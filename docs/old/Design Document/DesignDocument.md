# Design Document: 뽑기 (Ppopgi) — Etherlink Single Winner Lottery (v1.6)

## Table of Contents

- [Overview](#overview)
- [Why Etherlink](#why-etherlink)
- [High-Level Architecture](#high-level-architecture)
- [Contracts](#contracts)
  - [1) LotteryRegistry](#1-lotteryregistry-forever-contract)
  - [2) SingleWinnerDeployer](#2-singlewinnerdeployer-factory)
  - [3) LotterySingleWinner](#3-lotterysinglewinner-lottery-instance)
- [Mainnet Configuration](#mainnet-configuration)
- [Key Roles & Permissions](#key-roles--permissions)
- [Lifecycle & Status Model](#lifecycle--status-model)
- [Core User Flows](#core-user-flows)
  - [Create Lottery (Registry-Gated)](#create-lottery-registry-gated)
  - [Buy Tickets (Nuclear CEI)](#buy-tickets-nuclear-cei)
  - [Finalize Lottery (State Freezing)](#finalize-lottery-state-freezing)
  - [Entropy Callback (Pick Winner)](#entropy-callback-pick-winner)
  - [Withdraw Funds](#withdraw-funds)
  - [Cancellation & Refunds](#cancellation--refunds)
  - [Sweep Surplus (Admin)](#sweep-surplus-admin)
  - [Rescue Registration (Admin)](#rescue-registration-admin)
- [Protocol Fees & External Fee Recipient](#protocol-fees--external-fee-recipient)
- [Security Model & Audit Notes](#security-model--audit-notes)
- [Gas & Performance Notes](#gas--performance-notes)
- [Operational Playbooks](#operational-playbooks)

---

## Overview

This project implements a lottery platform with:

- **Verifiable randomness** via **Pyth Entropy**
- **Pull-based payouts** (users withdraw) to avoid payout griefing / DoS issues
- **Permissionless finalization** (anyone can finalize when eligible), enabling optional automation bots
- A minimal **“forever” registry** contract so the frontend only needs **one permanent address**
- Designed for **Etherlink Mainnet (Tezos L2)** using **USDC (6 decimals)**

The core lottery type (MVP) is **Single Winner**: participants buy tickets, and one ticket wins.

---

## Why Etherlink

Etherlink is a **Tezos Layer 2 with EVM compatibility**, chosen for:

- **EVM compatibility** (Paris hardfork supported, including `PREVRANDAO`)
- **Lower fees / faster confirmations** (~500ms block times) than many L1s
- **Scalability** suitable for many lottery instances and frequent participation
- **Oracle-friendly environment**: Pyth Entropy integrates well with EVM execution environments

---

## High-Level Architecture

The system is split into three on-chain components:

1. **LotteryRegistry**
   Minimal, stable, “forever” contract that stores:
   - all deployed lottery addresses
   - a numeric `typeId` per lottery
   - creator attribution
   - indexed lists by type

2. **SingleWinnerDeployer**
   Type-specific factory authorized by the registry owner (Safe). It:
   - packs configuration into a `LotteryParams` struct
   - deploys a new `LotterySingleWinner` instance
   - transfers **admin ownership** to the Safe
   - attempts to register the lottery in the registry (see [Create Lottery](#create-lottery-registry-gated))

3. **LotterySingleWinner**
   One instance = one lottery. It:
   - receives ticket purchases in USDC
   - requests randomness from Pyth
   - allocates winnings/revenue/fees into claimable balances
   - supports cancellation, refunds, and surplus sweeping
   - implements an **Escrowed Liabilities** model for both USDC and native (XTZ) tokens
   - implements "Nuclear CEI" (Check-Effect-Interaction + balance delta verification)

---

## Contracts

### 1) LotteryRegistry (Forever Contract)

**Purpose:** permanent on-chain list of lotteries.

**Responsibilities**
- Store all registered lotteries `allLotteries[]`
- Map each lottery address to:
  - `typeIdOf[lottery]`
  - `creatorOf[lottery]`
  - `registeredAt[lottery]`
- Maintain per-type list `lotteriesByType[typeId]`
- Allow **only authorized registrars** to register lotteries

**Admin**
- `owner` is the **Safe multisig**
- Safe authorizes registrar deployers via: `setRegistrar(registrar, true|false)`

**Key design constraints**
- No gameplay logic
- No unbounded on-chain loops (pagination helpers are bounded by `limit`)
- Minimal surface area (meant to be stable long-term)

---

### 2) SingleWinnerDeployer (Factory)

**Purpose:** Deploy and register single-winner lotteries.

**Responsibilities**
- Pack arguments into `LotteryParams` struct.
- Deploy `LotterySingleWinner`.
- Fund the lottery with the creator's USDC (requires approval).
- Call `confirmFunding()` on the lottery (see strict funding check below).
- Transfer lottery ownership to the **Safe** (admin owner).
- Emit `LotteryDeployed` event with extended metadata (deadline, ticket limits) for indexers.
- **Try/Catch Registration:** Attempts to register the lottery; if registry registration fails, deployment still succeeds and `RegistrationFailed` is emitted.

**Registry-Gated Creation (Important)**
- **Creation requires the deployer to be an authorized registrar in the registry.**
- `createSingleWinnerLottery(...)` checks `registry.isRegistrar(address(this))` and **reverts** if unauthorized.
- As a result, registry authorization is a prerequisite for creation (even though registration itself is wrapped in `try/catch`).

**Admin**
- `owner` is the **Safe**
- Safe can rotate deployer config via `setConfig(...)`.
- **Rescue Hatch:** `rescueRegistration(lotteryAddr, creator)` allows the Safe to manually register a lottery if automatic registration failed. This function validates:
  - target has contract code
  - target lottery was deployed by this deployer (`lottery.deployer() == address(this)`)
  - target lottery is owned by the Safe (`lottery.owner() == safeOwner`)

---

### 3) LotterySingleWinner (Lottery Instance)

**Purpose:** a single lottery (one instance = one game).

**Responsibilities**
- Store lottery parameters (name, price, pot, min/max tickets, deadline)
- Enforce sanity bounds on deployment (e.g., max price, max pot, max duration)
- **Hard Caps / Anti-griefing**
  - `HARD_CAP_TICKETS = 10,000,000`
  - Ticket purchases stored as **ranges** (append-only, binary-searchable)
  - Range growth is bounded by `MAX_RANGES = 20,000`
  - New ranges require `totalCost >= MIN_NEW_RANGE_COST` (1 USDC) unless the buyer is extending the last range
- Accept ticket purchases in USDC
- **Randomness:** Trigger Pyth request via `finalize()`, receive via `entropyCallback()`
- **Accounting (Escrowed Liabilities Model):**
  - **USDC:** `totalReservedUSDC` tracks funds that **must** be paid out (pot + ticket revenue + fees + refunds)
  - **Native (XTZ):** `totalClaimableNative` tracks native refunds owed to users
  - **Invariant intent:** USDC and native balances should remain sufficient to cover their respective liabilities
- **Funds Management:**
  - Allocate winner prize, creator revenue, protocol fees.
  - Pull-based withdrawals: `withdrawFunds()` (USDC), `withdrawNative()` (XTZ).
  - **Surplus Recovery:** `sweepSurplus(to)` and `sweepNativeSurplus(to)` transfer only amounts above liabilities.

**Admin**
- `owner()` is the **Safe**
- Safe can:
  - pause/unpause
  - set entropy provider/contract **only when `activeDrawings == 0`**
  - sweep surplus funds (balance > reserved)

**Immutables**
- `feeRecipient` and `protocolFeePercent` are **immutable per lottery instance**
- `creator` and `usdcToken` are immutable per instance

---

## Mainnet Configuration

Use these values when deploying `SingleWinnerDeployer` to **Etherlink Mainnet**.

| Parameter | Value | Notes |
| :--- | :--- | :--- |
| **Network Name** | Etherlink Mainnet | |
| **Chain ID** | `42793` | |
| **Block Time** | ~0.5 seconds | |
| **Native Token** | XTZ | Used for gas |
| **USDC Address** | `0x796Ea11Fa2dD751eD01b53C372fFDB4AAa8f00F9` | Canonical Bridged USDC (6 decimals). |
| **Pyth Entropy** | `0x2880aB155794e7179c9eE2e38200202908C17B43` | Verify against Pyth docs prior to deploy. |
| **Pyth Provider** | `0x52DeaA1c84233F7bb8C8A45baeDE41091c616506` | Default Pyth Entropy provider. |

---

## Key Roles & Permissions

### Safe Multisig (Owner / Admin)
Controls:
- Registry ownership (registrar authorization)
- Deployer config (global settings for new lotteries)
- Lottery instance admin knobs (pause / oracle config / surplus sweep)
- **Cannot** change fee recipient on *existing* lotteries (immutable per instance)

### Fee Recipient (External Wallet)
- Receives protocol fees via `claimableFunds[feeRecipient]`
- Withdraws via `withdrawFunds()` like any recipient
- Can be an EOA, treasury, or multisig/cold wallet
- Immutable per lottery instance

### Lottery Creator
- Calls deployer to create a new lottery
- Funds the pot at deployment (via Deployer approval flow)
- Receives ticket revenue (minus protocol fee) after completion
- Cannot buy tickets in own lottery (enforced via `msg.sender != creator`)

### Participants
- Buy tickets in USDC
- May finalize the lottery (permissionless)
- If lottery canceled, can claim refunds and withdraw

---

## Lifecycle & Status Model

LotterySingleWinner state machine:

- **FundingPending**
  - Lottery deployed but not yet confirmed funded
  - Only the deployer can call `confirmFunding()`

- **Open**
  - Pot confirmed; ticket purchases enabled
  - `finalize()` allowed only if `deadline` passed OR `maxTickets` reached

- **Drawing**
  - Randomness requested from Pyth
  - **State frozen:** `soldAtDrawing` records tickets sold at finalize time
  - Awaiting callback
  - `activeDrawings` increments to 1 (governance lock: entropy config cannot change)

- **Completed**
  - Winner selected
  - Funds allocated to claimable balances

- **Canceled**
  - Min tickets not reached OR emergency hatch triggered
  - **Snapshot:** `soldAtCancel` and `canceledAt` record state at cancellation time
  - Refunds become claimable for users based on tickets they own
  - Creator pot refund allocated
  - If canceled from Drawing, `activeDrawings` is decremented and drawing fields are cleared

---

## Core User Flows

### Create Lottery (Registry-Gated)

1. **Precondition:** Registry must authorize the deployer.
   - `LotteryRegistry.setRegistrar(deployer, true)` must be set by the Safe.
2. Creator approves `SingleWinnerDeployer` to spend `winningPot` in USDC.
3. Creator calls `SingleWinnerDeployer.createSingleWinnerLottery(...)`.
4. Deployer verifies it is an authorized registrar (`registry.isRegistrar(this)`), otherwise reverts.
5. Deployer deploys `LotterySingleWinner`.
6. Deployer transfers `winningPot` from Creator → Lottery.
7. Deployer calls `lottery.confirmFunding()` to activate it.
   - **Strict Funding Check (as implemented):** `confirmFunding()` requires `usdc.balanceOf(lottery) == winningPot` exactly, otherwise reverts.
8. Deployer transfers lottery ownership to the Safe.
9. Deployer emits `LotteryDeployed(...)`.
10. Deployer attempts to register in the registry:
   - **Success:** On-chain registry updated.
   - **Failure:** Emits `RegistrationFailed(lottery, creator)`; the lottery remains valid and usable but may be missing from the on-chain registry list until rescued.

### Buy Tickets (Nuclear CEI)

1. Participant calls `LotterySingleWinner.buyTickets(count)`.
2. Validations:
   - status is Open
   - not expired
   - not creator
   - `count` within bounds (`MAX_BATCH_BUY`, `minPurchaseAmount`)
   - ticket caps respected (`HARD_CAP_TICKETS`, `maxTickets`)
   - If the purchase creates a **new** range (not extending last range), requires `totalCost >= MIN_NEW_RANGE_COST` and `ticketRanges.length < MAX_RANGES`
3. Effects:
   - Update ticket range(s)
   - Increment `totalReservedUSDC` and `ticketRevenue`
   - Update `ticketsOwned[buyer]`
4. Interaction + Nuclear check:
   - Record balance before
   - `usdc.safeTransferFrom(buyer, lottery, totalCost)`
   - Record balance after
   - Revert if `balanceAfter < balanceBefore + totalCost` (`UnexpectedTransferAmount`)

### Finalize Lottery (State Freezing)

1. Anyone calls `finalize()` with `msg.value` intended to cover the Pyth fee.
2. Validations:
   - status is Open
   - no request pending (`entropyRequestId == 0`)
   - `deadline` passed OR `maxTickets` reached
3. If expired and `sold < minTickets`:
   - Lottery cancels via `_cancelAndRefundCreator(...)`
   - If `msg.value > 0`, the contract attempts to refund it to the caller via `_safeNativeTransfer`.
4. Else:
   - Status becomes Drawing
   - Snapshot `soldAtDrawing = sold`
   - Set `selectedProvider = entropyProvider`
   - Increment `activeDrawings` (governance lock)
   - Compute fee: `entropy.getFee(entropyProvider)`
   - Require `msg.value >= fee`
   - Request entropy: `entropy.requestWithCallback{value: fee}(provider, userRandomnessSeed)`
   - Store `entropyRequestId`
   - Refund any overpayment (`msg.value - fee`) via `_safeNativeTransfer`

### Entropy Callback (Pick Winner)

1. Pyth calls `entropyCallback(sequenceNumber, provider, random)`.
2. Contract verifies:
   - `msg.sender == entropy`
   - `sequenceNumber == entropyRequestId`
   - `status == Drawing`
   - `provider == selectedProvider`
3. Resolve:
   - winner index = `uint256(random) % soldAtDrawing`
   - winner address found via binary search over `ticketRanges`
4. Allocate claimables:
   - Winner prize: `winningPot - feePot`
   - Creator revenue: `ticketRevenue - feeRev`
   - Protocol fees: `feePot + feeRev` allocated to `feeRecipient`
5. Status becomes Completed, drawing fields are cleared, governance lock released.

### Withdraw Funds

Pull-based payout:
- `withdrawFunds()` transfers USDC owed to caller:
  - zeros `claimableFunds[msg.sender]`
  - decrements `totalReservedUSDC` by `amount`
  - transfers USDC to caller
- `withdrawNative()` transfers native token refunds:
  - zeros `claimableNative[msg.sender]`
  - decrements `totalClaimableNative`
  - sends XTZ to caller (reverts if send fails)

### Cancellation & Refunds

Paths:
- `cancel()` if expired and `sold < minTickets` (Open → Canceled)
- `forceCancelStuck()` if Drawing but callback never arrives:
  - Owner or creator after `PRIVILEGED_HATCH_DELAY` (24h)
  - Anyone after `PUBLIC_HATCH_DELAY` (7 days)

Cancellation behavior:
- Snapshot recorded: `soldAtCancel`, `canceledAt`
- Creator pot refund allocated once to `claimableFunds[creator]`
- Ticket buyers call `claimTicketRefund()`:
  - refund = `ticketsOwned[buyer] * ticketPrice`
  - sets `ticketsOwned[buyer] = 0`
  - credits refund to `claimableFunds[buyer]`
- Withdraw with `withdrawFunds()`

### Sweep Surplus (Admin)

- **USDC:** `sweepSurplus(to)`
  - Transfers `usdc.balanceOf(this) - totalReservedUSDC` to `to`
  - Reverts if no surplus
- **Native (XTZ):** `sweepNativeSurplus(to)`
  - Transfers `address(this).balance - totalClaimableNative` to `to`
  - Reverts if no surplus

Purpose: recover accidental transfers/dust without touching owed funds.

### Rescue Registration (Admin)

If `RegistrationFailed` was observed:
1. Admin calls `SingleWinnerDeployer.rescueRegistration(lotteryAddr, creatorAddr)`
2. Validates:
   - deployer is still an authorized registrar
   - `lotteryAddr` is a contract
   - `lottery.deployer() == address(this)`
   - `lottery.owner() == safeOwner`
3. Registers the lottery in `LotteryRegistry` (fixes indexing).

---

## Protocol Fees & External Fee Recipient

### Goal
Protocol fees should go to an **external wallet** (treasury) and **not sit on the Safe**.

### Implementation Pattern
- Each lottery stores an **immutable** `feeRecipient` address (set during deployment via the Deployer config).
- Fees are calculated as an **integer percentage** (`protocolFeePercent`, max 20).
- On completion, protocol fees are **allocated** to `claimableFunds[feeRecipient]`.
- The fee recipient withdraws using `withdrawFunds()`.

---

## Security Model & Audit Notes

- **Escrowed Liabilities Model:** `totalReservedUSDC` tracks USDC obligations. Withdrawals decrement this counter and revert if accounting would go negative.
- **Dual-Liability Accounting:** `totalClaimableNative` tracks native token refunds, enabling safe native surplus sweeping.
- **Reentrancy Protections:** User entrypoints and value-moving functions use `nonReentrant`.
- **Nuclear CEI:** `buyTickets()` updates state before transfer and verifies USDC balance delta to prevent "ghost ticket" transfers.
- **Hard Caps / Anti-griefing:** ticket caps + range limits reduce storage and gas griefing.
- **State Freezing:** `soldAtDrawing` locks participant count during async randomness; cancellation snapshot fields lock state during refunds.
- **Callback Context Verification:** Validates `sequenceNumber` and provider; rejects unexpected callbacks without mutating state.

---

## Gas & Performance Notes

- Tickets stored as **cumulative ranges** rather than per-ticket arrays.
- Winner lookup is **binary search**: `O(log nRanges)`.
- Balance delta checks in `buyTickets()` add two `balanceOf` calls for security.

---

## Operational Playbooks

### Initial Deployment
1. Deploy Safe multisig (admin).
2. Deploy `LotteryRegistry(owner = Safe)`.
3. Deploy `SingleWinnerDeployer(owner = Safe, registry, safeOwner = Safe, usdc, entropy, provider, feeRecipient, protocolFeePercent)`.
4. Safe calls `LotteryRegistry.setRegistrar(deployer, true)`.

### Rotating Treasury / Fee Recipient
**Note:** Fee recipient is immutable on deployed lotteries. To change it for future lotteries:
1. Safe calls `SingleWinnerDeployer.setConfig(..., newFeeRecipient, ...)`.
2. Newly created lotteries direct fees to the new address.
3. Existing lotteries continue paying the old address until they conclude.

### Recovering Accidental Transfers
1. Check `totalReservedUSDC` vs `usdc.balanceOf(lottery)`.
2. Safe calls `sweepSurplus(destinationAddress)` (USDC).
3. For native dust, compare `address(lottery).balance` vs `totalClaimableNative`, then call `sweepNativeSurplus(...)`.

### Rescuing Failed Registration
If a lottery was deployed but registry registration reverted:
1. Locate `RegistrationFailed` event on Deployer.
2. Verify the lottery is owned by the Safe and has `deployer == SingleWinnerDeployer`.
3. Safe calls `SingleWinnerDeployer.rescueRegistration(lotteryAddress, creatorAddress)`.

### Emergency Cancellation (Oracle Down / Callback Stuck)
1. If in Drawing, wait:
   - 24h for privileged hatch (Safe owner or creator)
   - 7 days for public hatch (anyone)
2. Call `forceCancelStuck()`.
3. Lottery cancels; creator pot refund and user ticket refunds become claimable.
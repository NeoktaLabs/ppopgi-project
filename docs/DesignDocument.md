# Design Document: Etherlink Single Winner Lottery (v1.5 - Gold Master)

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
  - [Create Lottery (Fault Tolerant)](#create-lottery-fault-tolerant)
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

- **EVM compatibility** (Paris Hardfork supported, including `PREVRANDAO`)
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
   - **Fault Tolerance:** Wraps the registry call in a `try/catch`. If the registry fails, the lottery is still deployed, and a `RegistrationFailed` event is emitted.
   - **Operational Safety:** Includes a `rescueRegistration` function to fix indexing if automatic registration fails.

3. **LotterySingleWinner**
   One instance = one lottery. It:
   - receives ticket purchases in USDC
   - requests randomness from Pyth
   - allocates winnings/revenue/fees into claimable balances
   - supports emergency cancellation, refunds, and surplus sweeping
   - **Accounting:** Uses a strict "Escrowed Liabilities" model.
   - **Security:** Implements "Nuclear CEI" (Check-Effect-Interaction with Balance Delta verification).

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
- No looping through all lotteries (no gas bombs)
- Minimal surface area (meant to be stable long-term)

---

### 2) SingleWinnerDeployer (Factory)

**Purpose:** Deploy and register single-winner lotteries safely, handling edge cases where the registry might be unavailable.

**Responsibilities**
- Pack arguments into `LotteryParams` struct.
- Deploy `LotterySingleWinner`.
- Fund the lottery with the creator's USDC (requires approval).
- Transfer lottery ownership to the **Safe** (admin owner).
- **Try/Catch Registration:** Attempts to register the lottery. If it fails (e.g., gas spikes, paused registry), emits `RegistrationFailed(lottery, creator)` so off-chain indexers know it exists, but leaves it unregistered on-chain until rescued.
- Emit `LotteryDeployed` event with extended metadata (deadline, ticket limits) for indexers.

**Admin**
- `owner` is the **Safe**
- Safe can rotate deployer config via `setConfig(...)`.
- **Rescue Hatch:** `rescueRegistration(lotteryAddr, creator)` allows the Safe to manually register a lottery if the automatic flow failed. This function validates the target lottery was deployed by this contract and is owned by the Safe.

---

### 3) LotterySingleWinner (Lottery Instance)

**Purpose:** a single lottery (one instance = one game).

**Responsibilities**
- Store lottery parameters (name, price, pot, min/max tickets, deadline)
- Enforce sanity bounds on deployment (Max price $100k, Max pot $10M, Max duration 1 year)
- **Hard Caps:** Enforces `HARD_CAP_TICKETS` (10,000,000) to prevent storage griefing attacks.
- Accept ticket purchases in USDC
- **Randomness:** Trigger Pyth request via `finalize()`, receive via `entropyCallback()`
- **Accounting (Escrowed Liabilities Model):**
  - `totalReservedUSDC` (Public): Tracks funds that **must** be paid out (Winning Pot + Gross Ticket Revenue + Fees).
  - **Invariant:** `usdc.balanceOf(this) >= totalReservedUSDC`
  - Withdrawal safety: Explicitly reverts if `totalReservedUSDC < amount` to prevent insolvency.
  - **Note:** Excess funding (surplus) is NOT automatically allocated to the creator; it remains as sweepable surplus.
- **Funds Management:**
  - Allocate winner prize, creator revenue, protocol fees.
  - Pull-based withdrawals: `withdrawFunds()`, `withdrawNative()`.
  - Surplus Recovery: `sweepSurplus(to)` allows admin to recover accidental transfers *above* the reserved amount.

**Admin**
- `owner()` is the **Safe**
- Safe can:
  - pause/unpause
  - set entropy provider/contract (only if no active drawings)
  - sweep surplus funds (balance > reserved)
- **Note:** `feeRecipient` and `protocolFeePercent` are **immutable** for the lifecycle of the specific lottery instance.

---

## Mainnet Configuration

Use these values when deploying `SingleWinnerDeployer` to **Etherlink Mainnet**.

| Parameter | Value | Notes |
| :--- | :--- | :--- |
| **Network Name** | Etherlink Mainnet | |
| **Chain ID** | `42793` | |
| **Block Time** | ~0.5 seconds | |
| **Native Token** | XTZ | Used for gas |
| **USDC Address** | `0x796Ea11Fa2dD751eD01b53C372fFDB4AAa8f00F9` | **Verified:** Canonical Bridged USDC. |
| **Pyth Entropy** | `0x2880aB155794e7179c9eE2e38200202908C17B43` | Verify on Pyth Docs before deploying. |
| **Pyth Provider** | `0x52DeaA1c84233F7bb8C8A45baeDE41091c616506` | Default Pyth Entropy Provider. |

---

## Key Roles & Permissions

### Safe Multisig (Owner / Admin)
Controls:
- Registry ownership (registrar authorization)
- Deployer config (global settings for new lotteries)
- Lottery instance admin knobs (pause / oracle config / surplus sweep)
- **Cannot** change fee recipient on *active* lotteries.

### Fee Recipient (External Wallet)
- Receives protocol fees via `claimableFunds[feeRecipient]`
- Withdraws via `withdrawFunds()` like any recipient
- Can be an EOA, treasury, or another multisig/cold wallet
- **Note:** This address is immutable for any deployed lottery instance.

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
  - Lottery deployed but not yet funded by deployer
- **Open**
  - Pot funded; ticket purchases enabled
  - finalize allowed only if `deadline` passed OR `maxTickets` reached
- **Drawing**
  - Randomness requested from Pyth
  - **State Frozen:** `soldAtDrawing` takes a snapshot of tickets sold.
  - Awaiting callback
  - `activeDrawings` increments to 1
  - Governance Lock enabled (cannot change Entropy config)
- **Completed**
  - Winner selected
  - Funds allocated to claimable balances
- **Canceled**
  - Min tickets not reached OR emergency hatch triggered
  - Refunds become claimable for users
  - Creator pot refund allocated
  - `activeDrawings` decremented if cancellation occurred during Drawing state

---

## Core User Flows

### Create Lottery (Fault Tolerant)
1. Creator approves `SingleWinnerDeployer` to spend `winningPot`.
2. Creator calls `SingleWinnerDeployer.createSingleWinnerLottery(...)`.
3. Deployer packs params -> deploys `LotterySingleWinner`.
4. Deployer transfers `winningPot` from Creator -> Lottery.
5. Deployer calls `lottery.confirmFunding()` to activate it (sets `totalReservedUSDC = winningPot`).
6. Deployer transfers lottery ownership to the Safe.
7. Deployer attempts to register lottery in Registry.
   - **Success:** Normal flow.
   - **Failure:** Emits `RegistrationFailed` event. Lottery is live but not in Registry list. Creator contacts Admin for `rescueRegistration`.

### Buy Tickets (Nuclear CEI)
1. Participant calls `LotterySingleWinner.buyTickets(count)`.
2. **Validation:** Checks status, deadline, hard caps (`HARD_CAP_TICKETS`).
3. **Anti-Spam Pre-check:** If purchase triggers a new storage range, verifies `count` and `cost` meet minimums.
4. **Effects (State Update):**
   - Append ticket range.
   - Increment `totalReservedUSDC` and `ticketRevenue`.
   - Emit `TicketsPurchased` event.
5. **Interaction (Nuclear Check):**
   - Measure `balanceBefore`.
   - Call `usdc.safeTransferFrom(user, lottery, totalCost)`.
   - Measure `balanceAfter`.
   - **Revert** if `balanceAfter < balanceBefore + cost` (Error: `UnexpectedTransferAmount`).

### Finalize Lottery (State Freezing)
1. Anyone calls `finalize()` with `msg.value` covering Pyth fee.
2. Validations: `deadline` passed OR `maxTickets` reached.
3. If expired and `sold < minTickets`:
   - Lottery canceled.
   - Creator pot refund allocated.
   - **Msg.value (randomness fee) is refunded to caller immediately.**
4. Else:
   - **Snapshot:** `soldAtDrawing = getSold()`.
   - Enters Drawing.
   - Requests entropy callback.
   - Refunds overpayment (or allocates to `claimableNative` if refund fails).

### Entropy Callback (Pick Winner)
1. Pyth calls `entropyCallback(seq, provider, random)`.
2. Contract verifies:
   - `msg.sender == entropy` (Spoofing check).
   - `seq == entropyRequestId` (Context check).
   - `provider == selectedProvider`.
3. Winner index = `random % soldAtDrawing` (uses frozen total).
4. Winner found via **binary search** over cumulative ranges.
5. Allocate claimables:
   - Winner prize.
   - Creator revenue.
   - Protocol fees to `feeRecipient`.
6. Status becomes Completed.

### Withdraw Funds
Pull-based payout:
- `withdrawFunds()` transfers USDC owed to caller.
  - **Strict Check:** Reverts if `totalReservedUSDC < amount` (Protects against accounting drift).
- `withdrawNative()` transfers native token (XTZ) refunds.

### Cancellation & Refunds
Paths:
- `cancel()` if expired and `sold < minTickets`.
- `forceCancelStuck()` if Drawing but callback never arrives:
  - Owner/creator after 24h (`PRIVILEGED_HATCH_DELAY`)
  - Anyone after 7 days (`PUBLIC_HATCH_DELAY`)

Refunds:
- Creator pot refund allocated once → creator withdraws.
- Ticket buyers call `claimTicketRefund()` → allocation → withdraw.
- **Event:** Emits `LotteryCanceled(reason, soldSnapshot, revenue, potRefund)` for indexer clarity.

### Sweep Surplus (Admin)
- Admin calls `sweepSurplus(to)`.
- Checks `balanceOf(this) > totalReservedUSDC`.
- Transfers difference to `to`.
- **Purpose:** Recover accidental user transfers or dust without touching game funds.

### Rescue Registration (Admin)
- If `RegistrationFailed` event was observed:
- Admin calls `SingleWinnerDeployer.rescueRegistration(lotteryAddr, creator)`.
- Validates target lottery is owned by Safe and deployed by this contract.
- Manually adds the lottery to the Registry (fixes indexing failures).

---

## Protocol Fees & External Fee Recipient

### Goal
Protocol fees should go to an **external wallet** (treasury) and **not sit on the Safe**.

### Implementation Pattern
- Lottery stores an **immutable** `feeRecipient` address (set during deployment via the Deployer config).
- Fees are calculated as an **integer percentage** (e.g., `5` = 5%).
- On completion, protocol fees are **allocated** to `claimableFunds[feeRecipient]`.
- The fee recipient withdraws using `withdrawFunds()`.

---

## Security Model & Audit Notes

- **Escrowed Liabilities Model:** `totalReservedUSDC` tracks obligations. The contract explicitly prevents withdrawing more than is owed, ensuring solvency even if the contract holds excess funds.
- **Nuclear CEI:** `buyTickets` updates state before transfer, AND explicitly checks the token balance delta to prevent "Ghost Ticket" attacks (where a token might return success but transfer nothing).
- **Hard Caps:** `HARD_CAP_TICKETS` (10M) prevents storage griefing attacks that could make binary search too expensive.
- **State Freezing:** `soldAtDrawing` locks the participant count during the async randomness request, preventing any potential logic drift during the wait period.
- **Fault Tolerance:** The Deployer `try/catch` block ensures that a Registry failure does not cause the Lottery deployment (and funding) to revert, preventing "stuck funds" scenarios during creation.
- **Replay Protection:** Uses **Context Verification**. The callback validates `sequenceNumber == entropyRequestId` and `provider == selectedProvider`. `entropyRequestId` is zeroed on success.

---

## Gas & Performance Notes

- Tickets stored as **cumulative ranges** rather than per-ticket arrays.
- Winner lookup is **binary search**: `O(log n)`.
- **Optimization:** Deadline is calculated locally in the Deployer to save an external call during deployment.
- **Balance Checks:** `buyTickets` performs 2 extra `STATICCALL`s (`balanceOf`) for security. On Etherlink (L2), this gas cost is negligible compared to the security benefit.

---

## Operational Playbooks

### Initial Deployment
1. Deploy Safe multisig (admin).
2. Deploy `LotteryRegistry(owner = Safe)`.
3. Deploy `SingleWinnerDeployer(owner = Safe, registry, safeOwner = Safe, feeRecipient, config...)`.
4. Safe calls `LotteryRegistry.setRegistrar(deployer, true)`.

### Rotating Treasury / Fee Recipient
**Note:** Fee recipient is immutable on deployed lotteries. To change it for future lotteries:
1. Safe calls `SingleWinnerDeployer.setConfig(..., newFeeRecipient, ...)`.
2. Any **newly** created lottery will direct fees to the new address.
3. Existing lotteries will continue to pay the old address until they conclude.

### Recovering Accidental Transfers
1. Check `totalReservedUSDC` (public var) vs `usdc.balanceOf(lottery)`.
2. Safe calls `sweepSurplus(destinationAddress)`.
3. Excess funds are transferred to the destination.

### Rescuing Failed Registration
If a lottery was deployed but the Registry transaction failed:
1. Locate `RegistrationFailed` event on Deployer contract.
2. Verify lottery address is valid and owned by Safe.
3. Safe calls `SingleWinnerDeployer.rescueRegistration(lotteryAddress, creatorAddress)`.

### Emergency Cancellation
**Symptom:** Pyth network is down; callback never arrives.
**Action:**
1. Wait 24 hours (`PRIVILEGED_HATCH_DELAY`).
2. Admin or Creator calls `forceCancelStuck()`.
3. Lottery cancels; funds become refundable.
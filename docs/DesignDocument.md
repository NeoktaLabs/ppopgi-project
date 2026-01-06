## Table of Contents

- [Overview](#overview)
- [Why Etherlink](#why-etherlink)
- [High-Level Architecture](#high-level-architecture)
- [Contracts](#contracts)
  - [1) LotteryRegistry](#1-lotteryregistry-forever-contract)
  - [2) SingleWinnerDeployer](#2-singlewinnerdeployer-type-specific-registrar)
  - [3) LotterySingleWinner](#3-lotterysinglewinner-lottery-instance)
- [Key Roles & Permissions](#key-roles--permissions)
- [Lifecycle & Status Model](#lifecycle--status-model)
- [Core User Flows](#core-user-flows)
  - [Create Lottery](#create-lottery)
  - [Buy Tickets](#buy-tickets)
  - [Finalize Lottery (Request Randomness)](#finalize-lottery-request-randomness)
  - [Entropy Callback (Pick Winner)](#entropy-callback-pick-winner)
  - [Withdraw Funds](#withdraw-funds)
  - [Cancellation & Refunds](#cancellation--refunds)
- [Protocol Fees & External Fee Recipient](#protocol-fees--external-fee-recipient)
- [Automation / Serverless Finalizer](#automation--serverless-finalizer)
- [Indexing & Frontend Data Strategy](#indexing--frontend-data-strategy)
- [Security Model & Audit Notes](#security-model--audit-notes)
- [Gas & Performance Notes](#gas--performance-notes)
- [Operational Playbooks](#operational-playbooks)
- [Future Expansion: New Lottery Types](#future-expansion-new-lottery-types)

---

## Overview

This project implements a lottery platform with:

- **Verifiable randomness** via **Pyth Entropy**  
- **Pull-based payouts** (users withdraw) to avoid payout griefing / DoS issues  
- **Permissionless finalization** (anyone can finalize when eligible), enabling optional automation bots  
- A minimal **“forever” registry** contract so the frontend only needs **one permanent address**  
- Designed for **Etherlink (Tezos L2)** using **USDC (6 decimals)**  

The core lottery type (MVP) is **Single Winner**: participants buy tickets, and one ticket wins.

---

## Why Etherlink

Etherlink is a **Tezos Layer 2 with EVM compatibility**, chosen for:

- **EVM compatibility** → standard Solidity tooling, audits, and ecosystem patterns  
- **Lower fees / faster confirmations** than many L1s → better UX for consumer flows (buy tickets, finalize, claim)  
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

2. **SingleWinnerDeployer**  
   Type-specific deployer/registrar authorized by the registry owner (Safe). It:
   - deploys a new `LotterySingleWinner` instance
   - transfers **admin ownership** to the Safe
   - registers the lottery in the registry

3. **LotterySingleWinner**  
   One instance = one lottery. It:
   - receives ticket purchases in USDC
   - requests randomness from Pyth
   - allocates winnings/revenue/fees into claimable balances
   - supports emergency cancellation and refunds

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

### 2) SingleWinnerDeployer (Type-Specific Registrar)

**Purpose:** deploy and register single-winner lotteries, without changing the registry.

**Responsibilities**
- Deploy `LotterySingleWinner`
- Transfer its ownership to the **Safe** (admin owner)
- Register the new lottery in the registry under `typeId = 1`
- Hold chain-specific config:
  - USDC address
  - Pyth Entropy contract
  - Entropy provider
  - Safe owner
  - **Protocol fee recipient** (external wallet)

**Admin**
- `owner` is the **Safe**
- Safe can rotate deployer config via `setConfig(...)`

---

### 3) LotterySingleWinner (Lottery Instance)

**Purpose:** a single lottery (one instance = one game).

**Responsibilities**
- Store lottery parameters (name, price, pot, min/max tickets, deadline)
- Accept ticket purchases in USDC
- Enforce anti-spam / storage controls
- Trigger Pyth randomness request via `finalize()`
- Receive randomness via `entropyCallback()`
- Allocate USDC balances into:
  - winner prize
  - creator revenue
  - protocol fees (to `feeRecipient`)
  - refunds on cancellation
- Implement pull-based withdrawals: `withdrawFunds()`, `withdrawEth()`

**Admin**
- `owner()` is the **Safe**
- Safe can:
  - pause/unpause
  - set protocol fee percent
  - set/update `feeRecipient`
  - set entropy provider/contract (only if no active drawings)

---

## Key Roles & Permissions

### Safe Multisig (Owner / Admin)
Controls:
- Registry ownership (registrar authorization)
- Deployer config
- Lottery instance admin knobs (pause/fee config/oracle config)

### Fee Recipient (External Wallet)
- Receives protocol fees via `claimableFunds[feeRecipient]`
- Withdraws via `withdrawFunds()` like any recipient  
- Can be an EOA, treasury, or another multisig/cold wallet

### Lottery Creator
- Calls deployer to create a new lottery
- Funds the pot at deployment (constructor pulls USDC)
- Receives ticket revenue (minus protocol fee) after completion
- Cannot buy tickets in own lottery

### Participants
- Buy tickets in USDC
- May finalize the lottery (permissionless)
- If lottery canceled, can claim refunds and withdraw

### Optional Automation Bot (Serverless / Cron)
- Calls `finalize()` when eligible (improves UX/liveness)
- No special permissions
- No trust required (permissionless)

---

## Lifecycle & Status Model

LotterySingleWinner state machine:

- **Open**
  - ticket purchases enabled  
  - finalize allowed only if:
    - `deadline` passed OR
    - `maxTickets` reached

- **Drawing**
  - randomness requested from Pyth
  - awaiting callback

- **Completed**
  - winner selected
  - funds allocated to claimable balances

- **Canceled**
  - min tickets not reached at expiry OR emergency hatch triggered
  - refunds become claimable for users
  - creator pot refund allocated

---

## Core User Flows

### Create Lottery
1. Creator calls `SingleWinnerDeployer.createSingleWinnerLottery(...)`
2. Deployer deploys `LotterySingleWinner`
3. Lottery constructor pulls `winningPot` from creator (`safeTransferFrom`)
4. Deployer transfers lottery ownership to the Safe
5. Deployer registers lottery in Registry (`typeId = 1`)

### Buy Tickets
1. Participant calls `LotterySingleWinner.buyTickets(count)`
2. Validations:
   - Open state, before deadline
   - count limits / minPurchase rules
   - ticket caps
   - storage spam barrier for new ranges
3. State updated + ticket range appended or extended
4. USDC transferred via `safeTransferFrom` (CEI-friendly pattern)

### Finalize Lottery (Request Randomness)
1. Anyone calls `finalize()` with `msg.value` covering Pyth fee
2. Validations:
   - `deadline` passed OR `maxTickets` reached
3. If expired and `sold < minTickets`:
   - lottery canceled
   - creator pot refund allocated
4. Else:
   - enters Drawing
   - requests entropy callback
   - refunds overpayment (or allocates to `claimableEth` if refund fails)

### Entropy Callback (Pick Winner)
1. Pyth calls `entropyCallback(seq, provider, random)`
2. Contract verifies request and provider
3. Winner index = `random % totalSold`
4. Winner found via **binary search** over cumulative ranges
5. Allocate claimables:
   - winner prize
   - creator revenue
   - protocol fees to `feeRecipient`
6. Status becomes Completed

### Withdraw Funds
Pull-based payout:
- `withdrawFunds()` transfers USDC owed to caller
- `withdrawEth()` transfers native token refunds (fee overpayment fallback)

### Cancellation & Refunds
Paths:
- `cancel()` if expired and `sold < minTickets`
- `forceCancelStuck()` if Drawing but callback never arrives  
  - owner/creator after 24h  
  - anyone after 7 days  

Refunds:
- Creator pot refund allocated once → creator withdraws
- Ticket buyers call `claimTicketRefund()` → allocation → withdraw

---

## Protocol Fees & External Fee Recipient

### Goal
Protocol fees should go to an **external wallet** (treasury) and **not sit on the Safe**.

### Recommended Pattern
- Lottery stores a mutable `feeRecipient` address (admin-set by Safe).
- On completion, protocol fees are **allocated** to:
  - `claimableFunds[feeRecipient]`
- The fee recipient withdraws using `withdrawFunds()`.

### Why this is recommended
- avoids permanently hardcoding treasury
- supports rotation if compromised or treasury changes
- separates admin control (Safe) from custody destination (fee recipient)

---

## Automation / Serverless Finalizer

**Problem (liveness):** If nobody calls `finalize()`, funds can remain stuck in Open state.

**Solution:** a serverless cron / worker:
- watches for eligible lotteries (deadline passed / maxTickets reached)
- calls `finalize()` with a slight fee buffer

**Security impact:**
- minimal additional risk
- bot is not trusted and has no privileged permissions

**Fee fluctuation note:**
- Pyth fee is dynamic → bot should overpay slightly; contract refunds excess.

---

## Indexing & Frontend Data Strategy

### With an Indexer (recommended)
Use events to build a complete UI:
- Registry:
  - `LotteryRegistered`
- Lottery instances:
  - `TicketsPurchased`
  - `LotteryFinalized`
  - `WinnerPicked`
  - `RefundAllocated`
  - `FundsClaimed`
  - (Optional) `PrizeAllocated` / `PayoutAllocated` for richer UX

### Without an Indexer
Still possible:
- read registry arrays via pagination
- query each lottery instance state (status, winner, deadline, etc.)

Limitation:
- “how far back” depends on frontend RPC performance and patience.
- For mass-market UX, an indexer is strongly recommended.

---

## Security Model & Audit Notes

- **Randomness:** Pyth Entropy, callback verified (caller, request id, provider)
- **Pull payouts:** avoids push-payment DoS and callback griefing
- **Reentrancy:** `ReentrancyGuard` + CEI style + `SafeERC20`
- **Storage spam control:** $1 minimum for new ranges, range compression
- **Emergency hatch:** prevents stuck funds if callback never arrives
- **Invariant checks:** liability counter (`totalReservedUSDC`) vs actual balance

---

## Gas & Performance Notes

- Tickets stored as **cumulative ranges** rather than per-ticket arrays.
- Winner lookup is **binary search**: `O(log n)`.
- Batch buys update a single range slot instead of storing many entries.

---

## Operational Playbooks

### Initial Deployment
1. Deploy Safe multisig (admin)
2. Deploy `LotteryRegistry(owner = Safe)`
3. Deploy `SingleWinnerDeployer(owner = Safe, registry, safeOwner = Safe, feeRecipient, config...)`
4. Safe calls `LotteryRegistry.setRegistrar(deployer, true)`

### Rotating Treasury / Fee Recipient
- Safe calls `LotterySingleWinner.setFeeRecipient(newTreasury)`

### Rotating Entropy Config
- Safe calls deployer `setConfig(...)` for new lotteries
- Existing lotteries can be updated only if no active drawings (per-lottery admin knobs)

---

## Future Expansion: New Lottery Types

Registry is numeric `typeId` based:
- `1 = single winner`
- `2 = multi-winner`
- `3 = guess number`
- ...

To add new type later:
1. Deploy a new deployer (e.g. `MultiWinnerDeployer`)
2. Safe authorizes it in `LotteryRegistry` via `setRegistrar(newDeployer, true)`
3. Frontend continues reading the same registry address (no redeploy needed)

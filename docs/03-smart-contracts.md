# Smart Contracts — Deep Technical Documentation

This document provides a **complete and transparent description** of the Ppopgi (뽑기) smart contracts deployed on **Etherlink Mainnet**.

It explains:
- what each contract is responsible for
- how funds are handled
- what each function does
- who can call what
- how state transitions work
- which invariants are enforced
- what limitations and tradeoffs exist

The goal is **verifiability, not obscurity**.

---

## Overview of On-Chain Architecture

The protocol is composed of three core contracts:

1. **LotteryRegistry**  
   A minimal, long-lived registry that tracks all official lotteries.

2. **SingleWinnerDeployer**  
   A factory contract responsible for deploying and funding new lotteries.

3. **LotterySingleWinner**  
   A per-lottery contract handling ticket sales, randomness, payouts, and refunds.

Each contract has a **narrow responsibility** and limited authority.

---

## 1. LotteryRegistry (Forever Registry)

### Purpose

The registry acts as the **canonical on-chain index** of lotteries.

It contains:
- all registered lottery addresses
- their lottery type
- creator attribution
- pagination helpers for UIs and indexers

It contains **no gameplay logic** and **no funds**.

---

### Key State Variables

- `owner`: admin (Safe multisig)
- `allLotteries[]`: array of registered lottery addresses
- `typeIdOf[lottery]`: lottery type identifier
- `creatorOf[lottery]`: creator address
- `registeredAt[lottery]`: timestamp
- `isRegistrar[address]`: authorization mapping

---

### Functions

#### `constructor(address owner)`
Initializes the registry owner.

---

#### `setRegistrar(address registrar, bool allowed)` (owner-only)
Authorizes or revokes a deployer’s ability to register lotteries.

- Used to gate which factories are “official”
- Prevents unauthorized spam registration

Emits: `RegistrarSet`

---

#### `registerLottery(uint256 typeId, address lottery, address creator)`
Registers a lottery.

Requirements:
- caller must be an authorized registrar
- lottery must not already be registered

Effects:
- appends lottery to `allLotteries`
- stores metadata mappings

Emits: `LotteryRegistered`

---

#### `isRegisteredLottery(address lottery)`
Returns whether a lottery is registered.

---

#### Pagination helpers
- `getAllLotteriesCount`
- `getAllLotteries(start, limit)`
- `getLotteriesByTypeCount(typeId)`
- `getLotteriesByType(typeId, start, limit)`
- `getLotteryByTypeAtIndex(typeId, index)`

These functions **never loop unboundedly** and are safe for UIs.

---

### Security Notes

- Registry holds **no funds**
- Registry cannot modify lotteries
- Registry can only list addresses
- Owner power is limited to registrar management

---

## 2. SingleWinnerDeployer (Factory)

### Purpose

The deployer is responsible for:
- deploying new `LotterySingleWinner` instances
- funding the initial prize pot
- transferring ownership to the Safe
- registering the lottery (best-effort)

---

### Key State Variables

- `owner`: Safe multisig
- `registry`: LotteryRegistry
- `safeOwner`: final admin owner of lotteries
- `usdc`: ERC20 used for tickets
- `entropy`: Pyth Entropy contract
- `entropyProvider`: default randomness provider
- `feeRecipient`: protocol fee address
- `protocolFeePercent`: immutable fee percentage per lottery

---

### Functions

#### `createSingleWinnerLottery(...)`

Creates and activates a new lottery.

Flow:
1. Checks deployer is an authorized registrar
2. Deploys `LotterySingleWinner`
3. Transfers prize pot (USDC) from creator
4. Calls `confirmFunding()` on the lottery
5. Transfers ownership of the lottery to the Safe
6. Attempts registry registration (`try/catch`)

If registry registration fails:
- the lottery still exists and works
- emits `RegistrationFailed`

Emits: `LotteryDeployed`

---

#### `setConfig(...)` (owner-only)
Updates defaults for **future lotteries only**.

Does NOT affect existing lotteries.

---

#### `rescueRegistration(lottery, creator)` (owner-only)
Manually registers a lottery if automatic registration failed.

Validations:
- lottery has contract code
- deployed by this deployer
- owned by the Safe

---

### Security Notes

- Deployer never holds funds
- Deployer cannot modify deployed lotteries
- Deployer cannot change fees of existing lotteries

---

## 3. LotterySingleWinner (Per-Raffle Contract)

### Purpose

Handles:
- ticket sales
- randomness
- winner selection
- payouts
- refunds
- accounting invariants

Each instance represents **one raffle**.

---

## Lifecycle & Status

Status enum:

| Value | State |
|-----|------|
| 0 | FundingPending |
| 1 | Open |
| 2 | Drawing |
| 3 | Completed |
| 4 | Canceled |

---

## Core Accounting Model

### USDC Accounting
- `totalReservedUSDC` tracks **all USDC owed**
- Includes:
  - winning pot
  - ticket revenue
  - protocol fees
  - refunds

Invariant:
usdc.balanceOf(contract) >= totalReservedUSDC

---

### Native Token Accounting
- `totalClaimableNative` tracks refundable native token amounts
- Used to safely refund entropy overpayments

---

## Functions (Detailed)

### `confirmFunding()`
Finalizes setup after prize funding.

Requirements:
- exact prize amount must be present

Transitions:
- FundingPending → Open

---

### `buyTickets(uint256 count)`
Allows users to buy tickets.

Validations:
- status is Open
- not expired
- buyer is not creator
- count within bounds
- caps respected

Security:
- **Nuclear CEI**:
  - state updated before transfer
  - balance delta checked after transfer

Effects:
- ticket ranges appended or extended
- `totalReservedUSDC` increased

---

### `finalize()` (payable)
Triggers randomness request.

Eligibility:
- status == Open
- expired OR sold out

If min tickets not met:
- lottery cancels
- refunds allocated

Else:
- transitions to Drawing
- requests entropy
- freezes ticket count

---

### `entropyCallback(...)`
Receives randomness.

Validations:
- correct entropy contract
- correct request id
- correct provider

Effects:
- selects winner via binary search
- allocates winnings and fees
- transitions to Completed

---

### `claimTicketRefund()`
Allocates refunds to users in canceled lotteries.

Effects:
- credits `claimableFunds[user]`
- zeroes `ticketsOwned[user]`

---

### `withdrawFunds()`
Withdraws USDC owed to caller.

Effects:
- transfers USDC
- decreases `totalReservedUSDC`

---

### `withdrawNative()` / `withdrawNativeTo(to)`
Withdraws native refunds.

Effects:
- decreases `totalClaimableNative`

---

### `cancel()`
Cancels expired lotteries with insufficient tickets.

---

### `forceCancelStuck()`
Emergency hatch if entropy callback never arrives.

Time-locked:
- privileged after 24h
- public after 7 days

---

### Admin-only Functions

- `pause / unpause`
- `setEntropyProvider`
- `setEntropyContract`
- `sweepSurplus`
- `sweepNativeSurplus`

**Admin cannot:**
- move owed funds
- change winners
- affect completed raffles

---

## Invariants & Safety Properties

- Funds owed are always tracked
- Surplus sweeping cannot touch liabilities
- Winner selection is deterministic from entropy
- State transitions are one-way
- Randomness provider cannot be changed mid-draw

---

## Known Limitations & Tradeoffs

- Pull-based withdrawals require user action
- Refunds are two-step (claim + withdraw)
- Range model can hit limits under extreme griefing (bounded by safeguards)
- Randomness callback depends on external provider availability

---

## Transparency Promise

Every rule described here:
- is enforced on-chain
- is visible in code
- is verifiable by anyone

There are no hidden behaviors.

---

## Final Note

These contracts were designed with **clarity, safety, and decentralization** in mind.

They are experimental, but intentionally constrained.

If something feels unclear, it should be documented — not hidden.
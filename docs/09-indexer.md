# Ppopgi (뽑기) Indexer (The Graph) — Documentation

This document describes the **Ppopgi indexer** built with **The Graph**, targeting **Etherlink (EVM)**.

The indexer exists to provide:
- fast discovery of raffles
- global filtering and sorting (expiry, prize, ticket price)
- reliable browsing of past raffles with final outcomes
- minimal RPC load on the frontend

The indexer is intentionally **hybrid**:
- **The indexer is used for lists, filters, and history**
- **On-chain reads remain the source of truth** for all action-critical and user-specific data

---

## Goals

### What the indexer should enable
- Browse raffles without scanning on-chain contracts
- Filter raffles by:
  - expiry (ending soon / later)
  - winning prize (low / high)
  - ticket price (low / high)
- Display past raffles, including:
  - winners for settled raffles
  - cancellation reasons for canceled raffles
  - drawing state when randomness is pending
- Keep UX fast while maintaining “code wins” transparency

### What the indexer should NOT try to replace
- Per-user claimable balances
- Per-user ticket ownership
- Allowance and approval checks
- Real-time action gating (e.g. “can finalize now”)
- Any state that directly determines whether a user can safely sign a transaction

---

## Hybrid model: what is indexed vs what is read on-chain

### Indexed (The Graph)

Use the indexer for:
- raffle discovery
- immutable or effectively immutable raffle metadata
- lifecycle events (finalization, completion, cancellation)
- global filtering and sorting

**Indexer is the primary source for:**
- homepage sections
- explore and browse pages
- past raffles listings

---

### On-chain reads (RPC)

Use direct on-chain reads for:
- confirmation on the raffle details view
- all user-specific data:
  - `ticketsOwned(user)`
  - `claimableFunds(user)`
  - `claimableNative(user)`
- allowance and approval checks for USDC
- action safety checks (paused state, finalize eligibility, request pending)

**On-chain state always wins** if indexer data is stale or inconsistent.

---

## Explicit non-indexed data (by design)

The following data **MUST NOT** be relied upon from the indexer and **MUST always be read directly from the raffle contract**:

- `ticketsOwned(address)`
- `claimableFunds(address)`
- `claimableNative(address)`
- per-user refund eligibility
- per-user prize eligibility
- current finalize eligibility
- allowance and approval state for USDC
- any value that directly determines whether a user can safely sign a transaction

The indexer is a **discovery and history layer**, not a transactional authority.

---

## Contracts indexed

### Registry
- `LotteryRegistry`

Used for canonical discovery and anti-spam registration.

Key event:
- `LotteryRegistered(typeId, lottery, creator)`

---

### Factory / Deployer
- `SingleWinnerDeployer`

Used for raffle creation metadata and factory defaults.

Key events:
- `LotteryDeployed(lottery, creator)`
- `ConfigUpdated(usdc, entropy, entropyProvider, feeRecipient, protocolFeePercent)`

> Note: the deployer does not control raffle state after deployment and does not hold user funds.

---

### Lottery instances
- `LotterySingleWinner` (dynamic data source per instance)

Key lifecycle events:
- `LotteryFinalized(requestId, totalSold, provider)`
- `WinnerPicked(winner, winningTicketIndex, totalSold)`
- `LotteryCanceled(reason, sold, ticketRevenue, potRefund)`

Optional analytics-only event:
- `TicketsPurchased(buyer, count, totalCost, totalSold, rangeIndex, isNewRange)`

> Analytics events MUST NOT be used for accounting, eligibility, or user balances.

---

## Data model

### Entity: `Raffle`

Represents one deployed `LotterySingleWinner` instance.

#### Identity & creation
- `id`: `Bytes` (raffle contract address)
- `typeId`: `BigInt`
- `creator`: `Bytes`
- `deployer`: `Bytes`
- `name`: `String`
- `createdAt`: `BigInt`
- `registeredAt`: `BigInt` (nullable)
- `isRegistered`: `Boolean`

> A raffle is created when `LotteryDeployed` is emitted  
> A raffle becomes canonical when `LotteryRegistered` is emitted

Frontend list pages MUST only display raffles where `isRegistered == true`.

---

#### Configuration
- `deadline`: `BigInt`
- `ticketPrice`: `BigInt` (USDC, 6 decimals)
- `winningPot`: `BigInt` (USDC, 6 decimals)
- `minTickets`: `BigInt`
- `maxTickets`: `BigInt`
- `protocolFeePercent`: `BigInt`
- `feeRecipient`: `Bytes`
- `usdc`: `Bytes`
- `entropy`: `Bytes`
- `entropyProvider`: `Bytes`

---

#### Lifecycle & outcome
- `status`: `String`  
  Allowed values:
  - `OPEN`
  - `DRAWING`
  - `COMPLETED`
  - `CANCELED`

> The contract’s `FundingPending` state MUST NOT be surfaced by the indexer.

- `winner`: `Bytes` (nullable)
- `winningTicketIndex`: `BigInt` (optional)
- `finalizeRequestId`: `BigInt` (optional)
- `selectedProvider`: `Bytes` (optional)
- `canceledReason`: `String` (optional)
- `canceledAt`: `BigInt` (optional)
- `soldAtCancel`: `BigInt` (optional)

---

#### Indexing metadata
- `indexedAtBlock`: `BigInt`
- `indexedAtTimestamp`: `BigInt`

---

### Entity: `FactoryConfig` (optional)

Tracks current deployer defaults for Create-page transparency.

- `id`: `Bytes` (factory address)
- `usdc`: `Bytes`
- `entropy`: `Bytes`
- `entropyProvider`: `Bytes`
- `feeRecipient`: `Bytes`
- `protocolFeePercent`: `BigInt`
- `updatedAtBlock`: `BigInt`
- `updatedAtTimestamp`: `BigInt`

---

## Indexing strategy

### Canonical raffle creation
- Create `Raffle` entity on `LotteryDeployed`
- Mark `isRegistered = true` only after `LotteryRegistered`
- Frontend must treat unregistered raffles as non-canonical

---

### Dynamic raffle templates
- Create a dynamic data source per raffle instance
- Index lifecycle events:
  - finalization
  - completion
  - cancellation

---

### Factory defaults
- Track `ConfigUpdated` events for Create-page display only
- Defaults are informational and non-authoritative

---

## Frontend integration rules (hybrid truth)

### List & browse pages
- Subgraph-first
- No per-card RPC calls
- Optional freshness indicator

---

### Raffle details view
- Subgraph used for fast initial render
- On-chain reads used for confirmation
- On-chain state always wins on mismatch

---

### User-specific views
- On-chain only
- Indexer must not be used

---

### Forbidden derived fields
The indexer MUST NOT expose or infer:
- `finalizable`
- `canWithdraw`
- `canClaim`
- any boolean that implies action safety

These must always be derived from on-chain state at interaction time.

---

## Handling indexer lag and reorgs

- Indexer data is eventually consistent
- Temporary inconsistencies may occur during reorgs
- User actions must never depend solely on indexer state

The frontend should allow:
- manual refresh
- on-chain verification
- graceful fallback to RPC

---

## Testing & correctness expectations

The indexer is **not part of the protocol’s security boundary**.

- Bugs in the indexer cannot cause fund loss
- Incorrect indexer data must never enable or block transactions
- Smart contract invariants are enforced on-chain and tested independently

Indexer correctness is a UX concern, not a safety assumption.

---

## Implementation note

The specific indexing backend (hosted The Graph, self-hosted Graph Node, or alternative indexer)
may evolve over time depending on Etherlink support.

This document defines the **contract between indexed data and the frontend**,  
not a hard dependency on a specific indexing technology.

---

## Final note

The Ppopgi indexer is designed as a **read-optimization layer**, not a trusted authority.

It improves UX, reduces RPC load, and enables rich discovery —
while preserving the guarantee that **all meaningful actions are governed by on-chain truth**.
# Ppopgi (뽑기) Indexer (The Graph) — Documentation

This document describes the **Ppopgi indexer** built with **The Graph**, targeting **Etherlink (EVM)**.

The indexer exists to provide:
- fast discovery of raffles
- global filtering and sorting (expiry, prize, ticket price)
- reliable “past raffles” browsing with winner visibility
- minimal RPC load on the frontend

The indexer is intentionally **hybrid**:
- **The Graph is used for lists, filters, and history**
- **On-chain reads remain the source of truth** for action-critical and user-specific data

---

## Goals

### What the indexer should enable
- Browse raffles without scanning on-chain contracts
- Filter raffles by:
  - expiry (soon / late)
  - winning prize (low / high)
  - ticket price (low / high)
- Show “past / expired” raffles including the winner (when settled)
- Keep UX fast while maintaining “code wins” transparency

### What the indexer should NOT try to replace
- Per-user claimable balances (`claimableFunds`, `ticketsOwned`, `claimableNative`)
- Real-time action gating (finalizable now, allowance, paused state)
- Any state that users are about to sign transactions based on

---

## Hybrid model: what is indexed vs what is read on-chain

### Indexed (The Graph)

Use The Graph for:
- raffle discovery
- immutable or effectively immutable raffle metadata
- lifecycle events (finalization, completion, cancellation)
- global filter and sort fields

**Indexer is the primary source for:**
- browse pages
- search and filter results
- “past raffles” listings

### On-chain reads (RPC)

Use direct on-chain reads for:
- confirmation on the raffle details page
- user-specific data:
  - `ticketsOwned[user]`
  - `claimableFunds[user]`
  - `claimableNative[user]`
- allowance and approval checks for USDC
- finalize eligibility (deadline, maxTickets, pause state)

**On-chain state always wins** if indexer data is stale or inconsistent.

---

## Explicit non-indexed data (by design)

The following data **MUST NOT** be relied upon from the indexer and **must always be read directly from the raffle contract**:

- `ticketsOwned(address)`
- `claimableFunds(address)`
- `claimableNative(address)`
- per-user refund eligibility
- per-user prize eligibility
- current finalize eligibility
- allowance and approval state for USDC
- any value that directly determines whether a user can safely sign a transaction

These values are intentionally excluded to:
- avoid stale or misleading UX
- prevent incorrect user actions
- preserve the principle that **users act on on-chain truth only**

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

> Note: the deployer is not a source of user funds and does not control raffle state after deployment.

---

### Lottery instances
- `LotterySingleWinner` (one subgraph data source per instance)

Key lifecycle events:
- `LotteryFinalized(requestId, totalSold, provider)`
- `WinnerPicked(winner, winningTicketIndex, totalSold)`
- `LotteryCanceled(reason, sold, ticketRevenue, potRefund)`

Optional analytics event (non-authoritative):
- `TicketsPurchased(buyer, count, totalCost, totalSold, rangeIndex, isNewRange)`

> Analytics events must never be used for accounting, eligibility, or user balances.

---

## Data model

### Entity: `Raffle`

Represents one deployed `LotterySingleWinner` instance.

Suggested fields:

- `id`: `Bytes` (raffle contract address)
- `typeId`: `BigInt`
- `creator`: `Bytes`
- `deployer`: `Bytes`
- `name`: `String`
- `createdAt`: `BigInt`
- `registeredAt`: `BigInt` (optional)
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

Lifecycle & outcome:
- `status`: `String` (`OPEN`, `DRAWING`, `COMPLETED`, `CANCELED`)
- `winner`: `Bytes` (nullable)
- `winningTicketIndex`: `BigInt` (optional)
- `finalizeRequestId`: `BigInt` (optional)
- `selectedProvider`: `Bytes` (optional)
- `canceledReason`: `String` (optional)
- `canceledAt`: `BigInt` (optional)
- `soldAtCancel`: `BigInt` (optional)

Indexing metadata:
- `indexedAtBlock`: `BigInt`
- `indexedAtTimestamp`: `BigInt`

---

### Entity: `FactoryConfig` (optional)

Tracks current deployer defaults for the Create page.

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
- Use `SingleWinnerDeployer.LotteryDeployed` as the authoritative creation signal.

### Registry registration
- Use `LotteryRegistry.LotteryRegistered` to confirm canonical status.

### Dynamic raffle templates
- Create a dynamic data source per raffle to index lifecycle events:
  - finalization
  - completion
  - cancellation

### Factory defaults
- Track `ConfigUpdated` for Create-page transparency only.

---

## Frontend integration rules (hybrid truth)

### List pages
- Subgraph-first
- No per-card RPC calls
- Optional freshness indicator

### Raffle details page
- Subgraph for fast initial render
- On-chain reads for confirmation
- On-chain state always wins on mismatch

### User-specific views
- On-chain only

---

## Handling indexer lag and reorgs

- Indexer data is eventually consistent
- Reorgs may temporarily surface stale data
- User actions must never depend on indexer state

The frontend should allow:
- manual refresh
- on-chain verification
- graceful fallback to RPC

---

## Testing & correctness expectations

The indexer is not part of the protocol’s security boundary.

- Bugs in the indexer **cannot cause fund loss**
- Incorrect indexer data must never enable or block transactions
- Smart contract invariants are enforced on-chain and tested independently

Indexer correctness is a UX concern, not a safety assumption.

---

## Final note

The Ppopgi indexer is designed as a **read-optimization layer**, not a trusted authority.

It improves UX, reduces RPC load, and enables rich discovery —
while preserving the guarantee that **all meaningful actions are governed by on-chain truth**.
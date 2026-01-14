# Ppopgi Indexer (The Graph) — Documentation

This document describes the **Ppopgi indexer** built with **The Graph**, targeting **Etherlink (EVM)**.

The indexer exists to provide:
- fast discovery of raffles
- global filtering and sorting (expiry, prize, ticket price)
- reliable “past raffles” browsing with winner visibility
- minimal RPC load on the frontend

The indexer is intentionally **hybrid**:
- **The Graph is used for lists + filters + history**
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
- Per-user claimable balances (`claimableFunds`, `ticketsOwned`, `claimTicketRefund` status)
- Real-time action gating (finalizable now, current allowance, current status if chain just updated)
- Any state that users are about to sign transactions based on

---

## Hybrid model: what is indexed vs what is read on-chain

### Indexed (The Graph)
Use The Graph for:
- raffle discovery
- immutable raffle metadata (or effectively immutable)
- state transitions and final outcomes (winner/cancel)
- global filter/sort fields

**Indexer is the primary source for:**
- browse pages
- search/filter results
- “past raffles” catalog

### On-chain reads (RPC)
Use on-chain reads for:
- confirmation on the raffle details page (truth)
- user-specific data:
  - `ticketsOwned[user]`
  - `claimableFunds[user]`
  - `claimableNative[user]`
- approvals / allowance checks for USDC
- finalize eligibility checks (deadline/maxTickets conditions can change with time)

**Chain is always the source of truth** if indexer data is stale.

---

## Explicit non-indexed data (by design)

The following data **MUST NOT** be relied upon from the indexer and **must always be read directly from the raffle contract**:

- `ticketsOwned(address)`
- `claimableFunds(address)`
- `claimableNative(address)`
- per-user refund eligibility
- per-user prize eligibility
- current finalize eligibility (time-based or cap-based)
- allowance and approval state for USDC
- any value that directly determines whether a user can safely sign a transaction

These values are intentionally excluded from indexing to:
- prevent stale or misleading UX
- avoid incorrect user actions
- preserve the principle that **users act on on-chain truth only**

The indexer is a **convenience and discovery layer**, not a transactional authority.

---

## Contracts indexed

### Registry
- `LotteryRegistry`

Used for canonical discovery and anti-spam registration.

Key event:
- `LotteryRegistered(index, typeId, lottery, creator)`

---

### Factory / Deployer
- `SingleWinnerDeployer`

Used for rich “created raffle” metadata and factory defaults.

Key events:
- `LotteryDeployed(lottery, creator, winningPot, ticketPrice, name, usdc, entropy, entropyProvider, feeRecipient, protocolFeePercent, deadline, minTickets, maxTickets)`
- `ConfigUpdated(usdc, entropy, provider, feeRecipient, protocolFeePercent)`

---

### Lottery instances
- `LotterySingleWinner` (many instances)

Key events:
- `LotteryFinalized(requestId, totalSold, provider)`
- `WinnerPicked(winner, winningTicketIndex, totalSold)`
- `LotteryCanceled(reason, sold, ticketRevenue, potRefund)`

Optional analytics event:
- `TicketsPurchased(buyer, count, totalCost, totalSold, rangeIndex, isNewRange)`

---

## Data model

### Entity: `Raffle`

A single deployed `LotterySingleWinner` instance.

Suggested fields:

- `id`: `Bytes` (raffle contract address)
- `typeId`: `BigInt` (e.g. `1` for Single Winner)
- `registryIndex`: `BigInt` (from `LotteryRegistered.index`, optional)
- `creator`: `Bytes`
- `deployer`: `Bytes` (the factory address)
- `name`: `String`
- `createdAt`: `BigInt` (block timestamp)
- `registeredAt`: `BigInt` (block timestamp, optional)
- `deadline`: `BigInt` (seconds)
- `ticketPrice`: `BigInt` (USDC 6 decimals)
- `winningPot`: `BigInt` (USDC 6 decimals)
- `minTickets`: `BigInt`
- `maxTickets`: `BigInt` (0 means uncapped)
- `protocolFeePercent`: `BigInt` (0–20)
- `feeRecipient`: `Bytes`
- `usdc`: `Bytes`
- `entropy`: `Bytes`
- `entropyProvider`: `Bytes`

State and results:
- `status`: `String` (`OPEN`, `DRAWING`, `COMPLETED`, `CANCELED`)
- `winner`: `Bytes` (nullable until completed)
- `winningTicketIndex`: `BigInt` (optional)
- `totalSoldAtFinalize`: `BigInt` (optional)
- `finalizeRequestId`: `BigInt` (optional)
- `selectedProvider`: `Bytes` (optional)
- `canceledReason`: `String` (optional)
- `canceledAt`: `BigInt` (optional)
- `soldAtCancel`: `BigInt` (optional)

Freshness:
- `indexedAtBlock`: `BigInt`
- `indexedAtTimestamp`: `BigInt`

---

### Entity: `FactoryConfig` (optional but recommended)

Tracks current factory defaults for the Create page.

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
Use `SingleWinnerDeployer.LotteryDeployed` as the primary metadata source.

### Registry registration
Use `LotteryRegistry.LotteryRegistered` to attach canonical registry metadata.

### Dynamic raffle templates
Create a dynamic data source per raffle to index:
- `LotteryFinalized`
- `WinnerPicked`
- `LotteryCanceled`

### Factory defaults
Use `ConfigUpdated` to keep Create-page configuration in sync.

---

## Frontend integration rules (hybrid truth)

### List pages
- Subgraph-first
- No per-card RPC calls
- Optional freshness indicator

### Raffle details page
- Subgraph for fast render
- On-chain reads for confirmation
- On-chain always wins on mismatch

### User-specific views
- On-chain only

---

## Handling indexer lag and reorgs

- Indexer data is eventually consistent
- Never gate user actions on indexer state
- Always allow manual on-chain verification

---

## Final note

The Ppopgi indexer is designed as a **read-optimization layer**, not a trusted authority.

It improves UX, reduces RPC load, and enables rich discovery —
while preserving the guarantee that **all meaningful actions are governed by on-chain truth**.
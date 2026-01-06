# Neokta Lottery — Frontend Specification (Full Contract Coverage)

This document tells a web developer **exactly** what to build to ship a **smooth, non-technical** lottery UI on **Etherlink Mainnet (Tezos L2)**.

It maps **1:1** to the current smart contracts:

- **LotteryRegistry.sol** — forever registry (Safe-owned)
- **SingleWinnerDeployer.sol** — deploy + fund + register (Safe-owned admin config)
- **LotterySingleWinner.sol** — one contract = one lottery instance

> **Key UX principle:** users should never need to understand contracts, gas, entropy fees, or “pull payments”. The UI should translate everything into plain language and provide clear action buttons.

---

## Table of contents

- [1. Glossary (UI-friendly words)](#1-glossary-ui-friendly-words)
- [2. Contracts & responsibilities](#2-contracts--responsibilities)
- [3. Core user journeys](#3-core-user-journeys)
- [4. Registry pages (explore & verify)](#4-registry-pages-explore--verify)
- [5. Create flow (deployer)](#5-create-flow-deployer)
- [6. Lottery detail page (all states)](#6-lottery-detail-page-all-states)
- [7. Claims center (pull payments)](#7-claims-center-pull-payments)
- [8. Admin (Safe only)](#8-admin-safe-only)
- [9. Events-driven UX](#9-events-driven-ux)
- [10. Error-to-copy mapping (non-technical text)](#10-error-to-copy-mapping-non-technical-text)
- [11. No-indexer strategy](#11-no-indexer-strategy)
- [12. Developer checklist (100% feature mapping)](#12-developer-checklist-100-feature-mapping)
- [13. Technical & Compliance Requirements (Critical)](#13-technical--compliance-requirements-critical)

---

## 1. Glossary (UI-friendly words)

Use these phrases consistently across the UI:

- **Lottery**: a game people join by buying tickets.
- **Pot**: the USDC the creator deposits as the prize.
- **Ticket price**: cost per ticket in USDC.
- **Tickets sold**: total tickets bought so far.
- **Minimum tickets**: if not reached by deadline, the lottery is canceled and refunds are enabled.
- **Deadline**: when the lottery stops accepting tickets (or when it can be finalized).
- **Finalize**: “Draw the winner” (anyone can do it when ready).
- **Randomness fee**: a small native fee (XTZ) paid to the randomness provider at finalize time.
- **Claim**: withdraw money from the contract to your wallet (security model).
- **Refund**: money returned if the lottery is canceled.
- **Paused**: safety stop — buying/finalizing/claiming is temporarily disabled.

---

## 2. Contracts & responsibilities

### A) LotteryRegistry (Forever contract)
What it does:
- Stores every lottery address ever created on the platform
- Stores `typeId` (numeric) and `creator` for each lottery
- Helps the UI display “Verified” lotteries

What it does **not** do:
- No gameplay logic
- No finalization logic
- No payout logic

### B) SingleWinnerDeployer (Type-specific deployer)
What it does:
- Creates **single-winner** lotteries
- Fixes ERC20 approval paradox by handling **funding flow**
- Registers new lottery addresses in the registry

Admin-configured defaults (Safe can change for **future** lotteries only):
- USDC address
- Entropy contract address
- Entropy provider address
- `feeRecipient` address
- `protocolFeePercent` (platform fee %) for **newly created lotteries**

### C) LotterySingleWinner (One instance = one lottery)
What it does:
- Stores all settings for **one** lottery (pot, ticket price, rules)
- Allows users to buy tickets
- Allows anyone to finalize once eligible
- Uses Pyth Entropy callback to pick winner
- Uses **pull-payments** (`claimableFunds`) for security
- Supports cancel + refunds + emergency cancel if oracle is down

Important immutability rules:
- For an **existing (active) lottery instance**, these do **not** change:
  - `feeRecipient` (where platform fees go)
  - `protocolFeePercent` (platform fee %)
  - `winningPot`, `ticketPrice`, rules, etc.

> Changing `feeRecipient` or `protocolFeePercent` in the deployer affects **only newly created lotteries**, never existing ones.

---

## 3. Core user journeys

### 3.1 Explore & join
1. User opens **Explore**
2. UI lists lotteries from the registry (verified)
3. User opens a lottery
4. User buys tickets (USDC approval if needed)

### 3.2 Create a lottery (creator journey)
1. Creator fills a simple form:
   - Name
   - Ticket price
   - Pot size (USDC)
   - Deadline (duration)
   - Min tickets / optional max tickets
   - Min purchase
2. UI checks creator USDC balance + allowance to the **Deployer**
3. If allowance low → show a friendly “Allow USDC” step
4. Call `createSingleWinnerLottery(...)`
5. UI confirms:
   - Lottery is created
   - Pot is funded
   - Lottery is “Live”

### 3.3 Draw winner (finalize)
- When the lottery reaches max tickets or passes deadline, **anyone** can draw the winner.
- The UI should normally run a bot/serverless job, but still show a “Draw winner” button publicly.

### 3.4 Claim winnings / refunds
- Winner / creator / feeRecipient / ticket buyers must click “Claim” (withdraw).
- The UI should provide:
  - A global **Claims** banner
  - A single “Claim all” flow (best UX)

---

## 4. Registry pages (explore & verify)

### 4.1 Explore page: “All lotteries”
**Reads (LotteryRegistry):**
- `getAllLotteriesCount()`
- `getAllLotteries(start, limit)`
- Per lottery card:
  - `typeIdOf(lottery)`
  - `creatorOf(lottery)`
  - `registeredAt(lottery)`

**UI requirements:**
- Sort by **newest first** using `registeredAt` (descending)
- Filters:
  - “Type” filter (start with “Single Winner” typeId = `1`)
  - Optional “Creator address” filter
- Each card shows:
  - Name (read from the lottery instance)
  - Status badge (Open / Drawing / Completed / Canceled / Funding)
  - Pot size, ticket price, tickets sold, time left

**Authenticity / safety badge (important):**
- Show ✅ **Verified** if `typeIdOf(lottery) != 0`
- If the user manually pastes an address not in registry, show ⚠️ “Not verified”

### 4.2 Explore page: “By type”
**Reads (LotteryRegistry):**
- `getLotteriesByTypeCount(typeId)`
- `getLotteriesByType(typeId, start, limit)`

**UI requirements:**
- Type tabs:
  - Single Winner (typeId = 1)
  - Future types can be added later (UI should accept arbitrary typeId)

---

## 5. Create flow (deployer)

### 5.1 Create page: Single Winner (TypeId = 1)

**Writes (SingleWinnerDeployer):**
- `createSingleWinnerLottery(name, ticketPrice, winningPot, minTickets, maxTickets, durationSeconds, minPurchaseAmount)`

**Pre-checks (USDC token):**
- `balanceOf(user)`
- `allowance(user, deployerAddress)`

**UX copy (simple):**
- Step 1: “Deposit prize pot (USDC)”
- Step 2: “Create lottery”
- Explain once: “USDC approval is needed so the contract can move your prize pot into the lottery.”

**Important:** the deployer funds the lottery and calls `confirmFunding()` internally, so the user should experience this as **one creation transaction** (plus approval if needed).

### 5.2 Deployer debug panel (optional, for support)
**Reads (SingleWinnerDeployer):**
- `usdc()`
- `entropy()`
- `entropyProvider()`
- `feeRecipient()`
- `protocolFeePercent()`

Show these values in “Debug / Network info” (hidden behind a toggle).

---

## 6. Lottery detail page (all states)

### 6.1 Reads to show (LotterySingleWinner)

Always show these fields:
- `name()`
- `status()`
- `createdAt()`, `deadline()`
- `ticketPrice()`, `winningPot()`, `ticketRevenue()`
- `minTickets()`, `maxTickets()`, `minPurchaseAmount()`
- `getSold()`
- `creator()`
- `feeRecipient()`
- `protocolFeePercent()`
- `entropyProvider()` (advanced / tooltip)
- `paused()` (from Pausable)

User-specific reads:
- `ticketsOwned(user)`
- `claimableFunds(user)`
- `claimableEth(user)`

Helper reads:
- `getMinTicketsToBuy()`
- `getTicketRangesCount()` (advanced)

### 6.2 State mapping (UI labels + what to show)

`status()` is an enum:
- `FundingPending` → **“Setting up…”**
- `Open` → **“Open”**
- `Drawing` → **“Drawing winner…”**
- `Completed` → **“Winner picked”**
- `Canceled` → **“Canceled”**

#### A) FundingPending
What it means:
- Lottery address exists but pot not confirmed yet (should be brief)

Show:
- “Setting up…” and a spinner
- Disable buy/finalize

#### B) Open
Show:
- Countdown: “Ends in …”
- Progress:
  - “Tickets sold: X”
  - “Minimum needed: Y”
  - If `maxTickets > 0`: “Max: Z”
- Buy tickets module
- “Draw winner” CTA appears only when eligible (see finalize rules)

#### C) Drawing
Show:
- “Drawing winner…” with spinner
- “If this takes too long, funds can be recovered later.” (link to emergency section)
- Disable buying

#### D) Completed
Show:
- Winner address: `winner()`
- If the UI has the `WinnerPicked` event, show “Winning ticket #…”
- Claims module (winner/creator/feeRecipient may have claimable funds)

#### E) Canceled
Show:
- “Canceled: refunds are available”
- Refund module if user bought tickets
- Creator pot refund info

### 6.3 Buy tickets module

**Write:**
- `buyTickets(count)`

**Pre-checks:**
- Only allow if `status == Open` and `paused == false`
- Suggest default `count = getMinTicketsToBuy()`

**UX behavior:**
- Quantity stepper with presets (1 / 5 / 10 / Max)
- Show “Total: X USDC”
- If allowance insufficient → show “Allow USDC” step
- After purchase, refresh:
  - `getSold()`
  - `ticketsOwned(user)`
  - `ticketRevenue()`

### 6.4 Finalize module (“Draw winner”)

**Write:**
- `finalize()` (payable)

Eligibility (show button if all true):
- `status == Open`
- AND (`now >= deadline` OR (`maxTickets > 0` AND `getSold() >= maxTickets`))

Fee estimation:
- `entropy.getFee(entropyProvider)` (call the Entropy contract directly)
- Add buffer (e.g., +20%) and show:
  - “Randomness fee: ~X XTZ”
  - “Any extra is refunded automatically.”

After sending tx:
- Update UI to “Drawing winner…”

### 6.5 Cancel module (only when eligible)

**Write:**
- `cancel()`

Show button if:
- `status == Open`
- AND `now >= deadline`
- AND `getSold() < minTickets`

Copy:
- “Cancel lottery (enables refunds)”
- Tooltip: “If minimum tickets weren’t reached, the lottery is canceled and refunds become available.”

### 6.6 Emergency module (oracle down)

**Write:**
- `forceCancelStuck()`

Show only if `status == Drawing`.

Read:
- `drawingRequestedAt()`
- `creator()`, `owner()`

Rules:
- Creator or Safe owner: can cancel after 24h
- Anyone: can cancel after 7 days

Copy:
- “If the randomness service is down, funds can still be recovered.”

---

## 7. Claims center (pull payments)

### 7.1 Why claims exist (explain once)
Use simple text:
> “For safety, prizes and refunds are kept in the contract until you click **Claim**.”

### 7.2 What to read
For the connected wallet:
- `claimableFunds(user)` (USDC)
- `claimableEth(user)` (XTZ refunds from overpaying finalize)
- `ticketsOwned(user)` (only matters if canceled)

### 7.3 What to write
- `withdrawFunds()`
- `withdrawEth()`
- `claimTicketRefund()` (only if canceled)

### 7.4 Best UX: “Claim all”
Without an indexer:
- Iterate recent lotteries from the registry (last N pages)
- For each, check `claimableFunds(user)` and `claimableEth(user)`
- Offer a batched “Claim all” *in the UI* (sequential txs), with a progress indicator.

---

## 8. Admin (Safe only)

Admin UI should appear only if connected wallet is the **Safe** (or a Safe signer, depending on how you gate it).

### 8.1 Registry admin (LotteryRegistry)
Writes:
- `setRegistrar(registrar, authorized)`
- `transferOwnership(newOwner)` (rare)

Reads:
- `owner()`
- `isRegistrar(address)`

UI:
- List known registrars (your deployers)
- Add/remove registrar (with confirmation modal)

### 8.2 Deployer admin (SingleWinnerDeployer) — **global config for NEW lotteries**
Writes:
- `setConfig(usdc, entropy, entropyProvider, feeRecipient, protocolFeePercent)`
- `transferOwnership(newOwner)` (rare)

Reads:
- `owner()`
- `usdc()`, `entropy()`, `entropyProvider()`, `feeRecipient()`, `protocolFeePercent()`

UX:
- Plain language:
  - “Where platform fees go (new lotteries)”
  - “Platform fee % (new lotteries)”
- Warning banner:
  - “Changes affect only lotteries created after this update.”

### 8.3 Lottery admin (LotterySingleWinner)
Writes:
- `pause()`, `unpause()`
- `setEntropyProvider(p)` (guarded by `activeDrawings == 0`)
- `setEntropyContract(e)` (guarded by `activeDrawings == 0`)

Reads:
- `owner()`
- `paused()`
- `activeDrawings()`

UX:
- These controls are advanced; hide them under “Safety / Advanced”
- Provide very clear warnings (“Only use if instructed by the team.”)

> Note: **protocol fee % and feeRecipient are NOT changeable on existing lottery instances.** They are fixed at deployment.

---

## 9. Events-driven UX

The UI should subscribe to events (or poll them via provider) for near real-time updates.

### 9.1 Registry events
**LotteryRegistry:**
- `LotteryRegistered(index, typeId, lottery, creator)`  
  Use to instantly add new lottery to Explore without rescanning storage.

### 9.2 Lottery events
**LotterySingleWinner:**
- `FundingConfirmed(funder, amount)` → “Lottery is live”
- `TicketsPurchased(buyer, count, totalCost, totalSold)` → update sold, activity feed
- `LotteryFinalized(requestId, totalSold, provider)` → show “Drawing…”
- `WinnerPicked(winner, winningTicketIndex, totalSold)` → show winner
- `PrizeAllocated(user, amount, reason)` → show toast:
  - reason=1: “You won a prize!”
  - reason=2: “Creator earnings are available”
  - reason=3: “Refund available”
  - reason=4: “Platform fee allocated”
  - reason=5: “Prize pot refunded to creator”
- `FundsClaimed(user, amount)` → “USDC claimed”
- `EthRefundAllocated(user, amount)` / `EthClaimed(user, amount)` → show “XTZ refund”
- `LotteryCanceled(reason)` → show canceled banner with reason
- `EmergencyRecovery()` → show “Emergency cancellation triggered”
- `CallbackRejected(seq, reasonCode)` → log only (debug)

---

## 10. Error-to-copy mapping (non-technical text)

Smart contracts revert with custom errors. The UI should translate them.

Suggested mapping:

- `LotteryNotOpen` → “This lottery isn’t open right now.”
- `LotteryExpired` → “This lottery has ended. You can’t buy tickets anymore.”
- `BatchTooSmall` → “Please buy at least the minimum number of tickets.”
- `BatchTooLarge` → “That’s too many tickets at once. Please try a smaller number.”
- `BatchTooCheap` → “Please buy a bit more so your purchase meets the minimum amount.”
- `TicketLimitReached` → “Not enough tickets left. Try a smaller number.”
- `NotReadyToFinalize` → “Not ready yet. The lottery must end or sell out first.”
- `InsufficientFee` → “Randomness fee changed. Please try again.”
- `RequestPending` → “A draw is already in progress.”
- `NotDrawing` → “This lottery is not waiting for a draw result.”
- `Wait24Hours` → “Please wait 24 hours before using the emergency option.”
- `EmergencyHatchLocked` → “Emergency option is available after 7 days.”
- `NothingToClaim` → “Nothing to claim right now.”
- `NothingToRefund` → “No refund available for this wallet.”
- `NotCanceled` → “Refunds are only available if the lottery is canceled.”
- `CannotCancel` → “This lottery can’t be canceled right now.”
- `TooManyRanges` → “This lottery is too popular to accept more unique buyers. Try again later.”
- `Pausable: paused` (or `paused() == true`) → “This lottery is temporarily paused for safety.”

Fallback (unknown revert):
- “Transaction failed. Please try again. If it keeps happening, contact support.”

---

## 11. No-indexer strategy

You can ship without an indexer, but you must accept limits.

### 11.1 Explore lists
- Use registry pagination and cache pages locally.
- Show “Load more”.

### 11.2 My activity
Without an indexer:
- **Created lotteries**: scan registry pages and filter where `creatorOf(lottery) == user`
- **Joined lotteries**: scan the most recent N lotteries and check `ticketsOwned(user)`

Show honest UX copy:
- “We’re showing your most recent activity. Older lotteries may require searching.”

### 11.3 Search by address
Provide a search box:
- Paste a lottery address
- Check registry `typeIdOf(address)`:
  - if 0 → show “Not verified”
  - else → load details page

---

## 12. Developer checklist (100% feature mapping)

### LotteryRegistry
- [ ] `getAllLotteriesCount`
- [ ] `getAllLotteries(start, limit)`
- [ ] `getLotteriesByTypeCount(typeId)`
- [ ] `getLotteriesByType(typeId, start, limit)`
- [ ] `typeIdOf(lottery)`
- [ ] `creatorOf(lottery)`
- [ ] `registeredAt(lottery)`
- [ ] Events: `LotteryRegistered`
- [ ] Admin: `setRegistrar`, `transferOwnership`

### SingleWinnerDeployer
- [ ] `createSingleWinnerLottery` (create flow)
- [ ] Reads: `usdc`, `entropy`, `entropyProvider`, `feeRecipient`, `protocolFeePercent`
- [ ] Admin: `setConfig`, `transferOwnership`
- [ ] Events: `ConfigUpdated`

### LotterySingleWinner
- [ ] Reads: **all public fields** + `getSold`, `getMinTicketsToBuy`, `getTicketRangesCount`
- [ ] Buy: `buyTickets`
- [ ] Finalize: `finalize` (payable)
- [ ] Callback handling (events-driven)
- [ ] Cancel: `cancel`
- [ ] Emergency cancel: `forceCancelStuck`
- [ ] Refund: `claimTicketRefund`
- [ ] Claims: `withdrawFunds`, `withdrawEth`
- [ ] Admin: `pause`, `unpause`, `setEntropyProvider`, `setEntropyContract`
- [ ] Events: all of them, especially `PrizeAllocated` and `FundingConfirmed`

---

## 13. Technical & Compliance Requirements (Critical)

### 13.1 Network Enforcement (Etherlink Mainnet)
The dApp must strictly enforce the **Etherlink Mainnet** network.
- **Chain ID:** `42793`
- **Behavior:** If the user's wallet is connected to a different chain, **all** transaction buttons (Create, Buy, Finalize, Claim) must change to a **"Switch to Etherlink"** button that triggers the wallet network switch request.

### 13.2 Contract Addresses (Verification Required)
The developer must verify these addresses against official documentation before hardcoding:
* **Pyth Entropy:** `0x2880aB155794e7179c9eE2e38200202908C17B43`
* **Pyth Provider:** `0x52DeaA1c84233F7bb8C8A45baeDE41091c616506`
* **USDC:** `0x796Ea11Fa2dD751eD01b53C372fFDB4AAa8f00F9` (Canonical Bridged USDC).

### 13.3 Terms of Service (TOS) Gate
- **Create Page:** Add a mandatory checkbox: *"I agree to the Terms of Service and confirm I am legally eligible to create a lottery."* The "Create Lottery" button is disabled until checked.
- **Buy Module:** Add a mandatory checkbox: *"I agree to the Terms of Service."* The "Buy Tickets" button is disabled until checked.

### 13.4 "Max Tickets" Race Condition Handling
In the **Buy Tickets** module, the UI must prevent users from trying to buy more tickets than are available.
- **Logic:**
  `available = (maxTickets > 0) ? (maxTickets - getSold()) : infinity`
- **Constraint:**
  If the user inputs a number > `available`, the UI must automatically cap the input to `available` and show a helper text: *"Only X tickets remaining."*
- **Why:** This prevents failed transactions and wasted gas for your users.

### 13.5 Data Formatting Standards
- **USDC (Inputs/Outputs):** Always convert user input to **6 decimals** before sending to blockchain (`amount * 10^6`).
- **XTZ (Fees/Refunds):** Always treat native currency as **18 decimals**.
- **Timestamps:** Contract returns Unix timestamps (seconds). Convert to local user time for display.
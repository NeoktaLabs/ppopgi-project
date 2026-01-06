# Neokta Lottery — Full-Feature Frontend Specification
**(100% Contract Coverage)**

This document outlines the detailed requirements for the frontend interface of the Neokta Lottery platform. It ensures every capability of the smart contracts is accessible via the UI.

---

## Table of Contents
1. [Global App Structure](#1-global-app-structure)
2. [Registry Features](#2-registry-features-use-them-all)
3. [Deployer Features](#3-deployer-features-use-them-all)
4. [Lottery Features](#4-lottery-features-use-them-all)
5. [Protocol Fee Recipient UX](#5-protocol-fee-recipient-ux)
6. [Admin Panel (Safe Only)](#6-admin-panel-safe-only--full-feature)
7. [Events-Driven UX](#7-events-driven-ux-use-all-the-nice-signals)
8. [My Activity Strategy](#8-my-activity-without-an-indexer)
9. [Recommended UI Components](#9-recommended-ui-components)
10. [Developer Checklist](#10-developer-checklist-every-contract-feature-mapped)

---

## 1. Global App Structure

### Global Navigation
* **Explore**: Browse active lotteries.
* **Create**: Deploy new lotteries.
* **My Activity**: View created lotteries and tickets owned.
* **Notifications / Claims**: Global alert system for winnings and refunds.
* **Admin**: Visible only to the Safe owner.

### Global Background Jobs (Frontend-side)
Implement a polling loop (every ~10–30s) to fetch:
* Newly registered lotteries (via `LotteryRegistered` events or registry pagination).
* Status changes for lotteries currently displayed on screen.
* User claimable balances for the **"Claims"** banner.

> **Note:** If an indexer is added later, polling can be replaced with event indexing. The UI must function robustly without an indexer initially.

---

## 2. Registry Features (Use Them All)

### A. Registry Page: "All Lotteries"
**Contract Calls:**
* `getAllLotteriesCount()`
* `getAllLotteries(start, limit)`
* *Per lottery:* `typeIdOf(lottery)`, `creatorOf(lottery)`, `registeredAt(lottery)`

**UI Elements:**
* **Sort:** "Newest first" (using `registeredAt`).
* **Filters:**
    * **Type:** Filter by `typeId`.
    * **Creator:** Filter by specific address.
* **Pagination:** Load more / Next page.

### B. Registry Page: "By Type"
**Contract Calls:**
* `getLotteriesByTypeCount(typeId)`
* `getLotteriesByType(typeId, start, limit)`

**UI Elements:**
* **Tabs:**
    * "Single Winner" (mapped to `typeId = 1`).
    * *Future types:* Show tabs dynamically based on available types.

### C. Lottery Authenticity Badge (IMPORTANT UX)
**Contract Logic:**
* Verify `typeIdOf(lottery) != 0`.

**UI Elements:**
* If true, display badge: ✅ **"Verified by Registry"**
* *This distinguishes official platform lotteries from fake clones.*

---

## 3. Deployer Features (Use Them All)

### Create Lottery (Single Winner)
**Contract Calls:**
* `createSingleWinnerLottery(...)`

**UX Flow:**
1.  **Pre-Submit:** Check `USDC.allowance(user, deployer)` and `USDC.balanceOf(user)`.
2.  **Approve Flow:** If allowance is insufficient, show **"Approve USDC"** modal before creation.
3.  **Post-Transaction:**
    * Show created lottery address.
    * Deep-link to the new **Lottery Detail Page**.
    * Show **"Registered ✅"** confirmation once the registry event is detected.

### Network Config (Debug Mode)
**Contract Calls:**
* `usdc()`, `entropy()`, `entropyProvider()`

**UI Elements:**
* **"Network Config" Box:** Visible in dev/debug mode.
* *Purpose:* Helps debug deployments on incorrect networks or with wrong addresses.

---

## 4. Lottery Features (Use Them ALL)

For each Lottery Instance (Single Winner):

### A. Core Display (Always Show)
**Read Functions:**
* `name()`, `creator()`, `feeRecipient()`
* `createdAt()`, `deadline()`
* `status()`
* `ticketPrice()`, `winningPot()`, `ticketRevenue()`
* `minTickets()`, `maxTickets()`, `minPurchaseAmount()`
* `winner()`, `getSold()`

**UI Elements:**
* **Countdown Timer:** `deadline - now`.
* **Sold Progress Bar:**
    * Visual: `sold / maxTickets` (if capped).
    * Indicator: `sold / minTickets` (shows if "Min Reached").
* **Rule Summary:**
    * "Min tickets: X"
    * "Max tickets: Unlimited / X"
    * "Min purchase: None / X tickets"
* **Cards:**
    * **Winner Card:** Shown if status is *Completed*.
    * **Creator Card:** Address + Copy button.
    * **Date:** "Registered on [Date]" (from Registry data).

### B. Ticket Purchase Features
**Read Functions:**
* `getMinTicketsToBuy()` *(Key UX Helper)*

**Write Functions:**
* `buyTickets(count)`

**UI Elements:**
* **Quantity Selector:** Default value set to `getMinTicketsToBuy()`.
    * *Warning:* Alert user if selection is below minimum purchase rules.
* **Cost Calculation:** Display `count * ticketPrice`.
* **Approval Flow:** Check USDC allowance/balance -> Prompt approval if needed.
* **Post-Purchase:** Update sold count, user's ticket count, and revenue instantly.
* **Advanced Stats (Optional):** Show `getTicketRangesCount()` for power users monitoring range optimization.

### C. Permissionless Finalization Features (VERY IMPORTANT)
**Read Functions:**
* `status()`, `getSold()`, `deadline()`, `minTickets()`, `maxTickets()`
* **Entropy Fee:** `entropy.getFee(entropyProvider)`

**Write Functions:**
* `finalize()` (Payable)

**UI Logic:**
* **Show "Finalize" Button:** Visible to **everyone** when:
    * `status == Open` **AND**
    * (`now >= deadline` **OR** `sold >= maxTickets`)
* **Fee Estimate:** Calculate `fee * 1.2` (20% buffer).
    * *Note:* "Excess fee is refunded automatically."
* **Loading State:** After finalizing, status becomes `Drawing`. Show spinner: **"Awaiting randomness..."**

### D. Winner Resolution & Completed State
**Read Functions:**
* `winner()`
* `status()`

**UI Elements:**
* Display **Winner Address**.
* Display **Winning Ticket Index** (from `WinnerPicked` event).
* **Share:** "Copy Winner Address" / Shareable link.

### E. Pull-Based Payout Features (USE ALL)
**Read Functions (User-Specific):**
* `claimableFunds(user)`
* `claimableEth(user)`
* `ticketsOwned(user)` (for refunds)

**Write Functions:**
* `withdrawFunds()`
* `withdrawEth()`

**UI Elements:**
* **Global "Claims" Banner:** Appears if `claimableFunds > 0` OR `claimableEth > 0`.
* **Lottery Detail Page:**
    * "USDC Claimable: [Amount]"
    * "Fee Refund Claimable: [Amount]"
* **Action Buttons:** "Withdraw USDC", "Withdraw Fee Refund".
* **Explicit Text:** *"Funds are secured in the contract until you withdraw."*

### F. Cancellation & Refund Features
**Read Functions:**
* `status()`
* `ticketsOwned(user)`

**Write Functions:**
* `cancel()`
* `claimTicketRefund()`

**UI Elements:**
* **Cancel Action:** If *Open* & *Expired* & *Min Tickets Not Met*:
    * Show **"Cancel Lottery"** button.
    * *Tooltip:* "Returns pot to creator and enables ticket refunds."
* **Refund Action:** If *Canceled*:
    * Show **"Claim Refund"** if `ticketsOwned > 0`.
    * Display amount: `ticketsOwned * ticketPrice`.

### G. Emergency Hatch Features
**Read Functions:**
* `status()`
* `drawingRequestedAt()`
* `creator()`, `owner()`

**Write Functions:**
* `forceCancelStuck()`

**UI Elements:**
* **Visibility:** Only in `Drawing` state.
* **Countdown:**
    * Privileged (Owner/Creator): 24 hours.
    * Public: 7 days.
* **Action:** Enable **"Force cancel stuck lottery"** when timer expires.
* *Trust signal:* "If the oracle fails, funds can be recovered."

### H. Pause Features
**Read Functions:**
* `paused()`

**UI Elements:**
* If `paused`: Disable write actions and show banner **"Paused for safety"**.

---

## 5. Protocol Fee Recipient UX
* **Display:** Show "Protocol Fee Recipient" address on lottery detail (optional).
* **Withdraw:** If connected user == `feeRecipient` and `claimableFunds > 0`, show **Withdraw CTA**.

---

## 6. Admin Panel (Safe Only — "Full Feature")
*Visible only if connected wallet is the Safe Owner.*

### Registry Admin
* **Write:** `setRegistrar(registrar, authorized)`
* **UI:** List authorized registrars; Add/Remove interface.

### Deployer Admin
* **Write:** `setConfig(usdc, entropy, entropyProvider, feeRecipient)`
* **UI:** Form with current values; "Apply Changes" button.

### Lottery Admin (Any Instance)
* **Write:**
    * `pause()` / `unpause()`
    * `setProtocolFee(p)`
    * `setEntropyProvider(p)`
    * `setEntropyContract(e)`
* **UI:**
    * Selector for target lottery address.
    * Display `activeDrawings`.
    * *Guard:* Disable entropy changes if `activeDrawings > 0`.

---

## 7. Events-Driven UX (Use All The Nice Signals)
The UI should subscribe to these events for real-time updates:

| Source | Event | UI Action |
| :--- | :--- | :--- |
| **Registry** | `LotteryRegistered` | Update lists immediately. |
| **Lottery** | `TicketsPurchased` | Update "Sold" count and activity feed. |
| **Lottery** | `LotteryFinalized` | Switch status to "Drawing started". |
| **Lottery** | `WinnerPicked` | Show winner card. |
| **Lottery** | `PrizeAllocated` | Show toast: "You received X USDC (Reason: Winner/Refund)". |
| **Lottery** | `FundsClaimed` | Show success toast. |
| **Lottery** | `EthRefundAllocated` | Show claimable ETH bubble. |
| **Lottery** | `EthClaimed` | Show success toast. |
| **Lottery** | `LotteryCanceled` | Update status and show reason. |

---

## 8. My Activity (Without an Indexer)
*Strategy for decent UX without external indexing:*

1.  **My Created Lotteries:**
    * Iterate registry pages.
    * Filter where `creatorOf(lottery) == user`.
    * Cache results in local storage.

2.  **My Participations:**
    * Iterate recent N lotteries.
    * Check `ticketsOwned(user) > 0`.
    * Display "You own X tickets".

---

## 9. Recommended UI Components
* **"One-Click Withdraw":** Smart button that detects all claimables across lotteries.
* **"Finalize For Me":** Messaging explaining that anyone can finalize, but bots usually handle it.
* **"Safety Box":** Explainer section for Pull Payouts & Emergency Hatch.
* **"Verified Badge":** Visual trust indicator from Registry data.

---

## 10. Developer Checklist: Every Contract Feature Mapped

**✅ Registry**
- [ ] `registerLottery` (via deployer)
- [ ] `setRegistrar` (admin panel)
- [ ] Pagination views (explore pages)
- [ ] `typeIdOf`, `creatorOf`, `registeredAt` (lottery cards)

**✅ Deployer**
- [ ] `createSingleWinnerLottery` (create page)
- [ ] Config reads (debug mode)
- [ ] `setConfig` (admin panel)

**✅ Lottery**
- [ ] All reads on detail page
- [ ] `buyTickets` (purchase modal)
- [ ] `finalize` (CTA + fee estimate)
- [ ] `withdrawFunds` / `withdrawEth` (claims page)
- [ ] `cancel` (expired/min not met)
- [ ] `claimTicketRefund` (refund CTA)
- [ ] `forceCancelStuck` (emergency section)
- [ ] `pause`/`unpause` + admin knobs (admin panel)
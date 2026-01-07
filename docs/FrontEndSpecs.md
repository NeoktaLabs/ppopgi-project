# Neokta Ppopgi — Frontend Specification (v6.4 - Final Production Spec)

This document tells a web developer **exactly** what to build to ship a **smooth, non-technical** lottery UI on **Etherlink Mainnet (Tezos L2)**.

It maps **1:1** to the current smart contracts (v1.5 Gold Master):
- **LotteryRegistry.sol** — forever registry (Safe-owned)
- **SingleWinnerDeployer.sol** — deploy + fund + register (Safe-owned admin config)
- **LotterySingleWinner.sol** — one contract = one lottery instance

> **Key UX Principle:** The user is a "Player" in a theme park. The goal is to make them feel excitement when they join and **FOMO (Fear Of Missing Out)** if they try to leave.

---

## Table of contents
- [1. Glossary (Sticky Language)](#1-glossary-sticky-language)
- [2. Contracts & responsibilities](#2-contracts--responsibilities)
- [3. Core user journeys](#3-core-user-journeys)
- [4. Registry pages (The Park Map)](#4-registry-pages-the-park-map)
- [5. Create flow (Build a Booth)](#5-create-flow-build-a-booth)
- [6. Lottery detail page (The Booth)](#6-lottery-detail-page-the-booth)
- [7. Claims center (Prize Counter)](#7-claims-center-prize-counter)
- [8. Admin (Safe only)](#8-admin-safe-only)
- [9. Events-driven UX](#9-events-driven-ux)
- [10. Error-to-copy mapping](#10-error-to-copy-mapping)
- [11. Hybrid Indexing Strategy](#11-hybrid-indexing-strategy)
- [12. Developer checklist](#12-developer-checklist)
- [13. Technical & Compliance Requirements](#13-technical--compliance-requirements)
- [14. "Fairground" Theme & Engagement Mechanics](#14-fairground-theme--engagement-mechanics)

---

## 1. Glossary (Sticky Language)

Replace passive text with active, emotional triggers:

- **Connect Wallet** → **"Join the Party!"**
- **Disconnect/Leave** → **"Exit Park (Are you sure?)"**
- **Buy Ticket** → **"Grab a Chance!"** or **"I'm In!"**
- **Pending Tx** → **"Drumrolling..."**
- **Success** → **"BOOM! You're in!"**
- **Winner** → **"LEGEND STATUS"**
- **Loser** → **"So Close! Try Again?"**
- **Dashboard** → **"My Pocket"** or **"Ticket Stubs"**
- **Pot/Jackpot** → **"The Treasure Chest"**

---

## 2. Contracts & responsibilities

### A) LotteryRegistry (Forever contract)
What it does:
- Stores every lottery address ever created.
- Helps the UI display all "Active Booths" in the park (Active = status is Open or Drawing).

### B) SingleWinnerDeployer (Factory)
What it does:
- Creates **single-winner** lotteries.
- **Fault Tolerance:** If the Registry is down, the lottery is still created (but emits a `RegistrationFailed` event).
- Registers new lottery addresses.

Admin-configured defaults (Safe only):
- USDC/Entropy/Fee settings for **future** lotteries.

### C) LotterySingleWinner (One instance = one game)
What it does:
- Stores settings for one game.
- **Randomness:** Uses Pyth Entropy.
- **Funds Management:** Uses pull-payments (`claimableFunds`) for security.
- **Security:** Checks token balance changes (**Nuclear CEI**) to prevent "Ghost Tickets". Reverts if balance delta doesn't match cost.

---

## 3. Core user journeys

### 3.1 Explore & join (Walking the Park)
1. User enters the site (The Park Map).
2. UI displays active lotteries as **Carnival Booths** or **Tents**.
3. User clicks a Booth to enter.
4. User buys tickets (approves USDC = "Inserts Token").

### 3.2 Create a lottery (Building a Booth)
1. Creator fills a simple form:
   - **Icon (Emoji)**
   - Name ("Booth Name")
   - Ticket price & Pot size
   - Deadline
2. UI checks creator USDC balance + allowance. Handle allowance flows cleanly. Show current allowance. Offer "Approve Exact" vs "Approve Max".
3. Call `createSingleWinnerLottery(...)`.
   - **Success Case:** "Booth Open for Business!"
   - **Edge Case (Registry Down):** "Booth Built but Hidden! Contact Admin to Map it." (See Section 5).

### 3.3 Draw winner (Spin the Drum)
- When the lottery is ready (deadline passed or sold out), the "Spin the Drum" button lights up.
- Ready if: `status == Open` && (`now >= deadline` || (`maxTickets > 0` && `sold >= maxTickets`)).
- **Pre-flight:** UI reads `entropy.getFee(provider)` live and checks user XTZ balance. Disable if balance < fee.
- Anyone can click it to trigger the Pyth randomness request. UI polls for `WinnerPicked` event AND checks `status()` + `winner()` via RPC to handle websocket hiccups.

### 3.4 Claim winnings (Prize Counter)
- Winner / creator / feeRecipient click "Collect Prize".
- Global "Prize Counter" page allows claiming from multiple lotteries at once. 
- **Note:** This is a **multi-tx sequence**. Prompt multiple signatures and explain this clearly.

---

## 4. Registry pages (The Park Map)

### 4.1 Explore page: “The Fairground”
**Visuals:**
- Instead of a list, a scrollable **2D Map** or **Grid of Tents**.
- **Big Tent:** High jackpot lotteries.
- **Small Stand:** Smaller/Newer lotteries.
- **Booth Icon:** Display the creator's chosen Emoji on top of the tent.
- **Lights Off:** Ended/Closed lotteries.

**Reads (LotteryRegistry):**
- `getAllLotteries(start, limit)`
- Per lottery: `typeIdOf`, `creatorOf`, `registeredAt`.

**Authenticity Badge:**
- Show a **"Verified Booth"** stamp (✅) if registered (`typeIdOf > 0`).
- Warning tape (⚠️) if user manually navigates to an unregistered address.

---

## 5. Create flow (Build a Booth)

### 5.1 Create page: Single Winner (TypeId = 1)

**Writes (SingleWinnerDeployer):**
- `createSingleWinnerLottery(...)`

**Form Inputs:**
1. **Booth Icon:** Simple Emoji Picker (e.g., 🚀, 🦄, 🎪, 💎).
2. **Booth Name:** Text input.
3. **Ticket Price:** USDC (6 decimals).
4. **Jackpot (Pot):** USDC (6 decimals).
5. **Duration:** Dropdown or Date Picker.

**Technical Handling of Emoji:**
- The contract `name` is a string.
- **Frontend Logic:** Prepend the chosen emoji to the name string before sending to the blockchain.
- *Example:* User picks "🚀" and types "Moon Base".
- *Tx Data:* `name = "🚀 Moon Base"`

**Logic for Minimum Purchase:**
- If `ticketPrice` < $1 (1.00 USDC):
  - Automatically calculate `minPurchaseAmount` so that `count * price >= 1.00 USDC`.
  - Helper text: *"For cheap tickets, players must buy a strip of X tickets at once to cover the booth cost."*

**UX copy:**
- Step 1: “Fill the Prize Chest (USDC)”
- Step 2: “Open Booth”

**Registry Failure Handling (Critical):**
- If the transaction succeeds but the Registry fails (caught by `try/catch` in contract):
- **UI Message:** "Booth created successfully! However, the Park Map (Registry) is momentarily down. Please save this address and contact support to have it listed."
- **Action:** Display the new Lottery Address clearly. Provide "Copy address" button, "Add to My Stubs" local storage, and deep link `/lottery/0x...`.

---

## 6. Lottery detail page (The Booth)

### 6.1 Reads to show (LotterySingleWinner)
Always show: `name` (this will contain the Emoji), `status`, `winningPot`, `ticketPrice`, `getSold()` (Total Tickets), `deadline`.

### 6.2 State mapping (Visuals)



`status()` enum:

- **FundingPending:** "Setting up the tent..." (Spinner)
- **Open:** "Open for Business!" (Marquee lights flashing)
- **Drawing:** "Drum is Spinning!" (Animation of spinning raffle drum)
- **Completed:** "We have a Winner!" (Confetti, spotlight on winner)
  - Show winner address. Show "You won / you didn't win". Show `claimableFunds[user]` and `claimableNative[user]`.
- **Canceled:** "Closed / Rained Out" (Dark tent, "Refunds Inside" sign)
  - Show "Generate Refund" (`claimTicketRefund`) then "Withdraw USDC" (`withdrawFunds`).

### 6.3 Buy tickets module (“Get Tickets”)

**Action:** `buyTickets(count)`
**Visual:**
- A **Ticket Roll** animation.
- Slider pulls a strip of tickets out.
- "Purchase" button tears the strip off.
- **Odds Display:** - Current odds: `userTickets / totalSold`
  - Post-purchase preview: `(userTickets + count) / (totalSold + count)`

### 6.4 Finalize module (“Spin the Drum”)

**Action:** `finalize()` (payable)
**Visual:**
- A big **Lever** or **Button**.
- Text: "Spin the Drum!" (only active if eligible).
- Fee note: "Requires a small coin (XTZ) to pay the oracle to spin."

### 6.5 Cancel / Emergency

**Actions:** `cancel()`, `forceCancelStuck()`
**Visual:**
- "Close Booth" (standard cancel).
- "Emergency Exit" (force cancel).
- Tooltip: "If the drum gets stuck (oracle down), use the emergency exit to recover funds."

---

## 7. Claims center (Prize Counter)

### 7.1 Concept
A dedicated "Prize Counter" booth where users go to collect earnings and refunds. Use `PrizeAllocated` event indexing to list all booths with pending collectables.

### 7.2 Best UX: “Collect All”
- Check both `claimableFunds` (USDC) and `claimableNative` (XTZ).
- If multiple claims exist, show a **"Collect All Loot"** button (triggers sequential txs). Clearly state "3 Prizes = 3 Signatures."

---

## 8. Admin (Safe only)

**Location:** "Park Office" (Hidden/Advanced section).
**Features:**
- **Registry Admin:** Manage authorized deployers.
- **Global Config:** Set fees for *new* booths.
- **Rescue Booth:** (Critical Ops Tool)
  - Input: Lottery Address + Creator Address.
  - Action: `rescueRegistration(...)`.
  - Use case: If a booth was built but didn't appear on the map.
- **Surplus Sweep:** "Lost & Found" box.
  - Calculate `Surplus = Balance - Reserved`.
  - Button: "Recover Lost Items" (`sweepSurplus`).

---

## 9. Events-driven UX

The UI should feel "live".
- `TicketsPurchased`: Animate new tickets flying into the pot.
- `LotteryFinalized`: Start the drum spinning animation immediately.
- `WinnerPicked`: Explosion of confetti.

---

## 10. Error-to-copy mapping (Friendly text)

- `LotteryNotOpen` → “Sorry, this booth is closed right now!”
- `LotteryExpired` → “Too late! The ride has started.”
- `BatchTooSmall` → “You need to tear off a bigger strip of tickets!”
- `BatchTooCheap` → “The coin slot only takes $1.00 or more! (Contract Limit)”
- `TicketLimitReached` → “Sold out! No more tickets left.”
- `RequestPending` → “ The drum is already spinning!”
- `InsufficientFee` → “You need a bit more XTZ to pay the Oracle fee.”
- `NotReadyToFinalize` → “Not time yet—come back when the booth closes or sells out.”
- `TooManyRanges` → “This booth is too crowded to accept new entries. Try another booth.”
- `UnexpectedTransferAmount` → “Whoops! The coin slot jammed (Token Transfer Error). Try again. (Nuclear CEI check)”
- `AccountingMismatch` → “Something is wrong at the counter. Contact support.”
- `Pausable: paused` → “The park is taking a short break.”

---

## 11. Hybrid Indexing Strategy

To fully power the UX, index the following events:
- **LotteryDeployed (Deployer):** metadata + address discovery.
- **RegistrationFailed (Deployer):** "hidden booths" + admin alerts.
- **TicketsPurchased (Lottery):** for "My Ticket Stubs."
- **WinnerPicked (Lottery):** for winner history.
- **LotteryCanceled (Lottery):** for refund prompts.
- **PrizeAllocated (Lottery):** to build the "claimables" list and show "You have funds to collect" per booth.

Local fallback: Store interacted lottery addresses in localStorage.

---

## 12. Developer checklist

### LotteryRegistry
- [ ] `getAllLotteriesCount`
- [ ] `getAllLotteries(start, limit)`
- [ ] `typeIdOf(lottery)`, `creatorOf`, `registeredAt`
- [ ] Events: `LotteryRegistered`

### SingleWinnerDeployer
- [ ] `createSingleWinnerLottery` (create flow)
- [ ] Frontend: Emoji Picker component + string concatenation logic.
- [ ] Reads: `usdc`, `entropy`, `entropyProvider`, `feeRecipient`, `protocolFeePercent`
- [ ] Events: `LotteryDeployed` (with rich metadata) AND `RegistrationFailed`.

### LotterySingleWinner
- [ ] Reads: all public fields + `getSold` + `ticketRanges` (only for winner proof visualization).
- [ ] Handle `UnexpectedTransferAmount` errors gracefully.
- [ ] Buy: `buyTickets` (with Balance Delta check).
- [ ] Finalize: `finalize`. Proactively check user XTZ balance vs Pyth fee.
- [ ] Poll both `WinnerPicked` event AND contract `status()` during Draw phase.
- [ ] Two-step refund logic for Canceled status: `claimTicketRefund` → `withdrawFunds`.
- [ ] Claims: `withdrawFunds`, `withdrawNative`
- [ ] Admin: `sweepSurplus`, `pause`
- [ ] Events: `TicketsPurchased`, `WinnerPicked`, `PrizeAllocated`, `LotteryCanceled`

---

## 13. Technical & Compliance Requirements (Critical)

### 13.1 Network Enforcement (Etherlink Mainnet)
- **Chain ID:** `42793`
- If wrong network: Button becomes **"Switch to Etherlink"**.

### 13.2 Contract Addresses
* **Pyth Entropy:** `0x2880aB155794e7179c9eE2e38200202908C17B43`
* **Pyth Provider:** `0x52DeaA1c84233F7bb8C8A45baeDE41091c616506`
* **USDC:** `0x796Ea11Fa2dD751eD01b53C372fFDB4AAa8f00F9`

### 13.3 Terms of Service (TOS) Gate
- Mandatory checkbox on Create & Buy actions.

### 13.4 "Max Tickets" Race Condition
- Cap user input at `maxTickets - sold`.
- **Hard Cap Safety:** Ensure UI never allows `newTotal > 10,000,000` (`HARD_CAP_TICKETS`).

### 13.5 Data Formatting
- USDC = 6 decimals.
- XTZ = 18 decimals.
- Winner Index Display: Add 1 (0-based → 1-based) for display.

### 13.6 Global Disclaimer Gate
- **Trigger:** First visit. Blocking Modal.
- **Ticker Policy:** Real on-chain events only. No fake social proof.
- **Near-miss Policy:** Never show or imply "close" outcomes based on ticket numbers. Keep it purely thematic: "What a ride! Try again?"

---

## 14. "Fairground" Theme & Engagement Mechanics

### 14.1 Visual Style
- **Vibe:** Nostalgic Carnival / Ppopgi / Kermesse.
- **Colors:** Candy Red, Striped White, Popcorn Yellow, Night Sky Blue.
- **Fonts (Google Fonts):**
  - **Headings:** [Rye](https://fonts.google.com/specimen/Rye) (Vintage Circus feel).
  - **Body:** [Roboto Slab](https://fonts.google.com/specimen/Roboto+Slab) (Clean but serif).

### 14.2 Interactive Elements (Skeuomorphism)
- **The Pot:** A transparent **Raffle Drum** or **Treasure Chest** that visibly fills up as people buy tickets (`getSold`).
- **The Ticket:** Digital ticket stubs that look like paper (perforated edges).
- **The Lights:** Marquee bulbs that blink to show status (Green = Open, Red = Closed).

### 14.3 Audio Cues (Subtle but Fun)
- **Purchase:** *Paper tearing sound + Cash register "Cha-ching!"*
- **Spinning:** *Drum roll sound.*
- **Win:** *Trumpet fanfare + Confetti pop.*
- **Hover:** *Wood block click.*

### 14.4 "Loading" States
- Never use a generic spinner.
- Use: A popcorn machine popping, or a juggler juggling balls.
- Text: "Heating up...", "Printing Ticket...", "Counting Coins..."

### 14.5 Navigation Icons (The Park Signs)
- **Home:** 🎪 (Tent)
- **Create:** 🏗️ (Crane/Construction)
- **My Stubs:** 🎟️ (Ticket)
- **Prize Counter:** 🎁 (Gift/Trophy)

### 14.6 Engagement Mechanics (The "Sticky" Factor) **[NEW]**

The UI must implement these specific "Hooks" to keep users engaged:

#### A. The "Exit Intent" Modal (Don't Let Them Go)
**Trigger:** If the user moves their mouse to close the tab or clicks "Disconnect Wallet".
**Visual:** A sad mascot (the Popcorn box crying or dropping kernels).
**Copy:**
> **"Leaving so soon?"**
> "The next winner could be YOU. Are you sure you want to walk away from the jackpot?"
> **[ Stay and Play ]** (Big, Colorful Button)
> **[ I hate fun ]** (Small, Grey Link)

#### B. The "Sunk Cost" Display (Endowment Effect)
**Trigger:** On the "My Stubs" or Dashboard page.
**Visual:** Instead of "Total Spent: 50 USDC", show "Total Value Collected".
**Copy:**
> "You have **5 Active Tickets** working for you right now!" (Active = in lotteries with status Open or Drawing).
> "Don't let them get lonely. **[ Add One More ]**"

#### C. The "Near Miss" Polish (The Gambler's Hook)
**Trigger:** When a user checks a completed lottery and *lost*.
**Visual:** Do NOT just say "You Lost."
**Animation:** Show the winning ticket number rolling... stopping... 
**Copy:**
> **"Oooooh! So close!"**
> "That was a nail-biter. Luck changes fast... try the next booth?"
> **[ Spin Again ]**

#### D. The "Social Proof" Ticker
**Trigger:** Top of the screen (Marquee).
**Behavior:** Real-time ticker of recent actions (real on-chain events only).
**Copy:**
> "User...456 just won **500 USDC**!"
> "User...789 just bought **10 Tickets**!"
> "The **Moon Booth** is heating up! 🔥"

#### E. The "Popcorn" Reward (Micro-Feedback)
**Trigger:** ANY interaction (Clicking a button, copying an address, switching pages).
**Visual:** A tiny burst of popcorn particles explodes from the cursor.
**Sound:** A satisfying "Pop!" sound (low volume, non-intrusive).
**Why:** It makes simply *clicking around* feel fun and tactile, like popping bubble wrap.
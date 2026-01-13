# Ppopgi (뽑기) — Frontend UX & Product Specification
**Version:** Final UX Gold
**Audience:** UI/UX designers, frontend developers
**Network:** Etherlink (Tezos L2)
**Tone:** Friendly, safe, playful, non-technical
**Core Rule:** *Never make users feel like they are gambling or dealing with blockchain*

---

## 1. Product Vision

**Ppopgi (뽑기)** is a friendly, playful raffle platform inspired by:
- Korean childhood games
- Amusement parks
- Festival energy
- Soft pastel aesthetics

The experience must feel:
- Safe
- Welcoming
- Easy for **non-technical users**
- Familiar to **older users**
- Engaging (but never aggressive or casino-like)

There must be **zero technical wording** visible to users.

---

## 2. Global Design Rules (Non-Negotiable)

### 2.1 Same Design Everywhere
- Every page uses:
  - The **same illustrated background**
  - The **same color palette**
  - The **same typography**
- Pages feel like different areas of the *same place*, not different websites.

### 2.2 Background Handling
- One global illustrated background (Korean amusement-park inspired).
- Loaded once, reused everywhere.
- Slight white / pastel overlay to ensure readability.
- Background must **never scroll independently** (no parallax).

### 2.3 Performance
- No heavy animations.
- No background videos.
- Minimal micro-interactions only.
- Smooth scrolling only.

---

## 3. Sticky Language (Never Use Technical Terms)

| Technical | User-facing wording |
|---------|----------------------|
| Wallet | Pocket |
| Connect wallet | Join the party |
| Disconnect | Leave the park |
| Transaction pending | Getting things ready… |
| Success | You’re in! |
| Token | Coins |
| Gas fee | Energy |
| Claim funds | Collect |
| Lottery | Raffle |
| Buy tickets | Play |
| Finalize | Draw |
| Contract error | Something went wrong |

---

## 4. Global Top Bar (All Pages)

### Elements (left → right)

1. **Ppopgi logo**
   - Top-left corner
   - Small, subtle
   - Always visible
   - Click → Home

2. **Navigation**
   - Explore
   - Create

3. **Balances**
   - 🟡 Entry Coins (USDC)
   - 🔵 Energy Coins (XTZ)
   - Always visible after connection

4. **Coin Cashier Button**
   - Text: **“Coin Cashier”**
   - Icon: small shop / cashier
   - Opens a modal (see section 5)

5. **Profile / Leave**
   - “Leave the park” button
   - Friendly confirmation modal

---

## 5. Coin Cashier (Critical UX Element)

### Purpose
Explain **why two coins are needed**, without mentioning blockchain.

### Cashier Modal Content
Friendly explanation:

> **Welcome to the Coin Cashier 🏪** >  
> 🎟 **Entry Coins** let you play raffles  
> ⚡ **Energy Coins** help the park run smoothly  
>  
> If you’re missing coins, you can get them safely from our trusted partner.

### Actions
- “Get Entry Coins (USDC)”
- “Get Energy Coins (XTZ)”
- External redirect (e.g. Transak)
- No forced action

---

## 6. Mandatory Disclaimer (First Visit Only)

### Display
- Full-screen modal on first visit
- Blocks the site until accepted

### Copy (Friendly but Clear)
> **Before you enter 🎟️** >  
> Ppopgi is an experimental platform.  
> The system has been carefully reviewed and tested, but it has **not been officially audited**.  
>  
> Please only play with what you’re comfortable with.

Checkbox:
- “I understand and wish to continue”

Stored locally per device + wallet.

---

## 7. Live Activity Banner (Global, Always Visible)

### Placement
- Top-center
- Wide banner
- Cannot be hidden

### Content Rules
- Most recent event on top
- Timestamp on every line
- Real events only

### Event Types (Max 3 visible at once)
- 👋 “Welcome back, Player 1234!”
- 🎉 “Someone just won $500”
- 🎟 “A new raffle opened”
- 🌙 “A raffle ended without enough entries”

### Session Welcome Message Rules
- The welcome message is **UI-only** (not on-chain).
- Shown when a wallet connects or a connected wallet is detected on first load.
- Shown **once per session** (not on every refresh).
- Uses `sessionStorage` to avoid repeats.
- May reappear if the account changes.

---

## 8. Home Page

### Sections (Top → Bottom)

#### 8.1 Biggest Winning Pots
- Shows raffles with highest prizes
- Sorted descending by prize
- Uses **raffle ticket cards**

#### 8.2 Expiring Soon
- Shows raffles ending soonest
- **Exact countdown timer required** (no “ending soon” text)

#### 8.3 View All Raffles
- Button at bottom
- Leads to full list page

---

## 9. Raffle Cards (Final Design)

### Card Shape
- Pastel pink **raffle ticket**
- Soft borders
- Slight texture
- **No images**
- No thumbnails
- No decorative pictures inside cards

### Card Content (Required)
- Raffle name
- Prize amount
- Ticket price
- Tickets sold:
  - If `maxTickets > 0`: `sold / max`
  - If `maxTickets == 0`: show `sold` only
- Progress:
  - If `maxTickets > 0`: show progress bar
  - If `maxTickets == 0`: show “Minimum reached / not reached” based on `minTickets`
- **Exact time remaining** (countdown)
- Primary CTA button: **Play**

### Why no images?
- Keeps layout clean
- Scales to hundreds of raffles
- Avoids visual overload

---

## 10. All Raffles Page

### Purpose
Full transparency and discoverability.

### Features
- Same raffle cards as home
- Pagination or infinite scroll

### Sorting (Required)
User can sort by:
- Winning pot (asc / desc)
- Ticket price (asc / desc)
- Expiration time (asc / desc)

Sorting control must be visible and simple.

---

## 11. Raffle Detail Page

### Content
- Raffle name
- Prize
- Ticket price
- Tickets sold
- Progress bar (if applicable)
- Minimum ticket status (if no max)
- Countdown timer
- Status visuals:
  - Open
  - Drawing
  - Completed
  - Canceled

### Actions (contextual)
- Play (buy tickets)
- Draw (when eligible)
- Collect (if claimable)
- Refund flow (if canceled)

---

## 12. User Dashboard (“My Pocket”)

### Sections
- Active raffles played
- Tickets owned
- Pending collections
- Raffles created

### Tone
Encouraging, calm, informative.

---

## 13. Create Raffle Page

### Visual Style
- Same background
- Simple step-by-step form

### Inputs
- Raffle name
- Ticket price
- Prize
- Duration
- Optional limits (min/max tickets, min purchase amount)

### Language
Never mention:
- Smart contracts
- Deploy
- Gas
- Blockchain

---

## 14. Admin / Owner Dashboard

### Visibility
- Hidden unless authorized

### Features
- Configuration
- Rescue tools
- Emergency actions

### Design
Same theme, same background, no “enterprise admin” look.

---

## 15. Accessibility

- High contrast text
- Large buttons
- Clear spacing
- No fast flashing
- No sound by default

---

## 16. Emotional Guardrails

- No casino language
- No pressure
- No fake urgency
- No “almost won” manipulation
- Always respectful and calm

---

## 17. Final UX Promise

A user should feel:

> “This is easy, friendly, and safe — I understand what’s happening.”

If anything feels confusing, flashy, or stressful — it’s wrong.

---
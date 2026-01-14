# Ppopgi Frontend — Plain Language & Visual Style Guide

This document defines two non-negotiable frontend principles:

1) **No technical jargon**: the UI must use words that any non-crypto user understands.  
2) **Pastel + transparent UI**: the background artwork is the star; the UI must stay light, airy, and readable.

---

## 1) Plain-Language Rule (No Technical Terms)

### 1.1 Core rule
The UI must avoid technical words such as:
- wallet, address, RPC, chain, network, contract, transaction, gas, block, token, EVM, L2, bridge, approve

If something technical must happen, we still present it in human terms and keep the explanation simple.

### 1.2 UI wording: approved vocabulary

Use these user-friendly terms instead:

| Technical concept | UI term to use |
|---|---|
| Wallet connect | **Sign in** / **Connect** |
| Wallet address | **Your account** |
| Network / chain | **Where you play** / (usually hidden) |
| Transaction | **Confirm** / **Complete** |
| Gas fee | **Energy cost** |
| Native token (XTZ) | **Energy coins (XTZ)** |
| USDC | **Coins (USDC)** |
| Approve | **Allow** / **Unlock coins for this raffle** |
| Smart contract | (never mention) |
| Bridge | **Move coins to Etherlink** / **Bring coins in** |
| Explorer | (not a user concept) (keep in admin only) |

### 1.3 Microcopy guidelines
- Write at a ~10–12 year old reading level.
- Prefer short sentences.
- Always tell the user what happens next in one line.
- Avoid acronyms unless they’re the currency symbols (XTZ, USDC).

### 1.4 Example copy
**Instead of:** “Insufficient gas.”  
**Use:** “Not enough energy coins (XTZ) to complete this.”

**Instead of:** “Approve USDC spending.”  
**Use:** “Allow Ppopgi to use your coins (USDC) for tickets.”

**Instead of:** “Transaction pending.”  
**Use:** “We’re confirming your entry…”

---

## 2) Visual Style Guide (Pastel + Transparent)

### 2.1 Design goals
- Make the UI feel like a **spring festival / raffle booth**.
- Use **pastel pinks, peach, lavender, sky blue**.
- Keep sections **transparent** so the background remains visible.
- Maintain readability using blur + soft borders rather than opaque blocks.

### 2.2 Recommended palette (inspired by your background)
Use these as starting points (adjust slightly if needed for contrast):

- **Sakura Pink**: `#F6B6C8`
- **Peach Glow**: `#FAD1B8`
- **Lavender Mist**: `#CBB7F6`
- **Sky Pastel**: `#A9D4FF`
- **Warm Lantern**: `#FFD89A`
- **Soft Cream (text on dark)**: `#FFF6EF`
- **Ink (text)**: `#2B2B33`

### 2.3 Transparency system
All containers should use “glass” styling:

- Background: `rgba(255, 255, 255, 0.18)` to `0.28`
- Border: `rgba(255, 255, 255, 0.35)`
- Backdrop blur: `10px–16px` (enough to read text, not enough to hide the background)
- Shadow: very soft (no harsh black)

### 2.4 Card style (pink raffle ticket)
Lottery cards should feel like a raffle ticket:
- Rounded corners + subtle “ticket notch” effect (optional)
- Pink gradient wash
- A faint dashed line divider for “tear line”
- Small “stamp” badge for status

**Must include transparency** so the background still shows through.

---

## 3) Layout Behavior: Stay on Home, Use Modals

### 3.1 Navigation rule
- The user should **stay on the homepage** for almost everything.
- The only true page navigation is **Explore**.
- Everything else opens as a modal:
  - Lottery details & entry
  - Create raffle
  - Cashier help
  - Admin panel
  - Share dialogs
  - “Success” confirmations

### 3.2 Modal style
Modals should match the glass style:
- translucent panel
- blurred background behind modal
- large close button
- strong, friendly headings

---

## 4) Homepage Sections (Transparent Panels)

Homepage has two **transparent sections**:

### 4.1 “Big Prizes” section
- Show **3 biggest active raffles** by prize size
- Title: **“Big prizes right now”**
- Subtitle: “The biggest rewards you can win today.”

### 4.2 “Ending Soon” section
- Show **5 raffles ending soon**
- Title: **“Ending soon”**
- Subtitle: “Last chance to join.”

Each section uses a semi-transparent container so the background remains visible.

---

## 5) Top Menu Content (Friendly Labels)

### Left
- Logo

### Center
- **Explore**
- **Create**

### Right
- **Cashier** (opens “How to get energy + coins”)
- **Sign in** (connect)
- After sign-in:
  - “Energy: XTZ …”
  - “Coins: USDC …”
  - (Optional) Show a small “refresh” icon

### Conditional
- **Admin** only if the connected account is the owner

---

## 6) Disclaimer Gate (First Visit)

Before the app shows, display a full-screen modal:

- Title: **“Before you play”**
- Bullets (simple):
  - “This is an experimental app.”
  - “You’re responsible for your choices.”
  - “Only play with money you can afford to lose.”
- Button: **“I understand — let’s go”**

Store acceptance locally so it doesn’t reappear every time.

---

## 7) Share UX (Everywhere)

### 7.1 Lottery card share button
Each lottery card includes **Share**:
- Copy link
- Share to common platforms

### 7.2 Post-create share prompt
After a successful create:
- “Your raffle is live 🎉”
- “Want to share it?”
- Buttons: Copy link / Share

---

## 8) “Extreme Clarity” Lottery Card Content

Lottery cards must be transparent about costs and fees using simple words.

**Required fields**
- Name
- Prize: “Win: 10,000 USDC”
- Ticket price: “Ticket: 5 USDC”
- Time left: “Ends in 2h 14m”
- Spots: “123 joined” (and “Max: 500” if relevant)

**Fees (simple)**
- “Ppopgi fee: 10%”
- “Creator keeps: …”
- “Winner gets: …”

Never label anything as “protocol fee” or “feeRecipient”.

---

## 9) Accessibility and readability requirements
Because the background is detailed:
- Always enforce minimum contrast for text (use dark text on light glass panels)
- Use larger type for headings
- Avoid tiny gray text
- Add a subtle blur behind all text regions that sit on the background

---

## 10) Summary
The frontend should feel like:
- a spring festival
- friendly and human
- minimal navigation (modal-first)
- fully transparent about costs
- visually light so the background shines
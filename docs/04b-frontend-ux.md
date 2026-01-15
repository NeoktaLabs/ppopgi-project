# Ppopgi (뽑기) — Frontend UX Philosophy & Guarantees (Revised with Indexer + Finalizer Bot + Fallback)

## 1. Purpose of this document

This document explains **how the Ppopgi frontend behaves from a user’s perspective** and what guarantees it intentionally provides (and does not provide).

The goal is to:
- reassure users without overselling
- explain design decisions in plain language
- make the experience understandable even for non-technical users

This document focuses on **experience and expectations**, not technical implementation details.

---

## 2. Core UX philosophy

Ppopgi is designed to feel:
- calm
- friendly
- transparent
- non-exploitative

It intentionally avoids:
- casino aesthetics
- artificial urgency
- manipulative countdowns
- dark patterns or pressure loops

Randomness, time, and outcomes are treated as **facts**, not excitement generators.

---

## 2b. Fast UX, honest truth (Indexer + Bot + Fallback model)

Ppopgi uses helpers to improve experience, **without creating dependencies**:
- an **indexer** (for fast browsing and history)
- a **finalizer bot** (to keep raffles moving)
- an **automatic on-chain fallback** (to stay operational if helpers fail)

None of these are trusted authorities.

- The **indexer** makes lists and history fast  
- The **bot** helps expired or sold-out raffles progress automatically  
- The **fallback** ensures the app still works even if the indexer is unavailable  

In all cases:
- **on-chain state is the source of truth**
- **users can always act manually**
- **the app never controls outcomes**

If helpers fail, lag, or are offline, the system still works.

---

## 2c. Automatic fallback guarantee (indexer failure)

The frontend is designed to **never depend on the indexer for availability**.

If the indexer:
- is unreachable
- returns errors
- appears stale or inconsistent

the frontend will:
- **automatically fall back to direct on-chain reads**
- reduce features to what can be safely shown via RPC
- continue to allow all core actions (viewing raffles, buying tickets, finalizing, claiming)

This may result in:
- slower loading
- reduced filtering or sorting
- simpler list views

But it will **never block participation**.

This fallback is automatic and does not require user intervention.

---

## 3. Practical UX rules for Etherlink participation

The frontend should proactively prevent the most common “I’m stuck” moments.

### 3.1 Token prerequisites

To participate, users need:
- **XTZ on Etherlink**
  - for energy costs
  - for the randomness fee when finalizing
- **USDC on Etherlink**
  - to buy raffle tickets

If either is missing, the UI should:
- show a clear inline explanation
- explain *why* the token is needed
- link to acquisition instructions
- avoid letting the user proceed blindly

---

### 3.2 Ticket purchase minimum (anti-spam rule)

The raffle contract enforces a minimum total purchase of **1 USDC** when the buyer is **not extending the latest ticket range**.

This is a technical rule, but it has UX implications.

The frontend should:
- surface this rule before confirmation
- phrase it in user-friendly language
- prevent confusing failures caused by very small purchases

---

### 3.3 Finalization requires a small native fee

When a raffle is ready to draw, finalization requires:
- a small payment in native token
- used exclusively to pay the randomness provider

The UI should:
- label this as a “randomness fee” or “network randomness cost”
- explain that this fee is **not kept by the app**
- clarify that any overpayment is refunded automatically **when possible**

If an automatic refund cannot be delivered,
the refundable amount becomes claimable and can be withdrawn manually.

**Clarification**  
Calling “Finalize” does not immediately pick a winner.  
It requests randomness and moves the raffle into a drawing state.  
Winner selection occurs later when the randomness result is delivered.

---

## 4. Honest state representation

The frontend must never misrepresent the raffle state.

It should:
- clearly distinguish between **Open**, **Drawing**, **Settled**, and **Cancelled**
- avoid implying outcomes before they are finalized
- avoid celebratory visuals before results are known

If a raffle is waiting on randomness, the UI should say so explicitly.

---

### 4.1 Where state comes from (indexer, fallback, on-chain)

To keep the app fast and reliable:
- the **indexer** provides initial state for lists and history
- the **fallback** activates automatically if the indexer is unavailable
- the **raffle detail view always confirms critical state on-chain**

This means:
- a raffle may briefly look “Open” or “Drawing” while data refreshes
- before any action, the frontend verifies the on-chain state

If indexer data, fallback data, and on-chain data differ,  
**on-chain data always wins**.

---

### Winner display (transparency)

Once a raffle is **Settled**, the UI should clearly display the winner on:
- the raffle details view
- raffle cards in past / expired views

This should be presented as factual state:
- truncated account (e.g. `0xABCD…1234`)
- prize amount
- proof link when possible

The UI must not imply a winner exists before settlement.

---

### Progressive transparency (avoiding overload)

Transparency is provided through **progressive disclosure**.

The frontend should:
- keep raffle cards simple
- show key facts first
- expose deeper details via expandable sections or modals

Advanced details should be:
- hidden by default
- clearly labeled (e.g. “Safety info”, “How this works”)
- accessible without friction

---

## 4b. Safety & Proof layer (trust without intimidation)

Each raffle detail view includes a **clearly visible trust entry point**
(e.g. a shield icon labeled “Safety info”).

This opens a **compact “Safety & Proof” modal**.

This modal exists to show that:
- nothing is hidden
- nothing is controlled off-chain
- outcomes are verifiable facts

---

### What the Safety & Proof modal should show

#### A. “Who gets what”
A simple breakdown:
- **Winner gets:** X USDC  
- **Creator gets:** Y USDC (from ticket sales)  
- **Ppopgi fee:** Z USDC (N%)
- **Fee receiver:** `0xABCD…1234`

Include:
> “These values are set on-chain and cannot be changed by the app.”

For open raffles:
- label creator earnings as **“so far”**

---

#### B. “How the draw works”
Explained calmly:
- When the raffle is finished (time ended **or sold out**), anyone can request the draw.
- A randomness service is asked for a random number.
- A winner is picked only after randomness arrives.

Show factual details:
- randomness provider
- randomness system
- request ID (only during drawing)
- current state

**Liveness note:**
- If randomness does not return, the raffle can be canceled through an on-chain recovery path.

---

#### C. “Automatic finalization (helper bot)”

- A helper bot may finalize raffles automatically to keep things moving.
- The bot has **no special permissions**.
- It only performs actions that any user can do manually.
- If the bot is offline, users can still finalize themselves.

Suggested copy:
> “This raffle may be finalized automatically.  
> The bot cannot choose winners or move funds.”

---

#### D. “What the app cannot do”
- The app cannot pick the winner.
- The app cannot change raffle rules after creation.
- The app cannot change fees after creation.
- The app cannot take prizes or refunds once they are owed.
- Anyone can finalize a raffle — it does not depend on one operator.

Clarify admin limits:
- A designated safety owner can pause raffles and sweep **only extra deposits**, never owed funds.

---

#### E. Verification links
Buttons such as:
- “View raffle proof”
- “View randomness proof”
- “View fee receiver proof”

These open proof views without technical intimidation.

---

## 5. Network mismatch UX (wrong chain)

If the user is connected to the wrong network:
- actions are blocked calmly
- the UI explains the raffle exists on **Etherlink**
- the user is guided to switch

This is treated as configuration, not error.

---

## 6. Approval & multi-step action UX

Some actions require multiple steps.

The frontend should:
- explain why a step is needed
- separate “Allow” from the final action
- show progress clearly

Multi-step flows should feel intentional and safe.

---

## 7. Finalization UX (with bot and fallback)

Users should understand that:
- anyone can finalize a raffle
- finalization is normal and permissionless
- a helper bot may finalize automatically
- the raffle does not depend on the bot or the indexer

If the raffle is eligible:
- show a clear “Finalize” action
- show the cost
- allow manual finalization even if automation exists

Because of indexer lag or fallback mode:
- the finalize button must always be gated by **on-chain checks at click time**

---

## 8. Claims & withdrawals UX

Claiming funds should feel:
- safe
- explicit
- predictable

The frontend should:
- show exactly what the user can claim (on-chain)
- distinguish prize vs refund
- explain why a claim exists
- avoid auto-claiming

Claims are:
- pull-based
- user-initiated
- idempotent

**Refund clarification**  
If a raffle is cancelled, ticket refunds must be explicitly claimed  
before withdrawal.

---

## 8b. Sharing & invitations UX

Sharing is an **invitation**, not a call to action.

Sharing should:
- feel optional
- use neutral language
- reflect only on-chain facts

---

## 9. Errors, reverts, and failure states

Errors are part of the experience.

The UI should:
- catch common failures early
- show human explanations
- avoid vague errors

For helper or indexer issues:
- “This list may be slightly behind.”
- “We’re loading directly from the network.”
- provide refresh and proof options

---

## 10. What the frontend does NOT guarantee

The frontend does **not** guarantee:
- that a raffle will sell enough tickets
- that randomness returns instantly
- that automation always runs
- that the indexer is always available
- that energy costs are stable
- that users will win

It guarantees only:
- honest representation
- automatic fallback to on-chain data
- on-chain verification for important actions
- no hidden behavior

---

## 11. Replaceability is a feature

The frontend is replaceable.

Anyone can:
- build another UI
- interact directly with contracts
- finalize raffles manually

This is intentional and protective.

---

## Final note

Ppopgi’s UX is intentionally restrained.

It prioritizes:
- trust over excitement
- clarity over persuasion
- user agency over engagement

If something feels calm instead of thrilling,  
that is a deliberate choice.
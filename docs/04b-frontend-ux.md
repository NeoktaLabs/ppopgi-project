# Ppopgi (뽑기) — Frontend UX Philosophy & Guarantees

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
- link to bridging or acquisition instructions
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

If an automatic refund cannot be delivered (for example, if the caller cannot receive native token),
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

### Winner display (transparency)

Once a raffle is **Settled**, the UI should clearly display the winner on:
- the raffle details view
- raffle cards in “past” / “expired” browsing views

This should be presented as factual state, not celebration:
- show a truncated address (e.g. `0xABCD…1234`)
- show the prize amount
- provide a link to view the result on-chain when possible

The UI must not imply a winner exists before settlement.

---

### Progressive transparency (avoiding overload)

Transparency should be provided through **progressive disclosure**.

The frontend should:
- keep raffle cards visually simple by default
- surface only the most relevant information inline
- expose detailed on-chain configuration via expandable sections or modals

Advanced or rarely needed fields should be:
- hidden by default
- clearly labeled (e.g. “Safety info”, “How this works”, “On-chain details”)
- accessible without friction

This ensures transparency without overwhelming users.

---

## 4b. Safety & Proof layer (trust without intimidation)

To help users feel safe — especially around the draw — each raffle detail view must include a **small, clearly visible trust entry point** (for example, a shield icon labeled “Safety info”).

Clicking this opens a **compact “Safety & Proof” modal**.

This modal exists to show that:
- nothing is hidden
- nothing is controlled off-chain
- outcomes are verifiable facts, not promises

### What the Safety & Proof modal should show

#### A. “Who gets what”
A simple breakdown in plain language:
- **Winner gets:** X USDC  
- **Creator gets:** Y USDC  
- **Ppopgi fee:** Z USDC (N%)
- **Fee receiver (on-chain):** `0xABCD…1234` (copyable)

This section should explicitly state:
> “These values are set on-chain and cannot be changed by the app.”

---

#### B. “How the draw works”
Explained calmly and factually:
- When the raffle ends, anyone can request the draw.
- The app asks an independent randomness provider for a random number.
- A winner is picked only after that randomness arrives.

Then show the real on-chain facts:
- **Randomness provider (on-chain):** address
- **Randomness contract:** address
- **Request ID:** visible only when a draw is in progress
- **Current draw state:** Open / Drawing / Settled / Cancelled

---

#### C. “What the app cannot do”
A short reassurance list:
- The app cannot pick the winner.
- The app cannot change fees.
- The app cannot redirect funds.
- Anyone can finalize a raffle — it does not depend on one operator.

---

#### D. On-chain verification links
Buttons such as:
- “View raffle on-chain”
- “View randomness provider”
- “View fee receiver”

These should link to a block explorer, without over-emphasizing technical terms.

---

## 5. Network mismatch UX (wrong chain)

If the user is connected to the wrong network:

- the UI should block actions calmly
- explain that the raffle exists on **Etherlink**
- guide the user to switch networks without alarmist language

The UI should treat this as a configuration issue, not an error.

---

## 6. Approval & multi-step action UX

Some actions require multiple steps (for example, allowing coins, then buying tickets).

The frontend should:
- explain when a preliminary step is required
- clearly separate “Allow” from the final action
- show progress across steps without implying failure

Multi-step flows should feel intentional and safe,  
not like something went wrong.

---

## 7. Finalization UX

Although a background bot exists, users should understand that:

- anyone can finalize a raffle
- finalization is normal and permissionless
- the raffle does not depend on a single operator

If the raffle is eligible for finalization:
- the UI should show a clear “Finalize” action
- the cost should be visible
- fallback instructions should exist if automation fails

If randomness does not return, the raffle may remain in a drawing state  
until an on-chain recovery path is used. The UI should reflect this honestly.

---

## 8. Claims & withdrawals UX

Claiming funds should feel:
- safe
- explicit
- predictable

The frontend should:
- show exactly what the user can claim
- distinguish between prize, refund, and fee
- explain why a claim is available or unavailable
- avoid auto-claiming on the user’s behalf

Claims should always be:
- pull-based
- user-initiated
- idempotent

**Refund clarification**  
If a raffle is cancelled, ticket refunds must be explicitly claimed  
by the user before withdrawal. Refunds are never pushed automatically.

---

## 8b. Sharing & invitations UX

Sharing a raffle is treated as an **invitation**, not a call to action.

The frontend may offer sharing options:
- after a raffle is created
- on individual raffle views

Sharing should feel:
- optional
- neutral
- pressure-free

Shared content should:
- describe what the raffle *is*, not what it *promises*
- use neutral language such as “View raffle” or “Join if interested”
- reflect only on-chain facts

---

## 9. Errors, reverts, and failure states

Errors should be treated as part of the experience, not as edge cases.

The UI should:
- catch common failures locally when possible
- display human-readable explanations
- avoid generic “something went wrong” messages

If something cannot be explained clearly,  
the UI should say what is known and what is not.

---

## 10. What the frontend does NOT guarantee

The frontend does **not** guarantee:
- that a raffle will sell enough tickets
- that randomness returns instantly
- that energy costs are cheap or stable
- that users will win

It guarantees only:
- honest representation
- accurate data
- no hidden behavior

---

## 11. Replaceability is a feature

The frontend is designed to be replaceable.

Anyone can:
- build an alternative UI
- interact directly with the contracts
- finalize raffles without permission

This is not a limitation — it is a safety feature.

---

## Final note

Ppopgi’s UX is intentionally restrained.

It prioritizes:
- trust over excitement
- clarity over persuasion
- user agency over engagement

If something feels calm instead of thrilling,  
that is a deliberate choice.
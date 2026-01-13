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
  - for gas
  - for the randomness (Entropy) fee when finalizing
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
- surface this rule before transaction submission
- phrase it in user-friendly language
- prevent confusing reverts caused by small purchases

---

### 3.3 Finalization requires a small native fee

When a raffle is ready to draw, finalization requires:
- a small payment in native token
- used exclusively to pay the randomness provider

The UI should:
- label this as a “network randomness fee” (or similar)
- explain that this fee is not kept by the app
- clarify that any overpayment is refunded automatically

---

## 4. Honest state representation

The frontend must never misrepresent the raffle state.

It should:
- clearly distinguish between **Open**, **Drawing**, **Settled**, and **Cancelled**
- avoid implying outcomes before they are finalized
- avoid celebratory visuals before results are known

If a raffle is waiting on randomness, the UI should say so explicitly.

---

## 5. Finalization UX

Although a background bot exists, users should understand that:

- anyone can finalize a raffle
- finalization is a normal, permissionless action
- the raffle does not depend on a single operator

If the raffle is eligible for finalization:
- the UI should show a clear “Finalize” action
- the cost (entropy fee) should be visible
- fallback instructions should exist if automation fails

---

## 6. Claims & withdrawals UX

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

---

## 7. Errors, reverts, and failure states

Errors should be treated as part of the experience, not as edge cases.

The UI should:
- catch common reverts locally when possible
- display human-readable explanations
- avoid generic “transaction failed” messages

If something cannot be explained clearly,  
the UI should say what is known and what is not.

---

## 8. What the frontend does NOT guarantee

The frontend does **not** guarantee:
- that a raffle will sell enough tickets
- that randomness returns instantly
- that gas fees are cheap or stable
- that users will win

It guarantees only:
- honest representation
- accurate data
- no hidden behavior

---

## 9. Replaceability is a feature

The frontend is designed to be replaceable.

Anyone can:
- build an alternative UI
- interact directly with contracts
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
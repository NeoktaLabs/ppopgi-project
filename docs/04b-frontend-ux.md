# Ppopgi (뽑기) — Frontend UX Philosophy & Guarantees

## 1. Purpose of this Document

This document explains **how the Ppopgi frontend behaves from a user-experience perspective**, and what guarantees it intentionally provides (and does not provide).

The goal is to:
- reassure users without overselling
- explain design decisions in plain language
- make the experience understandable even for non-technical users

---

## 2. Core UX Philosophy

Ppopgi is designed to feel:
- friendly
- calm
- transparent
- non-aggressive

At no point should a user feel:
- rushed
- pressured
- confused
- manipulated

This is a deliberate design choice.

---

## 3. Non-Gambling Framing

Although raffles involve chance, the UX avoids:
- casino language
- flashing visuals
- “almost won” messaging
- artificial urgency

Words like:
- *wallet*
- *gas*
- *contract*
- *blockchain*

are intentionally hidden or replaced with softer metaphors (Pocket, Energy, Collect, etc.).

---

## 4. On-Chain Truth as the Only Source

The frontend never invents data.

All displayed information comes from:
- direct on-chain reads
- verified contract events
- deterministic derivations (e.g. countdown from deadline)

There are:
- no fake winners
- no fake activity
- no simulated progress bars

If something cannot be confirmed on-chain, it is not shown.

---

## 5. Explicit User Control

Every meaningful action requires:
- an explicit user click
- a wallet signature
- a visible confirmation step

The frontend:
- never auto-sends transactions
- never auto-finalizes
- never auto-withdraws

Users are always in control.

---

## 6. Network Safety

The application enforces:
- Etherlink Mainnet only
- correct chain ID before any action

If the user is on the wrong network:
- all write actions are disabled
- a single, clear “Switch to Etherlink” action is shown

This avoids accidental losses or confusion.

---

## 7. Transparency Without Overload

Ppopgi follows a **two-layer transparency model**:

### Primary UI
- friendly
- minimal
- non-technical

### Details / Transparency Modals
- addresses
- fees
- providers
- deployer information
- explanations of what “Verified” means

Users who want details can access them.
Users who do not are not overwhelmed.

---

## 8. Verified Badge Philosophy

The “Verified” badge does **not** mean:
- audited
- risk-free
- endorsed by an authority

It means:
- the raffle was created using the official factory
- the rules match the documented system
- the raffle appears in the official registry

A short, friendly explanation is always available when the badge is shown.

---

## 9. Fee Transparency

Before participating, users can clearly see:
- the protocol fee percentage
- the fee recipient address
- why fees exist (to cover infrastructure and maintenance)

Fees are never hidden or dynamic.
They are immutable per raffle once created.

---

## 10. Error Handling & Calm Feedback

Errors are presented as:
- clear explanations
- calm language
- actionable next steps

Examples:
- “Someone else acted first — please refresh.”
- “This raffle has already been drawn.”
- “Your Energy balance is too low to draw.”

There is no blame, no alarmist tone.

---

## 11. Accessibility & Inclusiveness

Design choices favor:
- large buttons
- readable text
- high contrast
- predictable layouts

No sound, flashing, or aggressive animations are used by default.

---

## 12. Replaceability & Resilience

The frontend is intentionally **not critical infrastructure**.

If it disappears:
- raffles continue to function
- funds remain safe
- users can interact through other tools

This aligns with decentralization principles.

---

## 13. Final UX Promise

The frontend aims to make users feel:

> “I understand what’s happening,  
> I’m in control,  
> and nothing is hidden from me.”

If anything feels confusing, stressful, or manipulative — it is considered a bug.
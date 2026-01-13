# Ppopgi (뽑기) — Frontend Architecture & Guarantees

## Purpose of this document

This document explains how the **Ppopgi frontend** is designed and what guarantees it provides.

It is intentionally explicit about:
- what the frontend does
- what it does **not** do
- which assumptions it makes
- which assumptions it refuses to make

The frontend is a **pure interface layer**.  
It does not hold funds and does not influence outcomes.

---

## Quick prerequisites (what users need)

To participate in a raffle on **Etherlink**, users must have **both**:

- **XTZ on Etherlink**
  - required for gas
  - required to pay the **Entropy randomness fee** when finalizing

- **USDC on Etherlink**
  - required to buy raffle tickets

If a user has only one of these, participation is impossible.

The frontend should:
- detect missing prerequisites early
- explain clearly what is missing
- provide links to bridging or acquisition instructions
- avoid letting users reach confusing reverts

---

## Important contract constraints surfaced by the UI

### Ticket purchase minimum (anti-spam rule)

The raffle contract enforces the following rule:

> If a buyer is **not extending the latest ticket range**,  
> the **total purchase cost must be ≥ 1 USDC**.

This prevents griefing via tiny fragmented ticket ranges.

The frontend should:
- communicate this constraint in the ticket selection UI
- validate locally before submitting the transaction
- show a clear error message if the rule is violated

---

### Finalization requires a native payment

Calling `finalize()` is **payable** because it must pay the Entropy fee.

The frontend should:
- explain why finalization requires a small native payment
- show the estimated fee when possible
- clarify that:
  - overpayment is refunded automatically
  - if a refund fails, it becomes withdrawable

---

## Bot is convenience, not trust

A background finalizer bot exists to:
- monitor expired raffles
- call `finalize()` automatically when possible

However:
- **anyone can finalize a raffle**
- the bot has no special permissions
- if the bot is offline, raffles still settle normally

The frontend must always allow **manual finalization**.

---

## On-chain truth as the only source

All displayed data comes from:
- direct on-chain reads
- verified contract events
- deterministic derivations (e.g. countdown from deadline)

The frontend:
- does not simulate outcomes
- does not invent progress
- does not fabricate activity

If the chain state is unknown, the UI should say so.

---

## No custody, no authority

The frontend:
- never takes custody of funds
- cannot block withdrawals
- cannot change raffle rules
- cannot change winners

All authority resides in smart contracts.

---

## Failure modes & graceful degradation

If the frontend:
- is down
- is censored
- becomes outdated

Users can still:
- buy tickets directly via contracts
- finalize raffles manually
- claim funds independently

The frontend is **replaceable by design**.

---

## Design priorities

The frontend prioritizes:
1. accuracy over flashiness
2. clarity over persuasion
3. explanation over concealment
4. safety over convenience

If something costs money or is irreversible,  
the UI should say so plainly.

---

## Final statement

The Ppopgi frontend exists to:
- reduce friction
- explain rules
- visualize on-chain state

It is not a gatekeeper.

If the frontend disappears tomorrow,  
**the raffles still work.**
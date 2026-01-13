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

**Clarification**  
Calling `finalize()` does not immediately select a winner.  
It requests randomness and moves the raffle into a drawing state.  
Winner selection and fund allocation occur later via the entropy callback.

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

## Sharing & promotion (user-initiated)

The frontend may provide **explicit, user-initiated sharing tools** to help
users share raffles with others and promote discovery of the platform.

Sharing features may include:
- a copyable raffle link
- native OS share sheets (when available)
- optional integrations with social platforms

### Guarantees

- Sharing is **always optional** and **never automatic**
- The frontend never posts on behalf of a user
- No wallet action is triggered by sharing
- No endorsement, outcome, or winning probability is implied

### Content constraints

Shared content must:
- reflect **on-chain facts only**
- include neutral information (e.g. raffle title, deadline, ticket price)
- avoid promotional or manipulative language (e.g. “guaranteed win”)

Sharing exists to invite others to **view or participate**,  
not to pressure or mislead.

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

### Network & chain safety

The frontend must detect the currently connected network.

If the user is **not connected to Etherlink**:
- write actions must be blocked
- a clear explanation should be shown
- the user should be prompted to switch networks

This prevents transactions from being sent on the wrong chain
and avoids fund confusion.

---

### Allowance visibility & approvals

Because ticket purchases require USDC approval, the frontend should:

- clearly display whether a USDC allowance already exists
- explain when an approval transaction is required
- distinguish clearly between:
  - “Approve USDC”
  - “Buy tickets”

Approval visibility exists to reduce confusion and build trust.
The frontend must not silently request approvals.

---

### Transparency fields shown in the UI

To improve trust and reduce support requests, the frontend should surface
key configuration fields directly from on-chain contracts.

#### On the Create page (read from the factory / deployer)

- `protocolFeePercent`
- `feeRecipient`
- `usdc`
- `entropy`
- `entropyProvider`

These values represent the **factory defaults** that will be applied to newly
created raffles.

#### On raffle cards and raffle details (read from the raffle contract)

For both active and past raffles, the frontend should display:

- `protocolFeePercent`
- `feeRecipient`
- `deployer`

All addresses shown in the UI should link to the **Etherlink explorer**.

---

### Winner visibility for settled raffles

For transparency, once a raffle is **Settled/Completed**, the frontend should display:
- the winning address (or truncated address)
- the prize amount (USDC)
- a link to the transaction or explorer view that proves settlement (when available)

For raffles shown in “expired” / “past” lists, the raffle card should display the winner
when the on-chain state indicates the raffle is settled.

If a raffle is **Cancelled**, the UI must clearly indicate cancellation and refund
availability instead of showing a winner.

The frontend must not display a winner for raffles that are still **Open** or **Drawing**.

---

### Fee transparency & previews

Before submitting any transaction, the frontend should show:
- the total USDC cost
- any required approvals
- estimated gas fees
- the entropy fee (when finalizing)

This ensures users understand costs before signing and prevents
hidden-fee misunderstandings.

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

**Refund note**  
If a raffle is cancelled, ticket refunds are **claimable** by users and must be
explicitly withdrawn. Refunds are never pushed automatically by the frontend.

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
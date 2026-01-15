# Ppopgi (뽑기) — Frontend Architecture & Guarantees (Updated)

## Purpose of this document

This document explains how the **Ppopgi frontend** is designed and what guarantees it provides.

It is intentionally explicit about:
- what the frontend does
- what it does **not** do
- which assumptions it makes
- which assumptions it refuses to make

The frontend is a **pure interface layer**.  
It does not hold funds, does not control outcomes, and does not create protocol dependencies.

---

## Core architectural principle

The Ppopgi frontend follows a **three-layer helper model**:

1. **On-chain contracts** — the only source of authority and truth  
2. **Helpers (indexer + bot)** — convenience and performance only  
3. **Frontend UI** — visualization, explanation, and safe interaction

At all times:
- **on-chain state wins**
- helpers may fail without breaking the system
- users can act manually

---

## Quick prerequisites (what users need)

To participate in a raffle on **Etherlink**, users must have **both**:

- **XTZ on Etherlink**
  - required for energy costs
  - required to pay the randomness fee when finalizing

- **USDC on Etherlink**
  - required to buy raffle tickets

If a user has only one of these, participation is impossible.

The frontend should:
- detect missing prerequisites early
- explain clearly what is missing and why
- provide links to acquisition or bridging instructions
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
- validate locally before submission
- show a clear, human-readable error if the rule is violated

---

### Finalization requires a native payment

Finalization requires a small native payment because it must pay the randomness provider.

The frontend should:
- explain why finalization has a cost
- show the estimated fee when possible
- clarify that:
  - overpayment is refunded automatically when possible
  - if a refund fails (e.g. the caller cannot receive native token), it becomes withdrawable later

**Clarification**  
Calling finalize does **not** immediately select a winner.  
It requests randomness and moves the raffle into a drawing state.  
Winner selection and fund allocation occur later.

---

## Indexer: performance helper, not authority

An indexer is used to:
- list raffles quickly
- enable filtering and sorting
- browse historical raffles efficiently

The indexer:
- is never required for correctness
- never enables or blocks actions
- is never trusted for user balances or permissions

### Frontend guarantees with indexer usage

- Lists and history are **indexer-first**
- Raffle details **verify on-chain state**
- User-specific data is **always read on-chain**
- If indexer data disagrees with on-chain state, **on-chain state wins**

---

### Automatic fallback (indexer failure)

The frontend must remain operational if the indexer:
- is unreachable
- returns errors
- appears stale or inconsistent

In this case, the frontend must:
- automatically fall back to direct on-chain reads
- reduce features safely (e.g. simpler lists, slower loading)
- continue to allow all core actions:
  - viewing raffles
  - buying tickets
  - finalizing
  - claiming funds

Fallback must be:
- automatic
- non-alarmist
- transparent but calm

The indexer is a **speed optimization**, not a dependency.

---

## Finalizer bot: convenience, not trust

A background finalizer bot exists to:
- monitor expired or sold-out raffles
- call finalize automatically when eligible

However:
- **anyone can finalize a raffle**
- the bot has no special permissions
- the bot cannot select winners or move funds
- if the bot is offline, raffles still settle normally

### Frontend requirement

The frontend must:
- always allow **manual finalization**
- never imply the bot is required
- never attribute authority or control to the bot

Automation must feel **boring and optional**, not powerful.

---

## Sharing & promotion (user-initiated only)

The frontend may provide **explicit, user-initiated sharing tools**.

Sharing features may include:
- copyable raffle links
- native share dialogs
- optional platform integrations

### Guarantees

- Sharing is always optional
- Nothing is posted automatically
- No wallet action is triggered by sharing
- No endorsement, outcome, or probability is implied

### Content constraints

Shared content must:
- reflect **on-chain facts only**
- include neutral information (title, deadline, ticket price)
- avoid promotional or manipulative language

Sharing exists to **invite**, not to pressure.

---

## On-chain truth as the only authority

All meaningful data ultimately comes from:
- direct on-chain reads
- verified contract events
- deterministic derivations (e.g. countdowns)

The frontend:
- does not simulate outcomes
- does not invent activity
- does not fabricate progress

If state is unknown or pending, the UI should say so.

---

## Network & chain safety

The frontend must detect the currently connected network.

If the user is **not connected to Etherlink**:
- write actions must be blocked
- a clear explanation must be shown
- the user should be guided to switch

This prevents accidental transactions on the wrong chain.

---

## Allowance visibility & approvals

Because ticket purchases require USDC allowance, the frontend should:

- show whether an allowance already exists
- explain when an approval step is required
- clearly separate:
  - allowing coins
  - buying tickets

The frontend must never silently request approvals.

---

## Transparency fields shown in the UI

To reduce confusion and support requests, the frontend should surface
important on-chain configuration.

### On the Create page (from the factory)

- fee percentage
- fee receiver
- USDC used
- randomness system and provider

These represent the defaults applied to newly created raffles.

---

### On raffle cards and raffle details

For active and past raffles, the frontend should display:

- fee percentage
- fee receiver
- deployer

Addresses should link to an Etherlink proof view.

---

## Winner visibility for settled raffles

Once a raffle is **Settled**:
- show the winning account (truncated)
- show the prize amount
- provide a proof link when available

For raffles shown in past / expired lists:
- display the winner only when settled
- display cancellation status clearly when canceled

The frontend must never show a winner for raffles that are **Open** or **Drawing**.

---

## Fee transparency & previews

Before any action, the frontend should show:
- total USDC cost
- required approvals
- estimated energy cost
- randomness fee (when finalizing)

Costs must never be hidden or implied.

---

## No custody, no authority

The frontend:
- never holds user funds
- cannot block withdrawals
- cannot change raffle rules
- cannot influence winners

All authority resides in on-chain contracts.

---

## Failure modes & graceful degradation

If the frontend:
- is down
- is censored
- becomes outdated

Users can still:
- interact directly with contracts
- finalize raffles manually
- claim funds independently

**Refund note**  
If a raffle is cancelled, refunds are **claimable** and must be explicitly withdrawn.  
They are never pushed automatically.

The frontend is **replaceable by design**.

---

## Design priorities

The frontend prioritizes:
1. accuracy over flashiness
2. clarity over persuasion
3. explanation over concealment
4. safety over convenience

If something costs money or is irreversible,  
the UI must say so plainly.

---

## Final statement

The Ppopgi frontend exists to:
- reduce friction
- explain rules
- visualize on-chain state

It is not a gatekeeper.

If the frontend disappears tomorrow,  
**the raffles still work.**
# Ppopgi (뽑기) — Security & Trust Model

This document explains how **security, trust, and permissions** are handled in Ppopgi (뽑기).

The goal of this project is **trust through design**, not trust through promises.  
All important guarantees are enforced by smart contracts and are verifiable on-chain.

This document is intentionally explicit about:
- what the system guarantees
- what it does not guarantee
- where trust assumptions still exist

---

## Core principle

> **No single person — including the admin — can drain funds, change outcomes, or interfere with a raffle once it is live.**

User funds are protected by:
- immutable contract parameters
- strict state transitions
- permissionless actions
- pull-based withdrawals
- invariant-enforced accounting

Not by operator goodwill.

---

## Threat model (high-level)

Ppopgi assumes:
- adversarial users
- potentially unreliable infrastructure
- honest-but-fallible operators
- public, adversarial mempools

Ppopgi does **not** assume:
- trusted frontends
- trusted bots
- trusted admins
- private execution environments

---

## What the admin / owner can do

The admin (an Etherlink Safe) can:

- deploy new raffle contracts
- configure defaults for **future** raffles
- pause or update off-chain services (frontend, bot)
- recover tokens accidentally sent to the **deployer contract**
- recover surplus funds not owed to users (see Surplus Recovery)
- upgrade operational processes off-chain

The admin **cannot**:
- modify live raffles
- interfere with ticket sales
- change prices, deadlines, or caps
- influence randomness
- select or block winners
- withdraw user funds

---

## What the admin / owner cannot do (once a raffle is live)

Once a raffle has opened, the admin cannot:

- ❌ change the prize amount
- ❌ change ticket price
- ❌ change min/max ticket counts
- ❌ extend or shorten deadlines
- ❌ cancel a valid raffle arbitrarily
- ❌ change protocol fees
- ❌ confiscate tickets
- ❌ block refunds
- ❌ move USDC out of the contract

**Clarification**  
A “valid raffle” means one that:
- has met its minimum ticket requirement, and
- is not stuck waiting indefinitely on randomness.

Emergency cancellation is possible only in the case of stalled randomness  
and exists solely to recover user funds.

All of these properties are enforced by code and verified by tests.

---

## Randomness model

Ppopgi uses an external on-chain randomness provider (**Entropy**) to select winners.

### How randomness works
- When `finalize()` is called, the raffle requests randomness from Entropy.
- Entropy later calls back with a random value.
- The contract deterministically derives a winning ticket index.
- The ticket ranges map that index to a winning address.

### Trust assumptions
- The unpredictability of outcomes depends on the Entropy provider.
- The provider is assumed to be economically and cryptographically secure.
- The admin cannot influence or replace the randomness provider for an existing raffle.

### What randomness does NOT protect against
- Delayed fulfillment by the provider
- Temporary unavailability of the provider
- Network congestion delaying callbacks

These scenarios delay settlement but do **not** allow fund theft or outcome manipulation.

Invalid or late callbacks are safely ignored and cannot corrupt state.

---

## Finalization & entropy fees

### Who can finalize
- **Anyone** can call `finalize()`
- No special permissions are required
- Bots are purely a convenience

### Why `finalize()` is payable
- Randomness requires paying an Entropy fee in native token.
- The caller must send enough native token to cover this fee.

### Fee handling guarantees
- Overpayment is refunded automatically **when possible**.
- If an automatic refund fails, the amount becomes withdrawable by the caller.
- If the raffle cancels due to insufficient ticket sales, any entropy fee sent is returned or becomes withdrawable.

No entropy fee is ever retained silently by the protocol.

---

## Cancellation & refunds

A raffle is cancelled if:
- it reaches its expiry
- and the minimum number of tickets was not sold

In this case:
- all ticket purchases become refundable
- no winner is selected
- the prize pot remains untouched
- refunds are claimable on-chain by users

**Refund mechanism clarification**  
Ticket refunds are not pushed automatically.  
Entrants must explicitly claim their refund before withdrawing funds.

---

## Emergency cancellation (stuck randomness)

If a raffle is in a drawing state and the randomness callback does not arrive:

- the creator or admin may cancel after a short delay
- anyone may cancel after a longer delay

This mechanism exists solely to recover funds and does not allow  
outcome manipulation or selective cancellation.

---

## Withdrawal & claim safety

All payouts use a **pull-based** model:
- users must explicitly claim their funds
- the contract never pushes funds automatically

This prevents:
- reentrancy risks
- forced transfers
- dependency on recipient behavior

Claims are:
- idempotent
- non-custodial
- fully enforced on-chain

---

## Frontend & bot trust assumptions

The frontend:
- cannot custody funds
- cannot change outcomes
- cannot block claims

The finalizer bot:
- has no special permissions
- can be replaced by anyone
- does not introduce trust assumptions

If both disappear, the system still functions.

---

## Surplus recovery (safety accounting)

To recover accidental transfers and dust:

- USDC held above on-chain reserved liabilities may be swept
- native token held above tracked refundable balances may be swept

These operations are constrained by explicit accounting variables and enforced
by invariants ensuring that:

- user claimable balances are never reduced
- solvency is preserved at all times

Surplus recovery exists to prevent permanent fund lock-up,
not to extract value from users.

---

## Testing & invariant enforcement

Security properties are reinforced through extensive testing:

- comprehensive unit tests for all user-visible flows
- fuzz testing across adversarial call sequences
- invariant testing using Foundry to enforce global safety properties

Key enforced invariants include:
- contract solvency (`balance ≥ reserved liabilities`)
- correctness of state transitions
- immutability of raffle parameters
- single-use randomness requests
- protection of user claimable balances

While testing does not replace a formal audit, it significantly reduces the risk
of logic, accounting, and state-machine errors.

---

## Known limitations & non-goals

Ppopgi does **not** attempt to:
- hide that raffles are games of chance
- guarantee profit or fairness beyond randomness
- eliminate all external dependencies
- optimize for maximal throughput or revenue

Instead, it prioritizes:
- clarity
- auditability
- constrained behavior
- user safety

---

## Final note

Ppopgi’s security model is intentionally conservative.

It does not promise perfection —  
it promises **honest rules, visible risks, and enforceable guarantees**.

Everything else is left to user choice.
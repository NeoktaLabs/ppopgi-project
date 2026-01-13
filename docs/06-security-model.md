# Security & Trust Model

This document explains how security, trust, and permissions are handled in **Ppopgi (뽑기)**, in clear and simple terms.

The goal of this project is **trust through design**, not trust through promises.  
Everything important is enforced by smart contracts and visible on-chain.

---

## Core principle

> **No single person — including the admin — can drain funds, change outcomes, or interfere with raffles once they are live.**

User funds are protected by strict on-chain rules, not by goodwill or off-chain control.

---

## Funds custody & safety

- User funds are **never held by the admin**
- Funds are held **directly by the raffle smart contracts**
- The admin **cannot withdraw, redirect, or seize user funds**
- There is **no “withdraw all”**, **no backdoor**, and **no emergency drain**

All money flows (winnings, refunds, protocol fees) follow **deterministic contract logic** and are:

- allocated automatically
- withdrawn only by the rightful recipient
- fully verifiable on-chain

If you can collect funds, it is because the contract explicitly allows *you* to do so — not because someone approved it.

---

## What the admin / owner cannot do

Once a raffle is created and opened, the admin **cannot**:

- ❌ change the winner
- ❌ influence randomness
- ❌ change ticket prices
- ❌ change the prize amount
- ❌ change protocol fees
- ❌ block withdrawals
- ❌ confiscate tickets
- ❌ move user funds
- ❌ cancel a valid raffle arbitrarily

The outcome of a raffle is determined by:
- ticket ownership
- immutable on-chain rules
- verifiable randomness (Entropy)

Not by the admin.

---

## What the admin can do (and why)

The admin role exists for **maintenance and safety**, not control.

The admin **can**:

- ✔️ configure defaults for **future raffles** (fees, providers)
- ✔️ pause a raffle **only in exceptional situations** (e.g. safety concerns)
- ✔️ recover **surplus funds** that are not owed to anyone
- ✔️ assist with rare edge cases (e.g. registry rescue if indexing fails)

Important clarifications:

- Admin actions **do not give access to user funds**
- Admin actions **do not affect completed payouts**
- Admin actions are **fully transparent and on-chain**

---

## Emergency mechanisms (user-protective by design)

Some safety mechanisms exist to protect users if something goes wrong (for example, if a randomness provider stops responding).

These mechanisms are:

- **time-locked**
- often **permissionless** (anyone can trigger them)
- designed to result in **refunds**, not fund seizures

They exist to **unstick** a raffle — not to give control to a privileged actor.

---

## Protocol fees & transparency

Because the project is self-funded, a protocol fee exists to cover running costs.

Key points:

- fees are defined **on-chain**
- fees are **fixed per raffle** once created
- fees **cannot be changed mid-raffle**
- the fee recipient is visible on-chain
- the frontend displays fee details in the raffle information

There are **no hidden fees**, no off-chain deductions, and no discretionary changes.

---

## Ownership & governance model

The protocol uses an **owner address (Safe multisig)** for administrative actions.

Current state:
- the Safe contains **a single address** (the project creator)

This is **not ideal long-term**, and it is intentionally disclosed.

However:
- the owner’s powers are **strictly limited**
- the owner **cannot touch user funds**
- the owner **cannot alter raffle outcomes**

If the project grows, the intention is to:
- add additional entities to the Safe
- progressively decentralize governance
- remain aligned with Tezos’ values of transparency and decentralization

---

## AI-generated code disclosure

All parts of the system — smart contracts, frontend, and automation — were:

- designed
- written
- tested
- and deployed

with the help of **AI agents**, under human supervision.

While best practices, testing, and documentation were applied, this means:

- the system is **experimental**
- it may contain bugs or edge cases
- it is **not formally audited**

Please interact with the protocol thoughtfully and only with amounts you are comfortable with.

---

## Security mindset

Despite being an experimental project:

- security was a first-class concern
- contract responsibilities were intentionally separated
- admin powers were minimized by design
- accounting models were chosen to prevent fund misuse
- every important action is verifiable on-chain

No system is perfect — but this one aims to be **honest, understandable, and verifiable**.

---

## Final note

Ppopgi does not ask for blind trust.

If you want to verify any claim made here:
- the code is public
- the contracts are readable
- the rules are enforced on-chain

You don’t need to trust the admin — you can check.
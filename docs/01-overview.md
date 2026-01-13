# Ppopgi (뽑기) — Project Overview

## What is Ppopgi?

**Ppopgi (뽑기)** is a friendly, on-chain raffle platform built on **Etherlink (Tezos L2, EVM-compatible)**.

In Korean, *뽑기* means *“drawing”* or *“picking something at random”*.  
It is commonly used to describe:
- festival prize draws
- capsule machines
- simple childhood games of chance

This perfectly reflects the spirit of the project:  
a **simple, fair, transparent draw**, without casino pressure, dark patterns, or technical intimidation.

Ppopgi aims to make on-chain raffles feel:
- approachable
- verifiable
- honest
- human

---

## What Ppopgi is (and is not)

### Ppopgi **is**
- fully on-chain and non-custodial
- verifiable by anyone at any time
- designed around clear rules and visible outcomes
- resistant to admin abuse by construction
- built with conservative assumptions

### Ppopgi is **not**
- a gambling platform
- a casino
- a yield product
- a black-box “game”
- a system that relies on trust in the frontend or operators

If the frontend disappears,  
**the raffles still work.**

---

## Core design goals

Ppopgi is designed around a few simple principles:

### 1. Transparency over cleverness
All meaningful behavior:
- happens on-chain
- is visible in code
- is documented clearly

There are no hidden mechanics, odds manipulation, or backend overrides.

---

### 2. Safety through constraints
Rather than supporting every possible feature, the system is intentionally limited:
- fixed ticket prices
- fixed prize pots
- immutable rules per raffle
- no mid-game changes

This reduces both complexity and attack surface.

---

### 3. Decentralization where it matters
While some components exist for convenience (frontend, bot), they are **not trusted components**.

Critical actions:
- buying tickets
- finalizing raffles
- claiming funds

can all be performed **directly on-chain by anyone**.

---

### 4. Honest UX
The frontend:
- reflects on-chain state
- does not invent or simulate outcomes
- avoids misleading gamification
- explains costs and requirements upfront

If something is irreversible or risky, the UI should say so plainly.

---

## Who this project is for

Ppopgi is for:
- builders who want to study a clean, auditable raffle design
- users who want a simple on-chain draw without hidden tricks
- the Tezos / Etherlink ecosystem as a reference implementation

It is **not** designed to maximize engagement, addiction, or revenue.

---

## Status & intent

This project is:
- experimental
- production-deployed
- intentionally conservative
- documented in full

Mistakes are possible.  
What matters is that:
- the rules are visible
- the limitations are known
- the system does exactly what it claims — no more, no less

If it helps others learn, experiment, or build on Tezos,  
then it has already succeeded.

---

## Documentation map

This repository contains the following documentation files:

- `01-overview.md` — project vision & philosophy (this file)
- `02-architecture.md` — system architecture & diagrams
- `03-smart-contracts.md` — deep smart contract documentation
- `04-frontend.md` — frontend architecture & guarantees
- `04b-frontend-ux.md` — frontend UX philosophy & user-facing guarantees
- `05-finalizer-bot.md` — finalizer bot design & behavior
- `06-security-model.md` — threat model & trust assumptions
- `07-deployments.md` — deployment & operational model
- `08-technical-references.md` — addresses, constants & external dependencies

Each document is intended to be readable on its own,  
but together they describe the full system end-to-end.

---

## Terminology (documentation vs smart contracts)

In the documentation and UI, the term **raffle** is commonly used.  
In the Solidity codebase, the equivalent term is **lottery**.

They refer to the same on-chain construct.

- **Raffle (docs / UI term)** = **Lottery (smart contract term)**
- **Ticket** = Entry into a raffle
- **Finalize** = request randomness and begin settlement  
  (winner selection occurs during the entropy callback)
- **Withdraw / Claim** = pull-based payout from the contract

---

## Network reference

Ppopgi runs on **Etherlink (Tezos L2)**:

- **Chain ID:** `42793`
- **Native token:** XTZ (gas and randomness/finalization fees)
- **Ticket / prize token:** USDC (ERC20)

Full RPC endpoints, deployed addresses, and entropy configuration are listed in  
`08-technical-references.md`.
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
- calm
- understandable
- welcoming to non-technical users
- verifiable by anyone who wants to look deeper

---

## Why this project exists

This project was built by a **solo IT engineer**, exploring the blockchain ecosystem out of curiosity, learning, and long-term belief in **Tezos**.

While I am **not a professional smart-contract developer**, my professional background is:
- **Lead Systems & Network Engineering**
- strong infrastructure design experience
- security-focused environments
- production-grade operational responsibility

Security, failure modes, and system boundaries are therefore a **natural concern** for me, even while learning a new technical domain.

Ppopgi was:
- built **entirely in spare time**
- **self-funded**
- designed carefully for **future scalability**
- approached as a **serious learning and experimentation project**

It has also been a **very large and enjoyable learning experience**, and the hope is that it can remain safe, useful, and interesting over time.

---

## Transparency & AI-assisted development

All parts of the project:
- smart contracts
- frontend
- automation bot

were **written, reviewed, and iterated with the help of AI agents**.

This has allowed rapid exploration and documentation, but it also means:

> There is **no guarantee** that the system is 100% bug-free or perfectly secure.

This is **not stated as an alarm**, but as an honest transparency principle.
The system has been:
- carefully tested
- thoroughly documented
- intentionally designed to limit damage in case of mistakes

Users are encouraged to:
- read the documentation
- verify behavior on-chain
- interact only with amounts they are comfortable with

---

## Tezos values & decentralization

Ppopgi is strongly aligned with **Tezos DNA**:

- transparency over marketing
- decentralization over control
- safety over speed
- composability over lock-in

Key principles:
- no hidden logic
- no off-chain winners
- no admin power to drain funds
- all critical actions visible on-chain
- optional automation, never required

---

## Project components

Ppopgi is composed of **three independent systems**:

### 1. Smart contracts (on Etherlink)
- Lottery registry (forever index)
- Factory / deployer
- Per-raffle instances
- Fully permissionless play & finalize
- Pull-based withdrawals

### 2. Frontend (Web UI)
- Non-technical language
- On-chain truth only
- Clear visibility of fees, providers, and verification
- Designed for calm, friendly UX

### 3. Finalizer bot (optional)
- Permissionless automation
- Ensures raffles never get stuck
- Anyone can run their own alternative bot
- No special privileges

---

## Fees & sustainability

The project is **self-funded**.

To cover:
- infrastructure costs
- RPC usage
- hosting
- long-term maintenance

each raffle includes a **clearly visible protocol fee**:
- percentage shown in raffle details
- fee recipient address visible
- immutable per raffle once created

Currently:
- the owner (Safe) has a single controlling address
- there is **no power to interfere with active raffles**
- no ability to change rules mid-game
- no ability to extract user funds

If the project grows, additional entities may be added to the Safe.
This will be done transparently and documented publicly.

---

## Experimental nature

Ppopgi is **experimental**.

It may not be perfect.
It may evolve.
It may contain edge cases.

But it is built with:
- care
- humility
- transparency
- a genuine desire to do things properly

If it helps others learn, experiment, or build on Tezos — then it has already succeeded.

---

## Documentation map

- `01-overview.md` — project vision & philosophy (this file)
- `02-architecture.md` — system architecture & diagrams
- `03-smart-contracts.md` — deep contract documentation
- `04-frontend.md` — frontend technical & UX spec
- `05-bot.md` — finalizer bot design
- `06-security-model.md` — threat model & guarantees
- `07-deployments.md` — addresses & environments
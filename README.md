# Ppopgi (뽑기) — A Friendly On-Chain Raffle on Etherlink (Tezos L2)

Hi 👋  
I’m a solo IT enthusiast exploring the blockchain world — with a special place for **Tezos**, a project I’ve believed in since its early days.

**Ppopgi** is a **self-funded**, independent side project that I built in my **spare time**, mainly out of curiosity and the desire to learn by doing.  
It is still **experimental**, probably **not perfect**, and very much a work in progress — but it’s built with care, attention, and respect for users.

This project has been a **very big learning experience** for me.  
I genuinely enjoyed discovering new concepts, experimenting, making mistakes, fixing them, and slowly understanding how everything fits together.  
My hope is that the project can remain **secure**, **useful**, and **fully usable** over time — even as it continues to evolve.

There is no VC backing, no grant pressure, and no external funding — everything so far has been **self-funded**.

---

## What is Ppopgi (뽑기)

**Ppopgi** is an experimental on-chain raffle system built on **Etherlink (Tezos L2, EVM)**.

It combines:
- small, auditable smart contracts
- a calm and playful frontend that reflects on-chain state
- optional automation to help raffles reach a final state when needed

A core principle of the project is **transparency**:
- no off-chain game logic
- no hidden winner selection
- no fake activity or artificial urgency
- everything important can be checked directly on-chain

The protocol aims to be **as decentralized as reasonably possible**, while still caring about usability and safety — very much in the spirit of the **Tezos ecosystem**.

---

## Why “Ppopgi” (뽑기)

In Korean, **뽑기** means *“drawing”* or *“picking something at random”*, often associated with:
- festival games
- capsule machines
- small, joyful prize draws

The Korean-inspired theme is intentional.  
It reflects the idea that this should feel like a **simple, fair game**, not a casino, a financial product, or something intimidating.

---

## About the code & how this project was built

All the **coding parts of this project** — including:
- smart contracts
- frontend application
- automation / finalizer bot

were **designed, written, tested, and deployed with the help of AI agents**.

I acted as:
- the project designer
- the system integrator
- the reviewer and tester
- the person making final decisions and trade-offs

While I paid close attention to architecture, security principles, and testing,  
this also means that **there is no guarantee that the system is 100% bug-free or perfectly secure**.

Nothing here should be considered production-grade or risk-free.  
Please interact with the project thoughtfully and only with amounts you are comfortable with.

---

## Funding, fees & sustainability

Because the project is self-funded, the platform includes a **protocol fee** on raffles.

This fee exists to:
- cover infrastructure costs (hosting, RPC usage, automation)
- maintain and improve the platform over time
- allow the project to remain independent

Fees are:
- defined **on-chain**
- immutable per raffle once created
- **clearly displayed in the raffle details** on the frontend
- fully transparent and verifiable by anyone

There are no hidden costs, off-chain deductions, or discretionary changes after a raffle is live.

---

## Governance & ownership

The protocol uses an **owner address (a Safe multisig)** for administrative actions.

At the moment:
- the Safe contains **a single address (mine)**

This is not intended to be permanent.  
If the project grows and attracts real usage, the goal is to **add additional entities or participants** to the Safe to improve decentralization and shared governance.

Importantly:
- the owner has **very limited power** over active raffles
- the owner **cannot change rules, winners, fees, or outcomes** once a raffle is open
- core game logic is enforced by immutable smart-contract rules

Because of this limited authority model and the strong transparency around fees and behavior, there is **no critical custodial risk at this stage**, even with a single-owner Safe.

---

## Project structure

Ppopgi is made of three independent parts:

- **Smart contracts**  
  A registry, a factory, and per-raffle instances with clear responsibilities and minimal surface area.

- **Frontend application**  
  A friendly interface that mirrors on-chain state and avoids unnecessary abstraction.

- **Finalizer bot**  
  A permissionless helper that improves user experience by making sure raffles don’t stay stuck forever.

Each component can be deployed, verified, and run independently.

### Repositories
- **Smart contracts:** https://github.com/NeoktaLabs/ppopgi-smartcontracts  
- **Frontend:** https://github.com/NeoktaLabs/ppopgi-frontend  
- **Finalizer bot:** https://github.com/NeoktaLabs/ppopgi-finalizerbot  

---

## Scalability & future ideas

From the beginning, the project was built with **future ideas in mind**, even if they are not implemented yet.

Possible future directions include:
- adding an **indexer** for better history and search
- experimenting with **new raffle types**
- improving creator tools and user experience
- gradually expanding governance participation
- iterating on decentralization where possible
- continuing to learn and refine the system over time

The current architecture is intentionally flexible so these ideas can be explored without breaking what already exists.

---

## Documentation

This repository contains detailed documentation under [`/docs`](./docs), including:
- protocol architecture and design choices
- smart-contract lifecycle and behavior
- frontend technical and UX specifications
- security considerations and assumptions
- finalizer bot design and operations
- deployment information and addresses

---

## Philosophy

Ppopgi is guided by a few simple ideas:
- **clarity over complexity**
- **transparency over magic**
- **safety over speed**
- **learning over perfection**

If something is hard to explain or verify, it probably doesn’t belong here.

---

If you find bugs, unclear behavior, or have suggestions, feel free to open an issue or discussion.  
Feedback, curiosity, and constructive criticism are always welcome 🙏
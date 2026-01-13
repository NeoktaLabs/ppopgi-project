# Ppopgi (뽑기) — A Friendly On-Chain Raffle on Etherlink (Tezos L2)

Hi 👋 I’m a solo IT guy exploring the blockchain world — and especially **Tezos**, which I’ve believed in since the early days (Tezos OG energy 🫶).

This repository is the **global home** for the Ppopgi project:
- a single-winner raffle system deployed on **Etherlink Mainnet (Tezos L2, EVM)**
- a lightweight **registry + factory + raffle instance** smart-contract architecture
- a friendly, non-technical **frontend** experience
- an optional **finalizer bot** to improve raffle liveness and UX

## Important disclaimer (please read)
I’m **not a professional smart-contract developer**.  
I built this project with the help of **AI agents** and a lot of iteration.

That means:
- the code *may contain mistakes or edge cases*
- the project is **not officially audited**
- you should only interact with it using amounts you’re comfortable with

That said, I have:
- tested the system end-to-end in realistic flows (create / play / draw / refunds / withdraw)
- written detailed documentation so anyone can verify behavior from on-chain state
- designed the UI around strict “on-chain truth only” rules (no fake activity, no simulated winners)

## Repositories
- **Smart contracts:** (link)  
- **Frontend:** (link)  
- **Finalizer bot (Cloudflare Worker):** (link)

## Documentation
All detailed docs live in this repo under [`/docs`](./docs), including:
- architecture & contract flows
- frontend technical spec + UX spec
- security model & threat assumptions
- bot design + operations
- deployment addresses and verification checklist

## Philosophy
Ppopgi aims to be:
- **transparent** (on-chain truth, always)
- **safe by design** (pull-based withdrawals, liabilities accounting, clear cancellation paths)
- **friendly** (no casino language, no pressure, no dark patterns)

---

If you spot an issue or have suggestions, please open an issue. 🙏
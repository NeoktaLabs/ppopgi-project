# Ppopgi (뽑기) — Deployment & Operations Guide

## 1. Purpose

This document explains **how Ppopgi is deployed and operated in production**.

It covers:
- smart contract deployment
- frontend deployment
- automation bot deployment
- operational responsibilities
- security and governance considerations

This document is intentionally **transparent and conservative**.  
It does not claim perfection and does not hide operational risks.

---

## 2. System Overview

Ppopgi is composed of **three independent layers**:

1. **Smart Contracts** — Etherlink (EVM-compatible Tezos L2)
2. **Frontend Web Application** — Cloudflare Pages
3. **Finalizer Bot** — Cloudflare Workers + Cron

There is:
- no centralized backend server
- no custodial wallet
- no off-chain state required for correctness

Each layer can fail independently without putting user funds at risk.

---

## 3. Network & Environment

### 3.1 Target Network

- **Network:** Etherlink Mainnet
- **Chain ID:** `42793`
- **Native Token:** XTZ
- **Execution Model:** EVM-compatible

All contracts are deployed **only on Etherlink Mainnet**.

---

## 4. Smart Contract Deployment

### 4.1 Deployment Order

Smart contracts must be deployed **in the following order**:

1. **LotteryRegistry**
2. **SingleWinnerDeployer**
3. *(Per raffle)* **LotterySingleWinner** (deployed via the deployer)

### 4.2 Ownership Model

- All core contracts are owned by an **Etherlink Safe (multisig)**.
- Initially, the Safe contains **a single signer** (the project creator).
- Additional signers can be added in the future if the project grows.

Ownership allows:
- authorizing deployers
- updating deployer configuration
- performing rescue operations

Ownership **does not allow draining user funds** from active raffles.

---

### 4.3 Registry Deployment

**LotteryRegistry** is the permanent on-chain registry.

- Deployed once
- Intended to remain unchanged
- Stores:
  - all registered lotteries
  - their type identifiers
  - creator addresses
  - registration timestamps

After deployment:
- The Safe authorizes the deployer via `setRegistrar(deployer, true)`.

---

### 4.4 Deployer Deployment

**SingleWinnerDeployer** is deployed next.

It is configured with:
- USDC token address
- Pyth Entropy contract
- Entropy provider
- Protocol fee recipient
- Protocol fee percentage

The deployer:
- deploys lottery instances
- transfers ownership of each lottery to the Safe
- attempts to register the lottery in the registry

If registry registration fails, deployment still succeeds and can be rescued later.

---

### 4.5 Lottery Deployment (Runtime)

Each raffle is deployed **on demand**:

- Created via the frontend or directly via the deployer
- Funded at creation
- Activated only after strict funding confirmation

Each raffle:
- is a standalone contract
- holds its own funds
- has immutable configuration (fee recipient, creator, rules)

---

## 5. Frontend Deployment

### 5.1 Hosting Platform

- **Provider:** Cloudflare Pages
- **Type:** Static frontend
- **Framework:** Vite + React

There is:
- no backend API
- no database
- no server-side logic

All reads/writes go directly to the blockchain.

---

### 5.2 Build & Deploy Flow

1. Frontend repository is linked to Cloudflare Pages
2. Cloudflare automatically:
   - installs dependencies
   - builds the project
   - serves static assets globally
3. Deployments are triggered on:
   - main branch pushes
   - manual redeploys

Environment variables are injected at build time.

---

### 5.3 Environment Variables

Typical frontend variables include:

- `VITE_CHAIN_ID`
- `VITE_REGISTRY_ADDRESS`
- `VITE_DEPLOYER_ADDRESS`
- `VITE_WC_PROJECT_ID`

No secrets are stored in the frontend.

---

## 6. Finalizer Bot Deployment

### 6.1 Purpose

The Finalizer Bot ensures **protocol liveness** by:

- scanning open raffles
- finalizing expired or full raffles
- preventing stuck games

The bot is **not trusted**:
- anyone can finalize a raffle manually
- the bot only automates public actions

---

### 6.2 Hosting Platform

- **Provider:** Cloudflare Workers
- **Execution:** Serverless
- **Trigger:** Cron (`* * * * *` — every minute)

---

### 6.3 State Management

The bot uses Cloudflare KV for:

- run locking
- scan cursor
- per-lottery attempt TTL

This prevents:
- duplicate executions
- fee waste
- nonce collisions

---

### 6.4 Secrets & Permissions

Secrets stored securely in Cloudflare:

- `BOT_PRIVATE_KEY`

The bot wallet:
- holds minimal XTZ
- has no special on-chain permissions
- can only call public functions

If compromised, impact is limited to wasted gas.

---

## 7. Operational Responsibilities

### 7.1 What the Operator Can Do

The operator (Safe owner) can:

- deploy new raffle types
- update deployer defaults
- rescue failed registrations
- pause lotteries in emergencies
- sweep accidental surplus funds

### 7.2 What the Operator Cannot Do

The operator **cannot**:

- steal user tickets
- change raffle outcomes
- withdraw user funds
- alter randomness
- modify fees of active raffles

---

## 8. Failure Scenarios

| Scenario | Impact | Recovery |
|--------|-------|---------|
| Frontend down | UX unavailable | Funds safe on-chain |
| Bot down | Raffles can still be finalized manually | Restart bot |
| RPC outage | Temporary read/write failure | Retry later |
| Oracle delay | Drawing phase delayed | Emergency cancel available |
| Operator key lost | Admin actions blocked | Raffles continue safely |

---

## 9. Upgrade Strategy

- Registry is designed to be **immutable**
- New raffle types require new deployers
- Frontend is upgradeable without affecting contracts
- Bot logic can be updated independently

No contract upgrade can:
- rewrite history
- change active raffle rules

---

## 10. Transparency Commitments

Ppopgi commits to:

- publishing contract addresses
- documenting deployment steps
- explaining risks clearly
- avoiding hidden admin privileges
- keeping the system as decentralized as reasonably possible

---

## 11. Final Notes

This project is:

- experimental
- self-funded
- built in spare time
- heavily tested but **not formally audited**

It is shared in the spirit of:
- learning
- transparency
- respect for Tezos values

If something looks wrong — **assume good faith and ask questions**.
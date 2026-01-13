# Ppopgi (뽑기) — Architecture

## 1. Purpose of this Document

This document explains **how Ppopgi is architected end-to-end**, across:
- on-chain smart contracts
- off-chain automation
- frontend user interface

The goal is **maximum transparency**:
- what components exist
- how they interact
- what guarantees they provide
- what they deliberately *do not* control

This is not marketing documentation.  
It is meant for users, auditors, and curious builders.

---

## 2. High-Level Overview

Ppopgi is composed of **four main layers**:

1. **Users**
   - Players
   - Raffle creators
   - Admin (Safe multisig)

2. **Frontend (Web UI)**
   - Read-only by default
   - Writes only through explicit user actions
   - No backend authority

3. **On-chain Protocol (Etherlink)**
   - Immutable smart contracts
   - All funds custody & rules enforced here

4. **Off-chain Automation (Optional)**
   - Permissionless finalizer bot
   - Improves UX, not security-critical

---

## 3. Component Breakdown

### 3.1 Frontend (Cloudflare Pages)

**Role**
- Discovery of raffles
- User interaction (play, create, collect)
- State visualization

**Key Properties**
- Stateless
- No custody of funds
- No privileged keys
- Can be replaced by any alternative UI

**Trust Model**
- Frontend cannot steal funds
- Any write action requires wallet signature
- All critical state is re-verified on-chain

---

### 3.2 LotteryRegistry (On-chain, Forever Contract)

**Purpose**
- Permanent registry of official raffles
- Single canonical discovery entry point

**Responsibilities**
- Store all registered raffle addresses
- Attribute creators
- Tag raffle types (e.g. Single Winner)
- Enable pagination for scalable reads

**Security Model**
- No funds ever pass through the registry
- No game logic
- Minimal upgrade surface

**Why this exists**
- Prevents reliance on off-chain indexing
- Ensures discoverability even if UI changes
- One address to trust long-term

---

### 3.3 SingleWinnerDeployer (Factory)

**Purpose**
- Controlled creation of lotteries
- Enforces protocol-wide defaults

**Responsibilities**
- Deploy new `LotterySingleWinner` instances
- Fund the prize pot atomically
- Transfer ownership to the Safe
- Register the lottery in the registry (best-effort)

**Key Design Choice**
- **Creation is registry-gated**
- If the deployer is not authorized, creation reverts

**Security Implication**
- Prevents spoofed “official” lotteries
- Ensures consistent parameters for all new raffles

---

### 3.4 LotterySingleWinner (One Instance = One Raffle)

**This is where everything important happens.**

Each raffle:
- is its own contract
- holds its own funds
- enforces its own rules
- cannot be altered after deployment

**Responsibilities**
- Accept ticket purchases (USDC)
- Track ticket ownership
- Request randomness
- Pick a winner
- Allocate funds
- Handle refunds and cancellation

**Key Properties**
- Pull-based payouts (users withdraw)
- No admin function can move user funds
- Strong accounting invariants

---

### 3.5 Entropy / Randomness (Pyth)

**Purpose**
- Fair and verifiable randomness

**Usage**
- Lottery requests randomness only when finalized
- Callback validates:
  - sender
  - request ID
  - provider
- Winner derived deterministically

**Security**
- Admin cannot influence outcome
- Randomness request is locked at finalize time

---

### 3.6 Finalizer Bot (Optional, Off-chain)

**Purpose**
- Improve UX by finalizing eligible raffles automatically

**Important**
- Anyone can finalize manually
- Bot has no special permissions
- Bot cannot steal funds

**If the bot is down**
- The protocol still works
- Users can finalize manually

---

## 4. Lifecycle Summary

A typical raffle lifecycle:

1. Creator deploys raffle via factory
2. Raffle is registered in the registry
3. Users buy tickets
4. Deadline or max tickets reached
5. Anyone (user or bot) calls finalize
6. Randomness resolves
7. Winner is allocated
8. Users withdraw funds themselves

At **no point** does the admin:
- pick winners
- move user funds
- change rules mid-game

---

## 5. Decentralization & Trust Boundaries

| Component | Can steal funds? | Can block withdrawals? | Can change rules? |
|---------|------------------|------------------------|-------------------|
| Frontend | ❌ | ❌ | ❌ |
| Registry | ❌ | ❌ | ❌ |
| Deployer | ❌ | ❌ | ❌ |
| Lottery | ❌ | ❌ | ❌ |
| Safe Admin | ❌ | ❌ | ❌ |
| Bot | ❌ | ❌ | ❌ |

**Key takeaway:**  
Once a raffle is open, **nobody has unilateral power**.

---

## 6. Scalability Considerations

- Thousands of raffles supported
- Pagination everywhere
- Optional indexer for future UX improvements
- Stateless frontend
- Serverless automation

---

## 7. Final Notes

This architecture was designed to:
- minimize trust
- isolate risk
- favor transparency over convenience
- align with Tezos values of decentralization

It is intentionally conservative.
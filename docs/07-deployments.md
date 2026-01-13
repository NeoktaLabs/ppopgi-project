# Ppopgi (뽑기) — Deployment & Operations Guide

## 1. Purpose

This document explains **how Ppopgi is deployed and operated in production**.

It covers:
- smart contract deployment order
- ownership and governance
- frontend deployment
- automation (finalizer bot)
- operational responsibilities and limitations

> **Source of truth for live addresses, constants, and external dependencies:**  
> See `08-technical-references.md`.

This document is intentionally **transparent and conservative**.  
It does not claim perfection and does not hide operational risks.

---

## 2. Environments

Ppopgi may be deployed in multiple environments:

- local development
- testnets
- Etherlink Mainnet

Each environment uses:
- its own contract addresses
- its own randomness provider configuration
- its own frontend deployment

Addresses **must never** be hardcoded across environments.

---

## 3. Smart contract deployment

### 3.1 Deployment order

Smart contracts must be deployed in the following order:

1. **LotteryRegistry**
2. **SingleWinnerDeployer**
3. *(per raffle)* **LotterySingleWinner** (via the deployer)

Deploying in a different order is unsupported.

---

### 3.2 Ownership model

- All core contracts are owned by an **Etherlink Safe (multisig)**.
- Initially, the Safe may contain a single signer for operational simplicity.
- Additional signers can be added over time.

Ownership is transferred immediately after deployment.

---

### 3.3 Registry configuration

After deployment:

- the deployer is authorized as a registrar in `LotteryRegistry`
- unauthorized registrars are rejected
- the registry becomes the canonical source of “official” raffles

Failure to register:
- does not brick a raffle
- only affects discoverability

---

### 3.4 Deployer configuration

The `SingleWinnerDeployer` holds defaults for **future raffles**, including:

- `protocolFeePercent`
- `feeRecipient`
- `entropy` contract
- `entropyProvider`
- `usdc` token address
- `registry` address

Changing these values:
- affects only raffles deployed **after** the change
- does **not** affect existing raffles

---

## 4. Frontend deployment

The frontend is a stateless client application.

### Responsibilities
- discover raffles via the registry
- read on-chain state
- submit user transactions
- explain requirements and costs clearly

### Non-responsibilities
- custody of funds
- enforcement of rules
- outcome determination

The frontend must be treated as:
- replaceable
- non-trusted
- informational only

---

## 5. Finalizer bot

### Purpose

The finalizer bot exists to:
- monitor raffles
- detect when they are eligible for finalization
- call `finalize()` automatically

### Trust model

- the bot has no special permissions
- anyone can run a compatible bot
- manual finalization is always possible

If the bot fails or is offline:
- raffles do not get stuck
- users can finalize directly

---

## 6. Randomness provider operations

Ppopgi relies on an external randomness provider (Entropy).

Operational responsibilities include:
- ensuring the provider contract address is correct
- ensuring the provider is funded and reachable
- monitoring callback success

Failure modes:
- delayed randomness
- delayed settlement

These do **not** allow:
- theft of funds
- manipulation of outcomes

---

## 7. Operational risks & limitations

Known operational risks include:
- frontend downtime
- RPC instability
- randomness provider delays
- congestion-related fee spikes

Mitigations:
- permissionless contract access
- manual fallback paths
- transparent UX
- conservative defaults

---

## 8. Governance & upgrades

Ppopgi does **not** use upgradeable proxy contracts.

Implications:
- deployed raffles are immutable
- bugs cannot be patched in-place
- fixes require redeployment

Governance actions are therefore limited to:
- deploying new contracts
- updating off-chain components
- communicating changes clearly

---

## 9. Incident response philosophy

If something goes wrong:
- the team communicates openly
- on-chain facts are prioritized
- users retain full control over funds

There is no emergency admin drain,
because there is nothing to drain.

---

## Final note

Ppopgi is operated with the assumption that:
- infrastructure fails
- operators make mistakes
- users act adversarially

The system is designed so that  
**these failures do not become catastrophic.**

That is the core operational guarantee.
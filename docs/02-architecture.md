# Architecture

## On-chain contracts

### 1) LotteryRegistry (forever)
Purpose:
- A permanent, minimal registry holding a list of deployed raffle contracts.

Key properties:
- registrar-gated registration (authorized deployers only)
- pagination helpers (bounded loops)
- no gameplay logic

### 2) SingleWinnerDeployer (factory)
Purpose:
- Deploys `LotterySingleWinner` instances using a shared config.
- Registers the new raffle in the registry (best effort).

Key properties:
- must be authorized as a registrar in the registry
- deploys raffle instance, funds initial prize, confirms funding, transfers ownership to Safe
- wraps registry registration in `try/catch` and emits `RegistrationFailed` if needed

### 3) LotterySingleWinner (raffle instance)
Purpose:
- Runs one raffle from ticket sales → draw → payouts/refunds.

Key properties:
- range-based ticket tracking for gas efficiency
- verifiable randomness (Pyth Entropy)
- pull-based payouts
- cancellation paths + refunds
- escrowed liabilities accounting (USDC + native)

## Off-chain components

### Frontend
- Reads on-chain state for all views.
- Sends transactions only after preflight checks.

### Finalizer bot (Cloudflare Worker)
- Permissionless liveness agent.
- Scans registry, filters eligible raffles, calls `finalize()` with correct fee.
- Uses KV locks and attempt TTLs to avoid repeated fee burns.
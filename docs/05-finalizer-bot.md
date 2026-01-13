# Finalizer Bot (Cloudflare Worker)

**Network:** Etherlink Mainnet (chainId 42793)  
**Runtime:** Cloudflare Workers (Cron)  
**Cadence:** Every 1 minute (`* * * * *`)  
**State:** Cloudflare KV  
**Goal:** Guarantee raffle liveness (finalize or cancel) while minimizing fee waste and RPC load.

## What it does
The bot is a permissionless automation agent that:
1) scans registry for candidate raffles  
2) filters actionable raffles (Open + eligible)  
3) calls `finalize()` with the exact Pyth fee  

It has **no special permissions** and cannot change outcomes.

## Actionable raffle rules (must match contracts)
A raffle is actionable when:
- `status == Open`
- `paused == false`
- AND eligible:
  - expired: `now >= deadline` → call `finalize()` (this may cancel if sold < minTickets)
  - full: `maxTickets > 0 && sold >= maxTickets` → call `finalize()`

Important:
- expired + sold == 0 is still actionable: contract will cancel due to minTickets not met.

## Architecture
| Component | Tech | Purpose |
|---|---|---|
| Trigger | Cloudflare Cron | Executes every minute |
| Runtime | Worker | Runs scan + finalize |
| State | KV | lock, cursor, attempt TTL |
| Chain | Etherlink RPC | reads + tx |

## Key design decisions
- Hybrid scanning: hot (newest N) + cold cursor window
- Multicall-first filtering to reduce RPC calls
- KV lock (best-effort) to avoid overlapping runs
- Attempt TTL per raffle to avoid fee waste
- Exact fee via `entropy.getFee(provider)`; refresh fee on failure
- Pending nonce management to avoid collisions

## Guardrails
- time budget (default 25s)
- tx cap per run (`MAX_TX`, default 5–10)
- always simulate before sending

## Configuration
Required:
- `BOT_PRIVATE_KEY` (secret)
- `REGISTRY_ADDRESS`
- `RPC_URL`
- KV binding: `BOT_STATE`

Optional tuning:
- `HOT_SIZE` (default 100, max 500)
- `COLD_SIZE` (default 50, max 200)
- `MAX_TX` (default 5)
- `TIME_BUDGET_MS` (default 25000)
- `ATTEMPT_TTL_SEC` (default 600)

## Operational notes
- Use a dedicated hot wallet with minimal funds.
- Monitor XTZ balance for fees + gas.
- If registry is empty, bot exits cleanly (no tx).
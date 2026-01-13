# Design Document: 뽑기 (Ppopgi) — Finalizer Bot


**Network:** Etherlink Mainnet (Chain ID 42793)  
**Runtime:** Cloudflare Workers (Cron)  
**Cadence:** Every 1 minute (`* * * * *`)  
**Architecture:** Serverless + KV state  
**Goal:** Guarantee lottery **liveness** (finalize OR cancel) while minimizing fee waste and RPC load.

---

## 1) Overview

The Finalizer Bot is a permissionless automated agent that ensures every 뽑기 (Ppopgi) lottery progresses to a terminal state:

- **Completed** (winner picked) OR
- **Canceled** (min tickets not reached / expired)

Although anyone can call `finalize()`, relying solely on organic user incentives can lead to “stuck” lotteries (especially low-volume booths). This bot acts as a protocol safety net.

### Primary Responsibilities
1. **Discover** candidate lotteries (registry scan).
2. **Filter** to only actionable lotteries (Open + eligible).
3. **Finalize** by calling `finalize()` with the correct Pyth fee.

---

## 2) Architecture

Triggered by a cron event every 60 seconds.

| Component | Tech | Purpose |
|---|---|---|
| Trigger | Cloudflare Cron | Executes every minute |
| Runtime | Cloudflare Worker | Runs scanning + tx logic |
| State | Cloudflare KV | Lock, scan cursor, attempt TTL, fee cache optional |
| Chain | Etherlink RPC | Reads registry + lotteries, writes finalize tx |

---

## 3) Key Design Decisions

### 3.1 Hybrid Scanning Strategy (Hot + Cold)
**Problem:** Registry can reach 10k+ lotteries, cannot scan all every minute.  
**Solution:** Always scan a small “recent hot window” + a rotating cold cursor window.

- **Hot scan:** newest `HOT_SIZE` lotteries (default 100)
- **Cold scan:** `COLD_SIZE` lotteries starting from cursor (default 50)
- Cursor advances by `COLD_SIZE` each run, wraps at end.

This ensures:
- popular/new lotteries finalize quickly
- all lotteries eventually get checked

### 3.2 Multicall-First Filtering
**Problem:** Checking each lottery sequentially explodes RPC calls and timeouts.  
**Solution:**
1) Multicall `status()` for all candidates  
2) Keep only `Open`  
3) For `Open`, detail-multicall: `deadline, sold, maxTickets, paused, entropy, entropyProvider`

### 3.3 Best-Effort Concurrency Locking
A KV lock prevents overlapping runs:

1) Check if `lock` exists → exit
2) Write `lock = runId` with TTL (180s)
3) Read back to confirm ownership
4) Delete lock at end if still owned

### 3.4 Per-Lottery Idempotency Guard (Attempt TTL)
**Problem:** Even with a lock, restarts, TTL expiry, retries, or mempool lag can cause repeated attempts.  
**Solution:** Write `attempt:<lottery>` with TTL (e.g., 10 minutes) before sending a tx.

- Prevents fee waste due to repeated finalize attempts
- Still preserves liveness: TTL expires and bot can retry later

### 3.5 Fee Handling: Exact Fee + Refresh on Failure
**Problem:** Overpaying the fee creates refunds and can strand native tokens as `claimableNative`.  
**Solution:** Send **exact** `entropy.getFee(provider)` as `msg.value`.  
If simulation fails due to fee mismatch, refresh fee and retry once.

### 3.6 Manual Nonce Management (Pending Nonce)
**Problem:** RPC nodes can lag indexing, causing nonce collisions.  
**Solution:** Fetch nonce once from `blockTag: 'pending'` and increment locally per tx in-run.

---

## 4) Correctness Rules (must match contracts)

A lottery is **actionable** when:

- `status == Open`
- `paused == false`
- AND eligible:
  - **Expired:** `now >= deadline`  → call `finalize()` even if `sold == 0`
  - **Full:** `maxTickets > 0 && sold >= maxTickets` → call `finalize()`

**Important: sold == 0**
- Do NOT blindly skip sold=0.
- If expired, `finalize()` cancels and unlocks refunds/pot return.
- Only skip sold=0 if not expired and not full (it’s not eligible anyway).

---

## 5) Guardrails

- **Time budget:** stop inner loops if runtime exceeds 25 seconds
- **Tx cap:** maximum 5 tx per run
- **Size caps:** HOT_SIZE <= 500, COLD_SIZE <= 200
- **Simulation required:** always `simulateContract()` before sending

---

## 6) Failure Modes & Recovery

| Scenario | Behavior | Recovery |
|---|---|---|
| RPC down | run fails, lock TTL expires | next minute retry |
| Worker crash | lock remains until TTL | next run after TTL |
| Fee changes | simulation fails, refresh fee, retry once | next run |
| Someone finalized | simulation fails, skip | next run continues |
| Mempool lag | pending nonce prevents collisions | normal operation |

---

## 7) Configuration

**Required secrets / env vars**
- `BOT_PRIVATE_KEY`
- `REGISTRY_ADDRESS`
- `RPC_URL`
- `BOT_STATE` (KV namespace)

**Optional**
- `HOT_SIZE` default 100 (max 500)
- `COLD_SIZE` default 50 (max 200)
- `MAX_TX` default 5
- `ATTEMPT_TTL_SEC` default 600

---

## 8) Operational Notes

- Use a dedicated **hot wallet** with minimal funds.
- Monitor:
  - XTZ balance (for fees)
  - tx success rate
  - number of actionable lotteries per run
- Add a runbook for refilling the wallet.

---

## 9) Summary

This bot guarantees protocol liveness by:
- scanning efficiently (hot+cold)
- minimizing RPC load (multicall)
- preventing fee waste (simulate + idempotency TTL)
- staying reliable under cron overlap (KV lock + pending nonce)
- running every minute for best user experience

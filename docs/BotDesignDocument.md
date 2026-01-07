# 🤖 Neokta Lottery Finalizer Bot - Design Document

**Version:** 1.0.0  
**Network:** Etherlink Mainnet  
**Architecture:** Serverless (Cloudflare Workers)  

## 1. Overview

The Finalizer Bot is a permissionless, automated agent responsible for ensuring the **liveness** and **reliability** of the Neokta Lottery protocol. 

While the protocol allows any user to finalize a lottery, relying solely on user incentives creates a risk of "stuck" funds for niche or low-volume lotteries. This bot acts as the **protocol safety net**, ensuring every lottery is eventually processed without manual intervention.

### Primary Responsibilities
1.  **Monitor:** Scan the Lottery Registry for "Open" lotteries.
2.  **Evaluate:** Check if lotteries meet completion criteria (Deadline passed OR Max tickets sold).
3.  **Execute:** Calculate the required entropy fee and call `finalize()` on-chain.

---

## 2. High-Level Architecture

The bot runs on a **Serverless Architecture** triggered by a **1-minute CRON** event. It maintains minimal state via **Cloudflare KV** to track progress and prevent concurrency issues.



### Core Components

| Component | Technology | Purpose |
| :--- | :--- | :--- |
| **Trigger** | Cron Trigger | Fires execution every 60 seconds (`* * * * *`). |
| **Execution** | Cloudflare Worker | Node.js/Viem script that handles logic and RPC calls. |
| **State** | Cloudflare KV | Stores the **Lock** (concurrency) and **Cursor** (scanning progress). |
| **Blockchain** | Etherlink RPC | Interaction with Registry and Lottery Smart Contracts. |

---

## 3. Key Design Decisions

### 3.1 Hybrid Scanning Strategy (Hot + Cold)
**Problem:** As the registry grows to 10,000+ lotteries, scanning the entire list every minute is impossible due to RPC limits and execution time budgets.  
**Solution:** We implement a **Hybrid Scanning** approach.

| Segment | Strategy | Default Size | Goal |
| :--- | :--- | :--- | :--- |
| **Hot Scan** | Checks the **newest** N lotteries. | `100` | Ensure active/popular lotteries finalize immediately. |
| **Cold Scan** | Checks a sequential batch starting from a persistent `cursor`. | `50` | Guarantee that even old/forgotten lotteries are checked eventually. |

* **Cursor Logic:** The cursor advances by `COLD_SIZE` after every successful fetch. It wraps around to 0 when it reaches the end of the registry.

### 3.2 Stateless Efficiency via Multicall
**Problem:** Checking 150 lotteries sequentially would require 750+ RPC calls ($150 \times 5$ reads), causing timeouts.  
**Solution:**
1.  **Filter Multicall:** Fetches `status()` for all candidates in one batch. Discards any lottery that is not `Open`.
2.  **Detail Multicall:** For the remaining `Open` lotteries, fetches all details (`deadline`, `sold`, `entropy`, etc.) in chunked multicalls.
* **Impact:** Reduces RPC overhead by ~95%.

### 3.3 Best-Effort Concurrency Locking
**Problem:** On a 1-minute schedule, a slow run might overlap with the next trigger, causing **Nonce Collisions** or double-spending fees.  
**Solution:** A **Read-After-Write KV Lock**.
1.  **Check:** If `lock` exists in KV → Exit.
2.  **Acquire:** Write `lock` = `runId` with a 180s TTL.
3.  **Verify:** Read `lock` again. If it does not equal `runId` (race lost) → Exit.
4.  **Release:** Delete lock at the end of execution (only if we still own it).

---

## 4. Security & Safety Mechanisms

### 4.1 Gas & Revert Protection (Simulation)
The bot **never** blindly sends a transaction. It uses `client.simulateContract()` before every write.
* **Why?** Detects if a lottery was finalized by someone else *seconds ago*.
* **Benefit:** Prevents wasted gas on failed transactions.

### 4.2 Fee Caching
The bot caches the Pyth Entropy fee in memory, keyed by `entropyContract:providerAddress`.
* **Benefit:** If 50 lotteries use the same provider, we only fetch the fee once per run.

### 4.3 Zero-Sold Optimization
If `getSold() == 0`, the bot strictly skips the lottery.
* **Reasoning:** The smart contract reverts with `NoParticipants()` if sold is 0.

### 4.4 Operational Guardrails
To prevent the bot from crashing the node or draining the wallet:
1.  **Time Budget:** Inner loop checks `Date.now()`. If execution > **25s**, it stops processing to avoid Cloudflare timeouts.
2.  **Transaction Cap:** Max **5 transactions** per run.
3.  **Env Var Caps:** `HOT_SIZE` and `COLD_SIZE` are capped in code (Max 500 / 200).

---

## 5. Failure Modes & Recovery

| Failure Scenario | Bot Behavior | Recovery |
| :--- | :--- | :--- |
| **RPC Endpoint Down** | Throws error, logs "Critical Error", releases lock. | Auto-retries next minute. |
| **Worker Crash (OOM)** | Process dies. Lock remains in KV. | Lock auto-expires after 180s (TTL). Next run proceeds. |
| **Out of Gas** | `simulateContract` fails. | Operator must top up wallet. Bot resumes automatically. |
| **Lock Race Condition** | One instance exits early. | The winner continues processing. |

---

## 6. Configuration

Configuration is managed via `wrangler.toml` and Secrets.

### Environment Variables
```toml
# Infrastructure
REGISTRY_ADDRESS = "0x..."       # The immutable registry
RPC_URL = "https://..."          # Etherlink Mainnet RPC

# Tuning (Optional)
HOT_SIZE = "100"                 # Latest lotteries to check
COLD_SIZE = "50"                 # Old lotteries to check
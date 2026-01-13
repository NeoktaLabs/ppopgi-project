# Ppopgi (뽑기) — Finalizer Bot

## 1. Purpose of the Finalizer Bot

The Finalizer Bot exists to **improve user experience**, not to secure the protocol.

It ensures that raffles:
- do not remain idle after expiration
- progress to completion or cancellation in a timely manner

Importantly:
- anyone can finalize manually
- the bot has no special permissions
- the protocol does not depend on the bot

---

## 2. Why a Bot Is Needed

While finalization is permissionless, in practice:
- users may forget to finalize
- low-volume raffles may stall
- expired raffles may remain open longer than desired

The bot acts as a **liveness helper**, not an authority.

---

## 3. Execution Environment

The bot runs as:
- a Cloudflare Worker
- triggered by a cron job every minute

It is:
- serverless
- stateless between runs (except KV state)
- easy to replace or shut down

---

## 4. What the Bot Does

At each run, the bot:

1. Scans the registry for raffles
2. Filters to only `Open` raffles
3. Checks eligibility:
   - expired, or
   - sold out
4. Attempts to finalize eligible raffles
5. Stops after a safe transaction limit

---

## 5. What the Bot Does NOT Do

The bot:
- cannot pick winners
- cannot move user funds
- cannot change raffle rules
- cannot bypass contract checks

If the bot behaves incorrectly:
- transactions revert
- funds remain safe

---

## 6. Safety & Guardrails

Several protections are built in:

- **Simulation before sending**
  - Every transaction is simulated first
- **Exact fee payment**
  - Avoids dust or trapped native tokens
- **Idempotency TTL**
  - Prevents repeated attempts on the same raffle
- **Transaction cap**
  - Limits risk per run
- **Time budget**
  - Prevents runaway execution

---

## 7. Key-Value State Usage

Cloudflare KV is used only for:
- run locking (avoid overlapping executions)
- scan cursor position
- recent-attempt tracking

No sensitive data is stored permanently.

---

## 8. Failure Scenarios

| Scenario | Outcome |
|--------|---------|
| Bot is down | Users can finalize manually |
| RPC failure | Bot retries later |
| Fee changes | Bot refreshes fee |
| Someone finalized first | Bot skips safely |
| Worker crashes | Next run resumes |

The system remains functional in all cases.

---

## 9. Trust Model

The bot wallet:
- holds minimal funds
- only pays entropy fees
- cannot access raffle funds

Even if compromised:
- worst case is wasted fees
- no user funds are at risk

---

## 10. Decentralization Considerations

The bot is:
- permissionless
- optional
- replaceable

Anyone can:
- run their own version
- fork the logic
- finalize manually

This avoids central dependency.

---

## 11. Operational Transparency

The bot:
- logs each run
- logs each attempted finalization
- exposes no private APIs

All actions are visible on-chain.

---

## 12. Relationship With Future Indexers

An indexer (e.g. The Graph) is optional and independent.

The bot:
- does not rely on an indexer
- does not increase indexing costs
- only reads on-chain state

---

## 13. Final Notes

The Finalizer Bot is intentionally boring.

It exists to:
- reduce friction
- keep the system moving
- disappear quietly when not needed

If it fails, the protocol still works.
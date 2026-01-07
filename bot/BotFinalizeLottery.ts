import {
  createPublicClient,
  createWalletClient,
  http,
  parseAbi,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { defineChain } from "viem";

// --- TYPES & INTERFACES ---
export interface Env {
  BOT_PRIVATE_KEY: string;
  REGISTRY_ADDRESS: string;
  RPC_URL?: string;
  BOT_STATE: KVNamespace;

  HOT_SIZE?: string;
  COLD_SIZE?: string;

  // Optional tuning
  MAX_TX?: string;
  TIME_BUDGET_MS?: string;
  ATTEMPT_TTL_SEC?: string;
}

// Etherlink Config
const ETHERLINK = defineChain({
  id: 42793,
  name: "Etherlink Mainnet",
  network: "etherlink",
  nativeCurrency: { name: "Tezos", symbol: "XTZ", decimals: 18 },
  rpcUrls: { default: { http: ["https://node.mainnet.etherlink.com"] } },
});

// ABIs
const registryAbi = parseAbi([
  "function getAllLotteriesCount() external view returns (uint256)",
  "function getAllLotteries(uint256 start, uint256 limit) external view returns (address[])",
]);

const lotteryAbi = parseAbi([
  "function status() external view returns (uint8)",
  "function paused() external view returns (bool)",
  "function deadline() external view returns (uint64)",
  "function getSold() external view returns (uint256)",
  "function maxTickets() external view returns (uint64)",
  "function entropy() external view returns (address)",
  "function entropyProvider() external view returns (address)",
  "function finalize() external payable",
]);

const entropyAbi = parseAbi([
  "function getFee(address provider) external view returns (uint256)",
]);

// --- HELPERS ---
function chunkArray<T>(array: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < array.length; i += size) result.push(array.slice(i, i + size));
  return result;
}

function getSafeSize(val: string | undefined, defaultVal: bigint, maxVal: bigint): bigint {
  if (!val) return defaultVal;
  try {
    const parsed = BigInt(val);
    return parsed > maxVal ? maxVal : parsed;
  } catch {
    return defaultVal;
  }
}

function getSafeInt(val: string | undefined, defaultVal: number, maxVal: number): number {
  if (!val) return defaultVal;
  const n = Number(val);
  if (!Number.isFinite(n)) return defaultVal;
  return Math.min(Math.max(0, Math.floor(n)), maxVal);
}

function nowSec(): bigint {
  return BigInt(Math.floor(Date.now() / 1000));
}

function lower(a: string): string {
  return a.toLowerCase();
}

// --- MAIN WORKER ---
export default {
  async scheduled(_event: ScheduledEvent, env: Env, _ctx: ExecutionContext): Promise<void> {
    const START_TIME = Date.now();
    const LOCK_TTL_SEC = 180;
    const runId = crypto.randomUUID();

    console.log(`🤖 Run ${runId} started`);

    // 1) LOCK ACQUISITION (best-effort)
    const existingLock = await env.BOT_STATE.get("lock");
    if (existingLock) {
      console.warn(`⚠️ Locked by run ${existingLock}. Skipping.`);
      return;
    }

    await env.BOT_STATE.put("lock", runId, { expirationTtl: LOCK_TTL_SEC });

    const confirmLock = await env.BOT_STATE.get("lock");
    if (confirmLock !== runId) {
      console.warn(`⚠️ Lock race lost. Exiting.`);
      return; // don't delete; not ours
    }

    try {
      await runLogic(env, START_TIME);
    } catch (e: any) {
      console.error("❌ Critical Error:", e?.message || e);
    } finally {
      // 2) LOCK RELEASE
      const currentLock = await env.BOT_STATE.get("lock");
      if (currentLock === runId) {
        await env.BOT_STATE.delete("lock");
        console.log(`🔓 Lock released`);
      }
    }
  },
};

async function runLogic(env: Env, startTimeMs: number) {
  if (!env.BOT_PRIVATE_KEY || !env.REGISTRY_ADDRESS) throw new Error("Missing Env");

  const rpcUrl = env.RPC_URL || "https://node.mainnet.etherlink.com";
  const account = privateKeyToAccount(env.BOT_PRIVATE_KEY as `0x${string}`);

  const client = createPublicClient({ chain: ETHERLINK, transport: http(rpcUrl) });
  const wallet = createWalletClient({ account, chain: ETHERLINK, transport: http(rpcUrl) });

  // Tuning
  const HOT_SIZE = getSafeSize(env.HOT_SIZE, 100n, 500n);
  const COLD_SIZE = getSafeSize(env.COLD_SIZE, 50n, 200n);

  const MAX_TX = getSafeInt(env.MAX_TX, 5, 25);
  const TIME_BUDGET_MS = getSafeInt(env.TIME_BUDGET_MS, 25_000, 45_000);
  const ATTEMPT_TTL_SEC = getSafeInt(env.ATTEMPT_TTL_SEC, 600, 3600); // default 10 minutes

  // --- 1) FETCH TOTAL ---
  const total = await client.readContract({
    address: env.REGISTRY_ADDRESS as `0x${string}`,
    abi: registryAbi,
    functionName: "getAllLotteriesCount",
  });

  if (total === 0n) {
    console.log("ℹ️ Registry empty. Done.");
    return;
  }

  // --- 2) SCAN CONFIG ---
  const startHot = total > HOT_SIZE ? total - HOT_SIZE : 0n;
  const safeHotSize = total - startHot;

  const savedCursor = await env.BOT_STATE.get("cursor");
  let cursor = savedCursor ? BigInt(savedCursor) : 0n;
  if (cursor >= total) cursor = 0n;

  const startCold = cursor;
  const safeColdSize = (total - startCold) < COLD_SIZE ? (total - startCold) : COLD_SIZE;

  console.log(
    `🔍 Scanning: Hot[${startHot}..${startHot + safeHotSize}) Cold[${startCold}..${startCold + safeColdSize}) total=${total}`
  );

  // --- 3) FETCH BATCHES ---
  const [hotBatch, coldBatch] = await Promise.all([
    safeHotSize > 0n
      ? client.readContract({
          address: env.REGISTRY_ADDRESS as `0x${string}`,
          abi: registryAbi,
          functionName: "getAllLotteries",
          args: [startHot, safeHotSize],
        })
      : Promise.resolve([] as `0x${string}`[]),
    safeColdSize > 0n
      ? client.readContract({
          address: env.REGISTRY_ADDRESS as `0x${string}`,
          abi: registryAbi,
          functionName: "getAllLotteries",
          args: [startCold, safeColdSize],
        })
      : Promise.resolve([] as `0x${string}`[]),
  ]);

  // Compute next cursor, but write it a bit later (after successful processing)
  let nextCursor = startCold + safeColdSize;
  if (nextCursor >= total) nextCursor = 0n;

  // Deduplicate candidates
  const candidates = Array.from(new Set([...hotBatch, ...coldBatch]));
  if (candidates.length === 0) {
    console.log("ℹ️ No candidates. Done.");
    await env.BOT_STATE.put("cursor", nextCursor.toString());
    return;
  }

  // --- 4) STATUS FILTER (Multicall) ---
  const statusResults = await client.multicall({
    // allowFailure behavior depends on viem version; we also check status field below.
    contracts: candidates.map((addr) => ({
      address: addr,
      abi: lotteryAbi,
      functionName: "status",
    })),
  });

  const openLotteries: `0x${string}`[] = [];
  statusResults.forEach((res, i) => {
    // 1 = Open in your enum: FundingPending=0, Open=1, Drawing=2, Completed=3, Canceled=4
    if (res.status === "success" && res.result === 1) openLotteries.push(candidates[i]);
  });

  if (openLotteries.length === 0) {
    console.log("ℹ️ No Open lotteries found.");
    await env.BOT_STATE.put("cursor", nextCursor.toString());
    return;
  }

  console.log(`⚡ Found ${openLotteries.length} Open lotteries to analyze.`);

  // --- 5) PREPARE TX LOOP ---
  // Use pending nonce to avoid collisions with earlier pending txs
  let currentNonce = await client.getTransactionCount({
    address: account.address,
    blockTag: "pending",
  });

  const feeCache = new Map<string, bigint>();
  const CHUNK_SIZE = 25;
  const chunks = chunkArray(openLotteries, CHUNK_SIZE);

  let txCount = 0;

  // --- 6) PROCESSING LOOP ---
  for (const chunk of chunks) {
    if (txCount >= MAX_TX) break;
    if (Date.now() - startTimeMs > TIME_BUDGET_MS) break;

    const tNow = nowSec();

    // Detail multicall
    const detailCalls = chunk.flatMap((addr) => [
      { address: addr, abi: lotteryAbi, functionName: "deadline" },
      { address: addr, abi: lotteryAbi, functionName: "getSold" },
      { address: addr, abi: lotteryAbi, functionName: "maxTickets" },
      { address: addr, abi: lotteryAbi, functionName: "paused" },
      { address: addr, abi: lotteryAbi, functionName: "entropy" },
      { address: addr, abi: lotteryAbi, functionName: "entropyProvider" },
    ]);

    const detailResults = await client.multicall({ contracts: detailCalls });

    for (let i = 0; i < chunk.length; i++) {
      if (txCount >= MAX_TX) break;
      if (Date.now() - startTimeMs > TIME_BUDGET_MS) break;

      const lottery = chunk[i];
      const baseIdx = i * 6;

      const rDeadline = detailResults[baseIdx];
      const rSold = detailResults[baseIdx + 1];
      const rMax = detailResults[baseIdx + 2];
      const rPaused = detailResults[baseIdx + 3];
      const rEntropy = detailResults[baseIdx + 4];
      const rProvider = detailResults[baseIdx + 5];

      // ensure all calls succeeded
      if (
        rDeadline.status !== "success" ||
        rSold.status !== "success" ||
        rMax.status !== "success" ||
        rPaused.status !== "success" ||
        rEntropy.status !== "success" ||
        rProvider.status !== "success"
      ) continue;

      if (rPaused.result === true) continue;

      const deadline = BigInt(rDeadline.result as bigint);
      const sold = BigInt(rSold.result as bigint);
      const maxTickets = BigInt(rMax.result as bigint);
      const entropyAddr = rEntropy.result as `0x${string}`;
      const providerAddr = rProvider.result as `0x${string}`;

      const isExpired = tNow >= deadline;
      const isFull = maxTickets > 0n && sold >= maxTickets;

      // Only eligible if expired or full
      if (!isExpired && !isFull) continue;

      // Idempotency guard (prevents repeated fee burns)
      const attemptKey = `attempt:${lower(lottery)}`;
      const recentAttempt = await env.BOT_STATE.get(attemptKey);
      if (recentAttempt) {
        // recently attempted; skip for now
        continue;
      }

      // Mark attempt BEFORE simulate/send (best-effort idempotency)
      await env.BOT_STATE.put(attemptKey, `${Date.now()}`, { expirationTtl: ATTEMPT_TTL_SEC });

      console.log(
        `🚀 Finalizing eligible lottery: ${lottery} (expired=${isExpired} full=${isFull} sold=${sold.toString()} max=${maxTickets.toString()})`
      );

      try {
        // Fee lookup with cache
        const cacheKey = `${lower(entropyAddr)}:${lower(providerAddr)}`;
        let fee = feeCache.get(cacheKey);
        if (!fee) {
          fee = await client.readContract({
            address: entropyAddr,
            abi: entropyAbi,
            functionName: "getFee",
            args: [providerAddr],
          });
          feeCache.set(cacheKey, fee);
        }

        // Send EXACT fee (avoid overpay / claimableNative dust)
        let value = fee;

        // 1) Simulate
        let requestObj: any;
        try {
          const sim = await client.simulateContract({
            account,
            address: lottery,
            abi: lotteryAbi,
            functionName: "finalize",
            value,
          });
          requestObj = sim.request;
        } catch (e: any) {
          const msg = (e?.shortMessage || e?.message || "").toString();

          // If fee changed, refresh fee and retry once
          if (msg.includes("InsufficientFee") || msg.toLowerCase().includes("insufficient fee")) {
            const refreshedFee = await client.readContract({
              address: entropyAddr,
              abi: entropyAbi,
              functionName: "getFee",
              args: [providerAddr],
            });
            feeCache.set(cacheKey, refreshedFee);
            value = refreshedFee;

            const sim2 = await client.simulateContract({
              account,
              address: lottery,
              abi: lotteryAbi,
              functionName: "finalize",
              value,
            });
            requestObj = sim2.request;
          } else {
            // Not retrying; likely already finalized or not eligible anymore
            console.warn(`   ⏭️ Simulation failed: ${msg}`);
            continue;
          }
        }

        // 2) Write with manual nonce
        const hash = await wallet.writeContract({
          ...requestObj,
          nonce: currentNonce++,
        });

        console.log(`   ✅ Tx Sent: ${hash}`);
        txCount++;
      } catch (e: any) {
        console.warn(`   ⏭️ Tx failed for ${lottery}: ${e?.shortMessage || e?.message || e}`);
        // Keep attemptKey TTL to avoid hammering; it will expire naturally.
      }
    }
  }

  // Update cursor after successful processing phase
  await env.BOT_STATE.put("cursor", nextCursor.toString());

  console.log(`🏁 Run complete. txCount=${txCount} cursor=${nextCursor.toString()}`);
}

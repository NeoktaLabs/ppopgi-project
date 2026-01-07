import { 
  createPublicClient, 
  createWalletClient, 
  http, 
  parseAbi 
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { defineChain } from 'viem';

// --- TYPES & INTERFACES ---
export interface Env {
  BOT_PRIVATE_KEY: string;
  REGISTRY_ADDRESS: string;
  RPC_URL: string;
  BOT_STATE: KVNamespace;
  HOT_SIZE?: string;
  COLD_SIZE?: string;
}

// Etherlink Config
const ETHERLINK = defineChain({
  id: 42793,
  name: 'Etherlink Mainnet',
  network: 'etherlink',
  nativeCurrency: { name: 'Tezos', symbol: 'XTZ', decimals: 18 },
  rpcUrls: { default: { http: ['https://node.mainnet.etherlink.com'] } },
});

// ABIs
const registryAbi = parseAbi([
  "function getAllLotteriesCount() external view returns (uint256)",
  "function getAllLotteries(uint256 start, uint256 limit) external view returns (address[])"
]);

const lotteryAbi = parseAbi([
  "function status() external view returns (uint8)",
  "function paused() external view returns (bool)",
  "function deadline() external view returns (uint64)",
  "function getSold() external view returns (uint256)",
  "function maxTickets() external view returns (uint64)",
  "function entropy() external view returns (address)",
  "function entropyProvider() external view returns (address)",
  "function finalize() external payable"
]);

const entropyAbi = parseAbi([
  "function getFee(address provider) external view returns (uint256)"
]);

// --- HELPERS ---
function addBps(x: bigint, bps: bigint) {
  return x + (x * bps) / 10000n;
}

function chunkArray<T>(array: T[], size: number): T[][] {
  const result = [];
  for (let i = 0; i < array.length; i += size) {
    result.push(array.slice(i, i + size));
  }
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

export default {
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    const START_TIME = Date.now();
    const LOCK_TTL = 180; 
    const runId = crypto.randomUUID(); 

    console.log(`🤖 Run ${runId} started`);

    // 1. LOCK ACQUISITION
    // Check first to avoid overwriting an active run
    const existingLock = await env.BOT_STATE.get("lock");
    if (existingLock) {
      console.warn(`⚠️ Locked by run ${existingLock}. Skipping.`);
      return;
    }
    
    // Attempt to acquire
    await env.BOT_STATE.put("lock", runId, { expirationTtl: LOCK_TTL });
    
    // Read-after-write confirmation (Best effort atomicity)
    const confirmLock = await env.BOT_STATE.get("lock");
    if (confirmLock !== runId) {
      console.warn(`⚠️ Lock race lost. Exiting.`);
      // Do NOT delete lock here; it belongs to someone else
      return;
    }

    try {
      await runLogic(env, START_TIME);
    } catch (e: any) {
      console.error("❌ Critical Error:", e.message || e);
    } finally {
      // 2. LOCK RELEASE
      // Only delete if we definitely still own it
      const currentLock = await env.BOT_STATE.get("lock");
      if (currentLock === runId) {
        await env.BOT_STATE.delete("lock");
        console.log(`🔓 Lock released`);
      }
    }
  },
};

async function runLogic(env: Env, startTime: number) {
  if (!env.BOT_PRIVATE_KEY || !env.REGISTRY_ADDRESS) throw new Error("Missing Env");

  const rpcUrl = env.RPC_URL || 'https://node.mainnet.etherlink.com';
  const account = privateKeyToAccount(env.BOT_PRIVATE_KEY as `0x${string}`);
  const client = createPublicClient({ chain: ETHERLINK, transport: http(rpcUrl) });
  const wallet = createWalletClient({ account, chain: ETHERLINK, transport: http(rpcUrl) });

  // 3. FETCH TOTAL
  const total = await client.readContract({
    address: env.REGISTRY_ADDRESS as `0x${string}`,
    abi: registryAbi,
    functionName: "getAllLotteriesCount",
  });
  
  if (total === 0n) return;

  // 4. SCAN CONFIG
  const HOT_SIZE = getSafeSize(env.HOT_SIZE, 100n, 500n);
  const COLD_SIZE = getSafeSize(env.COLD_SIZE, 50n, 200n);

  const startHot = total > HOT_SIZE ? total - HOT_SIZE : 0n;
  const safeHotSize = (total - startHot) < HOT_SIZE ? (total - startHot) : HOT_SIZE;

  // Cold Scan Cursor
  const savedCursor = await env.BOT_STATE.get("cursor");
  let cursor = savedCursor ? BigInt(savedCursor) : 0n;
  if (cursor >= total) cursor = 0n;
  
  const startCold = cursor;
  const safeColdSize = (total - startCold) < COLD_SIZE ? (total - startCold) : COLD_SIZE;

  // 5. FETCH BATCHES (Parallel)
  const [hotBatch, coldBatch] = await Promise.all([
    safeHotSize > 0n ? client.readContract({
      address: env.REGISTRY_ADDRESS as `0x${string}`,
      abi: registryAbi,
      functionName: "getAllLotteries",
      args: [startHot, safeHotSize],
    }) : [],
    safeColdSize > 0n ? client.readContract({
      address: env.REGISTRY_ADDRESS as `0x${string}`,
      abi: registryAbi,
      functionName: "getAllLotteries",
      args: [startCold, safeColdSize],
    }) : []
  ]);

  // Update cursor ONLY after successful fetch (prevents skipping segments on RPC fail)
  let nextCursor = startCold + safeColdSize;
  if (nextCursor >= total) nextCursor = 0n;
  await env.BOT_STATE.put("cursor", nextCursor.toString());

  const candidates = Array.from(new Set([...hotBatch, ...coldBatch]));
  if (candidates.length === 0) return;

  // 6. STATUS FILTER
  const statusResults = await client.multicall({
    contracts: candidates.map(addr => ({ address: addr, abi: lotteryAbi, functionName: 'status' }))
  });

  const openLotteries: `0x${string}`[] = [];
  statusResults.forEach((res, i) => {
    if (res.status === 'success' && res.result === 1) { // 1 = Open
      openLotteries.push(candidates[i]);
    }
  });

  if (openLotteries.length === 0) return;

  // 7. PROCESSING LOOP
  const CHUNK_SIZE = 25;
  const chunks = chunkArray(openLotteries, CHUNK_SIZE);
  
  let txCount = 0;
  const MAX_TX = 5; 
  const TIME_BUDGET_MS = 25_000;
  const feeCache = new Map<string, bigint>();

  for (const chunk of chunks) {
    if (txCount >= MAX_TX) break;
    if (Date.now() - startTime > TIME_BUDGET_MS) break;

    // Snapshot time for this entire chunk
    const chunkNow = BigInt(Math.floor(Date.now() / 1000));

    const detailCalls = chunk.flatMap(addr => [
      { address: addr, abi: lotteryAbi, functionName: 'deadline' },
      { address: addr, abi: lotteryAbi, functionName: 'getSold' },
      { address: addr, abi: lotteryAbi, functionName: 'maxTickets' },
      { address: addr, abi: lotteryAbi, functionName: 'paused' },
      { address: addr, abi: lotteryAbi, functionName: 'entropy' },
      { address: addr, abi: lotteryAbi, functionName: 'entropyProvider' }
    ]);

    const detailResults = await client.multicall({ contracts: detailCalls });

    for (let i = 0; i < chunk.length; i++) {
      if (Date.now() - startTime > TIME_BUDGET_MS) break; // Inner loop time guard
      if (txCount >= MAX_TX) break;

      const lottery = chunk[i];
      const baseIdx = i * 6;

      const rDeadline = detailResults[baseIdx];
      const rSold = detailResults[baseIdx + 1];
      const rMax = detailResults[baseIdx + 2];
      const rPaused = detailResults[baseIdx + 3];
      const rEntropy = detailResults[baseIdx + 4];
      const rProvider = detailResults[baseIdx + 5];

      if (
        rDeadline.status !== 'success' || rSold.status !== 'success' ||
        rMax.status !== 'success' || rPaused.status !== 'success' ||
        rEntropy.status !== 'success' || rProvider.status !== 'success'
      ) continue;

      if (rPaused.result === true) continue;

      const sold = rSold.result as bigint;
      if (sold === 0n) continue; // Skip zero-sold

      const deadline = rDeadline.result as bigint;
      const maxTickets = rMax.result as bigint;
      const entropyAddr = rEntropy.result as `0x${string}`;
      const providerAddr = rProvider.result as `0x${string}`;

      const isExpired = chunkNow >= deadline;
      const isFull = maxTickets > 0n && sold >= maxTickets;

      if (isExpired || isFull) {
        console.log(`⚡ Eligible: ${lottery}`);

        try {
          // Cache Key: entropy + provider
          const cacheKey = `${entropyAddr.toLowerCase()}:${providerAddr.toLowerCase()}`;
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

          const value = addBps(fee!, 2000n); // +20%

          const { request } = await client.simulateContract({
            account,
            address: lottery,
            abi: lotteryAbi,
            functionName: 'finalize',
            value: value
          });

          const hash = await wallet.writeContract(request);
          console.log(`   ✅ Tx Sent: ${hash}`);
          txCount++;
          
        } catch (e: any) {
          console.log(`   ⏭️ Simulation failed: ${e.shortMessage || "unknown"}`);
        }
      }
    }
  }
}
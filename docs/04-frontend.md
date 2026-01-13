# Frontend Specification (v1.x)

## Non-negotiables
1. On-chain truth only (no fake activity or winners)
2. Avoid obviously reverting transactions (preflight checks)
3. Events for UX, state reads for verification
4. If state is unclear, disable writes and prompt refresh

## Network
- Etherlink Mainnet (chainId 42793)

## Canonical addresses (UI constants)
- USDC: `0x796Ea11Fa2dD751eD01b53C372fFDB4AAa8f00F9`
- Pyth Entropy: `0x2880aB155794e7179c9eE2e38200202908C17B43`
- Default provider: `0x52DeaA1c84233F7bb8C8A45baeDE41091c616506`

> The deployer stores “defaults” for new raffles. The UI should show those defaults in Create.

## Home page sections (no indexer required)
- Section A: **3 biggest winning pots**
- Section B: **5 expiring soon**

Implementation:
- paginate registry → read raffle summaries via multicall → sort client-side.
- For performance, cap the scan window (e.g., last N raffles) and progressively enhance.

## Explore page
- List raffles from registry.
- Must use multicall batching to avoid N+1 RPC calls.

## Verified vs Registered
Do not equate “registered” with “official”.

Badges:
- **Official Verified:** registry typeId matches expected type AND lottery `deployer()` is in official allowlist.
- **Registered:** registry typeId > 0 but deployer not in allowlist.

Explain Verified badge in friendly words:
> “Verified means this raffle was created using the official Ppopgi rulebook and recorded in our public registry.”

## Raffle detail must display (in a Details/Transparency modal)
- raffle address
- creator
- deployer
- fee percent + fee recipient
- entropy contract + provider
- links to explorer

## Fee quoting (critical)
When drawing:
- fee must be computed using the raffle’s own settings:
  - `fee = Entropy(lottery.entropy()).getFee(lottery.entropyProvider())`

## Refund flow (Canceled)
Two-step:
1) `claimTicketRefund()` allocates refund to claimable
2) `withdrawFunds()` transfers USDC

## Indexing strategy (scalable path)
### v1 (no indexer)
- Discovery: registry pagination + contract reads
- Sorting: client-side over a limited scan window (recent raffles)
- User history: localStorage + event queries for the connected wallet

### v2 (recommended)
Add an indexer (The Graph / custom) for:
- full-history sorting across all time
- “my raffles” across devices
- analytics, search, trending, etc.

## UX / graphical spec
Keep a non-technical tone (Pocket / Energy / Entry coins).
Put technical transparency behind a Details modal.
Avoid casino-like copy and fake urgency.
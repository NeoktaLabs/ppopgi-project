# frontend-technical-spec.md

# Ppopgi (뽑기) — Frontend Technical Specification (Etherlink Mainnet)
**Version:** v1.1 (Aligned to pasted Solidity: `LotteryRegistry`, `SingleWinnerDeployer`, `LotterySingleWinner` v1.5)  
**Audience:** Frontend engineers, blockchain integrators  
**Goal:** Ship a smooth, correct, safe dApp UI that maps **1:1** to the deployed contracts on **Etherlink Mainnet**

---

## 0. Non-Negotiables

1. **On-chain truth only**
   - No simulated winners, fake timers, fake “recent activity”, or synthetic social proof.
   - Countdown timers are allowed, but must be derived from on-chain `deadline`.

2. **Never send a tx that will revert**
   - Preflight checks must prevent obvious reverts (wrong network, insufficient balances, allowance, not eligible state).

3. **Events first, RPC verification always**
   - Use events for live UX.
   - Always verify by reading contract state (websocket/RPC hiccups happen).

4. **Safety over convenience**
   - If any state is unclear, disable writes and prompt user to refresh/retry.

---

## 1. Network & Global Configuration

### 1.1 Target Network
- **Etherlink Mainnet**
- **Chain ID:** `42793`

### 1.2 Network Enforcement
If the user is on the wrong network:
- Disable: Create / Buy / Finalize / Claim / Refund / Admin actions
- Show a single CTA: **“Switch to Etherlink”**
- Once switched, re-fetch:
  - chainId
  - account
  - balances
  - registry page

### 1.3 Canonical Addresses (from your spec)
- **USDC:** `0x796Ea11Fa2dD751eD01b53C372fFDB4AAa8f00F9`
- **Pyth Entropy:** `0x2880aB155794e7179c9eE2e38200202908C17B43`
- **Entropy Provider:** `0x52DeaA1c84233F7bb8C8A45baeDE41091c616506`

> **Note:** These are constants in UI config. The Deployer also stores its own config (`usdc`, `entropy`, `entropyProvider`, `feeRecipient`, `protocolFeePercent`). The UI should display the Deployer-configured addresses as the “current default config”.

### 1.4 Units / Formatting Rules
- **USDC:** 6 decimals
- **XTZ / native:** 18 decimals (EVM native)
- `winningTicketIndex` is **0-based** on-chain; display **+1** in UI.

### 1.5 TOS Gate (Mandatory)
Block Create & Buy actions behind a checkbox:
- Must be explicitly checked at time of action
- Store acceptance in localStorage (per wallet+chain) but re-checkable

---

## 2. Contracts: Addresses & Responsibilities

### 2.1 LotteryRegistry (Forever Registry)
**Purpose**
- Keeps a forever list of registered lotteries.

**Storage / Public Reads**
- `owner() -> address`
- `allLotteries(uint256) -> address` (public array getter)
- `typeIdOf(address) -> uint256`
- `creatorOf(address) -> address`
- `registeredAt(address) -> uint64`
- `isRegistrar(address) -> bool`

**View Functions**
- `isRegisteredLottery(address) -> bool`
- `getAllLotteriesCount() -> uint256`
- `getAllLotteries(start, limit) -> address[]`
- `getLotteriesByTypeCount(typeId) -> uint256`
- `getLotteryByTypeAtIndex(typeId, index) -> address`
- `getLotteriesByType(typeId, start, limit) -> address[]`

**Events**
- `OwnershipTransferred(oldOwner, newOwner)`
- `RegistrarSet(registrar, authorized)`
- `LotteryRegistered(index, typeId, lottery, creator)`

**Custom Errors**
- `NotOwner`, `ZeroAddress`, `NotRegistrar`, `AlreadyRegistered`, `InvalidTypeId`

---

### 2.2 SingleWinnerDeployer (Factory)
**Purpose**
- Creates and funds `LotterySingleWinner`, transfers ownership to Safe, registers in registry (best effort).

**Public Reads**
- `owner()`
- `registry() -> LotteryRegistry`
- `safeOwner() -> address`
- `SINGLE_WINNER_TYPE_ID() -> uint256` (const = 1)
- `usdc()`, `entropy()`, `entropyProvider()`, `feeRecipient()`, `protocolFeePercent()`

**Writes**
- `createSingleWinnerLottery(name, ticketPrice, winningPot, minTickets, maxTickets, durationSeconds, minPurchaseAmount) -> lotteryAddr`
- `rescueRegistration(lotteryAddr, creator)` (owner-only)
- `setConfig(usdc, entropy, provider, fee, percent)` (owner-only)
- `transferOwnership(newOwner)` (owner-only)

**Events**
- `DeployerOwnershipTransferred(oldOwner, newOwner)`
- `ConfigUpdated(usdc, entropy, provider, feeRecipient, protocolFeePercent)`
- `LotteryDeployed(lottery, creator, winningPot, ticketPrice, name, usdc, entropy, entropyProvider, feeRecipient, protocolFeePercent, deadline, minTickets, maxTickets)`
- `RegistrationFailed(lottery, creator)`

**Custom Errors**
- `NotOwner`, `ZeroAddress`, `FeeTooHigh`, `NotAuthorizedRegistrar`, `InvalidRescueTarget`

---

### 2.3 LotterySingleWinner (Per-raffle instance)
**Purpose**
- Ticket sales + Entropy randomness + payouts for one raffle.

**Key Constants (UI must respect)**
- `MAX_BATCH_BUY = 1000`
- `HARD_CAP_TICKETS = 10_000_000`
- `PRIVILEGED_HATCH_DELAY = 1 days`
- `PUBLIC_HATCH_DELAY = 7 days`

**Core Reads**
- `status() -> uint8 enum` where:
  - `0 FundingPending`
  - `1 Open`
  - `2 Drawing`
  - `3 Completed`
  - `4 Canceled`
- `name()`
- `createdAt()`
- `deadline()`
- `ticketPrice()`
- `winningPot()`
- `ticketRevenue()`
- `minTickets()`
- `maxTickets()`
- `minPurchaseAmount()`
- `winner()`
- `entropyRequestId()`
- `drawingRequestedAt()`
- `soldAtDrawing()`
- `entropyProvider()` (current provider)
- `selectedProvider()` (provider used for current draw)
- `activeDrawings()`
- `ticketsOwned(user)`
- `claimableFunds(user)`
- `claimableNative(user)`
- `totalReservedUSDC()`
- `totalClaimableNative()`
- `creator()`
- `feeRecipient()`
- `protocolFeePercent()`
- `deployer()`

**View Functions**
- `getSold() -> uint256`
- `ticketRanges(uint256) -> (buyer, upperBound)` (public array getter)

**Writes**
- `buyTickets(count)` (USDC transferFrom user)
- `finalize()` payable (pays Entropy fee)
- `claimTicketRefund()`
- `withdrawFunds()`
- `withdrawNative()`
- `cancel()` (when expired + min not reached)
- `forceCancelStuck()` (Drawing + after delay)
- `sweepSurplus(to)` (owner-only)
- `setEntropyProvider(p)` (owner-only, requires no active drawings)
- `setEntropyContract(e)` (owner-only, requires no active drawings)
- `pause()` / `unpause()` (owner-only)

**Events**
- `TicketsPurchased(buyer, count, totalCost, totalSold, rangeIndex, isNewRange)`
- `LotteryFinalized(requestId, totalSold, provider)`
- `WinnerPicked(winner, winningTicketIndex, totalSold)`
- `PrizeAllocated(user, amount, reason)` where reason:
  - `1` winner payout
  - `2` creator revenue
  - `3` participant refund
  - `4` protocol fees
  - `5` creator pot refund
- `LotteryCanceled(reason, sold, ticketRevenue, potRefund)`
- `FundsClaimed(user, amount)`
- `NativeClaimed(user, amount)`
- `RefundAllocated(user, amount)`
- `NativeRefundAllocated(user, amount)`
- `SurplusSwept(to, amount)`
- `EntropyProviderUpdated(newProvider)`
- `EntropyContractUpdated(newContract)`
- `GovernanceLockUpdated(activeDrawings)`
- `FundingConfirmed(funder, amount)`
- `EmergencyRecovery()`
- `CallbackRejected(sequenceNumber, reasonCode)`
- `ProtocolFeesCollected(amount)`

**Custom Errors**
See section **10** (Exhaustive Error Map).

---

## 3. Pages & Required Features

### 3.1 Explore (Raffles List)
**Goal:** Show all verified raffles + indicate active vs closed.

**Data Sources**
1. Registry pagination:
   - `getAllLotteriesCount()`
   - `getAllLotteries(start, limit)`
2. For each address: read raffle contract:
   - `status()`, `deadline()`, `winningPot()`, `ticketPrice()`, `getSold()`, `maxTickets()`, `name()`

**Verification badge**
- Verified if `typeIdOf(lottery) > 0` OR `isRegisteredLottery(lottery) == true`.

**Active definition**
- Active raffles: status `Open` or `Drawing`.

**Pagination**
- Implement pagination / infinite scroll based on registry count.
- Cache pages (memory) to avoid re-fetching on minor UI interactions.

---

### 3.2 Raffle Detail
**Goal:** One page per raffle address.

**Mandatory reads**
- `name`, `status`, `ticketPrice`, `winningPot`, `getSold()`, `deadline`
- `minTickets`, `maxTickets`, `minPurchaseAmount`
- `winner`, `entropyRequestId`, `drawingRequestedAt`, `selectedProvider`
- `ticketsOwned(user)`
- `claimableFunds(user)`, `claimableNative(user)`

**Derived UI values**
- `isExpired = now >= deadline`
- `isSoldOut = maxTickets > 0 && sold >= maxTickets`
- `isFinalizeEligible = status == Open && (isExpired || isSoldOut) && entropyRequestId == 0`
- Display odds (UX): `ticketsOwned / sold` (if sold > 0)

**Ticket ownership proof visualization (optional)**
- Read `ticketRanges(i)` progressively (do not load all at once if large).
- Only needed for advanced “proof view”; do not block core UX.

---

### 3.3 Create Raffle
**Write**
- `SingleWinnerDeployer.createSingleWinnerLottery(...)`

**Inputs**
- `name` (string): frontend may prepend emoji and a space.
- `ticketPrice` (USDC 6 decimals)
- `winningPot` (USDC 6 decimals)
- `minTickets` (uint64)
- `maxTickets` (uint64, 0 = unlimited)
- `durationSeconds` (uint64)
- `minPurchaseAmount` (uint32, 0 = none; else enforced)

**Preflight checks (must)**
- Wallet connected
- Correct chainId
- USDC balance >= `winningPot`
- USDC allowance for **deployer** >= `winningPot`
- Validate: `protocolFeePercent <= 20` (read from deployer and display)
- Validate duration:
  - `>= 600` seconds (10 minutes)
  - `<= 365 days`
- If `ticketPrice` is very low and creator sets `minPurchaseAmount` too small:
  - Be aware the contract will revert with `BatchTooCheap` based on:
    - `requiredMinPrice = ceil(MIN_NEW_RANGE_COST / minEntry)`
  - Frontend should compute and warn:
    - `minEntry = (minPurchaseAmount == 0) ? 1 : minPurchaseAmount`
    - `requiredMinPrice = ceil(1_000_000 / minEntry)` (in USDC base units)
    - require `ticketPrice >= requiredMinPrice`
  - Also, for player UX, enforce your “>= $1 per purchase strip” rule.

**Post-success**
- Get the new `lotteryAddr` from tx logs (`LotteryDeployed`) or return value.
- Deep-link to `/lottery/<addr>`.

**Registry failure handling (mandatory)**
- If the tx emitted `RegistrationFailed(lottery, creator)`:
  - Display a strong warning
  - Show and copy the raffle address
  - Save it to localStorage as a “Known raffle” so the user can access it later even if not on list.

---

### 3.4 Prize Counter (Claims Center)
**Goal:** Global place to claim funds/refunds across multiple raffles.

**Indexing strategy**
- Primary: index `PrizeAllocated(user, amount, reason)` events for the connected wallet.
- Secondary fallback: localStorage list of interacted raffles (created, purchased, visited).

**For each raffle in claims list**
- Read `claimableFunds(user)` and `claimableNative(user)` and display both.
- Enable:
  - `withdrawFunds()` if claimableFunds > 0
  - `withdrawNative()` if claimableNative > 0

**Collect All**
- Sequential transactions (one per withdrawal call).
- Display: “X claims = X signatures”
- If one tx fails, continue to next only if safe; otherwise stop and show details.

---

### 3.5 Admin (Safe only)
**Visibility**
- Only show admin tools if `connectedAccount == safeOwner` OR `connectedAccount == registry.owner()` / deployer owner (depending on page).
- Otherwise hide (do not just disable).

**Admin actions**
1. Factory config:
   - `setConfig(usdc, entropy, provider, feeRecipient, percent)`
2. Rescue registration:
   - `rescueRegistration(lotteryAddr, creator)`
3. Registry registrar management (if UI includes registry admin):
   - `setRegistrar(registrar, authorized)`

**Admin preflight checks**
- Always verify the connected account before enabling an admin action.
- Validate addresses are non-zero.
- For rescue registration, pre-read:
  - `lotteryAddr.code.length > 0` (front-end check)
  - Read `LotterySingleWinner(lotteryAddr).deployer()` equals deployer address
  - Read `LotterySingleWinner(lotteryAddr).owner()` equals `safeOwner`

---

## 4. Transaction Flows & Preflight Checks

### 4.1 Wallet Connection
- Support EVM wallets (e.g., MetaMask).
- On connect:
  - Get chainId
  - Get account
  - Fetch balances (USDC + native)
  - Preload registry page 0

### 4.2 ERC20 Approvals (USDC)
**Required approvals**
- Create flow: approve the **deployer** to transfer `winningPot`.
- Buy flow: approve the **raffle** to transfer `ticketPrice * count`.

**UX**
- Show current allowance
- Offer:
  - Approve exact
  - Approve max
- Allowance must be re-fetched after approve tx confirmation.

### 4.3 Buy Tickets
**Write:** `LotterySingleWinner.buyTickets(count)`

**Preflight must prevent**
- Wrong chain
- Not connected
- `status != Open`
- `now >= deadline`
- `count == 0`
- `count > 1000`
- `minPurchaseAmount > 0 && count < minPurchaseAmount`
- `maxTickets > 0 && sold + count > maxTickets`
- `sold + count > HARD_CAP_TICKETS`
- `msg.sender == creator` (block in UI)

**Cost**
- `totalCost = ticketPrice * count`

**Balance/Allowance**
- USDC balance >= totalCost
- Allowance to raffle >= totalCost

**After tx**
- Listen for `TicketsPurchased`
- Re-read:
  - `getSold()`
  - `ticketsOwned(user)`
  - `ticketRevenue()`
  - `claimableFunds(user)` (optional)
- Update odds display

### 4.4 Finalize
**Write:** `LotterySingleWinner.finalize()` payable

**Eligibility**
- `status == Open`
- `entropyRequestId == 0`
- AND (expired OR sold out)

**Preflight**
- Read fee: `entropy.getFee(entropyProvider)`
- Ensure user native balance >= fee (plus a buffer for gas)
- Show fee explicitly in UI

**Send tx**
- `value = fee` (or fee + small buffer if you want, contract refunds excess)

**After tx**
- Listen for `LotteryFinalized`
- Update state to Drawing
- Show “waiting for callback”
- Poll:
  - `status()` until Completed or Canceled
  - `winner()` once Completed

### 4.5 Refund flow (Canceled)
Two-step:
1. `claimTicketRefund()` allocates USDC to `claimableFunds`
2. `withdrawFunds()` transfers USDC out

**Eligibility**
- status must be `Canceled`
- `ticketsOwned(user) > 0` for claimTicketRefund
- `claimableFunds(user) > 0` for withdrawFunds

### 4.6 Withdrawals
- `withdrawFunds()` for USDC
- `withdrawNative()` for native (XTZ)

After withdrawal:
- Re-read claimables
- Update “Prize Counter” totals

---

## 5. Events & Indexing (Hybrid Strategy)

### 5.1 Must-index Events
For a complete UX, index the following:

**Factory**
- `LotteryDeployed(...)` → discovery + metadata
- `RegistrationFailed(lottery, creator)` → hidden raffles + admin alert

**Raffle**
- `TicketsPurchased(buyer, ...)` → ticket stub history
- `LotteryFinalized(requestId, ...)` → drawing started
- `WinnerPicked(winner, ...)` → winner history
- `LotteryCanceled(reason, ...)` → refunds prompt
- `PrizeAllocated(user, amount, reason)` → claimables list

### 5.2 RPC fallback
If events are missing:
- Always verify the canonical state by reading:
  - `status()`
  - `winner()`
  - `claimableFunds(user)`
  - `claimableNative(user)`
  - `getSold()`

### 5.3 localStorage fallback
Maintain a set keyed by `chainId + walletAddress`:
- raffles created
- raffles purchased
- raffles visited (optional)

Use it to rebuild claims view even if indexing is unavailable.

---

## 6. Status → UI State Contract (Engineering)

Map contract enum to deterministic UI states:

- FundingPending (0)
  - disable buy/finalize
  - show “setup” state
- Open (1)
  - allow buy
  - allow finalize only if eligible
- Drawing (2)
  - disable buy/finalize
  - show draw state, poll for completion
- Completed (3)
  - show winner
  - show claimables and claim buttons
- Canceled (4)
  - show refund flow (claimTicketRefund then withdrawFunds)
  - show creator pot refund if creator

---

## 7. Admin & Operational Considerations

### 7.1 Safe as Owner
- `LotterySingleWinner.owner()` is transferred to `safeOwner` by factory.
- All owner-only methods require Safe execution:
  - `pause/unpause`
  - `sweepSurplus`
  - `setEntropyProvider`
  - `setEntropyContract`

### 7.2 Governance locks
- `setEntropyProvider` and `setEntropyContract` revert if `activeDrawings != 0` (`DrawingsActive`).
- UI must:
  - read `activeDrawings()`
  - disable these settings while activeDrawings > 0

### 7.3 Emergency hatch
- `forceCancelStuck()` only works when `status == Drawing`.
- Delay rules:
  - privileged (owner or creator): after `drawingRequestedAt + 1 day`
  - public: after `drawingRequestedAt + 7 days`
- UI must:
  - display time remaining
  - disable until eligible

---

## 8. Performance Requirements

- Avoid N+1 calls:
  - Use multicall batching where possible for lists.
- For large registries:
  - paginate and lazy load
- Do not load all `ticketRanges` by default; it can be large.

---

## 9. Security & UX Safety Requirements

- Always display contract addresses (or explorer links) for transparency.
- Always show the exact token amounts and decimals.
- Never show “near miss” numerically; only thematic.
- Never auto-send transactions; always require explicit click.

---

## 10. Exhaustive Error Map (Contract-Derived)

### 10.1 LotteryRegistry Errors
- `NotOwner`
- `ZeroAddress`
- `NotRegistrar`
- `AlreadyRegistered`
- `InvalidTypeId`

### 10.2 SingleWinnerDeployer Errors
- `NotOwner`
- `ZeroAddress`
- `FeeTooHigh`
- `NotAuthorizedRegistrar`
- `InvalidRescueTarget`

### 10.3 LotterySingleWinner Errors (Complete)
**Create/Setup**
- `InvalidEntropy`
- `InvalidProvider`
- `InvalidUSDC`
- `InvalidFeeRecipient`
- `InvalidCreator`
- `FeeTooHigh`
- `NameEmpty`
- `DurationTooShort`
- `DurationTooLong`
- `InvalidPrice`
- `InvalidPot`
- `InvalidMinTickets`
- `MaxLessThanMin`
- `BatchTooCheap`

**Funding**
- `NotDeployer`
- `NotFundingPending`
- `FundingMismatch`

**Buy**
- `LotteryNotOpen`
- `LotteryExpired`
- `TicketLimitReached`
- `CreatorCannotBuy`
- `InvalidCount`
- `BatchTooLarge`
- `BatchTooSmall`
- `TooManyRanges`
- `Overflow`
- `UnexpectedTransferAmount`

**Finalize/Entropy**
- `RequestPending`
- `NotReadyToFinalize`
- `NoParticipants`
- `InsufficientFee`
- `InvalidRequest`
- `UnauthorizedCallback`

**Cancel/Emergency**
- `NotDrawing`
- `CannotCancel`
- `NotCanceled`
- `EarlyCancellationRequest`
- `EmergencyHatchLocked`

**Claims/Accounting**
- `NothingToClaim`
- `NothingToRefund`
- `NativeRefundFailed`
- `ZeroAddress`
- `NoSurplus`
- `DrawingsActive`
- `AccountingMismatch`

**Revert strings**
- `Pausable: paused`
- Ownable revert string (depends on OZ version): treat as “not owner”

> UI must map these to sticky copy defined in `frontend-ux-product-spec.md`.

---

## 11. QA Checklist (Minimum for Release)

### Network
- [ ] Wrong network blocks all writes and offers switch CTA
- [ ] Correct network enables writes after refresh

### Create
- [ ] Approve flow works (exact + max)
- [ ] Deployment emits `LotteryDeployed` and deep-links
- [ ] If `RegistrationFailed`, address shown + stored

### Buy
- [ ] Preflight prevents known revert cases
- [ ] TicketsPurchased updates sold + owned
- [ ] Odds display updates correctly

### Finalize
- [ ] Fee read and displayed correctly
- [ ] tx sends correct `value`
- [ ] UI transitions to Drawing, then to Completed via polling+events

### Claims
- [ ] PrizeAllocated indexing builds claim list
- [ ] withdrawFunds reduces claimableFunds
- [ ] withdrawNative works, and handles failure path (NativeRefundAllocated)

### Canceled refunds
- [ ] claimTicketRefund sets claimableFunds
- [ ] withdrawFunds transfers refund

### Admin
- [ ] Only visible to Safe owner / authorized account
- [ ] rescueRegistration guarded and validates target

---

## 12. Implementation Notes (Recommended)

- Use a robust EVM library (e.g., viem / wagmi) with:
  - chain enforcement
  - typed ABIs
  - event watching + fallback polling
- Use multicall for list rendering.
- Maintain a consistent “data refresh policy”:
  - On each confirmed tx, refresh only relevant reads (not full app reload).

---
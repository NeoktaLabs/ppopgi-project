# Smart Contracts

## Network
- Network: Etherlink Mainnet
- Chain ID: 42793
- Native token: XTZ

## Ownership
All admin-controlled contracts are owned by an **Etherlink Safe multisig**.

**Safe address (owner):

---

## Contracts

### LotteryRegistry
Permanent registry of lotteries.

- Address: `TBD`
- Owner: Safe
- Responsibilities:
  - authorize deployers
  - index lottery addresses
  - provide pagination helpers

### SingleWinnerDeployer
Factory for single-winner raffles.

- Address: `TBD`
- Owner: Safe
- Responsibilities:
  - deploy lotteries
  - fund initial prize
  - register lotteries in registry

### LotterySingleWinner
Individual raffle instance.

- Deployed per raffle
- Immutable parameters:
  - ticket price
  - prize amount
  - fee recipient
  - fee percentage
- Pull-based payouts only
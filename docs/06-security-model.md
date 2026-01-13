# Security Model

## What users must trust
- Smart contract code as deployed
- Pyth Entropy randomness delivery assumptions
- The chain itself (Etherlink)

Users do NOT need to trust:
- the frontend
- the finalizer bot
- any centralized server

## Key protections
- Pull-based withdrawals (no push payouts)
- Escrowed liabilities accounting:
  - USDC liabilities tracked by `totalReservedUSDC`
  - native liabilities tracked by `totalClaimableNative`
- Reentrancy protection on value-moving entrypoints
- Callback verification (entropy contract + request id + provider)
- Cancel paths if randomness gets stuck

## Admin powers (Safe)
Admin can:
- pause/unpause
- update entropy/provider only when no active drawings
- sweep surplus above liabilities

Admin cannot:
- change fee recipient for existing raffles
- change fee percent for existing raffles
- withdraw user funds that are reserved liabilities
- pick winners or influence entropy output
# Deployments

## Etherlink Mainnet (chainId 42793)
Explorer: https://explorer.etherlink.com

### Protocol owner (Safe)
- Safe: `0xe47fF5713ea90805B75bcDD93b888e076AeD9B2B`

### Canonical dependencies
- USDC: `0x796Ea11Fa2dD751eD01b53C372fFDB4AAa8f00F9`
- Pyth Entropy: `0x2880aB155794e7179c9eE2e38200202908C17B43`
- Default Provider: `0x52DeaA1c84233F7bb8C8A45baeDE41091c616506`

### Protocol contracts
> Fill after successful deployment (verify with bytecode).

- LotteryRegistry: `TBD`
- SingleWinnerDeployer: `TBD`

### Verification checklist
Because explorers may not show contract tabs:
- verify bytecode exists (`eth_getCode` / `viem getBytecode`)
- verify `owner()` returns the Safe
- verify deployer `registry()` returns the registry address
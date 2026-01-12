// src/config/contracts.ts

// 1. Helper to get env vars safely
const getEnv = (key: string, required: boolean = true): string => {
  // In Vite, env vars are accessed via import.meta.env
  // For hardcoded fallbacks during dev, we use || ""
  return import.meta.env?.[key] || "";
};

// 2. Global Constants
export const CHAIN_ID = 42793; // Etherlink Mainnet
export const EXPLORER_BASE_URL = "https://explorer.etherlink.com";

// 3. Contract Addresses (Environment + Defaults)
export const CONTRACT_ADDRESSES = {
  // ⚠️ PASTE YOUR DEPLOYED ADDRESSES HERE
  factory: "0xYOUR_FACTORY_ADDRESS_HERE" as `0x${string}`,
  registry: "0xYOUR_REGISTRY_ADDRESS_HERE" as `0x${string}`,
  usdc: "0x796Ea11Fa2dD751eD01b53C372fFDB4AAa8f00F9" as `0x${string}`, // Official Etherlink USDC
  
  // Infrastructure
  entropy: "0x2880aB155794e7179c9eE2e38200202908C17B43" as `0x${string}`,
  entropyProvider: "0x52DeaA1c84233F7bb8C8A45baeDE41091c616506" as `0x${string}`
} as const;

// 4. Verification
// If a raffle's deployer matches this, it gets the Gold Checkmark
export const OFFICIAL_DEPLOYER_ADDRESS = CONTRACT_ADDRESSES.factory;

// 5. Helpers
export const getExplorerAddressUrl = (address: string) => `${EXPLORER_BASE_URL}/address/${address}`;
export const getExplorerTxUrl = (txHash: string) => `${EXPLORER_BASE_URL}/tx/${txHash}`;

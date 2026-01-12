// src/contracts/abis.ts

export const ERC20_ABI = [
  {
    name: 'approve',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'spender', type: 'address' }, { name: 'amount', type: 'uint256' }],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    name: 'allowance',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'owner', type: 'address' }, { name: 'spender', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'decimals',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint8' }],
  },
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  }
] as const;

export const FACTORY_ABI = [
  {
    name: 'createSingleWinnerLottery',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'name', type: 'string' },
      { name: 'ticketPrice', type: 'uint256' },
      { name: 'winningPot', type: 'uint256' },
      { name: 'minTickets', type: 'uint64' },
      { name: 'maxTickets', type: 'uint64' },
      { name: 'durationSeconds', type: 'uint64' },
      { name: 'minPurchaseAmount', type: 'uint32' }
    ],
    outputs: [{ name: 'lotteryAddr', type: 'address' }]
  },
  {
    name: 'owner',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'address' }]
  }
] as const;

export const LOTTERY_ABI = [
  {
    name: 'buyTickets',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'count', type: 'uint256' }],
    outputs: []
  },
  { name: 'ticketPrice', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'uint256' }] },
  { name: 'winningPot', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'uint256' }] },
  { name: 'getSold', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'uint256' }] },
  { name: 'deadline', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'uint64' }] },
  { name: 'name', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'string' }] }
] as const;

// ⚠️ UPDATE THESE AFTER DEPLOYMENT
export const CONTRACT_ADDRESSES = {
  factory: "0xYOUR_FACTORY_ADDRESS", 
  usdc: "0xYOUR_USDC_ADDRESS" 
} as const;
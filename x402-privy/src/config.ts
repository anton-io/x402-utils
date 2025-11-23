// Configuration for the x402 app

export const config = {
  // Privy App ID
  privyAppId: import.meta.env.VITE_PRIVY_APP_ID || '',

  // Backend API URL
  apiUrl: import.meta.env.VITE_API_URL || 'http://localhost:8990',

  // Base Sepolia Network Configuration
  baseSepolia: {
    chainId: 84532,
    name: 'Base Sepolia',
    rpcUrl: 'https://base-sepolia-rpc.publicnode.com',
    blockExplorer: 'https://sepolia.basescan.org',
  },

  // Token Configuration (matches backend config)
  token: {
    address: '0x7143401013282067926d25e316f055fF3bc6c3FD',
    symbol: 'U',
    decimals: 18,
  },
} as const;

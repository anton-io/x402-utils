# x402 Protocol - Privy Frontend

A React + TypeScript frontend implementing the x402 payment protocol using [Privy](https://privy.io) for wallet integration.

## Features

- **Privy Integration**: Seamless wallet connection with embedded wallets
- **x402 Payment Flow**: Automatic payment handling for API execution
- **Base Sepolia Support**: Built for Base Sepolia testnet
- **Real-time Streaming**: SSE-based job output streaming
- **Modern UI**: Clean, terminal-style interface

## Quick Start

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment:**
   ```bash
   cp .env.example .env
   # Edit .env and add your Privy App ID from https://dashboard.privy.io
   ```

3. **Run the development server:**
   ```bash
   npm run dev
   ```

4. **Open in browser:**
   Navigate to http://localhost:3001

## Configuration

### Environment Variables

- `VITE_PRIVY_APP_ID`: Your Privy app ID (get from https://dashboard.privy.io)
- `VITE_API_URL`: Backend API URL (default: http://localhost:8990)

### Privy Setup

1. Sign up at https://dashboard.privy.io
2. Create a new app
3. Copy your App ID to `.env`
4. Configure supported chains to include Base Sepolia (Chain ID: 84532)

## How It Works

### x402 Payment Flow

1. **Connect Wallet**: User authenticates with Privy (embedded wallet or external)
2. **Request Job**: User selects job type and parameters
3. **402 Response**: Backend returns payment required with details
4. **Payment Authorization**: Privy handles EIP-712 signature for USDC transfer
5. **Verification**: Frontend polls backend until payment confirmed
6. **Execution**: Job executes and streams results via SSE

### Using Privy's x402 Hook

```typescript
const { wrapFetchWithPayment } = useX402Fetch();

const fetchWithPayment = wrapFetchWithPayment({
  walletAddress: wallets[0].address,
  fetch: fetch,
});

// Privy automatically handles 402 responses
const response = await fetchWithPayment('http://api.example.com/job');
```

## Architecture

- **React 19**: Modern React with hooks
- **TypeScript**: Full type safety
- **Vite**: Fast build tool and dev server
- **Privy**: Wallet infrastructure and x402 support
- **EventSource**: SSE for real-time job output

## Development

```bash
# Run dev server (http://localhost:3001)
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Lint code
npm run lint
```

## Network Details

- **Network**: Base Sepolia
- **Chain ID**: 84532
- **RPC**: https://base-sepolia-rpc.publicnode.com
- **Token**: U Token at 0x7143401013282067926d25e316f055fF3bc6c3FD
- **Explorer**: https://sepolia.basescan.org

## Resources

- [Privy Docs](https://docs.privy.io)
- [x402 Protocol](https://docs.privy.io/recipes/x402)
- [Base Sepolia Faucet](https://www.coinbase.com/faucets/base-ethereum-goerli-faucet)
- [Backend API](../backend/)

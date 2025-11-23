# Cross-Chain Deployment Guide

Simple step-by-step guide to deploy and use the U OFT token on Sepolia ↔ Base Sepolia testnets.

## Quick Start

### 1. Get Testnet ETH

Get ~0.5 ETH on each testnet:

**Sepolia:**
- https://sepoliafaucet.com/
- https://www.infura.io/faucet/sepolia

**Base Sepolia:**
- https://www.coinbase.com/faucets/base-ethereum-sepolia-faucet
- Or bridge from Sepolia: https://bridge.base.org/

### 2. Configure Environment

Copy the example environment file:
```bash
cp .env.example .env
```

Edit `.env` and add your credentials:
```bash
# Required
PRIVATE_KEY=your_private_key_without_0x_prefix

# RPC URLs (choose one option for each)
SEPOLIA_RPC_URL=https://ethereum-sepolia-rpc.publicnode.com
BASE_SEPOLIA_RPC_URL=https://base-sepolia-rpc.publicnode.com

# Or use Alchemy/Infura (more reliable):
# SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR-API-KEY
# BASE_SEPOLIA_RPC_URL=https://base-sepolia.g.alchemy.com/v2/YOUR-API-KEY

# Optional (for contract verification)
ETHERSCAN_API_KEY=your_etherscan_api_key
BASESCAN_API_KEY=your_basescan_api_key
```

**Note:** The LayerZero endpoint addresses are already configured in `.env.example`.

## Deployment Steps

### Step 1: Deploy to Sepolia

```bash
npx hardhat run scripts/deploy.ts --network sepolia
```

Save the deployed contract address shown in the output.

### Step 2: Deploy to Base Sepolia

```bash
npx hardhat run scripts/deploy.ts --network baseSepolia
```

Save this address too.

### Step 3: Update .env with Addresses

The deployment script automatically adds the addresses to your `.env` file, but verify they're there:

```bash
SEPOLIA_OFT_ADDRESS=0x...
BASE_SEPOLIA_OFT_ADDRESS=0x...
```

### Step 4: Configure Peer Relationships

Set Sepolia's peer (Base Sepolia):
```bash
npx hardhat run scripts/setPeers.ts --network sepolia
```

Set Base Sepolia's peer (Sepolia):
```bash
npx hardhat run scripts/setPeers.ts --network baseSepolia
```

You should see "✓ Peer verified successfully!" for both.

## Usage

### Check Token Balance

```bash
# Check balance on Sepolia
npx hardhat run scripts/checkBalance.ts --network sepolia

# Check balance on Base Sepolia
npx hardhat run scripts/checkBalance.ts --network baseSepolia
```

### Mint Tokens

```bash
# Mint 100 tokens on Sepolia (default)
npx hardhat run scripts/mint.ts --network sepolia

# Mint custom amount
MINT_AMOUNT=50 npx hardhat run scripts/mint.ts --network sepolia

# Mint to specific address
MINT_TO_ADDRESS=0x... npx hardhat run scripts/mint.ts --network baseSepolia
```

### Transfer Tokens Cross-Chain

The `transfer.ts` script automatically detects which network you're on and sends to the other network:

```bash
# Send from Sepolia → Base Sepolia
npx hardhat run scripts/transfer.ts --network sepolia

# Send from Base Sepolia → Sepolia
npx hardhat run scripts/transfer.ts --network baseSepolia

# Custom amount (default is 5 tokens)
TRANSFER_AMOUNT=10 npx hardhat run scripts/transfer.ts --network sepolia

# Send to different recipient
RECIPIENT_ADDRESS=0x... npx hardhat run scripts/transfer.ts --network sepolia
```

**Wait 5-10 minutes** for LayerZero to deliver the message, then check the recipient's balance on the destination chain.

### Track Cross-Chain Messages

Every transfer shows a LayerZero Scan URL in the output:
```
🔍 Track your message:
LayerZero Scan: https://testnet.layerzeroscan.com/tx/0x...
```

Use this to monitor delivery status in real-time.

## Complete Example Workflow

```bash
# 1. Deploy to both networks
npx hardhat run scripts/deploy.ts --network sepolia
npx hardhat run scripts/deploy.ts --network baseSepolia

# 2. Set up peer relationships
npx hardhat run scripts/setPeers.ts --network sepolia
npx hardhat run scripts/setPeers.ts --network baseSepolia

# 3. Mint some tokens on Sepolia
MINT_AMOUNT=1000 npx hardhat run scripts/mint.ts --network sepolia

# 4. Check balance
npx hardhat run scripts/checkBalance.ts --network sepolia

# 5. Send 10 tokens to Base Sepolia
TRANSFER_AMOUNT=100 npx hardhat run scripts/transfer.ts --network sepolia

# 6. Wait ~5 minutes, then check Base Sepolia
npx hardhat run scripts/checkBalance.ts --network baseSepolia

# 7. Send 5 tokens back to Sepolia
TRANSFER_AMOUNT=5 npx hardhat run scripts/transfer.ts --network baseSepolia

# 8. Wait ~5 minutes, then check Sepolia
npx hardhat run scripts/checkBalance.ts --network sepolia
```

## Available Scripts

| Script | Purpose | Networks |
|--------|---------|----------|
| `deploy.ts` | Deploy OFT contract | Any supported network |
| `setPeers.ts` | Configure cross-chain peer | Both networks |
| `mint.ts` | Mint tokens (owner only) | Either network |
| `transfer.ts` | Send tokens cross-chain | Either network (auto-detects) |
| `checkBalance.ts` | View token balance | Either network |

## Important Notes

- **Delivery Time:** Cross-chain transfers take 5-10 minutes on testnets
- **Fees:** Each transfer costs ~0.00002-0.0001 ETH in LayerZero fees
- **Peer Setup:** Must be done on BOTH networks before transfers work
- **Owner Only:** Only the deployer can mint tokens
- **Balance Required:** You need tokens on the source chain to transfer

## Troubleshooting

### RPC Timeout Errors

If you see timeout errors, try using Alchemy or Infura instead of public RPCs:
1. Sign up at https://www.alchemy.com/ (free)
2. Create apps for Sepolia and Base Sepolia
3. Update your `.env` with the API URLs

### "Insufficient Balance" Error

You need to mint tokens first:
```bash
npx hardhat run scripts/mint.ts --network sepolia
```

### "Peer Not Set" Error

Make sure you ran `setPeers.ts` on BOTH networks:
```bash
npx hardhat run scripts/setPeers.ts --network sepolia
npx hardhat run scripts/setPeers.ts --network baseSepolia
```

### Tokens Not Received

- Wait at least 5-10 minutes
- Check LayerZero Scan for message status
- Verify peer relationships are set correctly on both chains

## Contract Verification (Optional)

After deployment, you can verify contracts on block explorers:

```bash
# Verify on Sepolia
npx hardhat verify --network sepolia DEPLOYED_ADDRESS "U Token" "U" "0x6EDCE65403992e310A62460808c4b910D972f10f" "YOUR_OWNER_ADDRESS"

# Verify on Base Sepolia
npx hardhat verify --network baseSepolia DEPLOYED_ADDRESS "U Token" "U" "0x6EDCE65403992e310A62460808c4b910D972f10f" "YOUR_OWNER_ADDRESS"
```

## Cost Summary (Testnet)

- Deploy to Sepolia: ~0.01-0.02 ETH
- Deploy to Base Sepolia: ~0.001-0.002 ETH
- Set peer (each): ~0.001 ETH
- Cross-chain transfer: ~0.00002-0.0001 ETH

**Total for full setup:** ~0.05 ETH across both networks

## Reference Information

### LayerZero V2 Endpoints

Both networks use the same endpoint contract:
- **Address:** `0x6EDCE65403992e310A62460808c4b910D972f10f`
- **Sepolia EID:** `40161`
- **Base Sepolia EID:** `40245`

### Network Details

**Sepolia:**
- Chain ID: `11155111`
- Block Explorer: https://sepolia.etherscan.io/

**Base Sepolia:**
- Chain ID: `84532`
- Block Explorer: https://sepolia.basescan.org/

### Useful Links

- LayerZero Docs: https://docs.layerzero.network/
- LayerZero Testnet Scan: https://testnet.layerzeroscan.com/
- Base Bridge: https://bridge.base.org/

## Need Help?

Check out the comprehensive test suite:
```bash
npm test
```

The tests demonstrate all OFT functionality including deployment, minting, transfers, and peer configuration.

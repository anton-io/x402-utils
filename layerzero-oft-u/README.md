# U Token - Cross-Chain Omnichain Fungible Token

A LayerZero V2 Omnichain Fungible Token (OFT) implementation deployed on Sepolia and Base Sepolia testnets, enabling seamless cross-chain token transfers.

## What We Built

We've created and deployed a cross-chain fungible token called "U Token" (symbol: U) that can be transferred between Sepolia and Base Sepolia testnets using LayerZero's V2 protocol. The token is fully ERC20-compatible and can move across chains in ~5-10 minutes.

## Deployed Contracts

| Network | Contract Address | Explorer |
|---------|-----------------|----------|
| **Sepolia** | `0x8cd8999C4927d79A11cAa6009177887Bc4B1344e` | [View on Etherscan](https://sepolia.etherscan.io/address/0x8cd8999C4927d79A11cAa6009177887Bc4B1344e) |
| **Base Sepolia** | `0x82cabCB0F84d088218c22482737e6BB777FA980f` | [View on Basescan](https://sepolia.basescan.org/address/0x82cabCB0F84d088218c22482737e6BB777FA980f) |

**Owner Address:** `0xE20cAdBF59f7774e1F60fe6d2533A5386740B2dB`

**LayerZero Endpoint (both networks):** `0x6EDCE65403992e310A62460808c4b910D972f10f`

## What You Can Do

### 1. Mint Tokens

Mint new tokens on either network (owner only):

```bash
# Mint 100 tokens on Sepolia
npx hardhat run scripts/mint.ts --network sepolia

# Mint 50 tokens on Base Sepolia
MINT_AMOUNT=50 npx hardhat run scripts/mint.ts --network baseSepolia

# Mint to specific address
MINT_TO_ADDRESS=0x... npx hardhat run scripts/mint.ts --network sepolia
```

### 2. Check Balances

View token balance on any network:

```bash
# Check balance on Sepolia
npx hardhat run scripts/checkBalance.ts --network sepolia

# Check balance on Base Sepolia
npx hardhat run scripts/checkBalance.ts --network baseSepolia
```

### 3. Transfer Cross-Chain

Send tokens between networks (automatically detects source/destination):

```bash
# Transfer 5 tokens from Sepolia → Base Sepolia
npx hardhat run scripts/transfer.ts --network sepolia

# Transfer 10 tokens from Base Sepolia → Sepolia
TRANSFER_AMOUNT=10 npx hardhat run scripts/transfer.ts --network baseSepolia

# Send to different recipient
RECIPIENT_ADDRESS=0x... npx hardhat run scripts/transfer.ts --network sepolia
```

**Note:** Transfers take ~5-10 minutes to complete. Track progress at:
https://testnet.layerzeroscan.com/

For example: 
https://testnet.layerzeroscan.com/tx/0xa5f31a567b0d0c029c2714db221cbecf54723f4099eb69a2cc7bc7b51a444b3f


### 4. Deploy to New Networks

Deploy the token to additional networks:

```bash
npx hardhat run scripts/deploy.ts --network <network-name>
```

Then configure peer relationships:

```bash
npx hardhat run scripts/setPeers.ts --network <network-name>
```

## Available Scripts

| Script | Purpose |
|--------|---------|
| `scripts/mint.ts` | Mint new tokens (owner only) |
| `scripts/checkBalance.ts` | Check token balance |
| `scripts/transfer.ts` | Transfer tokens cross-chain |
| `scripts/deploy.ts` | Deploy to new networks |
| `scripts/setPeers.ts` | Configure peer relationships |
| `scripts/verify.ts` | Get contract verification info |

## Using U Token in Your Project

### In Smart Contracts

The U token is a standard ERC20 token, so you can interact with it like any other ERC20:

```solidity
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract MyContract {
    IERC20 public uToken = IERC20(0x8cd8999C4927d79A11cAa6009177887Bc4B1344e); // Sepolia

    function deposit(uint256 amount) external {
        uToken.transferFrom(msg.sender, address(this), amount);
        // Your logic here
    }

    function withdraw(uint256 amount) external {
        uToken.transfer(msg.sender, amount);
        // Your logic here
    }
}
```

### In JavaScript/TypeScript

```typescript
import { ethers } from "ethers";

// Connect to deployed contract
const uTokenAddress = "0x8cd8999C4927d79A11cAa6009177887Bc4B1344e"; // Sepolia
const uTokenABI = [
  "function balanceOf(address) view returns (uint256)",
  "function transfer(address to, uint256 amount) returns (bool)",
  "function mint(address to, uint256 amount)", // owner only
];

const uToken = new ethers.Contract(uTokenAddress, uTokenABI, signer);

// Check balance
const balance = await uToken.balanceOf(userAddress);
console.log("Balance:", ethers.utils.formatEther(balance));

// Transfer tokens
await uToken.transfer(recipientAddress, ethers.utils.parseEther("10"));

// Mint tokens (owner only)
await uToken.mint(userAddress, ethers.utils.parseEther("100"));
```

### With Hardhat

```typescript
const U = await ethers.getContractFactory("U");
const uToken = U.attach("0x8cd8999C4927d79A11cAa6009177887Bc4B1344e");

// Use the token
await uToken.balanceOf(address);
await uToken.transfer(to, amount);
await uToken.mint(to, amount); // owner only
```

## Cross-Chain Integration

If your project needs cross-chain functionality:

1. **Get tokens on source chain:**
```bash
npx hardhat run scripts/mint.ts --network sepolia
```

2. **Transfer to destination chain:**
```bash
TRANSFER_AMOUNT=100 npx hardhat run scripts/transfer.ts --network sepolia
```

3. **Wait 5-10 minutes for delivery**

4. **Use tokens on destination chain:**
```bash
npx hardhat run scripts/checkBalance.ts --network baseSepolia
```

## Project Setup

If you need to set up this project on a new machine:

```bash
# Clone/download the project
npm install --legacy-peer-deps

# Configure environment
cp .env.example .env
# Edit .env and add your PRIVATE_KEY

# Run tests
npm test

# Deploy to testnets (if needed)
npx hardhat run scripts/deploy.ts --network sepolia
npx hardhat run scripts/deploy.ts --network baseSepolia
```

## Testing

The project includes 19 comprehensive tests:

```bash
npm test
```

Tests cover:
- Token deployment and configuration
- Minting (owner-only access control)
- ERC20 transfers and approvals
- Cross-chain peer setup
- Edge cases and error handling

## Configuration

### Environment Variables

Required in `.env`:
```bash
PRIVATE_KEY=your_private_key
SEPOLIA_RPC_URL=https://ethereum-sepolia-rpc.publicnode.com
BASE_SEPOLIA_RPC_URL=https://base-sepolia-rpc.publicnode.com
SEPOLIA_OFT_ADDRESS=0x8cd8999C4927d79A11cAa6009177887Bc4B1344e
BASE_SEPOLIA_OFT_ADDRESS=0x82cabCB0F84d088218c22482737e6BB777FA980f
```

### Network Configuration

Already configured in `hardhat.config.ts`:
- Sepolia (Chain ID: 11155111)
- Base Sepolia (Chain ID: 84532)

Add more networks as needed.

## Token Details

- **Name:** U Token
- **Symbol:** U
- **Decimals:** 18
- **Total Supply:** Determined by minting (no initial supply)
- **Mintable:** Yes (owner only)
- **Burnable:** Via cross-chain transfers (tokens are burned on source, minted on destination)
- **Cross-Chain:** Enabled via LayerZero V2

## LayerZero Configuration

- **Protocol Version:** LayerZero V2
- **Sepolia Endpoint ID:** 40161
- **Base Sepolia Endpoint ID:** 40245
- **Peer Setup:** Configured bidirectionally
- **Options Encoding:** `0x00030100110100000000000000000000000000030d40`

## Important Notes

- **Owner Control:** Only the owner (`0xE20cAdBF59f7774e1F60fe6d2533A5386740B2dB`) can mint tokens
- **Transfer Time:** Cross-chain transfers take 5-10 minutes
- **Transfer Cost:** ~0.00002-0.0001 ETH in LayerZero fees
- **No Approval Needed:** OFT transfers don't require token approval
- **Testnet Only:** Currently deployed on testnets only

## Common Use Cases

### 1. Multi-Chain DeFi Application

Use U token as a unified currency across both Sepolia and Base Sepolia:

```typescript
// User deposits on Sepolia
await uToken.transferFrom(user, contract, amount);

// Later, user wants to use on Base Sepolia
// Transfer cross-chain using scripts/transfer.ts
// User can now interact with Base Sepolia contracts
```

### 2. Cross-Chain Payments

Accept payments on one chain, fulfill on another:

```typescript
// Receive payment on Sepolia
await uToken.transferFrom(payer, address(this), paymentAmount);

// Fulfill service on Base Sepolia
await uToken.transfer(serviceProvider, paymentAmount);
```

### 3. Cross-Chain Governance

Vote on one chain, execute on another:

```typescript
// Users hold U tokens on any chain
// Voting power = sum of balances across all chains
```

## Resources

- **Full Deployment Guide:** See [DEPLOYMENT.md](./DEPLOYMENT.md)
- **Developer Feedback:** See [FEEDBACK.md](./FEEDBACK.md)
- **LayerZero Docs:** https://docs.layerzero.network/
- **LayerZero Scan:** https://testnet.layerzeroscan.com/

## Quick Reference

```bash
# Mint 100 tokens
npx hardhat run scripts/mint.ts --network sepolia

# Check balance
npx hardhat run scripts/checkBalance.ts --network sepolia

# Transfer 5 tokens cross-chain
npx hardhat run scripts/transfer.ts --network sepolia

# Run tests
npm test

# Deploy to new network
npx hardhat run scripts/deploy.ts --network <network>
```


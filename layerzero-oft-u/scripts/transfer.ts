import { ethers } from "hardhat";
import * as dotenv from "dotenv";

dotenv.config();

async function main() {
  const SEPOLIA_OFT = process.env.SEPOLIA_OFT_ADDRESS || "";
  const BASE_SEPOLIA_OFT = process.env.BASE_SEPOLIA_OFT_ADDRESS || "";
  const SEPOLIA_EID = 40161;
  const BASE_SEPOLIA_EID = 40245;

  const RECIPIENT = process.env.RECIPIENT_ADDRESS || "";
  const AMOUNT = ethers.utils.parseEther(process.env.TRANSFER_AMOUNT || "5");

  const [sender] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();

  // Determine source and destination based on current network
  let sourceOft: string;
  let destOft: string;
  let destEid: number;
  let sourceName: string;
  let destName: string;

  if (network.chainId === 11155111) {
    // On Sepolia, send to Base Sepolia
    sourceOft = SEPOLIA_OFT;
    destOft = BASE_SEPOLIA_OFT;
    destEid = BASE_SEPOLIA_EID;
    sourceName = "Sepolia";
    destName = "Base Sepolia";
  } else if (network.chainId === 84532) {
    // On Base Sepolia, send to Sepolia
    sourceOft = BASE_SEPOLIA_OFT;
    destOft = SEPOLIA_OFT;
    destEid = SEPOLIA_EID;
    sourceName = "Base Sepolia";
    destName = "Sepolia";
  } else {
    console.error("❌ Unsupported network! Chain ID:", network.chainId);
    console.error("This script works on Sepolia or Base Sepolia only.");
    process.exit(1);
  }

  if (!sourceOft || !destOft) {
    console.error("\n❌ ERROR: Contract addresses not configured in .env!");
    console.error("Make sure you have:");
    console.error("  SEPOLIA_OFT_ADDRESS=0x...");
    console.error("  BASE_SEPOLIA_OFT_ADDRESS=0x...");
    process.exit(1);
  }

  const recipientAddress = RECIPIENT || sender.address;

  console.log("Cross-Chain Transfer");
  console.log("====================");
  console.log("Sender:", sender.address);
  console.log("From:", sourceName);
  console.log("To:", destName);
  console.log("Amount:", ethers.utils.formatEther(AMOUNT), "tokens");
  console.log("Recipient on", destName + ":", recipientAddress);

  const U = await ethers.getContractFactory("U");
  const oft = U.attach(sourceOft);

  // Check balance
  const balance = await oft.balanceOf(sender.address);
  console.log("\nCurrent balance on", sourceName + ":", ethers.utils.formatEther(balance));

  if (balance.lt(AMOUNT)) {
    console.log("\n⚠️  Insufficient balance!");
    console.log("You need to mint tokens first or reduce the transfer amount.");
    console.log("\nTo mint tokens, run:");
    if (network.chainId === 11155111) {
      console.log("npx hardhat run scripts/mint.ts --network sepolia");
    } else {
      console.log("npx hardhat run scripts/mint.ts --network baseSepolia");
    }
    process.exit(1);
  }

  // Prepare send parameters with proper LayerZero V2 options
  // Options format: 0x0003 (type) + 010100 (gas limit 65536) + 11 (native drop 0)
  const options = "0x00030100110100000000000000000000000000030d40";

  const sendParam = {
    dstEid: destEid,
    to: ethers.utils.hexZeroPad(recipientAddress, 32),
    amountLD: AMOUNT,
    minAmountLD: AMOUNT,
    extraOptions: options,
    composeMsg: "0x",
    oftCmd: "0x"
  };

  // Quote the fee
  console.log("\nQuoting LayerZero fee...");
  try {
    const feeQuote = await oft.quoteSend(sendParam, false);
    console.log("Native Fee:", ethers.utils.formatEther(feeQuote.nativeFee), "ETH");
    console.log("LZ Token Fee:", feeQuote.lzTokenFee.toString());

    const senderBalance = await sender.getBalance();
    console.log("Sender ETH balance:", ethers.utils.formatEther(senderBalance), "ETH");

    if (senderBalance.lt(feeQuote.nativeFee)) {
      console.error("\n❌ Insufficient ETH for LayerZero fees!");
      console.error("Need:", ethers.utils.formatEther(feeQuote.nativeFee), "ETH");
      console.error("Have:", ethers.utils.formatEther(senderBalance), "ETH");
      process.exit(1);
    }

    // Send tokens
    console.log("\nSending tokens cross-chain...");
    const tx = await oft.send(
      sendParam,
      { nativeFee: feeQuote.nativeFee, lzTokenFee: 0 },
      sender.address, // refund address
      { value: feeQuote.nativeFee }
    );

    console.log("Transaction hash:", tx.hash);
    console.log("Waiting for confirmation...");

    const receipt = await tx.wait();
    console.log("✓ Transaction confirmed in block:", receipt.blockNumber);

    const newBalance = await oft.balanceOf(sender.address);
    console.log("\nNew balance on", sourceName + ":", ethers.utils.formatEther(newBalance));

    console.log("\n====================================");
    console.log("LayerZero Message Sent!");
    console.log("====================================");
    console.log("\nTransaction details:");
    console.log("- From:", sourceName);
    console.log("- To:", destName);
    console.log("- Amount sent:", ethers.utils.formatEther(AMOUNT), "tokens");
    console.log("- Recipient:", recipientAddress);
    console.log("- LayerZero fee paid:", ethers.utils.formatEther(feeQuote.nativeFee), "ETH");
    console.log("\n⏱️  Delivery time: ~5-10 minutes");
    console.log("\n🔍 Track your message:");
    console.log("LayerZero Scan: https://testnet.layerzeroscan.com/tx/" + tx.hash);
    console.log("\n💡 Check recipient balance:");
    if (network.chainId === 11155111) {
      console.log("npx hardhat run scripts/checkBalance.ts --network baseSepolia");
    } else {
      console.log("npx hardhat run scripts/checkBalance.ts --network sepolia");
    }

  } catch (error: any) {
    console.error("\n❌ Error:", error.message);
    throw error;
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

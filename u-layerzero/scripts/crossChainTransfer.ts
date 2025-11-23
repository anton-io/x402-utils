import { ethers } from "hardhat";
import * as dotenv from "dotenv";

dotenv.config();

async function main() {
  // Configuration - update these values
  const SEPOLIA_OFT = process.env.SEPOLIA_OFT_ADDRESS || "0xYourSepoliaOFTAddress";
  const RECIPIENT = process.env.RECIPIENT_ADDRESS || ""; // Leave empty to use sender address
  const AMOUNT = ethers.utils.parseEther(process.env.TRANSFER_AMOUNT || "10"); // 10 tokens by default
  const BASE_SEPOLIA_EID = 40245;

  const [sender] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();

  // Validate we're on Sepolia
  if (network.chainId !== 11155111) {
    console.error("❌ This script must be run on Sepolia network!");
    console.error("Use: npx hardhat run scripts/crossChainTransfer.ts --network sepolia");
    process.exit(1);
  }

  if (SEPOLIA_OFT.includes("YourSepoliaOFTAddress")) {
    console.error("\n❌ ERROR: Please update SEPOLIA_OFT_ADDRESS in this script or .env file!");
    process.exit(1);
  }

  const recipientAddress = RECIPIENT || sender.address;

  console.log("Cross-Chain Transfer");
  console.log("====================");
  console.log("Sender:", sender.address);
  console.log("From: Sepolia");
  console.log("To: Base Sepolia");
  console.log("Amount:", ethers.utils.formatEther(AMOUNT), "tokens");
  console.log("Recipient on Base Sepolia:", recipientAddress);

  const U = await ethers.getContractFactory("U");
  const oft = U.attach(SEPOLIA_OFT);

  // Check balance
  const balance = await oft.balanceOf(sender.address);
  console.log("\nCurrent balance on Sepolia:", ethers.utils.formatEther(balance));

  if (balance.lt(AMOUNT)) {
    console.log("\nInsufficient balance! Minting tokens first...");
    const mintTx = await oft.mint(sender.address, AMOUNT);
    console.log("Mint transaction:", mintTx.hash);
    await mintTx.wait();
    console.log("✓ Minted", ethers.utils.formatEther(AMOUNT), "tokens");

    const newBalance = await oft.balanceOf(sender.address);
    console.log("New balance:", ethers.utils.formatEther(newBalance));
  }

  // Prepare send parameters with proper LayerZero V2 options
  // Options format: 0x0003 (type) + 010100 (gas limit 65536) + 11 (native drop 0)
  const options = "0x00030100110100000000000000000000000000030d40";

  const sendParam = {
    dstEid: BASE_SEPOLIA_EID,
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
    console.log("\nNew balance on Sepolia:", ethers.utils.formatEther(newBalance));

    console.log("\n====================================");
    console.log("LayerZero Message Sent!");
    console.log("====================================");
    console.log("\nTransaction details:");
    console.log("- Amount sent:", ethers.utils.formatEther(AMOUNT), "tokens");
    console.log("- Recipient:", recipientAddress);
    console.log("- LayerZero fee paid:", ethers.utils.formatEther(feeQuote.nativeFee), "ETH");
    console.log("\n⏱️  Delivery time: ~5-10 minutes");
    console.log("\n🔍 Track your message:");
    console.log("LayerZero Scan: https://testnet.layerzeroscan.com/tx/" + tx.hash);
    console.log("\n💡 Check recipient balance on Base Sepolia:");
    console.log("npx hardhat run scripts/checkBalance.ts --network baseSepolia");

  } catch (error: any) {
    console.error("\n❌ Error:", error.message);
    if (error.message.includes("OApp_InvalidOptions")) {
      console.error("\nThis might be due to invalid LayerZero options encoding.");
      console.error("The mock endpoints in tests use simplified options, but real networks require proper encoding.");
    }
    throw error;
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

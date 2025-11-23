import { ethers } from "hardhat";
import * as dotenv from "dotenv";

dotenv.config();

async function main() {
  const network = await ethers.provider.getNetwork();

  let oftAddress: string | undefined;
  let networkName: string;

  if (network.chainId === 11155111) {
    // Sepolia
    oftAddress = process.env.SEPOLIA_OFT_ADDRESS;
    networkName = "Sepolia";
  } else if (network.chainId === 84532) {
    // Base Sepolia
    oftAddress = process.env.BASE_SEPOLIA_OFT_ADDRESS;
    networkName = "Base Sepolia";
  } else {
    console.error("❌ Unsupported network:", network.chainId);
    console.error("Run with --network sepolia or --network baseSepolia");
    process.exit(1);
  }

  if (!oftAddress || oftAddress.includes("Your")) {
    console.error("\n❌ ERROR: OFT address not configured!");
    console.error("Please set in .env file:");
    if (network.chainId === 11155111) {
      console.error("  SEPOLIA_OFT_ADDRESS=0x...");
    } else {
      console.error("  BASE_SEPOLIA_OFT_ADDRESS=0x...");
    }
    process.exit(1);
  }

  // Get address to check
  const addressToCheck = process.env.CHECK_ADDRESS || (await ethers.getSigners())[0].address;

  console.log("Checking Balance");
  console.log("================");
  console.log("Network:", networkName);
  console.log("OFT Address:", oftAddress);
  console.log("Account:", addressToCheck);

  const U = await ethers.getContractFactory("U");
  const oft = U.attach(oftAddress);

  try {
    const balance = await oft.balanceOf(addressToCheck);
    const totalSupply = await oft.totalSupply();
    const name = await oft.name();
    const symbol = await oft.symbol();

    console.log("\nToken Information:");
    console.log("- Name:", name);
    console.log("- Symbol:", symbol);
    console.log("- Total Supply:", ethers.utils.formatEther(totalSupply));

    console.log("\nBalance Information:");
    console.log("- Address:", addressToCheck);
    console.log("- Balance:", ethers.utils.formatEther(balance), symbol);

    if (balance.eq(0)) {
      console.log("\n⚠️  Balance is zero!");
    } else {
      console.log("\n✓ Balance found!");
    }

  } catch (error: any) {
    console.error("\n❌ Error reading contract:", error.message);
    console.error("Make sure the OFT address is correct and deployed on", networkName);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

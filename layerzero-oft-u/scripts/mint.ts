import { ethers } from "hardhat";
import * as dotenv from "dotenv";

dotenv.config();

async function main() {
  const SEPOLIA_OFT = process.env.SEPOLIA_OFT_ADDRESS || "";
  const BASE_SEPOLIA_OFT = process.env.BASE_SEPOLIA_OFT_ADDRESS || "";

  const MINT_TO = process.env.MINT_TO_ADDRESS || "";
  const MINT_AMOUNT = ethers.utils.parseEther(process.env.MINT_AMOUNT || "100");

  const [owner] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();

  let oftAddress: string;
  let networkName: string;

  if (network.chainId === 11155111) {
    oftAddress = SEPOLIA_OFT;
    networkName = "Sepolia";
  } else if (network.chainId === 84532) {
    oftAddress = BASE_SEPOLIA_OFT;
    networkName = "Base Sepolia";
  } else {
    console.error("❌ Unsupported network! Chain ID:", network.chainId);
    process.exit(1);
  }

  if (!oftAddress) {
    console.error("\n❌ ERROR: OFT address not configured in .env!");
    process.exit(1);
  }

  const recipient = MINT_TO || owner.address;

  console.log("Minting Tokens");
  console.log("==============");
  console.log("Network:", networkName);
  console.log("OFT Contract:", oftAddress);
  console.log("Minter (owner):", owner.address);
  console.log("Recipient:", recipient);
  console.log("Amount:", ethers.utils.formatEther(MINT_AMOUNT), "tokens");

  const U = await ethers.getContractFactory("U");
  const oft = U.attach(oftAddress);

  // Check current balance
  const balanceBefore = await oft.balanceOf(recipient);
  console.log("\nCurrent balance:", ethers.utils.formatEther(balanceBefore));

  // Mint tokens
  console.log("\nMinting...");
  const tx = await oft.mint(recipient, MINT_AMOUNT);
  console.log("Transaction hash:", tx.hash);

  await tx.wait();
  console.log("✓ Minted successfully!");

  // Check new balance
  const balanceAfter = await oft.balanceOf(recipient);
  const totalSupply = await oft.totalSupply();

  console.log("\nResults:");
  console.log("- New balance:", ethers.utils.formatEther(balanceAfter));
  console.log("- Total supply:", ethers.utils.formatEther(totalSupply));
  console.log("- Minted amount:", ethers.utils.formatEther(balanceAfter.sub(balanceBefore)));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

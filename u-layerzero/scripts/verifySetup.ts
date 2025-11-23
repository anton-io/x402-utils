import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();
  const balance = await deployer.getBalance();

  console.log("Environment Verification");
  console.log("========================");
  console.log("Network:", network.name);
  console.log("Chain ID:", network.chainId);
  console.log("Account:", deployer.address);
  console.log("Balance:", ethers.utils.formatEther(balance), "ETH");

  if (balance.lt(ethers.utils.parseEther("0.01"))) {
    console.log("\n⚠️  Warning: Low balance! You may need more ETH for deployment.");
  } else {
    console.log("\n✓ Balance looks good!");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

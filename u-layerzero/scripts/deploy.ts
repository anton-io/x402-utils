import { ethers } from "hardhat";
import * as dotenv from "dotenv";

dotenv.config();

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Deploying contracts with the account:", deployer.address);
  console.log("Account balance:", (await deployer.getBalance()).toString());

  const network = await ethers.provider.getNetwork();
  console.log("Network:", network.name, "Chain ID:", network.chainId);

  // Get LayerZero endpoint for this network
  let lzEndpoint: string;
  if (network.chainId === 11155111) {
    // Sepolia
    lzEndpoint = process.env.SEPOLIA_LZ_ENDPOINT!;
    console.log("Deploying to Sepolia");
  } else if (network.chainId === 84532) {
    // Base Sepolia
    lzEndpoint = process.env.BASE_SEPOLIA_LZ_ENDPOINT!;
    console.log("Deploying to Base Sepolia");
  } else {
    throw new Error(`Unsupported network: ${network.chainId}`);
  }

  console.log("LayerZero Endpoint:", lzEndpoint);

  const U = await ethers.getContractFactory("U");
  const oft = await U.deploy(
    "U Token",           // name
    "U",                 // symbol
    lzEndpoint,          // LayerZero endpoint
    deployer.address     // delegate (owner)
  );

  await oft.deployed();

  console.log("\n=================================");
  console.log("U OFT deployed to:", oft.address);
  console.log("=================================\n");

  console.log("Deployment details:");
  console.log("- Name:", await oft.name());
  console.log("- Symbol:", await oft.symbol());
  console.log("- Decimals:", await oft.decimals());
  console.log("- Owner:", await oft.owner());
  console.log("- Token address:", await oft.token());

  console.log("\nSave this address for setting peers!");

  // Wait for a few block confirmations
  console.log("\nWaiting for block confirmations...");
  await oft.deployTransaction.wait(5);
  console.log("Confirmed!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

import { ethers } from "hardhat";
import * as dotenv from "dotenv";

dotenv.config();

async function main() {
  const SEPOLIA_OFT = process.env.SEPOLIA_OFT_ADDRESS || "";
  const BASE_SEPOLIA_OFT = process.env.BASE_SEPOLIA_OFT_ADDRESS || "";
  const SEPOLIA_LZ_ENDPOINT = process.env.SEPOLIA_LZ_ENDPOINT || "0x6EDCE65403992e310A62460808c4b910D972f10f";
  const BASE_SEPOLIA_LZ_ENDPOINT = process.env.BASE_SEPOLIA_LZ_ENDPOINT || "0x6EDCE65403992e310A62460808c4b910D972f10f";

  const [owner] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();

  let oftAddress: string;
  let lzEndpoint: string;
  let networkName: string;

  if (network.chainId === 11155111) {
    oftAddress = SEPOLIA_OFT;
    lzEndpoint = SEPOLIA_LZ_ENDPOINT;
    networkName = "Sepolia";
  } else if (network.chainId === 84532) {
    oftAddress = BASE_SEPOLIA_OFT;
    lzEndpoint = BASE_SEPOLIA_LZ_ENDPOINT;
    networkName = "Base Sepolia";
  } else {
    console.error("❌ Unsupported network! Chain ID:", network.chainId);
    process.exit(1);
  }

  if (!oftAddress) {
    console.error("\n❌ ERROR: OFT address not configured in .env!");
    process.exit(1);
  }

  console.log("Contract Verification");
  console.log("====================");
  console.log("Network:", networkName);
  console.log("Contract Address:", oftAddress);
  console.log("Owner/Delegate:", owner.address);
  console.log("LayerZero Endpoint:", lzEndpoint);
  console.log("\nConstructor arguments:");
  console.log('  name: "U Token"');
  console.log('  symbol: "U"');
  console.log("  lzEndpoint:", lzEndpoint);
  console.log("  delegate:", owner.address);
  console.log("\nVerification command:");
  console.log(`npx hardhat verify --network ${network.chainId === 11155111 ? 'sepolia' : 'baseSepolia'} ${oftAddress} "U Token" "U" "${lzEndpoint}" "${owner.address}"`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

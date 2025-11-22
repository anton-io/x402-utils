import { ethers } from "hardhat";
import * as dotenv from "dotenv";

dotenv.config();

async function main() {
  // TODO: Replace these with your deployed addresses after deployment
  const SEPOLIA_OFT = process.env.SEPOLIA_OFT_ADDRESS || "0xYourSepoliaOFTAddress";
  const BASE_SEPOLIA_OFT = process.env.BASE_SEPOLIA_OFT_ADDRESS || "0xYourBaseSepoliaOFTAddress";

  const SEPOLIA_EID = 40161;
  const BASE_SEPOLIA_EID = 40245;

  const [deployer] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();

  console.log("Setting peer with account:", deployer.address);
  console.log("Network:", network.name, "Chain ID:", network.chainId);

  let localOft: string;
  let remoteOft: string;
  let remoteEid: number;

  if (network.chainId === 11155111) {
    // On Sepolia, set peer to Base Sepolia
    localOft = SEPOLIA_OFT;
    remoteOft = BASE_SEPOLIA_OFT;
    remoteEid = BASE_SEPOLIA_EID;
    console.log("\nSetting Base Sepolia as peer on Sepolia OFT");
  } else if (network.chainId === 84532) {
    // On Base Sepolia, set peer to Sepolia
    localOft = BASE_SEPOLIA_OFT;
    remoteOft = SEPOLIA_OFT;
    remoteEid = SEPOLIA_EID;
    console.log("\nSetting Sepolia as peer on Base Sepolia OFT");
  } else {
    throw new Error(`Unsupported network: ${network.chainId}`);
  }

  if (localOft.includes("YourSepoliaOFTAddress") || remoteOft.includes("YourBaseSepoliaOFTAddress")) {
    console.error("\n❌ ERROR: Please update the contract addresses in this script!");
    console.error("You can also set them in .env file:");
    console.error("  SEPOLIA_OFT_ADDRESS=0x...");
    console.error("  BASE_SEPOLIA_OFT_ADDRESS=0x...");
    process.exit(1);
  }

  const U = await ethers.getContractFactory("U");
  const oft = U.attach(localOft);

  // Convert address to bytes32 (pad to 32 bytes)
  const peerBytes32 = ethers.utils.hexZeroPad(remoteOft, 32);

  console.log("\nPeer Configuration:");
  console.log("- Local OFT:", localOft);
  console.log("- Remote OFT:", remoteOft);
  console.log("- Remote EID:", remoteEid);
  console.log("- Peer (bytes32):", peerBytes32);

  console.log("\nSetting peer...");
  const tx = await oft.setPeer(remoteEid, peerBytes32);
  console.log("Transaction hash:", tx.hash);

  console.log("Waiting for confirmation...");
  await tx.wait();
  console.log("✓ Peer set successfully!");

  // Verify
  const setPeer = await oft.peers(remoteEid);
  console.log("\nVerification:");
  console.log("- Peer for EID", remoteEid, ":", setPeer);

  if (setPeer.toLowerCase() === peerBytes32.toLowerCase()) {
    console.log("✓ Peer verified successfully!");
  } else {
    console.log("✗ Peer verification failed!");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

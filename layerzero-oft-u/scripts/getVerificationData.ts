import { ethers } from "hardhat";
import * as dotenv from "dotenv";

dotenv.config();

async function main() {
  const [owner] = await ethers.getSigners();

  console.log("Contract Verification Data");
  console.log("===========================\n");

  console.log("Owner/Delegate Address:", owner.address);
  console.log("LayerZero Endpoint: 0x6EDCE65403992e310A62460808c4b910D972f10f");

  console.log("\n## Constructor Arguments (ABI-encoded):");
  console.log("---");

  const constructorArgs = ethers.utils.defaultAbiCoder.encode(
    ["string", "string", "address", "address"],
    [
      "U Token",
      "U",
      "0x6EDCE65403992e310A62460808c4b910D972f10f",
      owner.address
    ]
  );

  // Remove the 0x prefix for Etherscan
  console.log(constructorArgs.slice(2));

  console.log("\n## Compiler Settings:");
  console.log("- Compiler Version: v0.8.24");
  console.log("- Optimization: Yes");
  console.log("- Runs: 200");
  console.log("- EVM Version: default");

  console.log("\n## Contract Addresses:");
  console.log("- Sepolia: 0x8cd8999C4927d79A11cAa6009177887Bc4B1344e");
  console.log("  Verify at: https://sepolia.etherscan.io/address/0x8cd8999C4927d79A11cAa6009177887Bc4B1344e#code");

  console.log("\n- Base Sepolia: 0x82cabCB0F84d088218c22482737e6BB777FA980f");
  console.log("  Verify at: https://sepolia.basescan.org/address/0x82cabCB0F84d088218c22482737e6BB777FA980f#code");

  console.log("\n## To flatten the contract:");
  console.log("npx hardhat flatten contracts/U.sol > U_flattened.sol");
  console.log("Then remove duplicate SPDX license identifiers from the flattened file.");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

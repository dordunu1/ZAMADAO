import * as dotenv from "dotenv";
dotenv.config();

import "@fhevm/hardhat-plugin";
import "@nomicfoundation/hardhat-chai-matchers";
import "@nomicfoundation/hardhat-ethers";
import "@nomicfoundation/hardhat-verify";
import "@typechain/hardhat";
import "hardhat-deploy";
import "hardhat-gas-reporter";
import "solidity-coverage";
import type { HardhatUserConfig } from "hardhat/config";
import { vars } from "hardhat/config";

// Hardcoded mnemonic and Sepolia RPC URL
const MNEMONIC: string = vars.get("MNEMONIC", "play cement much paper mandate rubber marble ");
const SEPOLIA_RPC_URL: string = "https://eth-sepolia.g.alchemy.com/v2/q3ShnpnR_M3lmo9SOjNkml";

const config: HardhatUserConfig = {
  defaultNetwork: "hardhat",
  networks: {
    hardhat: {
      accounts: {
        mnemonic: MNEMONIC,
      },
      chainId: 31337,
    },
    sepolia: {
      accounts: {
        mnemonic: MNEMONIC,
        path: "m/44'/60'/0'/0/",
        count: 10,
      },
      chainId: 11155111,
      url: SEPOLIA_RPC_URL,
    },
  },
  paths: {
    artifacts: "./artifacts",
    cache: "./cache",
    sources: "./contracts",
    tests: "./test",
  },
  solidity: {
    version: "0.8.24",
    settings: {
      metadata: {
        bytecodeHash: "none",
      },
      optimizer: {
        enabled: true,
        runs: 800,
      },
      evmVersion: "cancun",
    },
  },
  etherscan: {
    apiKey: {
      sepolia: process.env.ETHERSCAN_API_KEY || "DNXJA8RX2Q3VZ4URQIWP7Z68CJXQZSC6AW",
    },
  },
};

// Add typechain as a separate export (not part of HardhatUserConfig)
export const typechain = {
  outDir: "types",
  target: "ethers-v6",
};

// Add gasReporter as a separate export (not part of HardhatUserConfig)
export const gasReporter = {
  enabled: process.env.REPORT_GAS ? true : false,
  excludeContracts: [],
};

export default config; 
import "@nomicfoundation/hardhat-verify"
import "@nomiclabs/hardhat-ethers"
import "@nomiclabs/hardhat-waffle"
import "@openzeppelin/hardhat-upgrades"
import "@typechain/hardhat"
import dotenv from "dotenv"
import "hardhat-contract-sizer"
import "hardhat-dependency-compiler"
import "hardhat-deploy"
import "hardhat-gas-reporter"
import { HardhatUserConfig } from "hardhat/config"
import "solidity-coverage"
import "./mocha-test"

dotenv.config()

const config: HardhatUserConfig = {
    solidity: {
        version: "0.7.6",
        settings: {
            optimizer: { enabled: true, runs: 100 },
            evmVersion: "berlin",
            // for smock to mock contracts
            outputSelection: {
                "*": {
                    "*": ["storageLayout"],
                },
            },
        },
    },
    networks: {
        hardhat: {
            allowUnlimitedContractSize: true,
        },
        opgoerli: {
            url: process.env.OPTIMISM_GOERLI_URL,
            accounts: {
                mnemonic: process.env.MNEMONIC || `0x${process.env.PRIVATE_KEY}` || "",
            },
            chainId: 420,
        },
    },
    dependencyCompiler: {
        // We have to compile from source since UniswapV3 doesn't provide artifacts in their npm package
        paths: [
            "@uniswap/v3-core/contracts/UniswapV3Factory.sol",
            "@uniswap/v3-core/contracts/UniswapV3Pool.sol",
            "@wim3/perp-oracle-contract/contracts/PriceFeedDispatcher.sol",
            "@perp/perp-oracle-contract/contracts/ChainlinkPriceFeedV2.sol",
            "@wim3/perp-oracle-contract/contracts/PythAggregatorV3",
            "@wim3/perp-oracle-contract/contracts/PythPriceFeedV3.sol",
            "@perp/voting-escrow/contracts/SurplusBeneficiary.sol",
        ],
    },
    contractSizer: {
        // max bytecode size is 24.576 KB
        alphaSort: true,
        runOnCompile: true,
        disambiguatePaths: true,
        except: ["@openzeppelin/", "@uniswap/", "@perp/perp-oracle-contract/", "@perp/voting-escrow/", "test/"],
    },
    gasReporter: {
        excludeContracts: ["test"],
    },
    mocha: {
        require: ["ts-node/register/files"],
        jobs: 4,
        timeout: 120000,
        color: true,
    },
    namedAccounts: {
        deployer: {
            default: 0,
        },
    },
    etherscan: {
        apiKey: process.env.OPSCAN_API_KEY,
    },
}

export default config

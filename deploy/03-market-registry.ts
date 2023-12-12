import { smockit } from "@eth-optimism/smock"
import { ethers, network } from "hardhat"
import { HardhatRuntimeEnvironment } from "hardhat/types"
import { HARDHAT_CHAINID, isDevelopmentChain, networkConfigHelper } from "../helper.hardhat.config"
import { verify } from "../scripts/verify"
import { CHAINLINK_AGGREGATOR_DECIMALS } from "../test/shared/constant"
import { UniswapV3Factory } from "../typechain"
import { Tag } from "./tags"
import * as fs from "fs"

// 2. MarketRegistry -> uniV3Factory.address & quoteToken.address
//    2.1. For each market, we deploy a pair of two virtual tokens (with no real value) and initiate a new Uniswap V3 pool to provide liquidity to.
//       2.1.1. Base token: the virtual underlying asset users are trading for, such as vETH, vBTC
//       2.1.2. Quote token: the counter currency of base token, which is always vUSDC for any base token

const deploy = async (hre: HardhatRuntimeEnvironment) => {
    const { log, deploy } = hre.deployments
    const { deployer } = await hre.getNamedAccounts()
    const chainId = network.config.chainId || HARDHAT_CHAINID
    log("#########################")
    log("# MarketRegistry Contract #")

    // I'm not sure about quote & base token deployment, so I just use USDC & vETH for now
    // Looks like we need to deploy quote & base token for each market
    const quoteTokenAddress = await deployQuoteToken(hre, chainId)
    const baseTokenAddress = await deployBaseToken(chainId)

    const uniV3Factory = await deployUniswapV3Factory(hre)
    log("# Creating pool...")
    await createPool(uniV3Factory, chainId)

    log(`# Deploying MarketRegistry Contract to: ${chainId} ...`)
    const marketRegistryContract = await deploy("MarketRegistry", {
        from: deployer,
        args: [uniV3Factory.address, quoteTokenAddress],
        log: true,
    })
    log("# MarketRegistry contract deployed at address:", marketRegistryContract.address)
    log("#########################")
    const marketRegistryCon = await ethers.getContractAt("MarketRegistry", marketRegistryContract.address)
    const marketRegistry = marketRegistryCon.attach(marketRegistryCon.address)
    await marketRegistry.addPool(baseTokenAddress, "3000")

    if (!isDevelopmentChain(chainId)) {
        const jsonString = fs.readFileSync("./deployments/opgoerli/MarketRegistry.json", "utf-8")
        const jsonData = JSON.parse(jsonString)
        await verify(jsonData.address, jsonData.args)
    }
}

export default deploy
deploy.tags = [Tag.MarketRegistry, Tag.All]

async function deployQuoteToken(hre: HardhatRuntimeEnvironment, chainId: number) {
    const { log, deploy } = hre.deployments
    const { deployer } = await hre.getNamedAccounts()
    log("# Deploying QuoteToken...")
    const quoteToken = await deploy("QuoteToken", {
        from: deployer,
        args: [],
        log: true,
        proxy: {
            owner: deployer,
            proxyContract: "OpenZeppelinTransparentProxy",
            execute: {
                init: {
                    methodName: "initialize",
                    args: ["VirtualUSDC", "vUSDC"],
                },
            },
        },
    })
    log(`# Deployed QuoteToken at address: ${quoteToken.address}`)
    networkConfigHelper[chainId].vusdc = quoteToken.address

    return networkConfigHelper[chainId].vusdc
}

async function deployBaseToken(chainId: number) {
    let priceFeedAddress
    let aggregatorAddress

    const optGoerliPyth = "0xDd24F84d36BF92C65F92307595335bdFab5Bbd21"
    const pythEthUsdPriceId = "0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace"

    if (isDevelopmentChain(chainId)) {
        console.log("# Deploying PythAggregatorV3...")
        const aggregatorFactory = await ethers.getContractFactory("PythAggregatorV3")
        const aggregator = await aggregatorFactory.deploy(optGoerliPyth, pythEthUsdPriceId)

        aggregatorAddress = aggregator.address
        console.log(`# Deployed PythAggregatorV3 at address: ${aggregatorAddress}}`)
    }

    if (isDevelopmentChain(chainId)) {
        const fortyMinutes = 60 * 40
        const fifteenMinutes = 60 * 15
        console.log("# Deploying PythPriceFeedV3...")
        const pythPriceFeedV3Factory = await ethers.getContractFactory("PythPriceFeedV3")
        const pythPriceFeedV3 = await pythPriceFeedV3Factory.deploy(aggregatorAddress, fortyMinutes, fifteenMinutes)
        priceFeedAddress = pythPriceFeedV3.address
        console.log(`# Deployed PythPriceFeedV3 at address: ${pythPriceFeedV3.address}}`)
    } else {
        priceFeedAddress = networkConfigHelper[chainId].ethusdPriceFeed
    }

    console.log("# Deploying PriceFeedDispatcher...")
    // This one is from perp-curie-contracts
    const priceFeedDispatcherFactory = await ethers.getContractFactory("PriceFeedDispatcher")
    const priceFeedDispatcher = await priceFeedDispatcherFactory.deploy(priceFeedAddress)
    console.log(`# Deployed priceFeedDispatcher at address: ${priceFeedDispatcher.address}}`)

    console.log("# Deploying BaseToken...")
    const baseTokenFactory = await ethers.getContractFactory("BaseToken")
    const baseToken = await baseTokenFactory.deploy()
    await baseToken.initialize("ETH", "vETH", priceFeedDispatcher.address)
    console.log(`# Deployed BaseToken at address: ${baseToken.address}}`)
    networkConfigHelper[chainId].veth = baseToken.address

    return networkConfigHelper[chainId].veth
}

async function deployUniswapV3Factory(hre: HardhatRuntimeEnvironment): Promise<UniswapV3Factory> {
    const { log, deploy } = hre.deployments
    const { deployer } = await hre.getNamedAccounts()
    const uniV3Factory = await deploy("UniswapV3Factory", {
        from: deployer,
        args: [],
        log: true,
    })
    log(`# Deployed UniswapV3Factory at address: ${uniV3Factory.address}`)
    const uniV3ContractFactory = await ethers.getContractAt("UniswapV3Factory", uniV3Factory.address)
    const uniV3Contract = uniV3ContractFactory.attach(uniV3ContractFactory.address)
    return uniV3Contract as UniswapV3Factory
}

async function createPool(uniV3Factory: UniswapV3Factory, chainId: number) {
    const uniFee = 3000
    const { veth, vusdc } = networkConfigHelper[chainId]
    console.log(`# With quote token "${vusdc}" and base token "${veth}"}`)
    await uniV3Factory.createPool(veth, vusdc, uniFee)
    console.log(`# Pool created`)
}

import { Contract } from "ethers"
import { ethers, network, upgrades } from "hardhat"
import { HardhatRuntimeEnvironment } from "hardhat/types"
import { HARDHAT_CHAINID, isDevelopmentChain, networkConfigHelper } from "../helper.hardhat.config"
import { verify } from "../scripts/verify"

// 2. MarketRegistry -> uniV3Factory.address & quoteToken.address
//    2.1. For each market, we deploy a pair of two virtual tokens (with no real value) and initiate a new Uniswap V3 pool to provide liquidity to.
//       2.1.1. Base token: the virtual underlying asset users are trading for, such as vETH, vBTC
//       2.1.2. Quote token: the counter currency of base token, which is always vUSDC for any base token
const deploy = async (hre: HardhatRuntimeEnvironment) => {
    const { log, get } = hre.deployments
    const chainId = network.config.chainId || HARDHAT_CHAINID
    // let aggregatorFactory;
    // let chainlinkPriceFeedV3Factory;
    // log("#########################")
    // log(`# Deploying MarketRegistry Contract to: ${chainId} ...`)
    // log("# Deploying AggregatorV3...")

    // if (isDevelopmentChain(chainId)) {
    //     aggregatorFactory = await ethers.getContractFactory('TestAggregatorV3');
    // } else {
    //     aggregatorFactory = await ethers.getContractFactory('AggregatorV3Interface');
    // }
    // const aggregator = await aggregatorFactory.deploy()
    // log(`# Deployed at address: ${aggregator.address}}`);

    // log("# Deploying ChainlinkPriceFeedV3...")

    // if (isDevelopmentChain(chainId)) {
    //     chainlinkPriceFeedV3Factory = await ethers.getContractFactory('TestChainlinkPriceFeed');
    // } else {
    //     chainlinkPriceFeedV3Factory = await ethers.getContractFactory('ChainlinkPriceFeedV3');
    // }

    // const chainlinkPriceFeedV3 = await chainlinkPriceFeedV3Factory.deploy(
    //     aggregator.address,
    //     40 * 60, // 40 mins
    //     CACHED_TWAP_INTERVAL,
    // )

    const usdcAddress = await deployQuoteToken(chainId)
    const uniV3Factory = await deployUniswapV3Factory()

    const marketRegistryFactory = await ethers.getContractFactory("MarketRegistry")
    const marketRegistryContract = await upgrades.deployProxy(
        marketRegistryFactory,
        [uniV3Factory.address, usdcAddress],
        {
            initializer: "initialize",
        },
    )
    await marketRegistryContract.deployed()
    log("# MarketRegistry contract deployed at address:", marketRegistryContract.address)
    log("#########################")

    if (!isDevelopmentChain(chainId)) {
        verify(marketRegistryContract.address, [])
    }
}

export default deploy
deploy.tags = ["marketreg", "all"]

async function deployQuoteToken(chainId: number) {
    if (isDevelopmentChain(chainId)) {
        const quoteTokenFactory = await ethers.getContractFactory("QuoteToken")
        const quoteToken = await quoteTokenFactory.deploy() // as QuoteToken
        await quoteToken.initialize("TestUSDC", "USDC")
        networkConfigHelper[chainId].usdc = quoteToken.address
    }

    return networkConfigHelper[chainId].usdc
}

async function deployUniswapV3Factory(): Promise<Contract> {
    const factoryFactory = await ethers.getContractFactory("UniswapV3Factory")
    return await factoryFactory.deploy() // as UniswapV3Factory
}

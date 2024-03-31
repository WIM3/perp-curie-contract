import * as fs from "fs"
import { ethers, network } from "hardhat"
import { HardhatRuntimeEnvironment } from "hardhat/types"
import { HARDHAT_CHAINID, isDevelopmentChain, networkConfigHelper } from "../helper.hardhat.config"
import { verify } from "../scripts/verify"
import { MarketRegistry, PriceFeedDispatcher, UniswapV3Factory } from "../typechain"
import { Tag } from "./tags"

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
    console.log("quote Token")
    const [baseTokenAddress, priceFeedDispatcher] = await deployBaseToken(hre, chainId, quoteTokenAddress)
    console.log("base Token")
    const uniV3Factory = await deployUniswapV3Factory(hre)
    log("# Creating pool...")
    const pool = await createPool(uniV3Factory, chainId)
    console.log("pool")
    const uniV3PriceFeed = await uniswapV3PriceFeed(hre, pool)
    const priceFeedFactory = await ethers.getContractAt("PriceFeedDispatcher", priceFeedDispatcher)
    const priceFeed = priceFeedFactory.attach(priceFeedFactory.address) as PriceFeedDispatcher
    await priceFeed.setUniswapV3PriceFeed(uniV3PriceFeed)

    log(`# Deploying MarketRegistry Contract to: ${chainId} ...`)
    const marketRegistryContract = await deploy("MarketRegistry", {
        from: deployer,
        args: [],
        log: true,
        proxy: {
            owner: deployer,
            proxyContract: "OpenZeppelinTransparentProxy",
            execute: {
                init: {
                    methodName: "initialize",
                    args: [uniV3Factory.address, quoteTokenAddress],
                },
            },
        },
    })
    log("# MarketRegistry contract deployed at address:", marketRegistryContract.address)
    log("#########################")
    const marketRegistryCon = await ethers.getContractAt("MarketRegistry", marketRegistryContract.address)
    const marketRegistry = marketRegistryCon.attach(marketRegistryCon.address) as MarketRegistry

    if (!isDevelopmentChain(chainId)) {
        const proxyString = fs.readFileSync("./deployments/opsepolia/MarketRegistry.json", "utf-8")
        const proxyData = JSON.parse(proxyString)
        const implString = fs.readFileSync("./deployments/opsepolia/MarketRegistry_Implementation.json", "utf-8")
        const implData = JSON.parse(implString)

        await verify(proxyData.address, proxyData.args, implData.address)
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

async function deployBaseToken(hre: HardhatRuntimeEnvironment, chainId: number, quoteTokenAddr: string) {
    const { log, deploy } = hre.deployments
    const { deployer } = await hre.getNamedAccounts()
    let priceFeedAddress
    let aggregatorAddress

    const optSepoliaPyth = "0x0708325268dF9F66270F1401206434524814508b"
    const pythEthUsdPriceId = "0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace"

    if (!isDevelopmentChain(chainId)) {
        console.log("# Deploying PythAggregatorV3...")
        const aggregator = await deploy("PythAggregatorV3", {
            from: deployer,
            args: [optSepoliaPyth, pythEthUsdPriceId],
            log: true,
        })

        aggregatorAddress = aggregator.address
        console.log(`# Deployed PythAggregatorV3 at address: ${aggregatorAddress}`)
    }

    if (!isDevelopmentChain(chainId)) {
        const fortyMinutes = 60 * 40
        const fifteenMinutes = 60 * 15
        console.log("# Deploying PythPriceFeedV3...")

        const pythPriceFeedV3 = await deploy("PythPriceFeedV3", {
            from: deployer,
            args: [aggregatorAddress, `${fortyMinutes}`, `${fifteenMinutes}`],
            log: true,
            gasLimit: 6000000,
        })
        priceFeedAddress = pythPriceFeedV3.address
        console.log(`# Deployed PythPriceFeedV3 at address: ${pythPriceFeedV3.address}`)
    } else {
        priceFeedAddress = networkConfigHelper[chainId].ethusdPriceFeed
    }

    console.log("# Deploying PriceFeedDispatcher...")
    // This one is from perp-curie-contracts
    const priceFeedDispatcher = await deploy("PriceFeedDispatcher", {
        from: deployer,
        args: [priceFeedAddress],
        log: true,
    })
    console.log(`# Deployed priceFeedDispatcher at address: ${priceFeedDispatcher.address}`)

    console.log("# Deploying BaseToken...")
    let baseTokenAddr = "0xffffffffffffffffffffffffffffffffffffffff"
    let baseToken
    if (!fs.existsSync("BaseToken.json")) {
        while (baseTokenAddr > quoteTokenAddr) {
            if (fs.existsSync("BaseToken.json")) {
                fs.rmSync("BaseToken.json")
                fs.rmSync("BaseToken_Implementation.json")
                fs.rmSync("BaseToken_Proxy.json")
            }
            baseToken = await deploy("BaseToken", {
                from: deployer,
                args: [],
                log: true,
                proxy: {
                    owner: deployer,
                    proxyContract: "OpenZeppelinTransparentProxy",
                    execute: {
                        init: {
                            methodName: "initialize",
                            args: ["ETH", "vETH", priceFeedDispatcher.address],
                        },
                    },
                },
            })
            baseTokenAddr = baseToken.address
        }
    }

    console.log(`# Deployed BaseToken at address: ${baseToken.address}}`)
    networkConfigHelper[chainId].veth = baseToken.address

    return [networkConfigHelper[chainId].veth, priceFeedDispatcher.address]
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
    const pool = await uniV3Factory.getPool(veth, vusdc, uniFee)
    return pool
}

async function uniswapV3PriceFeed(hre: HardhatRuntimeEnvironment, pool: string) {
    const { log, deploy } = hre.deployments
    const { deployer } = await hre.getNamedAccounts()
    console.log("# Deploying UniswapV3PriceFeed...")
    const uniswapV3PriceFeed = await deploy("UniswapV3PriceFeed", {
        from: deployer,
        args: [pool],
        log: true,
    })
    log(`# Deployed UniswapV3PriceFeed at address: ${uniswapV3PriceFeed.address}`)
    return uniswapV3PriceFeed.address
}

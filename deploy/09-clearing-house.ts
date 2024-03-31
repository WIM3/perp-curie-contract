import * as fs from "fs"
import { ethers, network } from "hardhat"
import { HardhatRuntimeEnvironment } from "hardhat/types"
import { HARDHAT_CHAINID, isDevelopmentChain } from "../helper.hardhat.config"
import { verify } from "../scripts/verify"
import { encodePriceSqrt } from "../test/shared/utilities"
import {
    AccountBalance,
    BaseToken,
    Exchange,
    OrderBook,
    QuoteToken,
    UniswapV3Factory,
    UniswapV3Pool,
} from "../typechain"
import { Tag } from "./tags"
import { priceSqrt } from "../scripts/getTokenPrice"

const deploy = async (hre: HardhatRuntimeEnvironment) => {
    const { log, get, deploy } = hre.deployments
    const { deployer } = await hre.getNamedAccounts()
    const chainId = network.config.chainId || HARDHAT_CHAINID
    log("#########################")
    log(`# Deploying ClearingHouse Contract to: ${chainId} ...`)

    const clearingHouseConfig = await get("ClearingHouseConfig")
    const vault = await get("Vault")
    const quoteToken = await get("QuoteToken")
    const baseToken = await get("BaseToken")
    const uniV3Factory = await get("UniswapV3Factory")
    const exchange = await get("Exchange")
    const accountBalance = await get("AccountBalance")
    const insuranceFund = await get("InsuranceFund")
    const marketRegistry = await get("MarketRegistry")
    const orderBook = await get("OrderBook")

    const clearingHouseContract = await deploy("ClearingHouse", {
        from: deployer,
        args: [],
        log: true,
        proxy: {
            owner: deployer,
            proxyContract: "OpenZeppelinTransparentProxy",
            execute: {
                init: {
                    methodName: "initialize",
                    args: [
                        clearingHouseConfig.address,
                        vault.address,
                        quoteToken.address,
                        uniV3Factory.address,
                        exchange.address,
                        accountBalance.address,
                        insuranceFund.address,
                    ],
                },
            },
        },
    })

    const baseTokenCon = await ethers.getContractAt("BaseToken", baseToken.address)
    const baseTokenV = baseTokenCon.attach(baseTokenCon.address) as BaseToken
    const quoteTokenCon = await ethers.getContractAt("QuoteToken", quoteToken.address)
    const quoteTokenV = quoteTokenCon.attach(quoteTokenCon.address) as QuoteToken
    await baseTokenV.mintMaximumTo(clearingHouseContract.address)
    await quoteTokenV.mintMaximumTo(clearingHouseContract.address)
    const uniFac = await ethers.getContractAt("UniswapV3Factory", uniV3Factory.address)
    const uniV3Fac = uniFac.attach(uniFac.address) as UniswapV3Factory
    const poolAddr = await uniV3Fac.getPool(baseToken.address, quoteToken.address, "3000")
    const uniPool = await ethers.getContractAt("UniswapV3Pool", poolAddr)
    const uniV3Pool = uniPool.attach(uniPool.address) as UniswapV3Pool
    // you need to get the sqrtPriceX96 information from the respective mainnet pool
    const sqrtPrice = await priceSqrt()
    await uniV3Pool.initialize(sqrtPrice)
    await baseTokenV.addWhitelist(clearingHouseContract.address)
    await quoteTokenV.addWhitelist(clearingHouseContract.address)
    await baseTokenV.addWhitelist(uniV3Pool.address)
    await quoteTokenV.addWhitelist(uniV3Pool.address)
    const marketRegistryFac = await ethers.getContractAt("MarketRegistry", marketRegistry.address)
    const marketRegistryCon = marketRegistryFac.attach(marketRegistryFac.address)
    await marketRegistryCon.setClearingHouse(clearingHouseContract.address)
    await marketRegistryCon.addPool(baseToken.address, "3000", { gasLimit: 5000000 })

    const exchangeFac = await ethers.getContractAt("Exchange", exchange.address)
    const exchangeCon = exchangeFac.attach(exchangeFac.address) as Exchange
    await exchangeCon.setClearingHouse(clearingHouseContract.address)

    const accountBalanceFac = await ethers.getContractAt("AccountBalance", accountBalance.address)
    const accountBalanceCon = accountBalanceFac.attach(accountBalanceFac.address) as AccountBalance
    await accountBalanceCon.setClearingHouse(clearingHouseContract.address)

    const orderBookFac = await ethers.getContractAt("OrderBook", orderBook.address)
    const orderBookCon = orderBookFac.attach(orderBookFac.address) as OrderBook
    await orderBookCon.setClearingHouse(clearingHouseContract.address)

    log("# ClearingHouse deployed at address:", clearingHouseContract.address)
    log("#########################")

    if (!isDevelopmentChain(chainId)) {
        const proxyString = fs.readFileSync("./deployments/opsepolia/ClearingHouse.json", "utf-8")
        const proxyData = JSON.parse(proxyString)
        const implString = fs.readFileSync("./deployments/opsepolia/ClearingHouse_Implementation.json", "utf-8")
        const implData = JSON.parse(implString)

        await verify(proxyData.address, proxyData.args, implData.address)
    }
}

export default deploy
deploy.tags = [Tag.ClearingHouse, Tag.All]
deploy.dependencies = [
    Tag.ClearingHouseConfig,
    Tag.Vault,
    Tag.MarketRegistry,
    Tag.Exchange,
    Tag.AccountBalance,
    Tag.InsuranceFund,
]
deploy.runAtTheEnd = true

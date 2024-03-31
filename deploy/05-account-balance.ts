import * as fs from "fs"
import { network } from "hardhat"
import { HardhatRuntimeEnvironment } from "hardhat/types"
import { HARDHAT_CHAINID, isDevelopmentChain } from "../helper.hardhat.config"
import { verify } from "../scripts/verify"
import { Tag } from "./tags"

const deploy = async (hre: HardhatRuntimeEnvironment) => {
    const { log, get, deploy } = hre.deployments
    const { deployer } = await hre.getNamedAccounts()
    const chainId = network.config.chainId || HARDHAT_CHAINID
    log("#########################")
    log(`# Deploying AccountBalance Contract to: ${chainId} ...`)

    const orderbook = await get("OrderBook")
    const clearingHouseConfig = await get("ClearingHouseConfig")
    const accountBalanceContract = await deploy("AccountBalance", {
        from: deployer,
        args: [],
        log: true,
        proxy: {
            owner: deployer,
            proxyContract: "OpenZeppelinTransparentProxy",
            execute: {
                init: {
                    methodName: "initialize",
                    args: [clearingHouseConfig.address, orderbook.address],
                },
            },
        },
    })
    log("# AccountBalance contract deployed at address:", accountBalanceContract.address)
    log("#########################")

    if (!isDevelopmentChain(chainId)) {
        const proxyString = fs.readFileSync("./deployments/opsepolia/AccountBalance.json", "utf-8")
        const proxyData = JSON.parse(proxyString)
        const implString = fs.readFileSync("./deployments/opsepolia/AccountBalance_Implementation.json", "utf-8")
        const implData = JSON.parse(implString)

        await verify(proxyData.address, proxyData.args, implData.address)
    }
}

export default deploy
deploy.tags = [Tag.AccountBalance, Tag.All]
deploy.dependencies = [Tag.OrderBook, Tag.ClearingHouseConfig]

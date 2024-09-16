import * as fs from "fs"
import { HardhatRuntimeEnvironment } from "hardhat/types"
import { HARDHAT_CHAINID, isDevelopmentChain } from "../helper.hardhat.config"
import { verify } from "../scripts/verify"
import { Tag } from "./tags"

const deploy = async (hre: HardhatRuntimeEnvironment) => {
    const { log, deploy } = hre.deployments
    const { deployer } = await hre.getNamedAccounts()
    const chainId = hre.network.config.chainId || HARDHAT_CHAINID
    log("#########################")
    log(`# Deploying ClearingHouseConfig Contract to: ${chainId} ...`)

    const clearingHouseConfigContract = await deploy("ClearingHouseConfig", {
        from: deployer,
        args: [],
        log: true,
        proxy: {
            owner: deployer,
            proxyContract: "OpenZeppelinTransparentProxy",
            execute: {
                init: {
                    methodName: "initialize",
                    args: [],
                },
            },
        },
    })

    log("# ClearingHouseConfig contract deployed at address:", clearingHouseConfigContract.address)
    log("#########################")

    if (!isDevelopmentChain(chainId)) {
        const proxyString = fs.readFileSync("./deployments/opsepolia/ClearingHouseConfig.json", "utf-8")
        const proxyData = JSON.parse(proxyString)
        const implString = fs.readFileSync("./deployments/opsepolia/ClearingHouseConfig_Implementation.json", "utf-8")
        const implData = JSON.parse(implString)
        await verify(proxyData.address, proxyData.args, implData.address)
    }
}

export default deploy
deploy.tags = [Tag.ClearingHouseConfig, Tag.All]

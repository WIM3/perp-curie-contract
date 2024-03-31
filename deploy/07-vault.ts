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
    log(`# Deploying Vault Contract to: ${chainId} ...`)

    const insuranceFund = await get("InsuranceFund")
    const clearingHouseConfig = await get("ClearingHouseConfig")
    const accountBalance = await get("AccountBalance")
    const exchange = await get("Exchange")
    const vaultContract = await deploy("Vault", {
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
                        insuranceFund.address,
                        clearingHouseConfig.address,
                        accountBalance.address,
                        exchange.address,
                    ],
                },
            },
        },
    })
    log("# Vault contract deployed at address:", vaultContract.address)
    log("#########################")

    if (!isDevelopmentChain(chainId)) {
        const proxyString = fs.readFileSync("./deployments/opsepolia/Vault.json", "utf-8")
        const proxyData = JSON.parse(proxyString)
        const implString = fs.readFileSync("./deployments/opsepolia/Vault_Implementation.json", "utf-8")
        const implData = JSON.parse(implString)

        await verify(proxyData.address, proxyData.args, implData.address)
    }
}

export default deploy
deploy.tags = [Tag.Vault, Tag.All]
deploy.dependencies = [Tag.InsuranceFund, Tag.ClearingHouseConfig, Tag.AccountBalance, Tag.Exchange]

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

    const clearingHouseConfig = await get("ClearingHouseConfig")
    const insuranceFund = await get("InsuranceFund")
    const accountBalance = await get("AccountBalance")
    const exchange = await get("Exchange")
    const vaultContract = await deploy("vault", {
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
                        insuranceFund.address,
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
        verify(vaultContract.address, [])
    }
}

export default deploy
deploy.tags = [Tag.Vault, Tag.All]
deploy.dependencies = [Tag.ClearingHouseConfig, Tag.InsuranceFund, Tag.AccountBalance, Tag.Exchange]

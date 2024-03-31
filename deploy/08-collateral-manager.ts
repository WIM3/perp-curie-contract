import * as fs from "fs"
import { ethers, network } from "hardhat"
import { HardhatRuntimeEnvironment } from "hardhat/types"
import { HARDHAT_CHAINID, isDevelopmentChain } from "../helper.hardhat.config"
import { verify } from "../scripts/verify"
import { Tag } from "./tags"

const deploy = async (hre: HardhatRuntimeEnvironment) => {
    const { log, get, deploy } = hre.deployments
    const { deployer } = await hre.getNamedAccounts()
    const chainId = network.config.chainId || HARDHAT_CHAINID
    log("#########################")
    log(`# Deploying CollateralManager Contract to: ${chainId} ...`)

    const clearingHouseConfig = await get("ClearingHouseConfig")
    const vault = await get("Vault")
    const maxCollateralTokensPerAccountArg = 5
    const debtNonSettlementTokenValueRatioArg = "800000"
    const liquidationRatioArg = "500000"
    const mmRatioBufferArg = "2000"
    const clInsuranceFundFeeRatioArg = "30000"
    const debtThresholdArg = ethers.utils.parseEther("10000")
    const collateralValueDustArg = ethers.utils.parseEther("500")

    const collateralManagerContract = await deploy("CollateralManager", {
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
                        maxCollateralTokensPerAccountArg,
                        debtNonSettlementTokenValueRatioArg,
                        liquidationRatioArg,
                        mmRatioBufferArg,
                        clInsuranceFundFeeRatioArg,
                        debtThresholdArg,
                        collateralValueDustArg,
                    ],
                },
            },
        },
    })

    log("# CollateralManager contract deployed at address:", collateralManagerContract.address)
    log("#########################")

    if (!isDevelopmentChain(chainId)) {
        const proxyString = fs.readFileSync("./deployments/opsepolia/CollateralManager.json", "utf-8")
        const proxyData = JSON.parse(proxyString)
        const implString = fs.readFileSync("./deployments/opsepolia/CollateralManager_Implementation.json", "utf-8")
        const implData = JSON.parse(implString)

        await verify(proxyData.address, proxyData.args, implData.address)
    }
}

export default deploy
deploy.tags = [Tag.CollateralManager, Tag.All]
deploy.dependencies = [Tag.ClearingHouseConfig, Tag.Vault]

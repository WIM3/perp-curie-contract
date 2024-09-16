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
    log(`# Deploying DelegateApproval Contract to: ${chainId} ...`)

    const delegateApprovalContract = await deploy("DelegateApproval", {
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

    log("# DelegateApproval contract deployed at address:", delegateApprovalContract.address)
    log("#########################")

    if (!isDevelopmentChain(chainId)) {
        const proxyString = fs.readFileSync("./deployments/opsepolia/DelegateApproval.json", "utf-8")
        const proxyData = JSON.parse(proxyString)
        const implString = fs.readFileSync("./deployments/opsepolia/DelegateApproval_Implementation.json", "utf-8")
        const implData = JSON.parse(implString)
        console.log("DELEGATE APPROVAL ADDREESS IMPL: ", implData.address)

        await verify(proxyData.address, proxyData.args, implData.address)
    }
}

export default deploy
deploy.tags = [Tag.DelegateApproval, Tag.All]

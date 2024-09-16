import * as fs from "fs"
import { network } from "hardhat"
import { HardhatRuntimeEnvironment } from "hardhat/types"
import { HARDHAT_CHAINID, isDevelopmentChain } from "../helper.hardhat.config"
import { verify } from "../scripts/verify"
import { Tag } from "./tags"

const deploy = async (hre: HardhatRuntimeEnvironment) => {
    const { log, deploy } = hre.deployments
    const { deployer } = await hre.getNamedAccounts()
    const chainId = network.config.chainId || HARDHAT_CHAINID
    const usdcAddress = "0x5fd84259d66Cd46123540766Be93DFE6D43130D7"
    log("#########################")
    log(`# Deploying InsuranceFund Contract to: ${chainId} ...`)

    // if (isDevelopmentChain(chainId)) {
    //     const tokenFactory = await ethers.getContractFactory("TestERC20")
    //     const USDC = (await tokenFactory.deploy()) as TestERC20
    //     await USDC.__TestERC20_init("TestUSDC", "USDC", 6)
    //     usdcAddress = USDC.address
    //     log(`# Deployed TestUSDC Token to: ${usdcAddress}`)
    // } else {
    //     usdcAddress = networkConfigHelper[chainId].usdc
    // }

    const insuranceFundContract = await deploy("InsuranceFund", {
        from: deployer,
        args: [],
        log: true,
        proxy: {
            owner: deployer,
            proxyContract: "OpenZeppelinTransparentProxy",
            execute: {
                init: {
                    methodName: "initialize",
                    args: [usdcAddress],
                },
            },
        },
    })

    log("# InsuranceFund contract deployed at address:", insuranceFundContract.address)
    log("#########################")

    if (!isDevelopmentChain(chainId)) {
        const proxyString = fs.readFileSync("./deployments/opsepolia/InsuranceFund.json", "utf-8")
        const proxyData = JSON.parse(proxyString)
        const implString = fs.readFileSync("./deployments/opsepolia/InsuranceFund_Implementation.json", "utf-8")
        const implData = JSON.parse(implString)

        await verify(proxyData.address, proxyData.args, implData.address)
    }
}

export default deploy
deploy.tags = [Tag.InsuranceFund, Tag.All]

import { ethers, network } from "hardhat"
import * as fs from "fs"
import { HardhatRuntimeEnvironment } from "hardhat/types"
import { HARDHAT_CHAINID, isDevelopmentChain, networkConfigHelper } from "../helper.hardhat.config"
import { verify } from "../scripts/verify"
import { TestERC20 } from "../typechain"
import { Tag } from "./tags"

const deploy = async (hre: HardhatRuntimeEnvironment) => {
    const { log, deploy } = hre.deployments
    const { deployer } = await hre.getNamedAccounts()
    const chainId = network.config.chainId || HARDHAT_CHAINID
    let usdcAddress
    log("#########################")
    log(`# Deploying InsuranceFund Contract to: ${chainId} ...`)

    if (isDevelopmentChain(chainId)) {
        const tokenFactory = await ethers.getContractFactory("TestERC20")
        const USDC = (await tokenFactory.deploy()) as TestERC20
        await USDC.__TestERC20_init("TestUSDC", "USDC", 6)
        usdcAddress = USDC.address
        log(`# Deployed TestUSDC Token to: ${usdcAddress}`)
    } else {
        usdcAddress = networkConfigHelper[chainId].usdc
    }

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
        verify(insuranceFundContract.address, [usdcAddress])
        log("# verifying implementation...")
        const jsonString = fs.readFileSync("./deployments/optimismGoerli/InsuranceFund_Implementation.json", "utf-8")
        const jsonData = JSON.parse(jsonString)
        verify(jsonData.address, jsonData.args)
    }
}

export default deploy
deploy.tags = [Tag.InsuranceFund, Tag.All]

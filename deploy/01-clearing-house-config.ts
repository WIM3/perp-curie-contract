import { ethers, network, upgrades } from "hardhat"
import { HardhatRuntimeEnvironment } from "hardhat/types"
import { HARDHAT_CHAINID, isDevelopmentChain } from "../helper.hardhat.config"
import { verify } from "../scripts/verify"

const deploy = async (hre: HardhatRuntimeEnvironment) => {
    const { log } = hre.deployments
    const chainId = network.config.chainId || HARDHAT_CHAINID

    log("#########################")
    log(`# Deploying ClearingHouseConfig Contract to: ${chainId} ...`)

    const ClearingHouseConfigFactory = await ethers.getContractFactory("ClearingHouseConfig")
    const clearingHouseConfigContract = await upgrades.deployProxy(ClearingHouseConfigFactory, [], {
        initializer: "initialize",
    })
    await clearingHouseConfigContract.deployed()
    log("# ClearingHouseConfig contract deployed at address:", clearingHouseConfigContract.address)
    log("#########################")

    if (!isDevelopmentChain(chainId)) {
        verify(clearingHouseConfigContract.address, [])
    }
}

export default deploy
deploy.tags = ["all"]

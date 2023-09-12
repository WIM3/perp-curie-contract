import { ethers, network, upgrades } from "hardhat"
import { HardhatRuntimeEnvironment } from "hardhat/types"
import { HARDHAT_CHAINID, isDevelopmentChain, networkConfigHelper } from "../helper.hardhat.config"
import { verify } from "../scripts/verify"
import { TestERC20 } from "../typechain"

const deploy = async (hre: HardhatRuntimeEnvironment) => {
    const { log } = hre.deployments
    const chainId = network.config.chainId || HARDHAT_CHAINID
    let usdcAddress
    log("#########################")
    log(`# Deploying InsuranceFund Contract to: ${chainId} ...`)

    if (isDevelopmentChain(chainId)) {
        usdcAddress = (await deployUSDCToken()).address
        log(`# Deployed TestUSDC Token to: ${usdcAddress}`)
    } else {
        usdcAddress = networkConfigHelper[chainId].usdc
    }

    const insuranceFundFactory = await ethers.getContractFactory("InsuranceFund")
    const insuranceFundContract = await upgrades.deployProxy(insuranceFundFactory, [usdcAddress], {
        initializer: "initialize",
    })
    await insuranceFundContract.deployed()
    log("# InsuranceFund contract deployed at address:", insuranceFundContract.address)
    log("#########################")

    if (!isDevelopmentChain(chainId)) {
        verify(insuranceFundContract.address, [])
    }
}

export default deploy
deploy.tags = ["all"]

async function deployUSDCToken() {
    const tokenFactory = await ethers.getContractFactory("TestERC20")
    const USDC = (await tokenFactory.deploy()) as TestERC20
    await USDC.__TestERC20_init("TestUSDC", "USDC", 6)
    return USDC
}

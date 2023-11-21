import { HardhatRuntimeEnvironment } from "hardhat/types"
import { Tag } from "./tags"

const deploy = async (hre: HardhatRuntimeEnvironment) => {
    hre.ethers.getContractFactory("QuoteToken")
    hre.deployments.log("#########################")
    hre.deployments.log("# UPGRADING CONTRACTS #")
    const proxyAddress = "0xA77A1064e9A14f8E78A7ACE7079b87d27Dc7305b" // networkConfigHelper[chainId].vusdc
    const quoteTokenV2 = await hre.ethers.getContractFactory("QuoteToken")
    const upgraded = await hre.upgrades.upgradeProxy(proxyAddress, quoteTokenV2, {
        kind: "transparent",
    })

    console.log("### ~ upgraded:", upgraded.address)
}

export default deploy
deploy.tags = [Tag.UpgradeQuotetoken]

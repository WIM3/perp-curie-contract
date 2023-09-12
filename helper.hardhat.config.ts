export const HARDHAT_CHAINID = 31337
export const GOERLI_CHAINID = 5

interface ContractArguments {
    name: string
    usdc?: string
}
interface ConfigHelper {
    [chainId: number]: ContractArguments
}

export const networkConfigHelper: ConfigHelper = {
    5: {
        name: "goerli",
    },
    31337: {
        name: "hardhat",
    },
}

export const isDevelopmentChain = (chainId: number) => {
    const developmentNetworkNames = ["hardhat", "localhost"]
    return developmentNetworkNames.includes(networkConfigHelper[chainId]?.name)
}

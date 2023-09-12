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
        usdc: "",
    },
    10: {
        name: "optimism mainnet",
        usdc: "0x7F5c764cBc14f9669B88837ca1490cCa17c31607",
    },
    420: {
        name: "Optimism Goerli Testnet",
        usdc: "0x5f1C3c9D42F531975EdB397fD4a34754cc8D3b71",
    },
    31337: {
        name: "hardhat",
        usdc: "",
    },
}

export const isDevelopmentChain = (chainId: number) => {
    const developmentNetworkNames = ["hardhat", "localhost"]
    return developmentNetworkNames.includes(networkConfigHelper[chainId]?.name)
}

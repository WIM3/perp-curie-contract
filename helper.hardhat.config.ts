export const HARDHAT_CHAINID = 31337
export const GOERLI_CHAINID = 5

interface ContractArguments {
    name: string
    usdc?: string
    veth?: string
    vusdc?: string
    ethusdPriceFeed?: string
}
interface ConfigHelper {
    [chainId: number]: ContractArguments
}

export const networkConfigHelper: ConfigHelper = {
    5: {
        name: "goerli",
        usdc: "",
        ethusdPriceFeed: "",
    },
    10: {
        // Verify addresses
        name: "optimism mainnet",
        usdc: "0x7F5c764cBc14f9669B88837ca1490cCa17c31607",
        ethusdPriceFeed: "0x13e3Ee699D1909E989722E753853AE30b17e08c5",
    },
    420: {
        name: "Optimism Goerli Testnet",
        usdc: "0xe05606174bac4A6364B31bd0eCA4bf4dD368f8C6",
        ethusdPriceFeed: "0x57241A37733983F97C4Ab06448F244A1E0Ca0ba8",
        // Filled while deploying
        veth: "",
        vusdc: "",
    },
    31337: {
        name: "hardhat",
        usdc: "",
        ethusdPriceFeed: "",
        veth: "",
    },
}

export const isDevelopmentChain = (chainId: number) => {
    const developmentNetworkNames = ["hardhat", "localhost"]
    return developmentNetworkNames.includes(networkConfigHelper[chainId]?.name)
}

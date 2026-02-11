import sdk from '@xyrawallet/sdk'
import { networkId, xahauNetwork } from '.'

const getXyraNetwork = () => {
  // Allow only XRPL/Xahau mainnet+testnet, no devnets/others
  if (xahauNetwork) {
    if (networkId === 21337) return 'xahau-mainnet'
    if (networkId === 21338) return 'xahau-testnet'
    return null
  }
  if (networkId === 0) return 'xrpl-mainnet'
  if (networkId === 1) return 'xrpl-testnet'
  return null
}

export const xyraConnect = async () => {
  const xyraNetwork = getXyraNetwork()
  if (!xyraNetwork) {
    throw new Error('Xyra supports only XRPL/Xahau Mainnet & Testnet (this network is not supported).')
  }

  const { address, network, publicKey } = await sdk.connect({
    network: xyraNetwork,
    onProgress: () => {}
  })

  if (network && network !== xyraNetwork) {
    throw new Error(`Please switch Xyra network to ${xyraNetwork} (currently ${network}).`)
  }

  return { address, publicKey, xyraNetwork }
}

export const xyraSignOnly = async ({ tx, setStatus }) => {
  const xyraNetwork = getXyraNetwork()
  if (!xyraNetwork) {
    throw new Error('Xyra supports only XRPL/Xahau Mainnet & Testnet for now.')
  }

  setStatus?.('Sign the transaction in Xyra.')
  const { tx_blob } = await sdk.sign({ transaction: tx, network: xyraNetwork })
  return tx_blob
}

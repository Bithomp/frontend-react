import { isInstalled, getAddress } from '@gemwallet/api' //getNetwork, signMessage

export const gemwalletTxSend = ({ saveAddressData }) => {
  isInstalled().then((response) => {
    if (response.result.isInstalled) {
      getAddress().then((response) => {
        saveAddressData({ address: response.result?.address, wallet: 'gemwallet' })
      })
    } else {
      alert('GemWallet is not installed')
    }

    //getNetwork().then((response) => {
    //alert(response.result?.network)
    //})

    //const message = 'Hello, World!'

    //signMessage(message).then((response) => {
    //console.log(response.result?.signedMessage)
    //})
  })
}

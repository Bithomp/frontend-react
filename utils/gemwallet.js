import { isInstalled, getAddress, signTransaction, submitTransaction } from '@gemwallet/api' //getNetwork

//getNetwork().then((response) => {
//alert(response.result?.network)
//})

const gemwalletSign = ({ address, tx, signRequest, afterSubmitExe, afterSigning, onSignIn }) => {
  const signRequestData = signRequest.data
  const transaction = tx

  // If the transaction field Account is not set, the account of the user's wallet will be used.

  if (signRequestData?.signOnly) {
    signTransaction({ transaction })
      .then((response) => {
        /*
        {
          "type": "response",
          "result": {
            "signature": "120003220000000023028B82FC2400209629201B002096C168400000000000000C7321ED9B2E16AC1B67FAA2A8953972796D48361DBD761ED174FA0F4E77A77AF37CAA007440B9CB3560837CC9128B0EBFC349D4EE3B66CC7AEAA99C6BA3628D0BE7194818697CD9EA26758F867059B0DD252D1ECB9BE074B34859341458C00A16CD22C6B70177107872706C6578706C6F7265722E636F6D8114677AB55E8308CB46539967BA4B61E305726CDBC6F9EA7D107872706C6578706C6F7265722E636F6DE1F1"
          }
        }
        */
        afterSigning({ signRequestData, blob: response.result?.signature, address })
      })
      .catch((error) => {
        console.error('Transaction submission failed', error)
      })
  } else {
    const redirectName = signRequest.redirect
    const wallet = 'gemwallet'

    if (!tx || tx?.TransactionType === 'SignIn') {
      onSignIn({ address, wallet, redirectName })
      //keept afterSubmitExe here to close the dialog form when signedin
      afterSubmitExe({})
      return
    }
    submitTransaction({ transaction })
      .then((response) => {
        const txHash = response.result?.hash
        if (txHash) {
          onSignIn({ address, wallet, redirectName })
          afterSubmitExe({
            redirectName,
            broker: signRequest.broker.name,
            txHash,
            txType: tx.TransactionType
          })
        } else {
          //when failed transaction: onlyLogin, remove redirectName
          onSignIn({ address, wallet, redirectName: null })
        }
      })
      .catch((error) => {
        console.error('Transaction submission failed', error)
      })
  }
}

export const gemwalletTxSend = ({ tx, signRequest, afterSubmitExe, afterSigning, onSignIn }) => {
  isInstalled().then((response) => {
    if (response.result.isInstalled) {
      getAddress().then((response) => {
        const address = response.result?.address
        gemwalletSign({ address, tx, signRequest, afterSubmitExe, afterSigning, onSignIn })
      })
    } else {
      alert('GemWallet is not installed')
    }
  })
}

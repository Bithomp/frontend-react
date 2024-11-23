import { isInstalled, getAddress, signTransaction, submitTransaction } from '@gemwallet/api' //getNetwork
import { broadcastTransaction, getNextTransactionParams } from './user'

//getNetwork().then((response) => {
//alert(response.result?.network)
//})

const useOurServer = true

const gemwalletSign = async ({
  address,
  tx,
  signRequest,
  afterSubmitExe,
  afterSigning,
  onSignIn,
  setStatus,
  setAwaiting,
  t
}) => {
  const signRequestData = signRequest.data

  // If the transaction field Account is not set, the account of the user's wallet will be used.

  if (signRequestData?.signOnly) {
    signTransaction({ transaction: tx })
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
        console.error(error)
      })
  } else {
    const wallet = 'gemwallet'

    if (!tx || tx?.TransactionType === 'SignIn') {
      onSignIn({ address, wallet, redirectName: signRequest.redirect })
      //keept afterSubmitExe here to close the dialog form when signedin
      afterSubmitExe({})
      return
    }

    if (useOurServer) {
      //get fee
      setAwaiting(true)
      setStatus('Getting transaction fee...')
      const txFee = await getNextTransactionParams(tx)
      setAwaiting(false)
      tx.Sequence = txFee.Sequence
      tx.Fee = txFee.Fee
      tx.LastLedgerSequence = txFee.LastLedgerSequence
      setStatus('Sign the transaction in GemWallet.')
      signTransaction({ transaction: tx })
        .then((response) => {
          const blob = response.result?.signature
          //now submit transaction
          setStatus('Submitting transaction to the network...')
          setAwaiting(true)
          broadcastTransaction({
            blob,
            setStatus,
            onSignIn,
            afterSubmitExe,
            address,
            wallet,
            signRequest,
            tx,
            setAwaiting,
            t
          })
        })
        .catch((error) => {
          console.error(error)
          setStatus('Error signing transaction')
        })
    } else {
      submitTransaction({ transaction: tx })
        .then((response) => {
          const txHash = response.result?.hash
          const redirectName = signRequest.redirect
          if (txHash) {
            onSignIn({ address, wallet, redirectName })
            afterSubmitExe({
              redirectName,
              broker: signRequest.broker?.name,
              txHash,
              txType: tx.TransactionType
            })
          } else {
            //when failed transaction: onlyLogin, remove redirectName
            onSignIn({ address, wallet, redirectName: null })
          }
        })
        .catch((error) => {
          console.error(error)
          setStatus('Error submitting transaction')
        })
    }
  }
}

export const gemwalletTxSend = ({
  tx,
  signRequest,
  afterSubmitExe,
  afterSigning,
  onSignIn,
  setStatus,
  account,
  setAwaiting,
  t
}) => {
  isInstalled().then((response) => {
    if (response.result.isInstalled) {
      if (account?.address && account?.wallet === 'gemwallet') {
        // gemwallet installed, account is known
        const address = account.address
        gemwalletSign({ address, tx, signRequest, afterSubmitExe, afterSigning, onSignIn, setStatus, setAwaiting, t })
      } else {
        //get address from gemwallet
        getAddress().then((response) => {
          const address = response.result?.address
          if (!tx.Account) {
            tx.Account = address
          }
          gemwalletSign({ address, tx, signRequest, afterSubmitExe, afterSigning, onSignIn, setStatus, setAwaiting, t })
        })
      }
    } else {
      setStatus('GemWallet is not installed')
    }
  })
}

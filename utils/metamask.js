//import { explorerName, networkId } from '.'
import { explorerName, server } from '.'
import { broadcastTransaction, getNextTransactionParams } from './user'
import { MetaMaskSDK } from '@metamask/sdk'

const MMSDK = new MetaMaskSDK({
  dappMetadata: {
    name: explorerName + ' explorer',
    url: server
  }
})

const hasSnapsSupport = async (provider) => {
  try {
    await provider.request({
      method: 'wallet_getSnaps'
    })
    return true
  } catch {
    return false
  }
}

const installSnaps = async (provider, setStatus) => {
  try {
    await provider.request({
      method: 'wallet_requestSnaps',
      params: {
        ['npm:xrpl-snap']: {}
      }
    })
    setStatus('Metamask Snaps installed, try again.')
  } catch (err) {
    setStatus(err.message)
  }
}

const metamaskSign = async ({
  provider,
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
  if (signRequestData?.signOnly) {
    setStatus('Sign the transaction in Metamask.')
    try {
      //tx.Sequence = 1
      //tx.Fee = '1'
      const { tx_blob: blob } = await provider.request({
        method: 'wallet_invokeSnap',
        params: {
          snapId: 'npm:xrpl-snap',
          request: {
            method: 'xrpl_sign',
            params: tx
          }
        }
      })
      afterSigning({ signRequestData, blob, address })
    } catch (err) {
      setStatus(err.message)
    }
  } else {
    const wallet = 'metamask'
    setAwaiting(true)

    if (!tx || tx?.TransactionType === 'SignIn') {
      onSignIn({ address, wallet, redirectName: signRequest.redirect })
      //keept afterSubmitExe here to close the dialog form when signedin
      afterSubmitExe({})
      return
    }

    setStatus('Getting transaction fee...')
    const params = await getNextTransactionParams(tx)
    setAwaiting(false)
    tx.Sequence = params.Sequence
    tx.Fee = params.Fee
    tx.LastLedgerSequence = params.LastLedgerSequence
    setStatus('Sign the transaction in Metamask.')
    try {
      const { tx_blob: blob } = await provider.request({
        method: 'wallet_invokeSnap',
        params: {
          snapId: 'npm:xrpl-snap',
          request: {
            method: 'xrpl_sign',
            params: tx
          }
        }
      })
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
    } catch (err) {
      setStatus(err.message)
    }
  }
}

export const metamaskTxSend = async ({
  tx,
  signRequest,
  afterSubmitExe,
  afterSigning,
  onSignIn,
  setStatus,
  setAwaiting,
  t
}) => {
  await MMSDK.connect()
  const provider = MMSDK.getProvider()
  try {
    //check if installed
    const installed = await hasSnapsSupport(provider)
    if (!installed) {
      setStatus('Please install Metamask Snaps')
      await installSnaps(provider, setStatus)
    }

    // no need to check for network, as we submit it on our side
    /*
    //check which network is active now
    const activeNetwork = await provider.request({
      method: 'wallet_invokeSnap',
      params: {
        snapId: 'npm:xrpl-snap',
        request: {
          method: 'xrpl_getActiveNetwork'
        }
      }
    })

    //change network in the metamask if not the same
    if (activeNetwork?.chainId !== networkId) {
      setStatus('Open Metamask and approve changing the network to ' + explorerName)
      await provider.request({
        method: 'wallet_invokeSnap',
        params: {
          snapId: 'npm:xrpl-snap',
          request: {
            method: 'xrpl_changeNetwork',
            params: {
              chainId: networkId
            }
          }
        }
      })
      return
    }
    */

    //'xrpl_getStoredNetworks' - get the list of stored networks

    // Get the account address and public key
    const { account: address, publicKey } = await provider.request({
      method: 'wallet_invokeSnap',
      params: {
        snapId: 'npm:xrpl-snap',
        request: {
          method: 'xrpl_getAccount'
        }
      }
    })

    if (!tx.Account) {
      tx.Account = address
    }
    tx.SigningPubKey = publicKey

    metamaskSign({
      provider,
      address,
      tx,
      signRequest,
      afterSubmitExe,
      afterSigning,
      onSignIn,
      setStatus,
      setAwaiting,
      t
    })
  } catch (err) {
    setStatus(err.message)
    if (err.code === 4001) {
      setStatus('Transaction rejected by user')
    } else if (err.code === 4100) {
      setStatus('Open Metamask and follow the instructions')
      await installSnaps(provider, setStatus)
      metamaskTxSend({
        tx,
        signRequest,
        afterSubmitExe,
        afterSigning,
        onSignIn,
        setStatus,
        setAwaiting,
        t
      })
    }
  }
}

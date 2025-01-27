import { useConnect, useRequest } from '@walletconnect/modal-sign-react'
import { delay, networkId } from '../utils'
import { useEffect, useState } from 'react'
import { broadcastTransaction, getNextTransactionParams } from '../utils/user'
import { useTranslation } from 'next-i18next'
import { encode } from 'xrpl-binary-codec-prerelease'

function SendTx({
  topic,
  tx,
  signRequest,
  setStatus,
  onSignIn,
  afterSubmitExe,
  address,
  wallet,
  setAwaiting,
  afterSigning
}) {
  const [txToSign, setTxToSign] = useState(null)
  const { t } = useTranslation()

  const signRequestData = signRequest.data

  async function getNextTxParams(tx) {
    const params = await getNextTransactionParams(tx)
    if (!params) {
      return
    }
    tx.Sequence = params.Sequence
    tx.Fee = params.Fee
    tx.LastLedgerSequence = params.LastLedgerSequence
    setTxToSign(tx)
  }

  if (tx && !tx.Sequence) {
    if (signRequestData?.signOnly) {
      //there is no message signing =(, so set some rendom sequence and fee to sign
      tx.Sequence = 1
      tx.Fee = '100'
      setTxToSign(tx)
    } else {
      getNextTxParams(tx)
    }
  }

  const { request } = useRequest()

  async function onLoad(transaction) {
    if (!transaction) return

    try {
      setStatus(
        'Please open your Wallet app, wait for the transaction to be prepared, and Sign it. Once done, return to our website to continue.'
      )

      const signedTx = await request({
        chainId: 'xrpl:' + networkId,
        topic,
        request: {
          method: 'xrpl_signTransaction',
          params: {
            submit: false,
            tx_json: transaction
          }
        }
      })

      const blob = encode(signedTx?.tx_json)

      if (signRequestData?.signOnly) {
        afterSigning({ signRequestData, blob, address })
        return
      }

      setStatus('Submitting transaction to the network...')

      //now submit transaction
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

      /*
        {
          "TxnSignature": "30450221008A1F12641AC0C01A8FF7184C194C1005E80058D96A5A5C6FDC1969E0CCA8B68F022044B6A2E2CE7BFE2D159FDF6DA90502389C72A804728F73EE13800751A437D002",
          "SigningPubKey": "0358F2549A8768DE705A30D3B24D7FB01811FBDED4F9B5C17D43891856EBBC7FB0",
        }
      */
    } catch (err) {
      console.error(err)
    }
  }

  useEffect(() => {
    if (txToSign) {
      onLoad(txToSign)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [txToSign])

  return <></>
}

export function WalletConnect({
  tx,
  signRequest,
  afterSubmitExe,
  onSignIn,
  setStatus,
  setAwaiting,
  afterSigning,
  session,
  setSession
}) {
  const [sendNow, setSendNow] = useState(false)

  const wallet = 'walletconnect'

  const { connect } = useConnect({
    requiredNamespaces: {
      xrpl: {
        chains: ['xrpl:' + networkId],
        methods: ['xrpl_signTransaction'],
        events: ['chainChanged', 'accountsChanged']
      }
    }
  })

  async function onConnect() {
    let sessionNew = session

    if (!sessionNew) {
      try {
        sessionNew = await connect()
      } catch (err) {
        if (err.message === 'Modal closed') {
          return
        }
        setAwaiting(false)
        if (err.message === 'Requested chains reside on testnet') {
          setStatus('Make sure your Wallet is connected to the Test network and then try again.')
        } else {
          setStatus(err.message || 'Error connecting through WalletConnect')
        }
      }
    }

    const accounts = sessionNew?.namespaces?.xrpl?.accounts?.map((a) => {
      return a.split(':')[2]
    })

    const address0 = accounts[0]

    if (!tx.Account) {
      tx.Account = address0
    } else if (tx.Account !== address0) {
      setStatus(
        'The account in the transaction (' +
          tx.Account +
          ') does not match the account in the WalletConnect session (' +
          address0 +
          '). Log out from the current account or Sign transaction with it.'
      )
      setAwaiting(false)
      return
    }

    setSession(sessionNew)

    if (!tx || tx?.TransactionType === 'SignIn') {
      onSignIn({ address: address0, wallet, redirectName: signRequest.redirect })
      //keept afterSubmitExe here to close the dialog form when signedin
      afterSubmitExe({})
      return
    }

    setSendNow(true)
    /*
        {
          "peer": {
            "publicKey": "af5bea4152b94af725b117560bc3637417b9910c72167f6ace81426c4d6e5b18",
            "metadata": {
              "description": "FJQYKl",
              "url": "https://bifrostwallet.com",
              "icons": [
                "https://bifrostwallet.com/images/bifrost-wallet-icon.png"
              ],
              "name": "Bifrost Wallet"
            }
          }
        }
      */
  }

  useEffect(() => {
    if (tx && session?.namespaces?.xrpl?.accounts) {
      //don't show awaiting spinning when accounts do not match
      const accounts = session?.namespaces?.xrpl?.accounts?.map((a) => {
        return a.split(':')[2]
      })
      const address0 = accounts[0]
      if (address0 === tx.Account) {
        setAwaiting(true)
      }
    } else {
      setAwaiting(true)
    }

    if (tx) {
      delay(100, onConnect)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tx, session])

  return (
    <>
      {sendNow && (
        <SendTx
          topic={session?.topic}
          tx={tx}
          signRequest={signRequest}
          setStatus={setStatus}
          onSignIn={onSignIn}
          afterSubmitExe={afterSubmitExe}
          address={tx.Account}
          wallet={wallet}
          setAwaiting={setAwaiting}
          afterSigning={afterSigning}
          session={session}
        />
      )}
    </>
  )
}

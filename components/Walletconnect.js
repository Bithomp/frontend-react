import { useConnect, useRequest, WalletConnectModalSign } from '@walletconnect/modal-sign-react'
import { delay, networkId } from '../utils'
import { useEffect, useState } from 'react'
import { getAppMetadata } from '@walletconnect/utils'
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
  setScreen
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

  if (signRequestData?.signOnly) {
    //later
  } else {
    if (tx && !tx.Sequence) {
      getNextTxParams(tx)
    }
  }

  const { request } = useRequest()

  async function onLoad() {
    try {
      const signedTx = await request({
        chainId: 'xrpl:' + networkId,
        topic,
        request: {
          method: 'xrpl_signTransaction',
          params: {
            submit: false,
            tx_json: txToSign //tx
          }
        }
      })

      setScreen('walletconnect')
      setStatus('Submitting transaction to the network...')

      const blob = encode(signedTx?.tx_json)

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
      onLoad()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [txToSign])

  return <></>
}

export function WalletConnect({ tx, setScreen, signRequest, afterSubmitExe, onSignIn, setStatus, setAwaiting }) {
  const [session, setSession] = useState(null)
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
    try {
      const session = await connect()
      setSession(session)
      const accounts = session?.namespaces?.xrpl?.accounts?.map((a) => {
        return a.split(':')[2]
      })

      const address = accounts[0]

      if (!tx.Account) {
        tx.Account = address
      }

      if (!tx || tx?.TransactionType === 'SignIn') {
        onSignIn({ address, wallet, redirectName: signRequest.redirect })
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
    } catch (err) {
      console.error(err)
    }
  }

  useEffect(() => {
    setAwaiting(true)
    if (tx && !session) {
      delay(100, onConnect)
      delay(500, setScreen, '')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tx, session])

  return (
    <>
      <WalletConnectModalSign projectId={process.env.NEXT_PUBLIC_WALLETCONNECT} metadata={getAppMetadata()} />
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
          setScreen={setScreen}
        />
      )}
    </>
  )
}

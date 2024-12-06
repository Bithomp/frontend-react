import { useConnect, useRequest, WalletConnectModalSign } from '@walletconnect/modal-sign-react'
import { delay, networkId } from '../utils'
import { useEffect, useState } from 'react'
import { getAppMetadata } from '@walletconnect/utils'

function SendTx({ topic, tx }) {
  const { request } = useRequest({
    chainId: 'xrpl:' + networkId,
    topic,
    request: {
      method: 'xrpl_signTransaction',
      params: {
        tx_json: tx
      }
    }
  })

  async function onLoad() {
    try {
      const req = await request()
      console.log('req', req) //delete
    } catch (err) {
      console.error(err)
    }
  }

  useEffect(() => {
    onLoad()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return <></>
}

export function WalletConnect({ tx, setScreen, signRequest, afterSubmitExe, onSignIn, setAwaiting }) {
  const [session, setSession] = useState(null)
  const [sendNow, setSendNow] = useState(false)

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

      const signRequestData = signRequest.data
      if (signRequestData?.signOnly) {
        //later
      } else {
        const wallet = 'walletconnect'
        if (!tx || tx?.TransactionType === 'SignIn') {
          onSignIn({ address, wallet, redirectName: signRequest.redirect })
          //keept afterSubmitExe here to close the dialog form when signedin
          afterSubmitExe({})
          return
        }

        setSendNow(true)
      }

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
    } else {
      //setSendNow(true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tx, session])

  return (
    <>
      <WalletConnectModalSign projectId={process.env.NEXT_PUBLIC_WALLETCONNECT} metadata={getAppMetadata()} />
      {sendNow && <SendTx topic={session?.topic} tx={tx} />}
    </>
  )
}

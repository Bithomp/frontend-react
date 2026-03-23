import { useConnect, useRequest } from '@walletconnect/modal-sign-react'
import { delay, networkId } from '../utils'
import { useEffect, useState } from 'react'
import { broadcastTransaction, getNextTransactionParams } from '../utils/user'
import { useTranslation } from 'next-i18next'
import { encode } from 'xrpl-binary-codec-prerelease'

const getSessionAccounts = (session) => {
  if (!session?.namespaces?.xrpl?.accounts) return []
  return session.namespaces.xrpl.accounts.map((item) => item.split(':')[2]).filter(Boolean)
}

const upsertSessionByTopic = (sessions = {}, session) => {
  if (!session?.topic) return sessions
  return {
    ...(sessions || {}),
    [session.topic]: session
  }
}

const pickExistingSession = ({ sessions, tx, activeAddress }) => {
  const list = Object.values(sessions || {}).filter((item) => item?.topic)
  if (!list.length) return null

  // Prefer a session that contains the transaction account.
  if (tx?.Account) {
    const byTxAccount = list.find((session) => getSessionAccounts(session).includes(tx.Account))
    if (byTxAccount) return byTxAccount
  }

  // Then prefer session that contains currently active app address.
  if (activeAddress) {
    const byActiveAddress = list.find((session) => getSessionAccounts(session).includes(activeAddress))
    if (byActiveAddress) return byActiveAddress
  }

  // Finally fallback to first known session.
  return list[0]
}

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
  sessions,
  setSessions,
  activeAddress
}) {
  const [sendNow, setSendNow] = useState(false)
  const [activeSession, setActiveSession] = useState(null)

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
    const forceNewSession = !!signRequest?.connectAnotherWallet
    let sessionNew = forceNewSession ? null : pickExistingSession({ sessions, tx, activeAddress })

    if (!sessionNew) {
      try {
        sessionNew = await connect()
        setSessions((previousSessions) => upsertSessionByTopic(previousSessions, sessionNew))
      } catch (err) {
        if (
          err?.message?.includes('WebSocket connection failed') ||
          err?.message?.includes('Socket stalled when trying to connect')
        ) {
          console.warn('WebSocket connection failed')
        } else if (err.message?.includes('No matching key')) {
          console.warn('Resetting WalletConnect storage due to invalid pairing')
          localStorage.clear()
          location.reload()
          return
        } else if (err.message === 'Modal closed') {
          return
        } else if (
          err.message.includes('setExternalProvider is not a function') ||
          err.message.includes('Cannot redefine property')
        ) {
          return // skip reporting
        }
        setAwaiting(false)
        if (err.message === 'Requested chains reside on testnet') {
          setStatus('Make sure your Wallet is connected to the Test network and then try again.')
        } else {
          setStatus(err.message || 'Error connecting through WalletConnect')
        }
      }
    }

    if (!sessionNew) {
      setAwaiting(false)
      setStatus('WalletConnect session was not created.')
      return
    }

    const accounts = getSessionAccounts(sessionNew)

    const address0 = accounts?.[0]
    const hasTxAccount = tx?.Account && accounts.includes(tx.Account)

    if (tx?.TransactionType !== 'SignIn') {
      if (!tx?.Account) {
        tx.Account = activeAddress && accounts.includes(activeAddress) ? activeAddress : address0
      }

      if (tx.Account && !accounts.includes(tx.Account)) {
        setStatus(
          'The account in the transaction (' +
            tx.Account +
            ') is not available in the selected WalletConnect session. Switch to the matching session or reconnect that wallet.'
        )
        setAwaiting(false)
        return
      }
    }

    setActiveSession(sessionNew)
    setSessions((previousSessions) => upsertSessionByTopic(previousSessions, sessionNew))

    if (!tx || tx?.TransactionType === 'SignIn') {
      onSignIn({
        address: hasTxAccount ? tx.Account : address0,
        addresses: accounts,
        wallet,
        redirectName: signRequest.redirect
      })
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
    const sessionCandidate = pickExistingSession({ sessions, tx, activeAddress })
    if (tx && sessionCandidate?.namespaces?.xrpl?.accounts) {
      //don't show awaiting spinning when accounts do not match
      const accounts = getSessionAccounts(sessionCandidate)
      if (!tx?.Account || accounts.includes(tx.Account)) {
        setAwaiting(true)
      }
    } else {
      setAwaiting(true)
    }

    if (tx) {
      delay(100, onConnect)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tx, sessions, activeAddress])

  return (
    <>
      {sendNow && (
        <SendTx
          topic={activeSession?.topic}
          tx={tx}
          signRequest={signRequest}
          setStatus={setStatus}
          onSignIn={onSignIn}
          afterSubmitExe={afterSubmitExe}
          address={tx.Account}
          wallet={wallet}
          setAwaiting={setAwaiting}
          afterSigning={afterSigning}
        />
      )}
    </>
  )
}

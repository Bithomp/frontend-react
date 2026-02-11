import { useState, useEffect } from 'react'
import { useTranslation, Trans } from 'next-i18next'
import { useRouter } from 'next/router'
import Link from 'next/link'
import axios from 'axios'
import Image from 'next/image'
import Select from 'react-select'

import { useIsMobile } from '../utils/mobile'
import {
  server,
  devNet,
  delay,
  encode,
  networkId,
  floatToXlfHex,
  rewardRateHuman,
  encodeAddressR,
  isAddressValid,
  removeQueryParams,
  webSiteName,
  xahauNetwork,
  nativeCurrency,
  isUrlValid
} from '../utils'
import { duration } from '../utils/format'
import { payloadXamanPost, xamanWsConnect, xamanCancel, xamanProcessSignedData } from '../utils/xaman'
import { gemwalletTxSend } from '../utils/gemwallet'
import { ledgerwalletTxSend } from '../utils/ledgerwallet'
import { trezorTxSend } from '../utils/trezor'
import { metamaskTxSend } from '../utils/metamask'
import { crossmarkTxSend } from '../utils/crossmark'
import { xyraSignOnly, xyraConnect } from '../utils/xyrawallet'

import XamanQr from './Xaman/Qr'
import CheckBox from './UI/CheckBox'
import TargetTableSelect from './UI/TargetTableSelect'
import { submitProAddressToVerify } from '../utils/pro'
import { setAvatar } from '../utils/blobVerifications'
import SetAvatar from './SignForms/SetAvatar'
import SetDomain from './SignForms/SetDomain'
import SetDid from './SignForms/SetDid'
import NFTokenCreateOffer from './SignForms/NFTokenCreateOffer'
import NftTransfer from './SignForms/NftTransfer'
import { WalletConnect } from './Walletconnect'
import NFTokenModify from './SignForms/NFTokenModify'
import { errorCodeDescription } from '../utils/transaction'
import { broadcastTransaction, getNextTransactionParams } from '../utils/user'

const qr = '/images/qr.gif'

const voteTxs = ['castVoteRewardDelay', 'castVoteRewardRate', 'castVoteHook', 'castVoteSeat']
const askInfoScreens = [
  ...voteTxs,
  'NFTokenAcceptOffer',
  'NFTokenCreateOffer',
  'NFTokenBurn',
  'setDomain',
  'setDid',
  'setAvatar',
  'nftTransfer',
  'NFTokenModify'
]
const noCheckboxScreens = [...voteTxs, 'setDomain', 'setDid', 'setAvatar']

let transactionFetchTries = 0

export default function SignForm({
  setSignRequest,
  account,
  signRequest,
  uuid,
  setRefreshPage,
  saveAddressData,
  setAccount,
  wcSession,
  setWcSession
}) {
  const { t } = useTranslation()
  const router = useRouter()
  const isMobile = useIsMobile()

  const [screen, setScreen] = useState('')
  const [status, setStatus] = useState('')
  const [showXamanQr, setShowXamanQr] = useState(false)
  const [xamanQrSrc, setXamanQrSrc] = useState(qr)
  const [xamanUuid, setXamanUuid] = useState(null)
  const [expiredQr, setExpiredQr] = useState(false)
  const [agreedToRisks, setAgreedToRisks] = useState(false)
  const [formError, setFormError] = useState(false)
  const [hookData, setHookData] = useState({})
  const [seatData, setSeatData] = useState({})
  const [targetLayer, setTargetLayer] = useState(signRequest?.layer)
  const [erase, setErase] = useState(false)
  const [awaiting, setAwaiting] = useState(false)
  const [preparedTx, setPreparedTx] = useState(null)

  const [xyraPreparedTx, setXyraPreparedTx] = useState(null)
  const [xyraNeedsClick, setXyraNeedsClick] = useState(false)

  const [rewardRate, setRewardRate] = useState()
  const [rewardDelay, setRewardDelay] = useState()

  const [choosenWallet, setChoosenWallet] = useState(null)

  useEffect(() => {
    if (!signRequest) return

    setXyraPreparedTx(null)
    setXyraNeedsClick(false)

    //deeplink doesnt work on mobiles when it's not in the onClick event
    if (!isMobile) {
      const w = signRequest?.wallet || account?.wallet || choosenWallet
      if (w === 'xyra') {
        // If already logged in with Xyra, go straight to Xyra screen (no choose-app)
        if (account?.wallet === 'xyra' && account?.address) {
          setScreen('xyra')
          setStatus('Getting transaction fee...')
          setAwaiting(true)

          // Prepare fee in background (no popup), then show button to open Xyra
          ;(async () => {
            try {
              const baseTx = signRequest.request || { TransactionType: 'SignIn' }

              if (baseTx.TransactionType === 'SignIn') {
                // ✅ don't auto-open xyra screen here (needs user click anyway)
                setAwaiting(false)
                setStatus('')
                setScreen('choose-app')
                return
              }

              const needsParams =
                baseTx.TransactionType !== 'SignIn' &&
                !signRequest?.data?.signOnly &&
                (!baseTx.Fee || !baseTx.Sequence || !baseTx.LastLedgerSequence)

              if (!needsParams) {
                setAwaiting(false)
                setStatus('Ready. Click “Open Xyra” to sign.')
                setXyraPreparedTx(baseTx)
                setXyraNeedsClick(true)
                return
              }

              // Ensure Account for params fetch
              const txWithAccount = { ...baseTx }
              if (!txWithAccount.Account) txWithAccount.Account = account.address

              const params = await getNextTransactionParams(txWithAccount)

              if (!params) {
                setAwaiting(false)
                setStatus('Error getting transaction fee.')
                return
              }

              const prepared = { ...txWithAccount }
              prepared.Sequence = params.Sequence
              prepared.Fee = params.Fee
              prepared.LastLedgerSequence = params.LastLedgerSequence

              setAwaiting(false)
              setStatus('Ready. Click “Open Xyra” to sign.')
              setXyraPreparedTx(prepared)
              setXyraNeedsClick(true)
            } catch (e) {
              setAwaiting(false)
              setStatus('Error getting transaction fee.')
            }
          })()

          setAwaiting(false)
          setStatus('')

          return
        }

        // Not logged in with Xyra: don't show xyra screen here (needs click on tile)
        setScreen('choose-app')
        return
      }

      // non-xyra wallets: old behavior
      txSend()
    } else {
      //if mobile, but if loggedin as walletconnect
      if (account?.address) {
        // if xaman, but there is an additional screen, so user will click the button
        if (account?.wallet === 'walletconnect' || (account?.wallet === 'xaman' && askInfoScreens.includes(screen))) {
          txSend()
          return
        }
      }
      setScreen('choose-app') //can be refactored, so it opens on previous click
    }
    setHookData({})
    setSeatData({})
    setErase(false)
    //eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signRequest])

  useEffect(() => {
    if (!uuid) return
    setScreen('xaman')
    setShowXamanQr(false)
    setStatus(t('signin.xaman.statuses.wait'))
    xamanProcessSignedData({ uuid, afterSigning, onSignIn, afterSubmitExe })
    //eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uuid])

  const txSend = async (options) => {
    //when the request is wallet specific it's a priority, logout if not matched
    //when request is not wallet specific, use the account wallet if loggedin
    const forcedWallet = signRequest?.wallet // only if request forces a wallet
    let wallet = forcedWallet || account?.wallet

    if (forcedWallet && account?.wallet && account.wallet !== forcedWallet) {
      // if loggedin, but account wallet is different from the one in the request
      // loggout from the account
      setAccount({ ...account, address: null, username: null, wallet: null })
    }

    if (!wallet) {
      // when request is not wallet specific and user is not loggedin
      // check saved wallet from options.wallet on previous steps
      wallet = choosenWallet
      if (!wallet && options?.wallet) {
        wallet = options.wallet
        // when user choosed a wallet in the form 'choose-app', save the wallet in choosenWallet
        setChoosenWallet(options.wallet)
      }
    }

    if (!wallet) {
      setScreen('choose-app')
      return
    }

    //default login
    let tx = { TransactionType: 'SignIn' }

    if (signRequest.request) {
      tx = signRequest.request
    }
    if (wallet === 'xaman' && signRequest.data?.signOnly) {
      //for Xaman make "SignIn" when signing only.
      tx.TransactionType = 'SignIn'
    }

    if (tx.TransactionType === 'NFTokenAcceptOffer' && !agreedToRisks && signRequest.offerAmount !== '0') {
      setScreen('NFTokenAcceptOffer')
      return
    }

    if (signRequest.action === 'nftTransfer') {
      tx.Amount = '0'
      if (!agreedToRisks) {
        setScreen('nftTransfer')
        return
      } else {
        if (!signRequest.request?.Destination) {
          setStatus(t('form.error.address-empty'))
          setFormError(true)
          return
        }
      }
    }

    if (tx.TransactionType === 'NFTokenCreateOffer' || tx.TransactionType === 'URITokenCreateSellOffer') {
      if (!agreedToRisks) {
        setScreen('NFTokenCreateOffer')
        return
      } else {
        if (signRequest.privateOffer && !signRequest.request?.Destination) {
          setStatus(t('form.error.address-empty'))
          setFormError(true)
          return
        }
        if (!signRequest.request?.Amount) {
          setStatus(t('form.error.price-empty'))
          setFormError(true)
          return
        }
      }
    }

    if (tx.TransactionType === 'NFTokenBurn' && !agreedToRisks) {
      setScreen('NFTokenBurn')
      return
    }

    if (tx.TransactionType === 'NFTokenModify' && !agreedToRisks) {
      setScreen('NFTokenModify')
      return
    }

    if (signRequest.action === 'setDomain' && !agreedToRisks) {
      setScreen('setDomain')
      return
    }

    if (signRequest.action === 'setDid' && !agreedToRisks) {
      setScreen('setDid')
      return
    }

    if (signRequest.action === 'setAvatar' && !agreedToRisks) {
      setScreen('setAvatar')
      return
    }

    if (signRequest.action && voteTxs.includes(signRequest.action) && !agreedToRisks) {
      setScreen(signRequest.action)
      return
    }

    if (signRequest.action === 'castVoteHook' && agreedToRisks && (hookData.value || erase)) {
      let hookTopic = '2' //default
      if (!hookData.topic) {
        if (hookData.topic === 0) {
          hookTopic = '0'
        }
      } else {
        hookTopic = hookData.topic
      }

      tx.HookParameters = [
        {
          HookParameter: {
            HookParameterName: '4C', // L - layer
            HookParameterValue: '0' + targetLayer // 01 for L1 table, 02 for L2 table
          }
        },
        {
          HookParameter: {
            HookParameterName: '54', // T - topic type
            HookParameterValue: '480' + hookTopic // H/48 [0x00-0x09]
          }
        },
        {
          HookParameter: {
            HookParameterName: '56', // V - vote data
            HookParameterValue: erase
              ? '0000000000000000000000000000000000000000000000000000000000000000'
              : hookData.value
          }
        }
      ]
    }

    if (signRequest.action === 'castVoteSeat' && agreedToRisks && (seatData.address || erase)) {
      tx.HookParameters = [
        {
          HookParameter: {
            HookParameterName: '4C', // L - layer
            HookParameterValue: '0' + targetLayer // 01 for L1 table, 02 for L2 table
          }
        },
        {
          HookParameter: {
            HookParameterName: '54', // T - topic type
            HookParameterValue: '53' + (seatData.seat || '13') // S - seat, seat number 0-13 (19)
          }
        },
        {
          HookParameter: {
            HookParameterName: '56', // V - vote data
            HookParameterValue: erase ? '0000000000000000000000000000000000000000' : encodeAddressR(seatData.address)
          }
        }
      ]
    }

    // add memo with domain and source tag
    if (!signRequest.data?.signOnly) {
      const client = {
        Memo: {
          MemoData: encode(server?.replace(/^https?:\/\//, ''))
        }
      }
      if (
        tx.Memos &&
        tx.Memos.length &&
        tx.Memos[0]?.Memo?.MemoData !== client.Memo.MemoData &&
        tx.Memos[1]?.Memo?.MemoData !== client.Memo.MemoData
      ) {
        tx.Memos.push(client)
      } else {
        tx.Memos = [client]
      }

      // Only set source tag if it's not already set from the send page
      if (!tx.SourceTag) {
        tx.SourceTag = 42697468
      }
    }

    if (!tx.Account && account?.address) {
      tx.Account = account.address
    }

    //add network ID to transactions for xahau, xahau-testnet and xahau-jshooks
    if (networkId === 21337 || networkId === 21338 || networkId === 31338) {
      tx.NetworkID = networkId
    }

    if (wallet === 'xaman') {
      xamanTxSending(tx)
    } else if (wallet === 'gemwallet') {
      gemwalletTxSending(tx)
    } else if (wallet === 'ledgerwallet') {
      ledgerwalletTxSending(tx)
    } else if (wallet === 'trezor') {
      trezorTxSending(tx)
    } else if (wallet === 'metamask') {
      metamaskTxSending(tx)
    } else if (wallet === 'walletconnect') {
      walletconnectTxSending(tx)
    } else if (wallet === 'crossmark') {
      crossmarkTxSending(tx)
    } else if (wallet === 'xyra') {
      setScreen('xyra')
      setXyraPreparedTx(null)
      setXyraNeedsClick(false)

      const isSignIn = !tx || tx.TransactionType === 'SignIn'
      const isLoggedInXyra = account?.wallet === 'xyra' && account?.address

      // ✅ SignIn: one click -> connect (if needed) -> close. No "Open Xyra".
      if (isSignIn) {
        try {
          if (isLoggedInXyra) {
            // already have address
            await onSignIn({ address: account.address, wallet: 'xyra', redirectName: signRequest?.redirect })
            closeSignInFormAndRefresh()
            return
          }

          setAwaiting(true)
          setStatus('Open Xyra and approve the connection...')
          const { address } = await xyraConnect()
          setAwaiting(false)

          await onSignIn({ address, wallet: 'xyra', redirectName: signRequest?.redirect })
          closeSignInFormAndRefresh()
          return
        } catch (e) {
          setAwaiting(false)
          setStatus(String(e?.message || e))
          return
        }
      }

      const needsParams =
        tx.TransactionType !== 'SignIn' &&
        !signRequest?.data?.signOnly &&
        (!tx.Fee || !tx.Sequence || !tx.LastLedgerSequence)

      if (!isLoggedInXyra) {
        try {
          setAwaiting(true)
          setStatus('Open Xyra and approve the connection...')
          const { address, publicKey } = await xyraConnect()
          setAwaiting(false)

          await onSignIn({ address, wallet: 'xyra', redirectName: signRequest?.redirect })

          const txBase = { ...tx, Account: tx.Account || address }
          if (publicKey && !txBase.SigningPubKey) txBase.SigningPubKey = String(publicKey).toUpperCase()

          if (needsParams && !signRequest?.data?.signOnly) {
            setAwaiting(true)
            setStatus('Getting transaction fee...')
            const params = await getNextTransactionParams(txBase)
            setAwaiting(false)
            if (!params) {
              setStatus('Error getting transaction fee.')
              return
            }
            txBase.Sequence = params.Sequence
            txBase.Fee = params.Fee
            txBase.LastLedgerSequence = params.LastLedgerSequence
          }

          setXyraPreparedTx(txBase)
          setXyraNeedsClick(true)
          setStatus('Ready. Click “Open Xyra” to sign.')
          return
        } catch (e) {
          setAwaiting(false)
          setStatus(String(e?.message || e))
          return
        }
      }

      // ✅ logged in: prepare params (if needed) and then show Open Xyra
      const txBase = { ...tx }
      if (!txBase.Account) txBase.Account = account.address
      // (optional) if you store publicKey in account, set SigningPubKey too

      if (needsParams) {
        setAwaiting(true)
        setStatus('Getting transaction fee...')
        const params = await getNextTransactionParams(txBase)
        setAwaiting(false)

        if (!params) {
          setStatus('Error getting transaction fee.')
          return
        }

        txBase.Sequence = params.Sequence
        txBase.Fee = params.Fee
        txBase.LastLedgerSequence = params.LastLedgerSequence
      }

      setXyraPreparedTx(txBase)
      setXyraNeedsClick(true)
      setStatus('Ready. Click “Open Xyra” to sign.')
      return
    }
  }

  const onSignIn = async ({ address, wallet, redirectName }) => {
    if (address) {
      await saveAddressData({ address, wallet })
      //if redirect
      if (redirectName) {
        signInCancelAndClose()
        if (redirectName === 'nfts') {
          router.push('/nfts/' + address)
          return
        } else if (redirectName === 'nft-offers') {
          router.push('/nft-offers/' + address)
          return
        } else if (redirectName === 'account') {
          router.push('/account/' + address)
          return
        }
      }
    }
  }

  const gemwalletTxSending = (tx) => {
    setScreen('gemwallet')
    if (tx.TransactionType.includes('Remit') && (tx.URITokenID || tx.URITokenIDs)) {
      setStatus('Unfortunatelly, Gem Wallet does not support Remit Transaction that can send NFT (URI Token).')
      return
    }
    gemwalletTxSend({ tx, signRequest, afterSubmitExe, afterSigning, onSignIn, setStatus, account, setAwaiting, t })
    setStatus(t('signin.statuses.check-app', { appName: 'GemWallet' }))
  }

  const crossmarkTxSending = (tx) => {
    setScreen('crossmark')
    if (tx.TransactionType === 'Remit' || tx.TransactionType === 'CronSet') {
      setStatus('Unfortunatelly, Crossmark does not support ' + tx.TransactionType + ' Transaction Types yet.')
      return
    }
    crossmarkTxSend({
      tx,
      signRequest,
      afterSubmitExe,
      afterSigning,
      onSignIn,
      setStatus,
      account,
      setAwaiting,
      t
    })
    setStatus(t('signin.statuses.check-app', { appName: 'Crossmark' }))
  }

  const ledgerwalletTxSending = (tx) => {
    setScreen('ledgerwallet')
    setStatus(
      'Please, connect your Ledger Wallet and open the ' +
        nativeCurrency +
        ' app. Note: Nano S does not support some transactions.'
    )
    ledgerwalletTxSend({ tx, signRequest, afterSubmitExe, afterSigning, onSignIn, setStatus, setAwaiting, t })
  }

  const trezorTxSending = (tx) => {
    setScreen('trezor')
    if (tx.TransactionType !== 'SignIn' && tx.TransactionType !== 'Payment') {
      setStatus('Unfortunatelly, Trezor supports only XRP Payments, and does not allow other Transaction Types =(')
      return
    }
    setStatus('Please, connect your Trezor Wallet.')
    trezorTxSend({ tx, signRequest, afterSubmitExe, afterSigning, onSignIn, setStatus, setAwaiting, t })
  }

  const metamaskTxSending = async (tx) => {
    setScreen('metamask')

    if (tx.TransactionType === 'AccountSet' && (tx.SetFlag === 11 || tx.ClearFlag === 11)) {
      setStatus('Unfortunatelly, Metamask XRPL Snap does not support AccountSet with ASF_TSH_COLLECT flag yet.')
      return
    }

    if (
      tx.TransactionType.includes('URIToken') ||
      tx.TransactionType === 'CronSet' ||
      tx.TransactionType === 'SetHook'
    ) {
      setStatus('Unfortunatelly, Metamask XRPL Snap does not support ' + tx.TransactionType + ' Transaction Types yet.')
      return
    }

    setStatus('Please, connect your Metamask Wallet.')
    metamaskTxSend({ tx, signRequest, afterSubmitExe, afterSigning, onSignIn, setStatus, setAwaiting, t })
  }

  const walletconnectTxSending = async (tx) => {
    setScreen('walletconnect')
    setPreparedTx(tx)
    setStatus('WalletConnect modal is loading...')
  }

  const xamanTxSending = (tx) => {
    let signInPayload = {
      options: {
        expire: 3
      },
      txjson: tx
    }

    if (signRequest.data?.signOnly) {
      signInPayload.options.submit = false
    }

    //for Xaman to sign transaction in the right network
    let forceNetwork = null
    if (networkId === 0) {
      forceNetwork = 'MAINNET'
    } else if (networkId === 1) {
      forceNetwork = 'TESTNET'
    } else if (networkId === 2) {
      forceNetwork = 'DEVNET'
    }
    signInPayload.options.force_network = forceNetwork
    signInPayload.custom_meta = { blob: {} }

    if (signRequest.redirect) {
      signInPayload.custom_meta.blob.redirect = signRequest.redirect
    }
    if (signRequest.broker) {
      signInPayload.custom_meta.blob.broker = signRequest.broker.name
    }
    if (signRequest.data) {
      signInPayload.custom_meta.blob.data = signRequest.data
    }

    setStatus(t('signin.xaman.statuses.wait'))

    if (isMobile) {
      setStatus(t('signin.xaman.statuses.redirecting'))
      //return to the same page
      signInPayload.options.return_url = {
        app: server + router.asPath + (router.asPath.includes('?') ? '&' : '?') + 'uuid={id}'
      }

      if (tx.TransactionType === 'Payment' || signRequest?.receipt) {
        //for username receipts
        signInPayload.options.return_url.app += '&receipt=true'
      }
    } else {
      const xamanUserToken = localStorage.getItem('xamanUserToken')
      if (xamanUserToken) {
        signInPayload.user_token = xamanUserToken
      }
      setShowXamanQr(true)
    }
    payloadXamanPost(signInPayload, onPayloadResponse)
    setScreen('xaman')
  }

  const onPayloadResponse = (data) => {
    if (!data || data.error) {
      setShowXamanQr(false)
      setStatus(data.error)
      return
    }
    setXamanUuid(data.uuid)
    setXamanQrSrc(data.refs.qr_png)
    setExpiredQr(false)
    if (data.pushed) {
      setStatus(t('signin.xaman.statuses.check-push'))
    }
    if (isMobile) {
      if (data.next && data.next.always) {
        window.location = data.next.always
      } else {
        console.log('payload next.always is missing')
      }
    } else {
      setShowXamanQr(true)
      setStatus(t('signin.xaman.scan-qr'))
      //connect to xaman websocket only if it didn't redirect to the xaman app
      xamanWsConnect(data.refs.websocket_status, xamanWsConnected)
    }
  }

  const xamanWsConnected = (obj) => {
    if (obj.status === 'canceled') {
      //cancel button pressed in xaman app
      closeSignInFormAndRefresh()
    } else if (obj.opened) {
      setStatus(t('signin.statuses.check-app', { appName: 'Xaman' }))
    } else if (obj.signed) {
      setShowXamanQr(false)
      setStatus(t('signin.xaman.statuses.wait'))
      xamanProcessSignedData({ uuid: obj.payload_uuidv4, afterSigning, onSignIn, afterSubmitExe })
    } else if (obj.expires_in_seconds) {
      if (obj.expires_in_seconds <= 0) {
        setExpiredQr(true)
        setStatus(t('signin.xaman.statuses.expired'))
      }
    }
  }

  const prepareForCrawlerCheck = ({ inLedger, meta, type }) => {
    //if transaction is in ledger, but not indexed yet, prepare for crawler check
    setStatus(t('signin.status.awaiting-crawler'))

    if (type === 'NFTokenMint') {
      if (meta?.nftoken_id) {
        checkCrawlerStatus({ inLedger, param: meta.nftoken_id, type })
      } else {
        //if no token found
        closeSignInFormAndRefresh()
      }
      return
    } else if (type === 'URITokenMint' || type === 'Remit') {
      let foundToken = false
      for (let i = 0; i < meta?.AffectedNodes?.length; i++) {
        const node = meta.AffectedNodes[i]
        if (node.CreatedNode?.LedgerEntryType === 'URIToken') {
          checkCrawlerStatus({
            inLedger,
            param: node.CreatedNode.LedgerIndex,
            type
          })
          foundToken = true
          break
        }
      }
      if (!foundToken) {
        closeSignInFormAndRefresh()
      }
      return
    }
    checkCrawlerStatus({ inLedger, type })
  }

  const validateTransactionOnLedger = async ({ txid, redirectName, txType, result }) => {
    // if we have result of the transaction, and we don't need check crawler and if we don't need to return transaction results (no callback), no need to validate just redirect
    if (
      result &&
      result === 'tesSUCCESS' &&
      !(txType?.includes('NFToken') || txType?.includes('URIToken') || txType?.includes('DID')) &&
      !signRequest?.callback
    ) {
      router.push('/tx/' + txid)
      closeSignInFormAndRefresh()
      return
    }

    setAwaiting(true)
    setStatus('Validating the transaction on the ledger...')
    //txid can be in the ledger or not, so we need to check if it in the ledger
    if (txid && transactionFetchTries < 3) {
      transactionFetchTries += 1
      const response = await axios('xrpl/transaction/' + txid)

      if (response.data) {
        const { validated, inLedger, ledger_index, meta, TransactionType } = response.data
        const includedInLedger = inLedger || ledger_index
        const txStatus = meta?.TransactionResult
        if (validated && includedInLedger) {
          if (
            txStatus === 'tesSUCCESS' &&
            (txType?.includes('NFToken') ||
              txType?.includes('URIToken') ||
              txType?.includes('DID') ||
              (txType === 'Remit' && !signRequest?.callback)) // it would be better to check that there is no NFT in Remit rather then checking if there is a callback.
          ) {
            // for NFToken, URIToken and DID transactions wait for crawler to index the transaction
            prepareForCrawlerCheck({
              inLedger: includedInLedger,
              meta,
              type: TransactionType
            })
          } else {
            //if failed or no need to wait for a crawler
            if (signRequest?.callback) {
              // if on desktop and there is a callback, call it with the result
              signRequest.callback(response.data || {})
            } else {
              // For mobile, redirect to transaction page
              if (redirectName && isUrlValid(redirectName)) {
                //stay on the same page
                router.push(redirectName)
                return
              }
              router.push('/tx/' + txid)
            }
            closeSignInFormAndRefresh()
            return
          }
        } else {
          //if not validated or if no ledger info received, delay for 1.5 seconds
          delay(1500, validateTransactionOnLedger, { txid, redirectName, txType, result })
        }
      } else {
        //if no info on transaction, delay 1.5 sec and try again
        delay(1500, validateTransactionOnLedger, { txid, redirectName, txType, result })
      }
    } else {
      //if no tx data, delay 3 sec
      delay(3000, closeSignInFormAndRefresh)
    }
  }

  const afterSigning = async ({ signRequestData, blob, address }) => {
    if (signRequestData?.action === 'pro-add-address') {
      //add address to the list
      submitProAddressToVerify(
        {
          address: signRequestData.address,
          name: signRequestData.name,
          blob
        },
        (res) => {
          if (res?.error) {
            setStatus(t(res.error))
          } else {
            closeSignInFormAndRefresh()
          }
        }
      )
      return
    }

    if (signRequestData?.action === 'set-avatar') {
      //add address to the list
      setAvatar({ address, blob }, (res) => {
        if (res?.error) {
          setStatus(t(res.error))
        } else {
          if (signRequestData?.redirect === 'account') {
            delay(3000, () => {
              closeSignInFormAndRefresh()
              router.push('/account/' + address)
            })
          } else {
            delay(3000, closeSignInFormAndRefresh)
          }
        }
      })
      return
    }
  }

  const afterSubmitExe = async ({ redirectName, broker, txHash, txType, result }) => {
    //if broker, notify about the offer
    if (broker) {
      setStatus(t('signin.status.awaiting-broker', { serviceName: broker }))
      if (broker === 'bidds') {
        setAwaiting(true)
        const response = await axios('/v2/bidds/transaction/broker/' + txHash).catch(() => {
          console.log('ERROR: can not get bidds transaction')
          setStatus(t('signin.status.failed-broker', { serviceName: broker }))
          closeSignInFormAndRefresh() //setAwaiting false inside
        })
        setAwaiting(false)
        if (response?.data) {
          /*
            {
              "status": true,
              "code": 200,
              "message": "Data Fetch Successfully",
              "data": [
                {
                  "Amount": "8880000",
                  "Destination": "rn6CYo6uSxR6fP7jWg3c8SL5jrqTc2GjCS",
                  "NFTokenID": "00081B580D828F028B88C7A78C67A2A9719DDB0A902A927EA72C172100000588",
                  "Owner": "rDzvW4ddvvDXhJNEGFWGkPQ9SYuUeMjKU5",
                  "Index": "E8E06CE995ABAA2D30AAE21725DFB4D27268F501113E4333120B6CC7E009171A",
                  "Date": "2023-11-07T10:18:31.000Z"
                }
              ]
            }
          */
          const responseData = response.data
          if (responseData.status && responseData.data?.hash) {
            // hash of the offer accept transaction
            validateTransactionOnLedger({ txid: responseData.data.hash, redirectName, txType, result })
          } else {
            setStatus(t('signin.status.failed-broker', { serviceName: broker }))
            delay(3000, closeSignInFormAndRefresh)
          }
        } else {
          setStatus(t('signin.status.failed-broker', { serviceName: broker }))
          delay(3000, closeSignInFormAndRefresh)
        }
      }
      return
    }

    if (txType === 'SignIn' || !txHash || signRequest?.receipt) {
      closeSignInFormAndRefresh()
      return
    }

    if (result && result !== 'tesSUCCESS') {
      //if we know the result already and if it's not succesfull
      setAwaiting(false)
      setStatus(errorCodeDescription(result))
    } else {
      validateTransactionOnLedger({ txid: txHash, redirectName, txType, result })
    }
  }

  const checkCrawlerStatus = async ({ inLedger, param, type }) => {
    let crawler = xahauNetwork ? 'uritokens' : 'nftokens'

    if (type && type.includes('DID')) {
      crawler = 'dids'
    }

    const crawlerResponse = await axios('v2/statistics/' + crawler + '/crawler')
    if (crawlerResponse.data) {
      const { ledgerIndex } = crawlerResponse.data
      // if crawler 10 ledgers behind, update right away
      // the backend suppose to return info directly from ledger when crawler 30 seconds behind
      // othewrwise wait until crawler catch up with the ledger where this transaction was included
      if (ledgerIndex >= inLedger || inLedger - 10 > ledgerIndex) {
        if (param) {
          //when we are back from xaman, there no signRequest, we can not call a callback
          // shall we redirect to nft page instead?
          if (signRequest?.callback) {
            signRequest.callback(param)
          } else {
            //we are on mobile
            if (type === 'NFTokenMint' || type === 'URITokenMint' || type === 'Remit') {
              router.push('/nft/' + param)
              return
            }
          }
        }
        closeSignInFormAndRefresh()
      } else {
        //check again in 1 second if crawler ctached up with the ledger where transaction was included
        delay(1000, checkCrawlerStatus, { inLedger, param, type })
      }
    }
  }

  const closeSignInFormAndRefresh = () => {
    signInCancelAndClose()
    setRefreshPage(Date.now())
  }

  const signInCancelAndClose = () => {
    if (screen === 'xaman') {
      setXamanQrSrc(qr)
      xamanCancel(xamanUuid)
    } else if (screen === 'xyra') {
      setXyraPreparedTx(null)
      setXyraNeedsClick(false)
    }

    if (uuid) {
      removeQueryParams(router, ['uuid'])
    }

    setScreen('choose-app')
    setSignRequest(null)
    setAwaiting(false)
    setStatus('')
    transactionFetchTries = 0
  }

  const buttonStyle = {
    margin: '0 10px'
  }

  const onRewardDelayChange = (e) => {
    setStatus('')
    let newRequest = signRequest
    let delay = e.target.value
    setRewardDelay(delay)
    delay = delay.trim()
    let n = Math.floor(Number(delay))
    if (n !== Infinity && String(n) === delay && n > 0) {
      newRequest.request.HookParameters = [
        {
          HookParameter: {
            HookParameterName: '4C', // L - layer
            HookParameterValue: '01' // 01 for L1 table, 02 for L2 table
          }
        },
        {
          HookParameter: {
            HookParameterName: '54', // T - topic type
            HookParameterValue: '5244' // RD - Reward delay
          }
        },
        {
          HookParameter: {
            HookParameterName: '56', // V - vote data
            HookParameterValue: floatToXlfHex(delay) // "0000A7DCF750D554" - 60 seconds
          }
        }
      ]
      setSignRequest(newRequest)
      setAgreedToRisks(true)
    } else {
      setStatus('Delay should be a positive integer')
      setAgreedToRisks(false)
    }
  }

  const onRewardRateChange = (e) => {
    setStatus('')
    let newRequest = signRequest
    let rate = e.target.value
    setRewardRate(rate)
    rate = rate.trim()
    if (rate >= 0 && rate <= 1) {
      newRequest.request.HookParameters = [
        {
          HookParameter: {
            HookParameterName: '4C', // L - layer
            HookParameterValue: '01' // 01 for L1 table, 02 for L2 table
          }
        },
        {
          HookParameter: {
            HookParameterName: '54', // T - topic type
            HookParameterValue: '5252' // RR - reward rate
          }
        },
        {
          HookParameter: {
            HookParameterName: '56', // V - vote data
            HookParameterValue: floatToXlfHex(rate)
          }
        }
      ]
      setSignRequest(newRequest)
      setAgreedToRisks(true)
    } else {
      setStatus('Rate should be a number from 0 to 1')
      setAgreedToRisks(false)
    }
  }

  const onSeatSelect = (data) => {
    let seatObj = seatData
    seatObj.seat = data.value
    setSeatData(seatObj)
  }

  const onSeatValueChange = (value) => {
    setStatus('')
    setAgreedToRisks(false)
    if (!value) return
    if (!isAddressValid(value)) {
      setStatus('Invalid address')
      return
    }
    setAgreedToRisks(true)
    let seatObj = seatData
    seatObj.address = value
    setSeatData(seatObj)
  }

  const onPlaceSelect = (topic) => {
    let hookObj = hookData
    hookObj.topic = topic.value
    setHookData(hookObj)
  }

  const onHookValueChange = (value) => {
    setStatus('')
    setAgreedToRisks(false)
    if (!value) return
    if (value.length !== 64) {
      setStatus('Invalid Hook value')
      return
    }
    setAgreedToRisks(true)
    let hookObj = hookData
    hookObj.value = value
    setHookData(hookObj)
  }

  const onEraseCheck = () => {
    setStatus('')
    if (!erase) {
      setAgreedToRisks(true)
    } else {
      setAgreedToRisks(false)
    }
    setErase(!erase)
  }

  const xls35Sell = signRequest?.request?.TransactionType === 'URITokenCreateSellOffer'

  const checkBoxText = (screen, signRequest) => {
    if (screen === 'nftTransfer') {
      if (signRequest.request?.TransactionType === 'Remit') {
        return "I'm sending this NFT for FREE."
      } else {
        return (
          <Trans i18nKey="signin.confirm.nft-transfer">
            I'm offering that NFT for FREE to the Destination account,{' '}
            <span className="orange bold">the destination account would need to accept the NFT transfer</span>.
          </Trans>
        )
      }
    }

    if (screen === 'NFTokenBurn') return t('signin.confirm.nft-burn')
    if (screen === 'NFTokenModify') return 'I understand that URI will be updated for this NFT.'
    if (screen === 'NFTokenCreateOffer' && (signRequest.request.Flags === 1 || xls35Sell)) {
      return t('signin.confirm.nft-create-sell-offer')
    }

    return (
      <Trans i18nKey="signin.confirm.nft-accept-offer">
        I admit that {{ webSiteName }} gives me access to a decentralised marketplace, and it cannot verify or guarantee
        the authenticity and legitimacy of any NFTs. I confirm that I've read the{' '}
        <Link href="/terms-and-conditions" target="_blank">
          Terms and conditions
        </Link>
        , and I agree with all the terms to buy, sell or use any NFTs on {{ webSiteName }}.
      </Trans>
    )
  }

  const walletNames = {
    xaman: 'Xaman',
    gemwallet: 'GemWallet',
    ledgerwallet: 'Ledger Wallet',
    trezor: 'Trezor',
    metamask: 'Metamask',
    walletconnect: 'WalletConnect',
    crossmark: 'Crossmark',
    xyra: 'Xyra'
  }

  const supportedByCrossmark = !signRequest?.request?.TransactionType || signRequest.request.TransactionType !== 'Remit'
  const supportedByMetamask = !signRequest?.request?.TransactionType || signRequest.request.TransactionType !== 'Remit'
  const supportedByTrezor = !signRequest?.request?.TransactionType || signRequest.request.TransactionType === 'Payment'

  const WalletTile = ({ name, alt, src, onClick, disabled, width, height }) => {
    return (
      <div
        className={`signin-app-logo${disabled ? ' disabled' : ''}`}
        onClick={disabled ? undefined : onClick}
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-disabled={disabled ? 'true' : 'false'}
        onKeyDown={(e) => {
          if (disabled) return
          if (e.key === 'Enter' || e.key === ' ') onClick?.()
        }}
        title={disabled ? `${name} is not supported in this environment` : name}
      >
        <div className="signin-app-inner">
          <Image alt={alt} src={src} width={width} height={height} />
          <div className="signin-app-name">{name}</div>
        </div>
      </div>
    )
  }

  return (
    <>
      {(networkId === 0 || networkId === 1) && (
        <WalletConnect
          tx={preparedTx}
          signRequest={signRequest}
          setStatus={setStatus}
          afterSubmitExe={afterSubmitExe}
          onSignIn={onSignIn}
          setAwaiting={setAwaiting}
          afterSigning={afterSigning}
          session={wcSession}
          setSession={setWcSession}
        />
      )}
      {screen && (
        <div className="sign-in-form">
          <div className="sign-in-body center">
            <div className="close-button" onClick={signInCancelAndClose}></div>
            {askInfoScreens.includes(screen) ? (
              <>
                <div className="header">
                  {screen === 'NFTokenBurn' && t('signin.confirm.nft-burn-header')}
                  {screen === 'NFTokenModify' && "Update NFT's URI"}
                  {screen === 'NFTokenAcceptOffer' &&
                    (signRequest.offerType === 'buy'
                      ? t('signin.confirm.nft-accept-buy-offer-header')
                      : t('signin.confirm.nft-accept-sell-offer-header'))}
                  {screen === 'NFTokenCreateOffer' &&
                    (signRequest.request.Flags === 1 || xls35Sell
                      ? t('signin.confirm.nft-create-sell-offer-header')
                      : t('signin.confirm.nft-create-buy-offer-header'))}
                  {screen === 'nftTransfer' && t('signin.confirm.nft-create-transfer-offer-header')}
                  {screen === 'setDomain' && t('signin.confirm.set-domain')}
                  {screen === 'setDid' && t('signin.confirm.set-did')}
                  {screen === 'setAvatar' && t('signin.confirm.set-avatar')}
                  {voteTxs.includes(screen) && 'Cast a vote'}
                </div>

                {screen === 'NFTokenCreateOffer' && (
                  <NFTokenCreateOffer
                    signRequest={signRequest}
                    setSignRequest={setSignRequest}
                    setStatus={setStatus}
                    setFormError={setFormError}
                    account={account}
                  />
                )}

                {screen === 'NFTokenModify' && (
                  <NFTokenModify signRequest={signRequest} setSignRequest={setSignRequest} setStatus={setStatus} />
                )}

                {screen === 'nftTransfer' && (
                  <NftTransfer
                    signRequest={signRequest}
                    setSignRequest={setSignRequest}
                    setStatus={setStatus}
                    setFormError={setFormError}
                  />
                )}

                {screen === 'setDomain' && (
                  <SetDomain
                    setSignRequest={setSignRequest}
                    signRequest={signRequest}
                    setStatus={setStatus}
                    setAgreedToRisks={setAgreedToRisks}
                  />
                )}

                {screen === 'setDid' && (
                  <SetDid
                    setSignRequest={setSignRequest}
                    signRequest={signRequest}
                    setStatus={setStatus}
                    setAgreedToRisks={setAgreedToRisks}
                  />
                )}

                {screen === 'setAvatar' && (
                  <SetAvatar
                    setSignRequest={setSignRequest}
                    signRequest={signRequest}
                    setStatus={setStatus}
                    setAgreedToRisks={setAgreedToRisks}
                  />
                )}

                {screen === 'castVoteRewardDelay' && (
                  <div className="center">
                    <br />
                    <span className="halv">
                      <span className="input-title">Reward delay (in seconds)</span>
                      <input
                        placeholder="2600000"
                        onChange={onRewardDelayChange}
                        className="input-text"
                        spellCheck="false"
                        value={rewardDelay}
                      />
                    </span>
                    <div>
                      <br />
                      {!status && rewardDelay ? <b>= {duration(t, rewardDelay, { seconds: true })}</b> : <br />}
                    </div>
                  </div>
                )}

                {screen === 'castVoteRewardRate' && (
                  <div className="center">
                    <br />
                    <span className="halv">
                      <span className="input-title">
                        Reward rate (per month compounding)
                        <br />A number from 0 to 1, where 1 would be 100%
                      </span>
                      <input
                        placeholder="0.00333333333333333"
                        onChange={onRewardRateChange}
                        className="input-text"
                        spellCheck="false"
                        value={rewardRate}
                      />
                    </span>
                    <div>
                      <br />
                      {!status && rewardRate ? <b>≈ {rewardRateHuman(rewardRate)}</b> : <br />}
                    </div>
                  </div>
                )}

                {screen === 'castVoteSeat' && (
                  <div className="center">
                    <br />
                    <div>
                      {signRequest.layer === 2 && (
                        <span className="quarter">
                          <span className="input-title">{t('signin.target-table')}</span>
                          <TargetTableSelect onChange={(layer) => setTargetLayer(layer)} layer={signRequest.layer} />
                        </span>
                      )}
                      <span className={signRequest.layer === 2 ? 'quarter' : 'halv'}>
                        <span className="input-title">Seat</span>
                        <Select
                          options={[
                            { value: '00', label: '0' },
                            { value: '01', label: '1' },
                            { value: '02', label: '2' },
                            { value: '03', label: '3' },
                            { value: '04', label: '4' },
                            { value: '05', label: '5' },
                            { value: '06', label: '6' },
                            { value: '07', label: '7' },
                            { value: '08', label: '8' },
                            { value: '09', label: '9' },
                            { value: '0A', label: '10' },
                            { value: '0B', label: '11' },
                            { value: '0C', label: '12' },
                            { value: '0D', label: '13' },
                            { value: '0E', label: '14' },
                            { value: '0F', label: '15' },
                            { value: '10', label: '16' },
                            { value: '11', label: '17' },
                            { value: '12', label: '18' },
                            { value: '13', label: '19' }
                          ]}
                          defaultValue={{ value: '13', label: '19' }}
                          onChange={onSeatSelect}
                          isSearchable={false}
                          className="simple-select"
                          classNamePrefix="react-select"
                          instanceId="seat-select"
                        />
                      </span>
                    </div>

                    <div className="terms-checkbox">
                      <CheckBox checked={erase} setChecked={onEraseCheck}>
                        Vacate the seat
                      </CheckBox>
                    </div>

                    {!erase && (
                      <span className="halv">
                        <span className="input-title">Address</span>
                        <input
                          placeholder="Enter address"
                          onChange={(e) => onSeatValueChange(e.target.value)}
                          className="input-text"
                          spellCheck="false"
                        />
                      </span>
                    )}
                  </div>
                )}

                {screen === 'castVoteHook' && (
                  <div className="center">
                    <br />
                    <div>
                      {signRequest.layer === 2 && (
                        <span className="quarter">
                          <span className="input-title">{t('signin.target-table')}</span>
                          <TargetTableSelect onChange={(layer) => setTargetLayer(layer)} layer={signRequest.layer} />
                        </span>
                      )}
                      <span className={signRequest.layer === 2 ? 'quarter' : 'halv'}>
                        <span className="input-title">Place</span>
                        <Select
                          options={[
                            { value: 0, label: '0' },
                            { value: 1, label: '1' },
                            { value: 2, label: '2' },
                            { value: 3, label: '3' },
                            { value: 4, label: '4' },
                            { value: 5, label: '5' },
                            { value: 6, label: '6' },
                            { value: 7, label: '7' },
                            { value: 8, label: '8' },
                            { value: 9, label: '9' }
                          ]}
                          defaultValue={{ value: 2, label: '2' }}
                          onChange={onPlaceSelect}
                          isSearchable={false}
                          className="simple-select"
                          classNamePrefix="react-select"
                          instanceId="hook-topic-select"
                        />
                      </span>
                    </div>
                    <div className="terms-checkbox">
                      <CheckBox checked={erase} setChecked={onEraseCheck}>
                        Erase the hook
                      </CheckBox>
                    </div>
                    {!erase && (
                      <span className="halv">
                        <span className="input-title">Hook</span>
                        <input
                          placeholder="Enter hook value"
                          onChange={(e) => onHookValueChange(e.target.value)}
                          className="input-text"
                          spellCheck="false"
                        />
                      </span>
                    )}
                  </div>
                )}

                {!noCheckboxScreens.includes(screen) && (
                  <div className="terms-checkbox">
                    <CheckBox checked={agreedToRisks} setChecked={setAgreedToRisks}>
                      {checkBoxText(screen, signRequest)}
                    </CheckBox>
                  </div>
                )}

                <div>{status ? <b className="orange">{status}</b> : <br />}</div>

                <br />
                <button type="button" className="button-action" onClick={signInCancelAndClose} style={buttonStyle}>
                  {t('button.cancel')}
                </button>
                <button
                  type="button"
                  className="button-action"
                  onClick={() => txSend()}
                  style={buttonStyle}
                  disabled={!agreedToRisks || formError}
                >
                  {t('button.sign')}
                </button>
              </>
            ) : (
              <>
                {screen === 'choose-app' ? (
                  <>
                    <div className="header">{t('signin.choose-app')}</div>

                    <div className="signin-apps">
                      <WalletTile
                        name="Xaman (Mobile app)"
                        alt="xaman"
                        src="/images/wallets/xaman-large.svg"
                        width={110}
                        height={48}
                        onClick={() => txSend({ wallet: 'xaman' })}
                        disabled={false}
                      />

                      {!isMobile && (
                        <WalletTile
                          name="Ledger (Hardware wallet)"
                          alt="Ledger Wallet"
                          src="/images/wallets/ledgerwallet-large.svg"
                          width={110}
                          height={48}
                          onClick={() => txSend({ wallet: 'ledgerwallet' })}
                          disabled={false}
                        />
                      )}

                      {!isMobile && (
                        <WalletTile
                          name="Crossmark (Browser wallet)"
                          alt="Crossmark"
                          src="/images/wallets/crossmark-large.png"
                          width={110}
                          height={48}
                          onClick={() => txSend({ wallet: 'crossmark' })}
                          disabled={!supportedByCrossmark}
                        />
                      )}

                      {!isMobile && (
                        <WalletTile
                          name="Gem (Browser wallet)"
                          alt="GemWallet"
                          src="/images/wallets/gemwallet.svg"
                          width={44}
                          height={44}
                          onClick={() => txSend({ wallet: 'gemwallet' })}
                          disabled={false}
                        />
                      )}

                      {/* available only for mainnet and testnet */}
                      {(networkId === 0 || networkId === 1) && (
                        <WalletTile
                          name="Multiple wallets"
                          alt="WalletConnect"
                          src="/images/wallets/walletconnect-large.svg"
                          width={110}
                          height={48}
                          onClick={() => txSend({ wallet: 'walletconnect' })}
                          disabled={false}
                        />
                      )}

                      {!isMobile && (
                        <WalletTile
                          name="MetaMask (Browser wallet)"
                          alt="Metamask"
                          src="/images/wallets/metamask.svg"
                          width={44}
                          height={44}
                          onClick={() => txSend({ wallet: 'metamask' })}
                          disabled={!supportedByMetamask}
                        />
                      )}

                      <WalletTile
                        name="Xyra (Popup wallet)"
                        alt="Xyra"
                        src="/images/wallets/xyra.svg"
                        width={48}
                        height={48}
                        onClick={() => txSend({ wallet: 'xyra' })}
                        disabled={false}
                      />

                      {!isMobile && (
                        <WalletTile
                          name="Trezor (Hardware wallet)"
                          alt="Trezor Wallet"
                          src="/images/wallets/trezor-large.svg"
                          width={110}
                          height={48}
                          onClick={() => txSend({ wallet: 'trezor' })}
                          disabled={!supportedByTrezor}
                        />
                      )}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="header">
                      {signRequest?.request
                        ? t('signin.sign-with', { appName: walletNames[screen] })
                        : t('signin.login-with', { appName: walletNames[screen] })}
                    </div>
                    {screen === 'xaman' && (
                      <>
                        {!isMobile && (
                          <div className="signin-actions-list">
                            1. {t('signin.xaman.open-app')}
                            <br />
                            {devNet ? (
                              <>
                                2. {t('signin.xaman.change-settings')}
                                <br />
                                3. {t('signin.xaman.scan-qr')}
                              </>
                            ) : (
                              <>2. {t('signin.xaman.scan-qr')}</>
                            )}
                          </div>
                        )}
                        <br />
                        {showXamanQr ? (
                          <XamanQr
                            expiredQr={expiredQr}
                            xamanQrSrc={xamanQrSrc}
                            onReset={() => txSend({ wallet: 'xaman' })}
                            status={status}
                          />
                        ) : (
                          <div className="orange bold center" style={{ margin: '30px' }}>
                            {awaiting && (
                              <>
                                <span className="waiting"></span>
                                <br />
                                <br />
                              </>
                            )}
                            {status}
                          </div>
                        )}
                      </>
                    )}{' '}
                    {screen === 'xyra' && xyraNeedsClick && xyraPreparedTx && (
                      <div style={{ marginTop: 10 }}>
                        <button
                          type="button"
                          className="button-action"
                          onClick={async () => {
                            try {
                              const txToSign = xyraPreparedTx || signRequest?.request || { TransactionType: 'SignIn' }

                              // sign popup must happen on this click
                              setStatus('Opening Xyra for signing...')
                              const blob = await xyraSignOnly({ tx: txToSign, setStatus })

                              if (signRequest?.data?.signOnly || txToSign.TransactionType === 'SignIn') {
                                afterSigning({ signRequestData: signRequest?.data, blob, address: account?.address })
                                closeSignInFormAndRefresh()
                                return
                              }

                              setStatus('Submitting transaction to the network...')
                              setAwaiting(true)
                              broadcastTransaction({
                                blob,
                                setStatus,
                                onSignIn,
                                afterSubmitExe,
                                address: txToSign.Account,
                                wallet: 'xyra',
                                signRequest,
                                tx: txToSign,
                                setAwaiting,
                                t
                              })
                            } catch (e) {
                              setAwaiting(false)
                              setStatus(String(e?.message || e))
                            }
                          }}
                        >
                          Open Xyra
                        </button>
                      </div>
                    )}{' '}
                    {screen !== 'xaman' && (
                      <>
                        <div className="orange bold center" style={{ margin: '30px' }}>
                          {awaiting && (
                            <>
                              <span className="waiting"></span>
                              <br />
                              <br />
                            </>
                          )}
                          {status}
                        </div>
                      </>
                    )}
                  </>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}

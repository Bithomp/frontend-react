import { useState, useEffect } from 'react';
import { useTranslation, Trans } from 'next-i18next'
import { useRouter } from 'next/router'
import Link from 'next/link'
import axios from 'axios'
import Image from 'next/image'

import { useIsMobile } from "../utils/mobile"
import { server, devNet, typeNumberOnly, delay, isDomainValid, encode } from '../utils'
import { capitalize } from '../utils/format'
import { payloadXummPost, xummWsConnect, xummCancel, xummGetSignedData } from '../utils/xumm'

import XummQr from "./Xumm/Qr"
import CheckBox from './UI/CheckBox'
import ExpirationSelect from './UI/ExpirationSelect'

const qr = "/images/qr.gif"
const ledger = '/images/ledger-large.svg'
const trezor = '/images/trezor-large.svg'
const ellipal = '/images/ellipal-large.svg'

export default function SignForm({ setSignRequest, setAccount, signRequest }) {
  const { t } = useTranslation()
  const router = useRouter()
  const isMobile = useIsMobile()

  const [screen, setScreen] = useState("choose-app")
  const [status, setStatus] = useState(t("signin.xumm.statuses.wait"))
  const [showXummQr, setShowXummQr] = useState(false)
  const [xummQrSrc, setXummQrSrc] = useState(qr)
  const [xummUuid, setXummUuid] = useState(null)
  const [expiredQr, setExpiredQr] = useState(false)
  const [agreedToRisks, setAgreedToRisks] = useState(false)

  const xummUserToken = localStorage.getItem('xummUserToken')

  useEffect(() => {
    //deeplink doesnt work on mobiles when it's not in the onClick event
    if (!isMobile && signRequest?.wallet === "xumm") {
      XummTxSend()
    }
    //eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signRequest])

  const saveAddressData = async (address) => {
    //&service=true&verifiedDomain=true&blacklist=true&payString=true&twitterImageUrl=true&nickname=true
    const response = await axios("v2/address/" + address + '?username=true&hashicon=true')
    if (response.data) {
      const { hashicon, username } = response.data;
      setAccount({ address, hashicon, username })
    } else {
      setAccount(null)
    }
  }

  const XummTxSend = () => {
    //default login 
    let tx = { TransactionType: "SignIn" }
    if (signRequest.request) {
      tx = signRequest.request
    }

    if (tx.TransactionType === "NFTokenAcceptOffer" && !agreedToRisks) {
      setScreen("NFTokenAcceptOffer")
      return
    }

    if (tx.TransactionType === "NFTokenCreateOffer" && !agreedToRisks) {
      setScreen("NFTokenCreateOffer")
      return
    }

    if (tx.TransactionType === "NFTokenBurn" && !agreedToRisks) {
      setScreen("NFTokenBurn")
      return
    }

    if (signRequest.action === 'setDomain' && !agreedToRisks) {
      setScreen("setDomain")
      return
    }

    const client = {
      "Memo": {
        "MemoData": "626974686F6D702E636F6D"
      }
    }

    if (tx.Memos && tx.Memos.length && tx.Memos[0]?.Memo?.MemoData !== client.Memo.MemoData) {
      tx.Memos.push(client)
    } else {
      tx.Memos = [client]
    }

    tx.SourceTag = 42697468

    let signInPayload = {
      options: {
        expire: 3
      },
      txjson: tx
    }

    if (signRequest.redirect) {
      signInPayload.custom_meta = {
        blob: {
          redirect: signRequest.redirect
        }
      }
    }

    if (isMobile) {
      setStatus(t("signin.xumm.statuses.redirecting"));
      //return to the same page
      //you can add "?uuid={id}"
      signInPayload.options.return_url = {
        app: server + router.asPath
      }
      //for username receipts
      if (tx.TransactionType === "Payment") {
        signInPayload.options.return_url.app += '&receipt=true'
      }

      //app which signed
      //signInPayload.options.return_url.app += '&signed=xumm'
    } else {
      if (xummUserToken) {
        signInPayload.user_token = xummUserToken
      }
      setShowXummQr(true)
    }
    payloadXummPost(signInPayload, onPayloadResponse)
    setScreen("xumm")
  }

  const onPayloadResponse = (data) => {
    if (!data || data.error) {
      setShowXummQr(false);
      setStatus(data.error);
      return;
    }
    setXummUuid(data.uuid);
    setXummQrSrc(data.refs.qr_png);
    setExpiredQr(false);
    xummWsConnect(data.refs.websocket_status, xummWsConnected);
    if (data.pushed) {
      setStatus(t("signin.xumm.statuses.check-push"));
    }
    if (isMobile) {
      if (data.next && data.next.always) {
        window.location = data.next.always;
      } else {
        console.log("payload next.always is missing");
      }
    } else {
      setShowXummQr(true);
      setStatus(t("signin.xumm.scan-qr"));
    }
  }

  const xummWsConnected = (obj) => {
    if (obj.opened) {
      setStatus(t("signin.xumm.statuses.check-app"));
    } else if (obj.signed) {
      setShowXummQr(false);
      setStatus(t("signin.xumm.statuses.wait"));
      xummGetSignedData(obj.payload_uuidv4, afterSubmit);
    } else if (obj.expires_in_seconds) {
      if (obj.expires_in_seconds <= 0) {
        setExpiredQr(true);
        setStatus(t("signin.xumm.statuses.expired"));
      }
    }
  }

  const afterSubmit = async data => {
    /*
    {
      "application": {
        "issued_user_token": "xxx"
      },
      "response": {
        "hex": "xxx",
        "txid": "xxx",
        "environment_nodeuri": "wss://testnet.xrpl-labs.com",
        "environment_nodetype": "TESTNET",
        "account": "xxx",
        "signer": "xxx"
      }
    }
    */
    //data.payload.tx_type: "SignIn"

    //if redirect 
    if (data.response?.account) {
      saveAddressData(data.response.account)
      const redirectName = data.custom_meta?.blob?.redirect
      if (redirectName === "nfts") {
        window.location.href = server + "/nfts/" + data.response.account
      } else if (redirectName === "account") {
        window.location.href = server + "/explorer/" + data.response.account
      }
    }

    // For NFT transaction, lets wait for crawler to finish it's job
    if (data.payload?.tx_type.includes("NFToken")) {
      if (data.response?.txid) {
        const response = await axios("xrpl/transaction/" + data.response.txid)
        if (response.data) {
          const { validated, inLedger, ledger_index } = response.data
          const includedInLedger = inLedger || ledger_index
          if (validated && includedInLedger) {
            checkCrawlerStatus(includedInLedger)
          } else {
            //if not validated or if no ledger info received, delay for 3 seconds
            delay(3000, closeSignInFormAndRefresh)
          }
        } else {
          //if no info on transaction, delay 3 sec
          delay(3000, closeSignInFormAndRefresh)
        }
      } else {
        //if no tx data, delay 3 sec
        delay(3000, closeSignInFormAndRefresh)
      }
    } else {
      // no checks or delays for non NFT transactions
      closeSignInFormAndRefresh()
    }
  }

  const checkCrawlerStatus = async inLedger => {
    const crawlerResponse = await axios("v2/statistics/nftokens/crawler")
    if (crawlerResponse.data) {
      const { ledgerIndex } = crawlerResponse.data
      // if crawler 10 ledgers behind, update right away
      // the backend suppose to return info directly from ledger when crawler 30 seconds behind
      // othewrwise wait until crawler catch up with the ledger where this transaction was included
      if (ledgerIndex >= inLedger || (inLedger - 10) > ledgerIndex) {
        closeSignInFormAndRefresh()
      } else {
        //check again in 1 second if crawler ctached up with the ledger where transaction was included
        delay(1000, checkCrawlerStatus, inLedger)
      }
    }
  }

  const closeSignInFormAndRefresh = () => {
    setXummQrSrc(qr)
    setScreen("choose-app")
    setSignRequest(null)
  }

  const SignInCancelAndClose = () => {
    if (screen === 'xumm') {
      setXummQrSrc(qr);
      xummCancel(xummUuid);
    }
    setScreen("choose-app");
    setSignRequest(null);
  }

  // temporary styles while hardware wallets are not connected
  const notAvailable = (picture, name) => {
    const divStyle = {
      display: "inline-block",
      position: "relative",
      opacity: 0.5,
      pointerEvents: "none"
    }
    const spanStyle = {
      position: "absolute",
      width: '100%',
      bottom: "20px",
      left: 0,
      textAlign: "center"
    }
    return <div style={divStyle}>
      <img alt={name} className='signin-app-logo' src={picture} />
      <span style={spanStyle}>{t("signin.not-available")}</span>
    </div>
  }

  const buttonStyle = {
    margin: "0 10px"
  }

  const onAmountChange = e => {
    let newRequest = signRequest
    newRequest.request.Amount = (e.target.value * 1000000).toString()
    setSignRequest(newRequest)
  }

  const onDomainChange = e => {
    setStatus("")
    let newRequest = signRequest
    let domain = e.target.value
    domain = domain.trim()
    domain = String(domain).toLowerCase()
    if (isDomainValid(domain)) {
      newRequest.request.Domain = encode(domain)
      setSignRequest(newRequest)
      setAgreedToRisks(true)
    } else {
      setAgreedToRisks(false)
    }
  }

  const onExpirationChange = (daysCount) => {
    if (daysCount) {
      let newRequest = signRequest
      let myDate = new Date()
      myDate.setDate(myDate.getDate() + daysCount)
      newRequest.request.Expiration = Math.floor(myDate / 1000) - 946684800 //rippe epoch
      setSignRequest(newRequest)
    }
  }

  return (
    <div className="sign-in-form">
      <div className="sign-in-body center">
        <div className='close-button' onClick={SignInCancelAndClose}></div>
        {(screen === 'NFTokenAcceptOffer' || screen === 'NFTokenCreateOffer' || screen === 'NFTokenBurn' || screen === 'setDomain') ?
          <>
            <div className='header'>
              {screen === 'NFTokenBurn' && t("signin.confirm.nft-burn-header")}
              {screen === 'NFTokenAcceptOffer' && t("signin.confirm.nft-accept-offer-header")}
              {screen === 'NFTokenCreateOffer' &&
                (signRequest.request.Flags === 1 ?
                  t("signin.confirm.nft-create-sell-offer-header")
                  :
                  t("signin.confirm.nft-create-buy-offer-header")
                )
              }
              {screen === 'setDomain' && t("signin.confirm.set-domain")}
            </div>

            {screen === 'NFTokenCreateOffer' &&
              <div className='center'>
                <br />
                <span className='quarter xrpOnly'>
                  <span className='input-title'>{t("signin.amount.set-price")}</span>
                  <input
                    placeholder={t("signin.amount.enter-amount")}
                    onChange={onAmountChange}
                    onKeyPress={typeNumberOnly}
                    className="input-text"
                    spellCheck="false"
                    maxLength="35"
                    min="0"
                    type="text"
                    inputMode="decimal"
                  />
                </span>
                <span className='quarter'>
                  <span className='input-title'>{t("signin.expiration")}</span>
                  <ExpirationSelect onChange={onExpirationChange} />
                </span>
              </div>
            }

            {screen === 'setDomain' &&
              <div className='center'>
                <br />
                <span className='halv'>
                  <span className='input-title'>{t("signin.set-account.domain")}</span>
                  <input
                    placeholder={t("signin.set-account.enter-domain")}
                    onChange={onDomainChange}
                    className="input-text"
                    spellCheck="false"
                  />
                </span>
              </div>
            }

            {screen !== 'setDomain' &&
              <div className='terms-checkbox'>
                <CheckBox checked={agreedToRisks} setChecked={setAgreedToRisks} >
                  {screen === 'NFTokenBurn' ?
                    t("signin.confirm.nft-burn")
                    :
                    <>
                      {screen === 'NFTokenCreateOffer' && signRequest.request.Flags === 1 ?
                        t("signin.confirm.nft-create-sell-offer")
                        :
                        <Trans i18nKey="signin.confirm.nft-accept-offer">
                          I admit that Bithomp gives me access to a decentralised marketplace, and it cannot verify or guarantee the authenticity and legitimacy of any NFTs.
                          I confirm that I've read the <Link href="/terms-and-conditions" target="_blank">Terms and conditions</Link>, and I agree with all the terms to buy, sell or use any NFTs on Bithomp.
                        </Trans>
                      }
                    </>
                  }
                </CheckBox>
              </div>
            }

            <br />
            <button type="button" className="button-action" onClick={SignInCancelAndClose} style={buttonStyle}>
              {t("button.cancel")}
            </button>
            <button type="button" className={"button-action" + (agreedToRisks ? "" : " disabled")} onClick={XummTxSend} style={buttonStyle}>
              {t("button.sign")}
            </button>
          </>
          :
          <>
            {screen === 'choose-app' ?
              <>
                <div className='header'>{t("signin.choose-app")}</div>
                <div className='signin-apps'>
                  <Image alt="xumm" className='signin-app-logo' src='/images/xumm-large.svg' onClick={XummTxSend} width={150} height={24} />
                  {signRequest.wallet !== "xumm" &&
                    <>
                      {notAvailable(ledger, "ledger")}
                      {notAvailable(trezor, "trezor")}
                      {notAvailable(ellipal, "ellipal")}
                    </>
                  }
                </div>
              </>
              :
              <>
                <div className='header'>
                  {signRequest?.request ? t("signin.sign-with") : t("signin.login-with")} {capitalize(screen)}
                </div>
                {screen === 'xumm' ?
                  <>
                    {!isMobile &&
                      <div className="signin-actions-list">
                        1. {t("signin.xumm.open-app")}<br />
                        {devNet ?
                          <>
                            2. {t("signin.xumm.change-settings")}<br />
                            3. {t("signin.xumm.scan-qr")}
                          </> :
                          <>
                            2. {t("signin.xumm.scan-qr")}
                          </>
                        }
                      </div>
                    }
                    <br />
                    {showXummQr ?
                      <XummQr expiredQr={expiredQr} xummQrSrc={xummQrSrc} onReset={XummTxSend} status={status} />
                      :
                      <div className="orange bold center" style={{ margin: "20px" }}>{status}</div>
                    }
                  </>
                  :
                  <>
                    <div className="orange bold center" style={{ margin: "20px" }}>{status}</div>
                  </>
                }
              </>
            }
          </>
        }
      </div>
    </div>
  )
}
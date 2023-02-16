import { useState, useEffect } from 'react';
import { useTranslation, Trans } from 'react-i18next';
import { isMobile } from "react-device-detect";
import { useLocation, Link } from 'react-router-dom';
import axios from 'axios';

import { server, devNet } from '../../utils';
import { capitalize } from '../../utils/format';
import { payloadXummPost, xummWsConnect, xummCancel, xummGetSignedData } from '../../utils/xumm';

import XummQr from "../Xumm/Qr";
import CheckBox from '../CheckBox';

import './styles.scss';
import qr from "../../assets/images/qr.gif";
import xumm from '../../assets/images/xumm-large.svg';
import ledger from '../../assets/images/ledger-large.svg';
import trezor from '../../assets/images/trezor-large.svg';
import ellipal from '../../assets/images/ellipal-large.svg';

export default function SignForm({ setSignRequest, setAccount, signRequest }) {
  const { t } = useTranslation();

  const location = useLocation();
  const [screen, setScreen] = useState("choose-app");
  const [status, setStatus] = useState(t("signin.xumm.statuses.wait"));
  const [showXummQr, setShowXummQr] = useState(false);
  const [xummQrSrc, setXummQrSrc] = useState(qr);
  const [xummUuid, setXummUuid] = useState(null);
  const [expiredQr, setExpiredQr] = useState(false);
  const [agreedToRisks, setAgreedToRisks] = useState(false);

  const xummUserToken = localStorage.getItem('xummUserToken');

  useEffect(() => {
    //deeplink doesnt work on mobiles when it's not in the onClick event
    if (!isMobile && signRequest?.wallet === "xumm") {
      XummTxSend();
    }
    //eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signRequest]);

  const saveAddressData = async (address) => {
    //&service=true&verifiedDomain=true&blacklist=true&payString=true&twitterImageUrl=true&nickname=true
    const response = await axios("v2/address/" + address + '?username=true&hashicon=true');
    if (response.data) {
      const { address, hashicon, username } = response.data;
      setAccount({ address, hashicon, username });
    } else {
      setAccount(null);
    }
  }

  const XummTxSend = () => {
    //default login 
    let tx = { TransactionType: "SignIn" };
    if (signRequest.request) {
      tx = signRequest.request;
    }

    if (tx.TransactionType === "NFTokenAcceptOffer" && !agreedToRisks) {
      setScreen("NFTokenAcceptOffer");
      return;
    }

    const client = {
      "Memo": {
        "MemoData": "626974686F6D702E636F6D"
      }
    };
    if (tx.Memos) {
      tx.Memos.push(client);
    } else {
      tx.Memos = [client]
    }

    let signInPayload = {
      options: {
        expire: 3
      },
      txjson: tx
    };

    if (xummUserToken) {
      signInPayload.user_token = xummUserToken;
    }

    if (isMobile) {
      setStatus(t("signin.xumm.statuses.redirecting"));
      //return to the same page
      // app: server + location.pathname + "?uuid={id}" + (location.search ? "&" + location.search.substr(1) : "")
      signInPayload.options.return_url = {
        app: server + location.pathname + location.search
      };
    } else {
      setShowXummQr(true);
    }
    payloadXummPost(signInPayload, onPayloadResponse);
    setScreen("xumm");
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
    } else {
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
  }

  const xummWsConnected = (obj) => {
    if (obj.opened) {
      setStatus(t("signin.xumm.statuses.check-app"));
    } else if (obj.signed) {
      setShowXummQr(false);
      setStatus(t("signin.xumm.statuses.wait"));
      xummGetSignedData(obj.payload_uuidv4, afterSumbit);
    } else if (obj.expires_in_seconds) {
      if (obj.expires_in_seconds <= 0) {
        setExpiredQr(true);
        setStatus(t("signin.xumm.statuses.expired"));
      }
    }
  }

  const afterSumbit = (data) => {
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
    if (data.response && data.response.account) {
      saveAddressData(data.response.account);
    }
    //close the sign in form
    setXummQrSrc(qr);
    setScreen("choose-app");
    setSignRequest(null);
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
  };

  return (
    <div className="sign-in-form">
      <div className="sign-in-body center">
        <div className='close-button' onClick={SignInCancelAndClose}></div>
        {screen === 'NFTokenAcceptOffer' ?
          <>
            <div className='header'>{t("signin.confirm.nft-accept-offer-header")}</div>
            <div style={{ textAlign: "left", margin: "30px" }}>
              <CheckBox checked={agreedToRisks} setChecked={setAgreedToRisks} >
                <Trans i18nKey="signin.confirm.nft-accept-offer">
                  I acknowledge that Bithomp is a peer-to-peer Web3 service, and it cannot verify or guarantee the legitimacy, authenticity, and legality of NFT that I purchase.
                  I confirm that I've read the <Link to="/terms-and-conditions" target="_blank">Terms and conditions</Link>, and I agree to all of them.
                </Trans>
              </CheckBox>
            </div>
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
                  <img alt="xumm" className='signin-app-logo' src={xumm} onClick={XummTxSend} />
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
                      <div className="orange bold center">{status}</div>
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
    </div >
  );
};
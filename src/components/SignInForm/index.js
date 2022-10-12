import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { isMobile } from "react-device-detect";
import axios from 'axios';

import { server, devNet, capitalize } from '../../utils';
import { payloadXummPost, xummWsConnect, xummCancel, xummSignedData } from '../../utils/xumm';

import ProgressBar from "../ProgressBar";

import './styles.scss';
import qr from "../../assets/images/qr.gif";
import xumm from '../../assets/images/xumm-large.svg';
import ledger from '../../assets/images/ledger-large.svg';
import trezor from '../../assets/images/trezor-large.svg';
import ellipal from '../../assets/images/ellipal-large.svg';

export default function SignInForm({ setSignInFormOpen, setAccount, signInFormOpen }) {
  const { t } = useTranslation();

  const [screen, setScreen] = useState("choose-app");
  const [status, setStatus] = useState(t("signin.xumm.statuses.wait"));
  const [showXummQr, setShowXummQr] = useState(false);
  const [xummQrSrc, setXummQrSrc] = useState(qr);
  const [xummUuid, setXummUuid] = useState(null);
  const [expiresInSeconds, setExpiresInSeconds] = useState(180);
  const [expiredQr, setExpiredQr] = useState(false);

  useEffect(() => {
    if (signInFormOpen === "xumm") {
      XummLogin();
    }
    //eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    let isSubscribed = true;
    const timer = setTimeout(function () {
      if (isSubscribed) {
        setExpiresInSeconds(expiresInSeconds - 1);
      }
    }, 1000);
    if (expiresInSeconds <= 0) {
      clearTimeout(timer);
      setExpiredQr(true);
      setStatus(t("signin.xumm.statuses.expired"));
    }
    return () => {
      clearTimeout(timer);
      isSubscribed = false;
    };
    //eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expiresInSeconds]);

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

  const XummLogin = () => {
    let signInPayload = {
      options: {
        expire: 3
      },
      txjson: {
        TransactionType: "SignIn"
      }
    };

    if (isMobile) {
      setStatus(t("signin.xumm.statuses.redirecting"));
      signInPayload.options.return_url = {
        app: server + "/explorer/?hw=xumm&uuid={id}",
      };
    } else {
      setShowXummQr(true);
    }
    payloadXummPost(signInPayload, onPayloadResponse);
    setScreen("xumm");
    setExpiresInSeconds(180);
  }

  const onPayloadResponse = (data) => {
    setXummUuid(data.uuid);
    setXummQrSrc(data.refs.qr_png);
    setExpiredQr(false);
    xummWsConnect(data.refs.websocket_status, xummWsConnected);
    if (data.pushed) {
      setStatus(t("signin.xumm.statuses.check-push"));
    } else {
      if (isMobile) {
        if (data.next && data.next.always) {
          window.location.href = data.next.always;
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
      xummSignedData(obj.payload_uuidv4, xummRedirect);
    } else if (obj.expires_in_seconds) {
      if (obj.expires_in_seconds <= 0) {
        setExpiredQr(true);
        setStatus(t("signin.xumm.statuses.expired"));
      }
    }
  }

  const xummRedirect = (data) => {
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
    if (data.response && data.response.account) {
      saveAddressData(data.response.account);
      localStorage.setItem("xummUserToken", data.application.issued_user_token);
    } else {
      setStatus("Error: xumm get payload: no account");
    }
    if (data.payload.tx_type === "SignIn") {
      //close the sign in form
      setXummQrSrc(qr);
      setScreen("choose-app");
      setSignInFormOpen(false);
    } else {
      if (isMobile) {
        window.location.href = "/explorer/" + data.response.account + "?hw=xumm&xummtoken=" + data.application.issued_user_token;
      } else {
        if (data.response && data.response.hex) {
          //submitTransaction({
          //  signedTransaction: data.response.hex,
          //  id: data.response.txid,
          //});
        }
      }
    }
  }

  const SignInCancelAndClose = () => {
    if (screen === 'xumm') {
      setXummQrSrc(qr);
      xummCancel(xummUuid);
    }
    setScreen("choose-app");
    setSignInFormOpen(false);
  }

  return (
    <div className="sign-in-form">
      <div className="sign-in-body center">
        <div className='close-button' onClick={SignInCancelAndClose}></div>
        {screen === 'choose-app' &&
          <>
            <div className='header'>{t("signin.choose-app")}</div>
            <div className='signin-apps'>
              <img alt="xumm" className='signin-app-logo' src={xumm} onClick={XummLogin} />
              <a href="/explorer/?hwlogin=ledger">
                <img alt="ledger" className='signin-app-logo' src={ledger} />
              </a>
              <a href="/explorer/?hwlogin=trezor">
                <img alt="trezor" className='signin-app-logo' src={trezor} />
              </a>
              <a href="/explorer/?hwlogin=ellipal">
                <img alt="ellipal" className='signin-app-logo' src={ellipal} />
              </a>
            </div>
          </>
        }
        {screen !== 'choose-app' &&
          <>
            <div className='header'>{t("signin.login-with")} {capitalize(screen)}</div>
            {screen === 'xumm' &&
              <>
                {!expiredQr ?
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
                    {showXummQr &&
                      <div className='center'>
                        <img width="200" height="200" src={xummQrSrc} alt="qr-code" />
                      </div>
                    }
                  </> :
                  <div className='qr-expired'>
                    <input type="button" value={t("signin.xumm.new-qr")} className="button-action" onClick={XummLogin} />
                  </div>
                }
              </>
            }
            <div className="signin-status orange bold">{status}</div>
            {!expiredQr && showXummQr && <center><ProgressBar goneSeconds={expiresInSeconds} maxSeconds={180} /></center>}
          </>
        }
      </div>
    </div>
  );
};
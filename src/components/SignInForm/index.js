import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { isMobile } from "react-device-detect";
import axios from 'axios';

import { server, devNet } from '../../utils';

import './styles.scss';
import qr from "../../assets/images/qr.gif";
import xumm from '../../assets/images/xumm-large.svg';
import ledger from '../../assets/images/ledger-large.svg';
import trezor from '../../assets/images/trezor-large.svg';
import ellipal from '../../assets/images/ellipal-large.svg';

let xummWs;

export default function SignInForm({ setSignInFormOpen }) {
  const { t } = useTranslation();

  const [screen, setScreen] = useState("choose-app");
  const [status, setStatus] = useState(t("signin.xumm.statuses.wait"));
  const [showXummQr, setShowXummQr] = useState(false);
  const [xummQrSrc, setXummQrSrc] = useState(qr);
  const [xummUuid, setXummUuid] = useState(null);

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
    PayloadXumm(signInPayload);
    setScreen("xumm");
  }

  const PayloadXumm = async (payload) => {
    const respponse = await axios.post('app/xumm/payload', payload).catch(error => {
      console.log(error.message);
    });
    if (respponse) {
      const { data } = respponse;
      if (data.refs) {
        //make all inputs readonly when showing QR or pushed to mobile.
        //$("#hwSendXrpForm input").attr("readonly", "readonly");
        //$("#hwSend").hide();
        setXummUuid(data.uuid);
        setXummQrSrc(data.refs.qr_png);
        XummWsConnect(data.refs.websocket_status);
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
      } else {
        console.log("xumm respond: no refs");
      }
    }
  }

  const XummWsConnect = (wsUri) => {
    xummWs = new WebSocket(wsUri);
    xummWs.onopen = function () {
      console.log("xummWs connected");
    };
    xummWs.onclose = function () {
      console.log("xummWs disconnected");
    };
    xummWs.onmessage = function (evt) {
      var obj = JSON.parse(evt.data);
      if (obj.opened) {
        setStatus(t("signin.xumm.statuses.check-app"));
      } else if (obj.signed) {
        setShowXummQr(false);
        setStatus(t("signin.xumm.statuses.wait"));
        xummWs.close();
        XummRedirect(obj.payload_uuidv4);
      } else {
        console.log("xummWs response:", evt.data);
      }
    };
    xummWs.onerror = function (evt) {
      console.log("xummWs error:", evt.data);
    };
  }

  const XummRedirect = async (uuid) => {
    const response = await axios("app/xumm/payload/" + uuid);
    const data = response.data;
    if (data) {
      if (data.payload.tx_type === "SignIn") {
        setStatus("Redirecting...");
        if (data.response && data.response.account) {
          window.location.href =
            "/explorer/" +
            data.response.account +
            "?hw=xumm&xummtoken=" +
            data.application.issued_user_token;
        } else {
          setStatus("Error: xumm get payload: no account");
        }
      } else {
        if (isMobile) {
          window.location.href =
            "/explorer/" +
            data.response.account +
            "?hw=xumm&xummtoken=" +
            data.application.issued_user_token;
        } else {
          if (data.response && data.response.hex) {
            //submitTransaction({
            //  signedTransaction: data.response.hex,
            //  id: data.response.txid,
            //});
          }
        }
      }
    } else {
      console.log("app/xumm/payload/" + uuid + " no data");
    }
  }

  const XummCancel = async (uuid) => {
    if (!uuid) return;
    const payloadXumm = await axios.delete('app/xumm/payload/' + uuid).catch(error => {
      console.log(error.message);
    });
    if (payloadXumm) {
      console.log("xumm canceled", payloadXumm);
      //{cancelled: true, reason: "OK"}
    } else {
      console.log("xumm payload cancelation - no data returned")
    }
  }

  const SignInCancelAndClose = () => {
    if (screen === 'xumm') {
      if (xummWs) {
        xummWs.close();
      }
      setXummQrSrc(qr);
      XummCancel(xummUuid);
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
            <div className='header'>{t("signin.login-with")} {screen}</div>
            {screen === 'xumm' &&
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
                {showXummQr && <center><img width="200" height="200" src={xummQrSrc} alt="qr-code" /></center>}
              </>
            }
            <div className="signin-status orange">{status}</div>
          </>
        }
      </div>
    </div>
  );
};
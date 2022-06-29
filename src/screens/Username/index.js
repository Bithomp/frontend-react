import { useState, useEffect } from 'react';
import { useTranslation, Trans } from 'react-i18next';
import { useSearchParams, Link } from "react-router-dom";
import axios from 'axios';

import { isAddressValid, isUsernameValid, server, wssServer } from '../../utils';

import CountrySelect from '../../components/CountrySelect';
import CheckBox from '../../components/CheckBox';
import Receipt from '../../components/Receipt';

import checkmark from "../../assets/images/checkmark.svg";
import './styles.scss';

let interval;
let ws = null;

export default function Username() {
  const { t, i18n } = useTranslation();

  const [searchParams, setSearchParams] = useSearchParams();
  const [address, setAddress] = useState("");
  const [username, setUsername] = useState("");
  const [receipt, setReceipt] = useState(false);
  const [agreeToPageTerms, setAgreeToPageTerms] = useState(false);
  const [agreeToSiteTerms, setAgreeToSiteTerms] = useState(false);
  const [agreeToPrivacyPolicy, setAgreeToPrivacyPolicy] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [countryCode, setCountryCode] = useState("");
  const [register, setRegister] = useState({});
  const [bidData, setBidData] = useState({});
  const [step, setStep] = useState(0);
  const [update, setUpdate] = useState(false);

  let addressRef;
  let usernameRef;

  useEffect(() => {
    let getAddress = searchParams.get("address");
    let getUsername = searchParams.get("username");
    let getReceipt = searchParams.get("receipt");
    if (isAddressValid(getAddress)) {
      setAddress(getAddress);
    } else {
      searchParams.delete("address");
    }
    if (isUsernameValid(getUsername)) {
      setUsername(getUsername);
    } else {
      searchParams.delete("username");
    }
    if (getReceipt === "true") {
      setReceipt(true);
    } else {
      searchParams.delete("receipt");
    }
    setSearchParams(searchParams);

    //on component unmount
    return () => {
      setUpdate(false);
      clearInterval(interval);
      if (ws) ws.close();
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setErrorMessage("");
  }, [i18n.language]);

  useEffect(() => {
    // show receipt
    if (receipt && username && address && countryCode) {
      onSubmit();
    }
  }, [receipt, username, address, countryCode]);

  const onAddressChange = (e) => {
    let address = e.target.value;
    address = address.replace(/[^0-9a-zA-Z.]/g, "");
    setAddress(address);
    if (isAddressValid(address)) {
      searchParams.set("address", address);
      setErrorMessage("");
    } else {
      searchParams.delete("address");
    }
    setSearchParams(searchParams);
  }

  const onUsernameChange = (e) => {
    let username = e.target.value;
    username = username.replace(/[^0-9a-zA-Z.]/g, "");
    setUsername(username);
    if (isUsernameValid(username)) {
      searchParams.set("username", username);
      setErrorMessage("");
    } else {
      searchParams.delete("username");
    }
    setSearchParams(searchParams);
  }

  const onCancel = () => {
    setUpdate(false);
    clearInterval(interval);
    setStep(0);
  }

  const onSubmit = async () => {
    if (!address) {
      setErrorMessage(t("username.error.address-empty"));
      addressRef?.focus();
      return;
    }

    if (!isAddressValid(address)) {
      setErrorMessage(t("username.error.address-invalid"));
      addressRef?.focus();
      return;
    }

    if (!username) {
      setErrorMessage(t("username.error.username-empty"));
      usernameRef?.focus();
      return;
    }

    if (!isUsernameValid(username)) {
      setErrorMessage(t("username.error.username-invalid"));
      usernameRef?.focus();
      return;
    }

    if (!receipt) {
      if (!agreeToPageTerms) {
        setErrorMessage(t("username.error.agree-terms-page"));
        return;
      }

      if (!agreeToSiteTerms) {
        setErrorMessage(t("username.error.agree-terms-site"));
        return;
      }

      if (!agreeToPrivacyPolicy) {
        setErrorMessage(t("username.error.agree-privacy-policy"));
        return;
      }
    }

    const postData = {
      bithompid: username,
      address,
      countryCode,
    };
    const apiData = await axios.post('v1/bithompid', postData).catch(error => {
      if (i18n.exists("error." + error.message)) {
        setErrorMessage(t("error." + error.message));
      } else {
        setErrorMessage(error.message);
      }
    });

    const data = apiData?.data;

    if (data?.invoiceId) {
      let serviceName = '';
      if (data.userInfo) {
        if (data.userInfo.name) {
          serviceName = data.userInfo.name;
        } else {
          serviceName = data.userInfo.domain;
        }
        if (serviceName) {
          serviceName = " " + t("username.error.address-hosted.on") + " <b>" + serviceName + "</b>";
        }
      }
      setErrorMessage(t("username.error.address-hosted.hosted", { serviceName }));
      return;
    }

    if (data?.error) {
      let addressInput = addressRef;
      let usernameInput = usernameRef;
      if (data.error === 'Username is already registered') {
        setErrorMessage(t("username.error.username-taken", { username }));
        usernameInput?.focus();
        return;
      }
      if (data.error === 'Bithompid is on registration') {
        setErrorMessage(t("username.error.username-hold", { username }));
        return;
      }
      if (data.error === "Address is invalid") {
        setErrorMessage(t("username.error.address-invalid"));
        addressInput?.focus();
        return;
      }
      if (data.error === 'Sorry, you already have a registered username on that address. Try another address') {
        setErrorMessage(t("username.error.address-done"));
        addressInput?.focus();
        return;
      }
      setErrorMessage(data.error);
      return;
    }

    if (data?.bithompid) {
      setRegister(data);
      setStep(1);
      setErrorMessage("");
      setUpdate(true);
    }
  }

  useEffect(() => {
    if (agreeToPageTerms || agreeToSiteTerms || agreeToPrivacyPolicy) {
      setErrorMessage("");
    }
  }, [agreeToPageTerms, agreeToSiteTerms, agreeToPrivacyPolicy]);

  useEffect(() => {
    if (register.destinationTag && update) {
      interval = setInterval(() => checkPayment(register.bithompid, register.sourceAddress, register.destinationTag), 60000);
      checkPaymentWs(register.bithompid, register.sourceAddress, register.destinationTag);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [update, register]);

  const updateBid = (data) => {
    setBidData(data);
    /* 
      setBidData({
        "bid": {
          "id": 907,
          "createdAt": 1653497569,
          "updatedAt": 165349767,
          "bithompid": "test13",
          "address": "rUjTn3UjrZC3jwisxqH6VpcTKccYSWiLDi",
          "destinationTag": 646158625,
          "action": "Registration",
          "status": "Completed",
          "price": 25.2,
          "totalReceivedAmount": 25.2,
          "currency": "XRP",
          "priceInSEK": 100,
          "country": ""
        },
        "transactions": [
          {
            "id": 352,
            "processedAt": 1653497667,
            "hash": "AABFBAA8321D6500B83EF18733A5A0DBE3A819D18FA6DDBEDE8CCEA3893DE844",
            "ledger": 28071047,
            "type": "Payment",
            "sourceAddress": "rUjTn3UjrZC3jwisxqH6VpcTKccYSWiLDi",
            "destinationAddress": "rsuUjfWxrACCAwGQDsNeZUhpzXf1n1NK5Z",
            "destinationTag": 646158625,
            "amount": 25.2,
            "status": "Completed"
          }
        ]
      });
    */
    if (data.bid.status === 'Completed') {
      setStep(2);
      setUpdate(false);
      setErrorMessage("");
      clearInterval(interval);
      if (ws) ws.close();
      return;
    }
    if (data.bid.status === "Partly paid") {
      setErrorMessage(t("username.error.payment-partly", { received: data.bid.totalReceivedAmount, required: register.amount, currency: register.currency }));
      return;
    }
    if (data.bid.status === "Timeout") {
      setStep(0);
      setUpdate(false);
      clearInterval(interval);
      if (ws) ws.close();
      return;
    }
    if (data.error) {
      setErrorMessage(data.error);
    }
  }

  const checkPayment = async (username, address, destinationTag) => {
    const response = await axios('v1/bithompid/' + username + '/status?address=' + address + '&dt=' + destinationTag);
    const data = response.data;
    if (data) {
      updateBid(data);
    }
  }

  const checkPaymentWs = (bithompid, address, destinationTag) => {
    if (!update) return;
    ws = new WebSocket(wssServer);

    ws.onopen = () => {
      ws.send(JSON.stringify({ command: "subscribe", bids: [{ bithompid, address, destinationTag }], "id": 1 }));
    }

    ws.onmessage = evt => {
      const message = JSON.parse(evt.data);
      if (message) {
        updateBid(message);
      }
    }

    ws.onclose = () => {
      if (update) {
        checkPaymentWs(bithompid, address, destinationTag);
      }
    }
  }

  return (
    <div className="page-username content-center">
      <h1 className="center">{t("menu.usernames")}</h1>
      {!step &&
        <>
          <p>
            <Trans i18nKey="username.step0.text0">
              Bithomp <b>username</b> is a <b>public</b> username for your XRPL address.
            </Trans>
          </p>
          <p className="brake">
            <Trans i18nKey="username.step0.text1">
              The username will be assosiated with your address on the bithomp explorer and in third-party services which use bithomp <a href="https://docs.bithomp.com">API</a>.
              After the registration it will become public - <b>anyone</b> will be able to see it.
              Your XRPL address will be accessable by:
            </Trans>
            {" " + server}/explorer/{isUsernameValid(username) ? username : <i>username</i>}
          </p>
          <p>
            <Trans i18nKey="username.step0.text2">
              The username <b>can not be changed or deleted</b>.
            </Trans>
          </p>
          <p>{t("username.step0.only-one-for-address")}</p>
          <p>{t("username.step0.address-you-control")}</p>
          <p>{t("username.step0.pay-from-your-address")}</p>
          <p>
            <Trans i18nKey="username.step0.text3">
              The payment is for 100 SEK denominated in XRP. The payment for the username is <b>not refundable</b>. If you pay more than requested, the exceeding amount will be counted as donation and won't be refunded.
            </Trans>
          </p>

          <p>{t("username.step0.enter-address")}:</p>
          <div className="input-validation">
            <input placeholder={t("username.step0.your-address")} value={address} onChange={onAddressChange} className="input-text" ref={node => { addressRef = node; }} spellCheck="false" maxLength="36" />
            {isAddressValid(address) && <img src={checkmark} className="validation-icon" alt="validated" />}
          </div>
          <p>{t("username.step0.enter-username")}:</p>
          <div className="input-validation">
            <input placeholder={t("username.step0.your-username")} value={username} onChange={onUsernameChange} className="input-text" ref={node => { usernameRef = node; }} spellCheck="false" maxLength="18" />
            {isUsernameValid(username) && <img src={checkmark} className="validation-icon" alt="validated" />}
          </div>
          <p>{t("username.step0.enter-country")}:</p>
          <CountrySelect setCountryCode={setCountryCode} />

          <CheckBox checked={agreeToPageTerms} setChecked={setAgreeToPageTerms} >
            {t("username.step0.agree-terms-page")}
          </CheckBox>

          <CheckBox checked={agreeToSiteTerms} setChecked={setAgreeToSiteTerms} >
            <Trans i18nKey="username.step0.agree-terms-site">
              I agree with the <Link to="/terms-and-conditions" target="_blank">Terms and conditions</Link>.
            </Trans>
          </CheckBox>

          <CheckBox checked={agreeToPrivacyPolicy} setChecked={setAgreeToPrivacyPolicy} >
            <Trans i18nKey="username.step0.agree-privacy-policy">
              I agree with the <Link to="/privacy-policy" target="_blank">Privacy policy</Link>.
            </Trans>
          </CheckBox>

          <p className="center">
            <input type="button" value={t("button.continue")} className="button-action" onClick={onSubmit} />
          </p>
        </>
      }
      {step === 1 &&
        <>
          <p>{t("username.step1.to-register")} <b className="blue">{register.bithompid}</b></p>
          <p>
            {t("username.step1.from-your-address")} <b>{register.sourceAddress}</b>.
            <br />
            <Trans i18nKey="username.step1.text0">
              Payments made by you <b className="red">from any other addresses</b> won't be accepted for the service, it will be accepted as a donation and <b className="red">won't be refunded</b>.
            </Trans>
          </p>

          <h3>{t("username.step1.payment-instructions")}</h3>
          <div className='payment-instructions bordered'>
            {t("username.step1.address")}<br /><b>{register.destinationAddress}</b>
            <br /><br />
            {t("username.step1.tag")}<br /><b className="red">{register.destinationTag}</b>
            <br /><br />
            {t("username.step1.amount")}<br /><b>{register.amount} {register.currency}</b>
          </div>

          <h3>{t("username.step1.awaiting")}</h3>
          <div className='payment-awaiting bordered center'>
            <div className="waiting"></div>
            <br /><br />
            {t("username.step1.about-confirmation")}
          </div>
        </>
      }
      {step === 2 &&
        <>
          <p className="center">
            <Trans i18nKey="username.step2.text0" values={{ username: register.bithompid }}>
              Congratulations! Your username <b className="blue">{{ username }}</b> has been succesfully registered.
            </Trans>
          </p>
          <p className="center bold">
            <a href={server + '/explorer/' + register.bithompid}>
              <u>{server}/explorer/{register.bithompid}</u>
            </a>
          </p>

          <Receipt item="username" details={bidData} />
        </>
      }
      <p className="red center" dangerouslySetInnerHTML={{ __html: errorMessage || "&nbsp;" }} />
      {step === 1 &&
        <p className="center">
          <input type="button" value={t("button.cancel")} className="button-action" onClick={onCancel} />
        </p>
      }
    </div>
  );
};

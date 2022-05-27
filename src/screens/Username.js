import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams, Link } from "react-router-dom";
import axios from 'axios';

import CountrySelect from '../components/CountrySelect';
import CheckBox from '../components/CheckBox';

import checkmark from "../assets/images/checkmark.svg";
import '../assets/styles/screens/username.scss';

const isAddressValid = (address) => {
  return /^r[0-9a-zA-Z]{24,35}$/.test(address);
}

const isUsernameValid = (username) => {
  return username && /^(?=.{3,18}$)[0-9a-zA-Z]{1,18}[-]{0,1}[0-9a-zA-Z]{1,18}$/.test(username);
}

let interval;

export default function Username({ server }) {
  const { t, i18n } = useTranslation();

  const [searchParams, setSearchParams] = useSearchParams();
  const [address, setAddress] = useState("");
  const [username, setUsername] = useState("");
  const [agreeToPageTerms, setAgreeToPageTerms] = useState(false);
  const [agreeToSiteTerms, setAgreeToSiteTerms] = useState(false);
  const [agreeToPrivacyPolicy, setAgreeToPrivacyPolicy] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [countryCode, setCountryCode] = useState("");
  const [register, setRegister] = useState({});
  const [step, setStep] = useState(0);
  const [update, setUpdate] = useState(false);

  let addressRef;
  let usernameRef;

  useEffect(() => {
    let getAddress = searchParams.get("address");
    let getUsername = searchParams.get("username");
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
    setSearchParams(searchParams);

    //on component unmount
    return () => {
      setUpdate(false);
      clearInterval(interval);
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setErrorMessage("");
  }, [i18n.language]);

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

    const postData = {
      bithompid: username,
      address,
      countryCode,
    };
    const { data } = await axios.post('v1/bithompid', postData).catch(error => {
      setErrorMessage(error.message);
    });

    if (data.invoiceId) {
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

    if (data.error) {
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

    if (data.bithompid) {
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
    if (update) {
      interval = setInterval(() => checkPayment(register.bithompid, register.sourceAddress, register.destinationTag), 3000);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [update, register]);

  const checkPayment = async (username, address, destinationTag) => {
    const response = await axios('v1/bithompid/' + username + '/status?address=' + address + '&dt=' + destinationTag);
    const data = response.data;

    if (data.bid) {
      if (data.bid.status === 'Completed') {
        setStep(2);
        setUpdate(false);
        setErrorMessage("");
        clearInterval(interval);
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
        return;
      }
    }
    if (data.error) {
      setErrorMessage(data.error);
    }
  }

  return (
    <div className="page-username content-center">
      <h1 className="center">{t("menu.usernames")}</h1>
      {!step &&
        <>
          <p>Bithomp <b>username</b> is a <b>public</b> username for your XRPL address.</p>
          <p className="brake">
            The username will be assosiated with your address on the Bithomp explorer and in third-party services which use bithomp <a href="https://docs.bithomp.com">API</a>.
            After the registration it will become public - <b>anyone</b> will be able to see it.
            Your XRPL address will be accessable by: {server}/explorer/{isUsernameValid(username) ? username : <i>username</i>}
          </p>
          <p>The username <b>can not be changed or deleted</b>.</p>
          <p>For each XRPL address you can register only one username.</p>
          <p>You can only register usernames for XRPL addresses you control (you have a secret or recovery 12/24 words). You can not register a username for a hosted address (wich has a destination tag) within an exchange / service / wallet .</p>
          <p>To prove that you're in control of the XRPL address you will need to make a payment from that address (for which you want to assign a username). Payments from other addresses will be counted as donations and won't be refunded.</p>
          <p>The payment is for 100 SEK denominated in XRP. The payment for the username is <b>not refundable</b>. If you pay more than requested, the exceeding amount will be counted as donation and won't be refunded.</p>

          <p>Enter your XRPL address:</p>
          <div className="input-validation">
            <input placeholder="Your XRPL address" value={address} onChange={onAddressChange} className="input-text" ref={node => { addressRef = node; }} spellCheck="false" maxLength="36" />
            {isAddressValid(address) && <img src={checkmark} className="validation-icon" alt="validated" />}
          </div>
          <p>Enter the username you would like to have:</p>
          <div className="input-validation">
            <input placeholder="Username" value={username} onChange={onUsernameChange} className="input-text" ref={node => { usernameRef = node; }} spellCheck="false" maxLength="18" />
            {isUsernameValid(username) && <img src={checkmark} className="validation-icon" alt="validated" />}
          </div>
          <p>Your country of residence (for our accounting):</p>
          <CountrySelect setCountryCode={setCountryCode} />

          <CheckBox checked={agreeToPageTerms} setChecked={setAgreeToPageTerms} >
            I understand and agree to the terms and conditions specified above.
          </CheckBox>

          <CheckBox checked={agreeToSiteTerms} setChecked={setAgreeToSiteTerms} >
            I agree with the <Link to="/terms-and-conditions" target="_blank">{t("menu.terms-and-conditions")}</Link>.
          </CheckBox>

          <CheckBox checked={agreeToPrivacyPolicy} setChecked={setAgreeToPrivacyPolicy} >
            I agree with the <Link to="/privacy-policy" target="_blank">{t("menu.privacy-policy")}</Link>.
          </CheckBox>

          <p className="center">
            <input type="button" value="Continue" className="button-action" onClick={onSubmit} />
          </p>
        </>
      }
      {step === 1 &&
        <>
          <p>To register your public username: <b className="blue">{register.bithompid}</b></p>
          <p>You need to make a payment from the address: <b>{register.sourceAddress}</b> (payments made by you from any other addresses <b className="red">won't be accepted and won't be refunded</b>.)</p>

          <h3>Payment instructions</h3>
          <div className='payment-instructions bordered'>
            XRPL address:<br /><b>{register.destinationAddress}</b>
            <br /><br />
            Destination Tag:<br /><b className="red">{register.destinationTag}</b>
            <br /><br />
            Amount:<br /><b>{register.amount} {register.currency}</b>
          </div>

          <h3>Awaiting your payment</h3>
          <div className='payment-awaiting bordered center'>
            <div className="waiting"></div>
            <br /><br />
            You will see a confirmation as soon as we receive your payment.
          </div>
        </>
      }
      {step === 2 &&
        <>
          <p className="bold center">Congratulations!</p>
          <p className="center">Your username <b className="blue">{register.bithompid}</b> has been succesfully registered.</p>
          <p className="center bold">
            <a href={server + '/explorer/' + register.bithompid}>
              <u>{server}/explorer/{register.bithompid}</u>
            </a>
          </p>
        </>
      }
      <p className="red center" dangerouslySetInnerHTML={{ __html: errorMessage || "&nbsp;" }} />
      {step === 1 &&
        <p className="center">
          <input type="button" value="Cancel" className="button-action" onClick={onCancel} />
        </p>
      }
    </div>
  );
};

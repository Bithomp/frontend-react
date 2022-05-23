import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams, Link } from "react-router-dom";

import CountrySelect from '../components/CountrySelect';
import CheckBox from '../components/CheckBox';

import checkmark from "../assets/images/checkmark.svg";

const isAddressValid = (address) => {
  return /^r[0-9a-zA-Z]{24,35}$/.test(address);
}

const isUsernameValid = (username) => {
  return username && /^[0-9a-zA-Z]{1,18}$/.test(username);
}

export default function Username({ server }) {
  const { t } = useTranslation();

  const [searchParams, setSearchParams] = useSearchParams();
  const [address, setAddress] = useState("");
  const [username, setUsername] = useState("");
  const [agreeToPageTerms, setAgreeToPageTerms] = useState(false);
  const [agreeToSiteTerms, setAgreeToSiteTerms] = useState(false);
  const [agreeToPrivacyPolicy, setAgreeToPrivacyPolicy] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  let addressRef: HTMLInputElement | null;
  let usernameRef: HTMLInputElement | null;

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onAddressChange = (e) => {
    let address = e.target.value;
    address = address.replace(/[^0-9a-zA-Z.]/g, "");
    setAddress(address);
    if (isAddressValid(address)) {
      searchParams.set("address", address);
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
    } else {
      searchParams.delete("username");
    }
    setSearchParams(searchParams);
  }

  const onSubmit = () => {
    if (!isAddressValid(address)) {
      setErrorMessage("Please enter a valid XRPL address.");
      addressRef?.focus();
      return;
    } else if (!isUsernameValid(username)) {
      setErrorMessage("Please enter a valid username.");
      usernameRef?.focus();
      return;
    } else if (!agreeToPageTerms) {
      setErrorMessage("Please agree to terms and conditions specified on this page.");
      return;
    } else if (!agreeToSiteTerms) {
      setErrorMessage("Please agree to our website terms and conditions.");
      return;
    } else if (!agreeToPrivacyPolicy) {
      setErrorMessage("Please agree to our Privacy Policy.");
      return;
    }
  }

  return (
    <div className="content-center">
      <h1 className="center">{t("menu.usernames")}</h1>
      <p>Bithomp <b>username</b> is a <b>public</b> username for your XRPL address.</p>
      <p>
        The username will be assosiated with your address on the Bithomp explorer and in third-party services which use bithomp <a href="https://docs.bithomp.com">API</a>.
        After the registration it will become public - <b>anyone</b> will be able to see it.
        Your XRPL address will be accessable by: {server}/explorer/{isUsernameValid(username) ? username : "<username>"}
      </p>
      <p>The username <b>can not be changed or deleted</b>.</p>
      <p>For each XRPL address you can register only one username.</p>
      <p>You can only register usernames for XRPL addresses you control (you have a secret or recovery 12/24 words). You can not register a username for a hosted address (wich has a destination tag) within an exchange / service / wallet .</p>
      <p>To prove that you're in control of the XRPL address you will need to make a payment from that address (for which you want to assign a username). Payments from other addresses will be counted as donations and won't be refunded.</p>
      <p>The payment is for 100 SEK denominated in XRP. The payment for the username is <b>not refundable</b>. If you pay more than requested, the exceeding amount will be counted as donation and won't be refunded.</p>

      <p>Enter your XRPL address:</p>
      <div className="input-validation">
        <input placeholder="Your XRPL address" value={address} onChange={onAddressChange} className="input-text" ref={node => { addressRef = node; }} />
        {isAddressValid(address) && <img src={checkmark} className="validation-icon" alt="validated" />}
      </div>
      <p>Enter the username you would like to have:</p>
      <div className="input-validation">
        <input placeholder="Username" value={username} onChange={onUsernameChange} className="input-text" ref={node => { usernameRef = node; }} />
        {isUsernameValid(username) && <img src={checkmark} className="validation-icon" alt="validated" />}
      </div>
      <p>Your country of residence (for our accounting):</p>
      <CountrySelect />

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

      <p className="red center">{errorMessage} </p>
    </div>
  );
};

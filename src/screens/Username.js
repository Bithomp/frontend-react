import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from "react-router-dom";

import CountrySelect from '../components/CountrySelect';

import checkmark from "../assets/images/checkmark.svg";

export default function Username({ server }) {
  const { t } = useTranslation();

  const [searchParams, setSearchParams] = useSearchParams();
  const [address, setAddress] = useState("");
  const [username, setUsername] = useState("");

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

  const isAddressValid = (address) => {
    return /^r[0-9a-zA-Z]{24,35}$/.test(address);
  }

  const isUsernameValid = (username) => {
    return username && /^[0-9a-zA-Z]{1,18}$/.test(username);
  }

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
      <p>To prove that you're in control of the XRPL address you will need to make a payment from it. The payment is for 100 SEK denominated in XRP. The payment for the username is <b>not refundable</b>. Payments from different addresses will be counted as donations and won't be refunded.</p>

      <p>Enter your XRPL address:</p>
      <div className="input-validation">
        <input placeholder="Your XRPL address" value={address} onChange={onAddressChange} className="input-text" />
        {isAddressValid(address) && <img src={checkmark} className="validation-icon" alt="validated" />}
      </div>
      <p>Enter the username you would like to have:</p>
      <div className="input-validation">
        <input placeholder="Username" value={username} onChange={onUsernameChange} className="input-text" />
        {isUsernameValid(username) && <img src={checkmark} className="validation-icon" alt="validated" />}
      </div>
      <p>Your country of residence (for our accounting):</p>
      <CountrySelect />
    </div>
  );
};

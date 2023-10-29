import { useState } from 'react'
import { useTranslation } from 'next-i18next'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import axios from 'axios'

import { isEmailValid, isUrlValid } from '../utils'
import SEO from '../components/SEO'

export async function getServerSideProps(context) {
  const { locale } = context
  return {
    props: {
      ...(await serverSideTranslations(locale, ['common'])),
    }
  }
}

const checkmark = "/images/checkmark.svg";

export default function Developer() {
  const { t } = useTranslation()

  const [errorMessage, setErrorMessage] = useState("");
  const [step, setStep] = useState(0);
  const [email, setEmail] = useState("");
  const [url, setUrl] = useState("");
  const [description, setDescription] = useState("");

  let emailRef;
  let urlRef;
  let descriptionRef;

  const onEmailChange = (e) => {
    let x = e.target.value;
    x = x.trim();
    setEmail(x);
    if (isEmailValid(x)) {
      setErrorMessage("");
    }
  }

  const onUrlChange = (e) => {
    let x = e.target.value;
    x = x.trim();
    setUrl(x);
    if (isUrlValid(x)) {
      setErrorMessage("");
    }
  }

  function isDescriptionValid(x) {
    return x.length > 16;
  }

  const onDescriptionChange = (e) => {
    let x = e.target.value;
    setDescription(x);
    if (isDescriptionValid(x)) {
      setErrorMessage("");
    }
  }

  const onSubmit = async () => {
    if (!email) {
      setErrorMessage(t("form.error.email-empty"));
      emailRef?.focus();
      return;
    }

    if (!isEmailValid(email)) {
      setErrorMessage(t("form.error.email-invalid"));
      emailRef?.focus();
      return;
    }

    if (!url) {
      setErrorMessage(t("developer.error.url-empty"));
      urlRef?.focus();
      return;
    }

    if (!isUrlValid(url)) {
      setErrorMessage(t("developer.error.url-invalid"));
      urlRef?.focus();
      return;
    }

    if (!description) {
      setErrorMessage(t("developer.error.description-empty"));
      descriptionRef?.focus();
      return;
    }

    if (!isDescriptionValid(description)) {
      setErrorMessage(t("developer.error.description-invalid"));
      descriptionRef?.focus();
      return;
    }

    const postData = { email, url, description };
    const apiData = await axios.post('v2/developer/register', postData).catch(error => {
      setErrorMessage(t("error." + error.message))
    });

    const data = apiData?.data;

    if (data) {
      if (data.status === "success") {
        setStep(1);
        setErrorMessage("");
      }

      if (data.error) {
        setErrorMessage(data.error);
      }
    } else {
      console.log('developer/register error: no data');
    }
  }

  return <>
    <SEO title={t("developer.header")} />
    <div className="content-center">
      <h1 className="center">{t("developer.header")}</h1>
      {!step && <>
        <p>{t("developer.email")}</p>
        <div className="input-validation">
          <input placeholder="name@company.com" value={email} onChange={onEmailChange} className="input-text" ref={node => { emailRef = node; }} spellCheck="false" />
          {isEmailValid(email) && <img src={checkmark} className="validation-icon" alt="validated" />}
        </div>

        <p>{t("developer.url")}</p>
        <div className="input-validation">
          <input placeholder="company.com:8000/demo" value={url} onChange={onUrlChange} className="input-text" ref={node => { urlRef = node; }} spellCheck="false" />
          {isUrlValid(url) && <img src={checkmark} className="validation-icon" alt="validated" />}
        </div>

        <p>{t("developer.description")}</p>
        <div className="input-validation">
          <input placeholder="To show bithomp usernames in my live XRPL Graph of whales..." value={description} onChange={onDescriptionChange} className="input-text" ref={node => { descriptionRef = node; }} />
          {isDescriptionValid(description) && <img src={checkmark} className="validation-icon" alt="validated" />}
        </div>
      </>}

      {step === 1 &&
        <p className='center'>{t("developer.success")}</p>
      }

      <p className="red center">{errorMessage || <br />}</p>

      {!step &&
        <p className="center">
          <input type="button" value={t("button.submit")} className="button-action" onClick={onSubmit} />
        </p>
      }
    </div>
  </>
};

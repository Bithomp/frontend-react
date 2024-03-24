import { FaMediumM } from "react-icons/fa";
import { SiSteemit, SiXrp } from "react-icons/si";
import {
    FaUser,
    FaTwitter,
    FaInstagram,
    FaFacebookF,
    FaYoutube,
    FaLinkedinIn,
    FaRedditAlien,
} from "react-icons/fa6";
import { CiGlobe } from "react-icons/ci";
import { AiOutlineMail } from "react-icons/ai";

import { serverSideTranslations } from "next-i18next/serverSideTranslations";
import { useTranslation } from "next-i18next";
import { useState } from "react";

import { isEmailValid } from '../utils'
import SEO from "../components/SEO";
import axios from "axios";

export async function getServerSideProps(context) {
    const { locale } = context;
    return {
        props: {
            ...(await serverSideTranslations(locale, ["common"])),
        },
    };
}

const fields = [
    {
        icon: <SiXrp />,
        name: "xrp",
        placeholder: "XRP address",
    },
    {
        icon: <FaUser />,
        name: "name",
        placeholder: "Name",
    },
    {
        icon: <CiGlobe />,
        name: "web",
        placeholder: "Web domain",
    },
    {
        icon: <FaTwitter />,
        name: "twitter",
        placeholder: "Twitter username",
    },
    {
        icon: <FaInstagram />,
        name: "instagram",
        placeholder: "Instagram username",
    },
    {
        icon: <FaFacebookF />,
        name: "facebook",
        placeholder: "Facebook username",
    },
    {
        icon: <FaYoutube />,
        name: "youtube",
        placeholder: "Youtube account",
    },
    {
        icon: <FaLinkedinIn />,
        name: "linkedin",
        placeholder: "LinkedIn username",
    },
    {
        icon: <FaRedditAlien />,
        name: "reddit",
        placeholder: "Reddit username",
    },
    {
        icon: <FaMediumM />,
        name: "medium",
        placeholder: "Medium username",
    },
    {
        icon: <SiSteemit />,
        name: "steemit",
        placeholder: "Steemit username",
    },
];

export default function SubmitAccountInformation() {
    const { t } = useTranslation();

    const [errorMessage, setErrorMessage] = useState("");
    const [email, setEmail] = useState("");
    const [allValues, setAllValues] = useState({
        xrp: '',
        name: '',
        web: '',
        twitter: '',
        instagram: '',
        facebook: '',
        youtube: '',
        linkedin: '',
        reddit: '',
        medium: '',
        steemit: ''
    });

    let emailRef;

    const style = {
        fontSize: "18px",
        marginBlock: "50px 12px",
    };

    const buttonStyle = {
        margin: "29px auto 40px",
        display: "block",
    };

    const onEmailChange = (e) => {
        let x = e.target.value;
        x = x.trim();
        setEmail(x);
        if (isEmailValid(x)) {
          setErrorMessage("");
        }
    }

    const changeHandler = e => {
        setAllValues({...allValues, [e.target.name]: e.target.value})

        if (e.target.value !== '') {
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

        // eslint-disable-next-line no-unused-vars
        const clearData = Object.fromEntries(Object.entries(allValues).filter(([key, value]) => value !== ''));
        // const postData = { email, clearData };

        const apiData = await axios.get( 'partner/partner', { baseUrl: '/api/' }).catch(error => {
          setErrorMessage(t("error." + error.message))
        });

        // const apiData = await axios.post( 'partner/partner', { baseUrl: '/api/' }).catch(error => {
        //   setErrorMessage(t("error." + error.message))
        // });

        const data = apiData?.data;
        console.log(data);
      }

    return (
        <>
            <SEO title={t("menu.project-registration")} noindex={true} />

            <div className='content-text content-center short-top short-bottom'>
                <h1 className='center'>{t("submit-account-info.header")}</h1>
                <div>{t("submit-account-info.desc")}</div>

                <form style={{ marginTop: "20px" }}>
                    {fields.map((field, index) => (
                        <div key={index} className='input-prepend'>
                            <input
                                type='text'
                                className='input-text'
                                name={field.name}
                                value={allValues[field.name]}
                                placeholder={field.placeholder}
                                onChange={changeHandler}
                            />
                            <label className='input-label'>{field.icon}</label>
                        </div>
                    ))}

                    <div className='center' style={style}>
                        {t("submit-account-info.subtitle")}
                    </div>
                    <p>{t("submit-account-info.info")}</p>

                    <div className='input-prepend'>
                        <input
                            ref={node => { emailRef = node; }}
                            type='email'
                            className='input-text'
                            value={email}
                            onChange={onEmailChange}
                            placeholder='Your personal email'
                        />
                        <label className='input-label'>
                            <AiOutlineMail />
                        </label>
                    </div>

                    {errorMessage && <p className="red center">{errorMessage}</p>}

                    <button
                        type='button'
                        className='button-action'
                        style={buttonStyle}
                        onClick={onSubmit}
                    >
                        {t("button.submit")}
                    </button>
                </form>
            </div>
        </>
    );
}

import { FaMediumM, FaTelegramPlane } from "react-icons/fa";
import { SiXrp } from "react-icons/si";
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
import { useEffect, useRef, useState } from "react";

import { isEmailValid, isDomainValid, isAddressValid } from '../utils'
import SEO from "../components/SEO";
import axios from "axios";

export async function getServerSideProps(context) {
    const { locale } = context;
    return {
        props: {
            ...(await serverSideTranslations(locale, ['submit-account-information', 'common'])),
        }
    }
}

const fields = [
    {
        icon: <SiXrp />,
        name: "address"
    },
    {
        icon: <FaUser />,
        name: "name"
    },
    {
        icon: <CiGlobe />,
        name: "domain"
    },
    {
        icon: <FaTwitter />,
        name: "twitter"
    },
    {
        icon: <FaInstagram />,
        name: "instagram"
    },
    {
        icon: <FaFacebookF />,
        name: "facebook"
    },
    {
        icon: <FaYoutube />,
        name: "youtube"
    },
    {
        icon: <FaLinkedinIn />,
        name: "linkedin"
    },
    {
        icon: <FaRedditAlien />,
        name: "reddit"
    },
    {
        icon: <FaMediumM />,
        name: "medium"
    },
    {
        icon: <FaTelegramPlane />,
        name: "telegram"
    }
];

const popupStyles = {
    width: "230px",
    textAlign: "center",
    padding: "0 10px",
    pointerEvents: "none",
    zIndex: 2,
    backgroundColor: "white",
    position: "fixed",
    left: "65px",
    bottom: "40px",
    boxShadow: "0 0 7px 0 rgba(0, 0, 0, 0.2)"
}

export default function SubmitAccountInformation() {
    const { t } = useTranslation();

    let emailRef = useRef();
    const listRef = useRef([]);
    const [error, setError] = useState(null);
    const [popupMessage, setPopupMessage] = useState(null);
    // eslint-disable-next-line no-unused-vars
    const [success, setSuccess] = useState(null);


    const [email, setEmail] = useState("");
    const [allValues, setAllValues] = useState({
        address: '',
        name: '',
        domain: '',
        twitter: '',
        instagram: '',
        facebook: '',
        youtube: '',
        linkedin: '',
        reddit: '',
        medium: '',
        telegram: '',
    });

    const baseList = [
        'address',
        'name',
        'email',
        'domain'
    ];

    const style = {
        fontSize: "18px",
        marginBlock: "50px 12px",
    };

    const buttonStyle = {
        margin: "29px auto 40px",
        display: "block",
    };

    const setSuccessMessage = (message) => {
        setSuccess(message);
        setPopupMessage(message);
    };

    const setErrorMessage = (message) => {
        setError(message);
        setPopupMessage(message);
    };

    useEffect(() => {
        if (popupMessage) {
          const timer = setTimeout(() => {
            setPopupMessage(null);
          }, 3000);

          return () => clearTimeout(timer);
        }
    }, [popupMessage]);


    const onEmailChange = (e) => {
        let x = e.target.value;
        x = x.trim();
        setEmail(x);
        if (isEmailValid(x)) {
            setErrorMessage("");
        }
    }

    const changeHandler = e => {
        setAllValues({ ...allValues, [e.target.name]: e.target.value })

        if (e.target.value !== '') {
            setErrorMessage("");
        }
    }

    const onSubmit = async () => {
        // eslint-disable-next-line no-unused-vars
        const clearData = Object.fromEntries(Object.entries(allValues).filter(([key, value]) => value !== ''));

        if (!clearData.address) {
            setErrorMessage(t("form.error.address-empty"));
            listRef.address?.focus();
            return;
        }

        if (!isAddressValid(clearData.address)) {
            setErrorMessage(t("form.error.address-invalid"));
            listRef.address?.focus();
            return;
        }

        if (!clearData.name) {
            setErrorMessage(t("form.error.service-name-empty", { ns: "submit-account-information" }));
            listRef.name?.focus();
            return;
        }


        if (!email) {
            setErrorMessage(t("form.error.email-empty"));
            emailRef?.focus();
            return;
        }

        if (!clearData.domain) {
            setErrorMessage(t("form.error.domain-empty"));
            listRef.domain?.focus();
            return;
        }

        if (!isDomainValid(clearData.domain)) {
            setErrorMessage(t("form.error.domain-invalid"));
            listRef.domain?.focus();
            return;
        }

        if (!isEmailValid(email)) {
            setErrorMessage(t("form.error.email-invalid"));
            emailRef?.focus();
            return;
        }


        const structuredData = Object.keys(clearData).reduce((obj, key) => {
            if (baseList.includes(key)) {
                return {
                    ...obj,
                    [key]: clearData[key]
                };
            } else {
                return {
                    ...obj,
                    email,
                    accounts: {
                        ...(obj.accounts || {}),
                        [key]: clearData[key]
                    }
                };
            }
        }, {});

        const apiData = await axios.post('v1/userinfo', structuredData).catch(error => {
            setErrorMessage(t("error." + error.message));
        });

        const data = apiData?.data;

        if (data) {
            if (data.status === "success") {
                setSuccessMessage(t("form.success", { ns: "submit-account-information" }));
            }

            if (data.error) {
                setErrorMessage(data.error);
            }
        } else {
            console.log('userinfo error: no data');
        }

    }

    return (
        <>
            <SEO title={t("menu.project-registration")} noindex={true} />

            <div className='content-text content-center short-top short-bottom'>
                <h1 className='center'>{t("heading", { ns: "submit-account-information" })}</h1>
                <div>{t("desc", { ns: "submit-account-information" })}</div>

                <form style={{ marginTop: "20px" }}>
                    {fields.map((field, i) => (
                        <div key={i} className='input-prepend'>
                            <input
                                type='text'
                                className='input-text'
                                ref={ref => { listRef[field.name] = ref; }}
                                name={field.name}
                                value={allValues[field.name]}
                                placeholder={t(`placeholders.${field.name}`, { ns: "submit-account-information" })}
                                onChange={changeHandler}
                            />
                            <label className='input-label'>{field.icon}</label>
                        </div>
                    ))}

                    <div className='center' style={style}>
                        {t("subtitle", { ns: "submit-account-information" })}
                    </div>
                    <p>{t("info", { ns: "submit-account-information" })}</p>

                    <div className='input-prepend'>
                        <input
                            ref={node => { emailRef = node; }}
                            type='email'
                            className='input-text'
                            value={email}
                            onChange={onEmailChange}
                            placeholder={t("placeholders.email", { ns: "submit-account-information" })}
                        />
                        <label className='input-label'>
                            <AiOutlineMail />
                        </label>
                    </div>

                    <button
                        type='button'
                        className='button-action'
                        style={buttonStyle}
                        onClick={onSubmit}
                    >
                        {t("button.submit")}
                    </button>
                </form>

                <div style={popupStyles}>
                    {popupMessage && (<p className={`center ${error ? 'red' : 'green'}`}>{popupMessage}</p>)}
                </div>
            </div>
        </>
    );
}

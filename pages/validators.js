import { useTranslation, Trans } from 'next-i18next'
import { useState, useEffect, memo } from 'react'
import axios from 'axios'
import moment from "moment"
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import ReactCountryFlag from "react-country-flag"
import { useTheme } from '../components/Layout/ThemeContext'

import SEO from '../components/SEO'
import CheckBox from '../components/UI/CheckBox'

import {
  addressUsernameOrServiceLink,
  amountFormat,
  fullDateAndTime,
  shortHash,
  timeFromNow
} from '../utils/format'
import { devNet, useWidth, xahauNetwork, countriesTranslated } from '../utils'
import { getIsSsrMobile } from '../utils/mobile'

import CopyButton from '../components/UI/CopyButton'

import VerifiedIcon from "../public/images/verified.svg"

export const getServerSideProps = async (context) => {
  const { query, locale } = context
  const { amendment } = query
  return {
    props: {
      amendment: amendment || null,
      isSsrMobile: getIsSsrMobile(context),
      ...(await serverSideTranslations(locale, ['common', 'validators'])),
    }
  }
}

const fixCountry = country => {
  //accept UK as a country code for GB
  return country?.toUpperCase() === "UK" ? "GB" : country
}

moment.relativeTimeThreshold('ss', devNet ? 36 : 6)

const showTime = ({ time }) => {
  if (!time) return "N/A"
  return <span className={(Math.floor(Date.now() / 1000) - (devNet ? 40 : 10)) > time ? 'red bold' : ''}>
    {timeFromNow((time - 1))}
  </span>
}

const ShowTimeMemo = memo(showTime)

export default function Validators({ amendment }) {
  const [validators, setValidators] = useState(null)
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState(null)
  const [unlValidatorsCount, setUnlValidatorsCount] = useState(0)
  const [developerMode, setDeveloperMode] = useState(false)
  const [showServer, setShowServer] = useState(true)
  const { t } = useTranslation()
  const windowWidth = useWidth()
  const { theme } = useTheme()

  const countries = countriesTranslated()

  const compare = (a, b) => {
    if (!amendment) {
      //in the negative UNL
      if (a.nUnl && !b.nUnl) return -1
      if (!a.nUnl && b.nUnl) return 1
    }

    //in the UNL
    if (a.unl && !b.unl) return -1
    if (!a.unl && b.unl) return 1

    //alive
    if (a.lastSeenTime && !b.lastSeenTime) return -1
    if (!a.lastSeenTime && b.lastSeenTime) return 1

    if (amendment) {
      if (a.amendments?.includes(amendment) && !b.amendments?.includes(amendment)) return -1
      if (!a.amendments?.includes(amendment) && b.amendments?.includes(amendment)) return 1
    }

    //with verified Domains
    if (a.domainVerified && !b.domainVerified) return -1
    if (!a.domainVerified && b.domainVerified) return 1

    //with Domains
    if (a.domain && !b.domain) return -1
    if (!a.domain && b.domain) return 1

    //with verified Legacy domains
    if (a.domainLegacyVerified && !b.domainLegacyVerified) return -1
    if (!a.domainLegacyVerified && b.domainLegacyVerified) return 1

    //with Legacy domains
    if (a.domainLegacy && !b.domainLegacy) return -1
    if (!a.domainLegacy && b.domainLegacy) return 1

    //with principals
    if (a.principals && !b.principals) return -1
    if (!a.principals && b.principals) return 1

    //with principal names
    if (a.principals?.[0].name && !b.principals?.[0].name) return -1
    if (!a.principals?.[0].name && b.principals?.[0].name) return 1

    //by principal name
    if (a.principals?.[0]?.name && b.principals?.[0]?.name) {
      return (a.principals[0].name.toLowerCase() > b.principals[0].name.toLowerCase()) ? 1 : -1
    }

    //with both countries
    if ((a.ownerCountry && a.serverCountry) && (!b.ownerCountry || !b.serverCountry)) return -1
    if ((!a.ownerCountry || !a.serverCountry) && (b.ownerCountry && b.serverCountry)) return 1

    //with owner country
    if (a.ownerCountry && !b.ownerCountry) return -1
    if (!a.ownerCountry && b.ownerCountry) return 1

    //with server country
    if (a.serverCountry && !b.serverCountry) return -1
    if (!a.serverCountry && b.serverCountry) return 1

    //by votes
    if (a.amendments && !b.amendments) return -1
    if (!a.amendments && b.amendments) return 1

    //by domain
    if (a.domain && b.domain) {
      return (a.domain.toLowerCase() > b.domain.toLowerCase()) ? 1 : -1
    }

    //by legacy domain
    if (a.domainLegacy && b.domainLegacy) {
      return (a.domainLegacy.toLowerCase() > b.domainLegacy.toLowerCase()) ? 1 : -1
    }

    //by lastSeenTime
    if (a.lastSeenTime > (b.lastSeenTime + 10)) return -1
    if ((a.lastSeenTime + 10) < b.lastSeenTime) return 1

    //by serverVersion
    if (a.serverVersion > b.serverVersion) return -1
    if (a.serverVersion < b.serverVersion) return 1

    //by lasSeenTime, serverVersion, publicKey
    return a.publicKey > b.publicKey ? 1 : -1
  }

  const twitterLink = twitter => {
    if (!twitter) return ""
    twitter = twitter.replace("@", "")
    return <a href={"https://x.com/" + twitter}>
      {" "}
      <span className='tooltip'>
        <svg width="12" height="12.27" viewBox="0 0 1200 1227" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M714.163 519.284L1160.89 0H1055.03L667.137 450.887L357.328 0H0L468.492 681.821L0 1226.37H105.866L515.491 750.218L842.672 1226.37H1200L714.137 519.284H714.163ZM569.165 687.828L521.697 619.934L144.011 79.6944H306.615L611.412 515.685L658.88 583.579L1055.08 1150.3H892.476L569.165 687.854V687.828Z"
            fill={theme === "dark" ? "#fff" : "#000"}
          />
        </svg>
        <span className='tooltiptext right no-brake'>
          {twitter}
        </span>
      </span>
    </a>
  }

  const displayFlag = (country, typeName, em = 1.5) => {
    if (!country) return ""
    if (country.length === 2) {
      country = fixCountry(country)
      return <span className='tooltip'>
        <ReactCountryFlag
          countryCode={country}
          style={{
            fontSize: em + 'em',
            lineHeight: em + 'em',
          }}
        />
        {country.toLowerCase() !== "eu" &&
          <span className='tooltiptext right no-brake'>
            {typeName}: {countries.getNameTranslated(country)}
          </span>
        }
      </span>
    }
  }

  const checkApi = async () => {
    setLoading(true)
    const response = await axios('v2/unl').catch(error => {
      if (error && error.message !== "canceled") {
        setErrorMessage(t("error." + error.message))
        setLoading(false) //keep here for fast tab clickers
      }
    })
    let dataU = response.data
    if (dataU) {
      dataU.validators?.sort(compare)
      setUnlValidatorsCount(dataU.validators?.length)

      //in case some of the validators down...
      for (let i = 0; i < dataU.validators.length; i++) {
        dataU.validators[i].unl = true
      }

      const responseV = await axios('v2/validators')
      const dataV = responseV.data
      let foundServerCountry = false
      if (dataV) {
        for (let i = 0; i < dataV.length; i++) {
          const v = dataV[i]
          if (v.serverCountry) {
            foundServerCountry = true
          }
          const index = dataU.validators.findIndex(x => x.publicKey === v.publicKey)
          if (index === -1) {
            dataU.validators.push(v)
          } else {
            v.unl = true
            v.domainLegacy = dataU.validators[index].domainLegacy
            v.sequence = dataU.validators[index].sequence
            dataU.validators[index] = v
          }
        }
        dataU.validators.sort(compare)
        setShowServer(foundServerCountry)
        setValidators(dataU)
        setLoading(false)
      }
    }
  }

  /*
  {
    "url": "https://vl.xrplf.org",
    "version": 1,
    "sequence": 2022051601,
    "updatedAt": 1664888233,
    "expiration": 1668297600,
    "error":  "Master signature does not match",
    "PublicKey": "ED45D1840EE724BE327ABE9146503D5848EFD5F38B6D5FEDE71E80ACCE5E6E738B",
    "manifest": "JAAAAAFxIe1F0YQO5yS+Mnq+kUZQPVhI79Xzi21f7ecegKzOXm5zi3Mh7RiCXiUBmFIhZUbZfHHGCftCtcsPeSU01cwAt0hkhs0UdkAQnI9+pUYXskMF1Er1SPrem9zMEOxDx24aS+88WIgXpslXVyRPehFwtnTTb+LwUx7yUXoH3h31Qkruu2RZG70NcBJAy3pkPr9jhqyPvB7T4Nz8j/MjEaNa9ohMLztonxAAZDpcB+zX8QVvQ4GUiAePLCKF/fqTKfhUkSfobozPOi/bCQ==",
    "signature": "109C8F7EA54617B24305D44AF548FADE9BDCCC10EC43C76E1A4BEF3C588817A6C95757244F7A1170B674D36FE2F0531EF2517A07DE1DF5424AEEBB64591BBD0D",
    "validators": [
      {
        "PublicKey": "EDC090980ECAAB37CBE52E880236EC57F732B7DBB7C7BB9A3768D3A6E7184A795E",
        "sequence": 4,
        "publicKey": "nHUFE9prPXPrHcG3SkwP1UzAQbSphqyQkQK9ATXLZsfkezhhda3p",
        "address": "rsjzL7orAw7ej5GXboP3YE9YwAixAsFnWW",
        "domain": "alloy.ee",
        "domainLegacy": "alloy.ee"
      },
    ]
  }

 {
    "signingKey": "n9Jdgmb4zvQJf1qeN6CQnPSDDcD9K4Ub91NxFQcGes84kQ4rduv3",
    "masterKey": "nHBzXTffnWr4JXY88bSt9pENiySJQeoA7MXR68bUJYa5uKh1Q5Qf",
    "publicKey": "nHBzXTffnWr4JXY88bSt9pENiySJQeoA7MXR68bUJYa5uKh1Q5Qf",
    "address": "rar1yFNYVormUcuMG8n86y6AiFDkzQT1XF",
    "addressDetails": {
      "username": null,
      "service": null
    },
    "domain": "gatehub.net",
    "ledgerIndex": 282588,
    "ledgerHash": "8D40712524825DFD5663B0E1F0D2DB4C91ED0718EC5C7014523C239CE726D624",
    "full": true,
    "signingTime": 1699519075,
    "lastSeenTime": 1699519076,
    "baseFee": "10",
    "reserveBase": "1000000",
    "reserveIncrement": "200000",
    "amendments": null,
    "networkID": 21337,
    "serverVersion": "2023.10.30",
    "manifest": "JAAAAAJxIe1UNqpG5b1tEabtbAp8kabGHJv2ItbCdacS9U6KurBEs3MhAgvHm/oM30yzCgqnPApMCEzu7X4CxXzUKztRi7lL2mwtdkYwRAIgTv24hfijwiRJQeX2HdUvubbG4KDXddLJ2bEXfiiCLM8CIAROHLtXZUKfSQPACuu9KsOBF5KNsf2e5Ql9QpdDjAgcdwtnYXRlaHViLm5ldHASQFJMUsxD52N/1UxU39WZ8PGimEJY0rkSpvXzDsh7L64lv+7wK+h4HpMP2o7nI6qyWFUzAFHR1a9vX/hiqhUqtgE=",
    "negative-unl": true
  }
  */

  useEffect(() => {
    checkApi()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const listAmendments = amendments => {
    if (!amendments?.length) return <span className='grey'>{t("table.text.no-votes")}</span>
    return amendments.map((a, i) => (
      <span key={i} className={a === amendment ? "purple bold" : "orange"}>{a}{i !== amendments.length - 1 && ", "}</span>
    ))
  }

  const verifiedSign = (domainVerified, domain) => {
    if (!domainVerified || !domain) return ""
    return <span className='tooltip'>
      <a
        href={"https://" + domain + "/.well-known/" + (xahauNetwork ? "xahau.toml" : "xrp-ledger.toml")}
        target="_blank"
        rel="noreferrer"
      >
        <VerifiedIcon style={{ marginLeft: "5px" }} />
      </a>
      <span className='tooltiptext right no-brake'>
        {t("table.text.domain-verified-toml", { ns: 'validators' })}
      </span>
    </span>
  }

  const checkBoxStyles = {
    display: "inline-block",
    marginTop: windowWidth > 500 ? "-20px" : 0,
    marginBottom: "20px",
    marginRight: "20px",
    marginLeft: "20px"
  }

  return <>
    <SEO title={t("menu.network.validators")} />
    <div className="content-text">
      <h1 className="center">{t("menu.network.validators")}</h1>
      <div className="flex center">
        <div className="grey-box">
          {!loading ? <>
            {validators &&
              <Trans i18nKey="text0" ns='validators'>
                The validator list <b>{{ url: validators.url }}</b> has sequence {{ sequence: validators.sequence }} and expiration on {{ expiration: fullDateAndTime(validators.expiration) }}.<br />It includes {{ validatorCount: unlValidatorsCount }} validators which are listed below.
              </Trans>
            }
            <br />
            {validators?.error && <b><br />Validation error: <span className='red'>{validators?.error}</span>.</b>}
          </>
            :
            <>
              <br />{t("general.loading")}<br />
            </>
          }
        </div>
      </div>

      {windowWidth >= 960 &&
        <div style={{ width: "200px", margin: "auto" }}>
          <CheckBox checked={developerMode} setChecked={setDeveloperMode} style={checkBoxStyles}>
            {t("general.developer-mode")}
          </CheckBox>
        </div>
      }

      <br />

      {windowWidth < 960 ?
        <table className="table-mobile">
          <thead>
          </thead>
          <tbody>
            {loading ?
              <tr className='center'>
                <td colSpan="100">
                  <br />
                  <span className="waiting"></span>
                  <br />{t("general.loading")}<br />
                  <br />
                </td>
              </tr>
              :
              <>
                {(!errorMessage && validators?.validators?.length > 0) ?
                  validators.validators.map((v, i) => (
                    <tr key={i}>
                      <td style={{ padding: "5px" }}>{i + 1}</td>
                      <td>
                        <p>
                          {displayFlag(v.ownerCountry, t("table.owner-country", { ns: 'validators' }))}
                          {v.principals?.map((p, i) => (
                            <span key={i}>
                              {p.name && <b> {p.name}</b>}
                              {twitterLink(p.twitter || p.x)}
                              <br />
                            </span>
                          ))}
                        </p>

                        {v.domain ?
                          <p>
                            {t("table.domain")}:<br />
                            <a
                              href={"https://" + v.domain}
                            >
                              {v.domain}
                            </a>
                            {verifiedSign(v.domainVerified, v.domain)}
                          </p>
                          :
                          <>
                            {v.domainLegacy &&
                              <p>
                                {t("domain-legacy", { ns: 'validators' })}<br />
                                <a
                                  href={"https://" + v.domainLegacy}
                                >
                                  {v.domainLegacy}
                                </a>
                                {verifiedSign(v.domainLegacyVerified, v.domainLegacy)}
                              </p>
                            }
                          </>
                        }
                        {v.unl &&
                          <p>
                            UNL: ✔️
                          </p>
                        }
                        {v.nUnl &&
                          <p>
                            nUNL: ❌
                          </p>
                        }
                        <p>
                          {t("table.votes-for", { ns: 'validators' })}:
                          <br />
                          {listAmendments(v.amendments)}
                        </p>
                        <p>
                          {t("table.public-key")}:<br />
                          {shortHash(v.publicKey)} <CopyButton text={v.publicKey} />
                        </p>
                        <p>
                          {t("table.sequence")}: {v.sequence}
                        </p>
                        <p>
                          {t("last-ledger-information.base-fee")}: {v.baseFee ? amountFormat(v.baseFee) : "N/A"}
                        </p>
                        <p>
                          {t("last-ledger-information.base-reserve")}: {v.reserveBase ? amountFormat(v.reserveBase) : "N/A"}
                        </p>
                        <p>
                          {t("last-ledger-information.increment-reserve")}: {v.reserveIncrement ? amountFormat(v.reserveIncrement) : "N/A"}
                        </p>
                        {v.serverCountry?.length === 2 &&
                          <p>
                            {t("table.server-country", { ns: 'validators' })}:
                            {" "}
                            {countries.getNameTranslated(fixCountry(v.serverCountry))}
                            {" "}
                            <ReactCountryFlag
                              countryCode={fixCountry(v.serverCountry)}
                              style={{
                                fontSize: '1.5em',
                                lineHeight: '1.5em',
                              }}
                            />
                          </p>
                        }

                        {v.serverLocation && <p>
                          {t("table.server-location", { ns: 'validators' })}: {v.serverLocation}
                        </p>
                        }

                        {v.serverCloud?.toString() && <p>
                          {t("table.cloud-private", { ns: 'validators' })}:
                          {v.serverCloud === true && <span style={{ fontSize: "1.5em" }}> ☁️</span>}
                          {v.serverCloud === false && <span style={{ fontSize: "1.5em" }}> 🏠</span>}
                        </p>
                        }

                        {v.serverLocation && <p>
                          {t("table.network-asn", { ns: 'validators' })}: {v.networkASN}
                        </p>
                        }

                        <p>
                          {t("table.version")}: {v.serverVersion ? v.serverVersion : "N/A"}
                        </p>
                        <p>
                          {t("table.last-seen", { ns: 'validators' })}: <ShowTimeMemo time={v.lastSeenTime} />
                        </p>
                        {xahauNetwork &&
                          <p>
                            {t("table.address")} <CopyButton text={v.address} /><br />
                            {addressUsernameOrServiceLink(v, 'address')}
                          </p>
                        }
                      </td>
                    </tr>
                  ))
                  :
                  <tr><td colSpan="100" className='center orange bold'>{errorMessage}</td></tr>
                }
              </>
            }
          </tbody>
        </table>
        :
        <table className="table-large">
          <thead>
            <tr>
              <th> </th>
              <th>{t("table.validator", { ns: 'validators' })}</th>
              <th className='center'>UNL/nUNL</th>
              {developerMode &&
                <th className='center'>{t("table.sequence")}</th>
              }
              {showServer &&
                <th className='center'>Server</th>
              }
              <th className='left'>{t("table.version")}</th>
              <th className='right'>{t("table.last-seen", { ns: 'validators' })}</th>
              {(xahauNetwork || (developerMode && windowWidth > 1560)) &&
                <th>{t("table.address")}</th>
              }
            </tr>
          </thead>
          <tbody>
            {loading ?
              <tr className='center'>
                <td colSpan="100">
                  <br />
                  <span className="waiting"></span>
                  <br />{t("general.loading")}<br />
                  <br />
                </td>
              </tr>
              :
              <>
                {(!errorMessage && validators?.validators?.length > 0) ?
                  validators.validators.map((v, i) =>
                    <tr key={v.publicKey}>
                      <td>{i + 1}</td>
                      <td>
                        {developerMode && <>
                          <CopyButton text={v.publicKey} />
                          {" "}
                          {windowWidth > 1240 ? v.publicKey : shortHash(v.publicKey)}
                          <br />
                        </>}

                        {displayFlag(v.ownerCountry, t("table.owner-country", { ns: 'validators' }))}
                        {v.ownerCountry && " "}

                        {v.principals?.map((p, i) => (
                          <span key={i}>
                            {p.name && <b>{p.name}</b>}
                            {twitterLink(p.twitter || p.x)}
                            {i !== v.principals.length - 1 ? ", " : <br />}
                          </span>
                        ))}

                        {!v.principals?.length && <br />}

                        {v.domain ?
                          <>
                            <a
                              href={"https://" + v.domain}
                            >
                              {v.domain}
                            </a>
                            {verifiedSign(v.domainVerified, v.domain)}
                            <br />
                          </>
                          :
                          <>
                            {v.domainLegacy ?
                              <>
                                <a
                                  href={"https://" + v.domainLegacy}
                                  className="green"
                                >
                                  {v.domainLegacy}
                                </a>
                                {verifiedSign(v.domainLegacyVerified, v.domainLegacy)}
                                <br />
                              </>
                              :
                              (!developerMode ?
                                <>
                                  {windowWidth > 1240 ? v.publicKey : shortHash(v.publicKey)}
                                  <br />
                                </>
                                :
                                ""
                              )
                            }
                          </>
                        }

                        {listAmendments(v.amendments)}
                        <br />
                        {t("last-ledger-information.base-fee")} {v.baseFee ? amountFormat(v.baseFee) : "N/A"}|
                        {t("last-ledger-information.base-reserve")} {v.reserveBase ? amountFormat(v.reserveBase) : "N/A"}|
                        {t("last-ledger-information.increment-reserve")} {v.reserveIncrement ? amountFormat(v.reserveIncrement) : "N/A"}
                      </td>
                      <td className='center'>
                        {v.unl ?
                          (v.nUnl ?
                            <span className='tooltip'>
                              ❌
                              <span className='tooltiptext right no-brake'>
                                {t("table.text.negative-unl", { ns: 'validators' })}
                              </span>
                            </span>
                            :
                            <span className='tooltip'>
                              ✔️
                              <span className='tooltiptext right no-brake'>
                                {t("table.text.unl", { ns: 'validators' })}
                              </span>
                            </span>
                          )
                          :
                          ""
                        }
                      </td>
                      {developerMode &&
                        <td className='center'>{v.sequence}</td>
                      }
                      {showServer &&
                        <td className={developerMode ? 'right' : 'center'}>
                          {developerMode && <>
                            {v.serverLocation && <>{v.serverLocation} </>}
                          </>
                          }
                          {displayFlag(v.serverCountry, t("table.server-country", { ns: 'validators' }))}
                          {developerMode && <>
                            <br />
                            {v.serverCloud === true && <span style={{ fontSize: "1.5em" }}>☁️</span>}
                            {v.serverCloud === false && <span style={{ fontSize: "1.5em" }}>🏠</span>}
                            {v.networkASN && <> {v.networkASN}</>}
                          </>
                          }
                        </td>
                      }
                      <td className='left'>{v.serverVersion}</td>
                      <td className='right'>
                        <ShowTimeMemo time={v.lastSeenTime} />
                      </td>
                      {(xahauNetwork || (developerMode && windowWidth > 1560)) &&
                        <td className='left'><CopyButton text={v.address} /> {addressUsernameOrServiceLink(v, 'address')}</td>
                      }
                    </tr>
                  )
                  :
                  <tr><td colSpan="100" className='center orange bold'>{errorMessage}</td></tr>
                }
              </>
            }
          </tbody>
        </table>
      }
    </div >
  </>
}

import { useTranslation, Trans } from 'next-i18next'
import { useState, useEffect } from 'react'
import axios from 'axios'
import moment from "moment"
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'

import SEO from '../components/SEO'

import { addressUsernameOrServiceLink, amountFormat, fullDateAndTime, shortHash } from '../utils/format'
import { useWidth, xahauNetwork } from '../utils'

import CopyButton from '../components/UI/CopyButton'

export const getServerSideProps = async ({ query, locale }) => {
  const { amendment } = query
  return {
    props: {
      amendment: amendment || null,
      ...(await serverSideTranslations(locale, ['common', 'validators'])),
    }
  }
}

const compare = (a, b) => {
  // nulls sort after anything else
  if (!a.domain) {
    return 1;
  }
  return a.domain > b.domain ? 1 : -1;
}

export default function Validators({ amendment }) {
  const [validators, setValidators] = useState(null)
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState(null)
  const [unlValidatorsCount, setUnlValidatorsCount] = useState(0)
  const { t } = useTranslation()
  const windowWidth = useWidth()

  const checkApi = async () => {
    setLoading(true)
    const response = await axios('v2/unl').catch(error => {
      if (error && error.message !== "canceled") {
        setErrorMessage(t("error." + error.message))
        setLoading(false) //keep here for fast tab clickers
      }
    })
    setLoading(false)
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
      if (dataV) {
        dataV.sort(compare)

        for (let i = 0; i < dataV.length; i++) {
          const v = dataV[i]
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
        setValidators(dataU)
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
    "nUnl": true
  }
  */

  useEffect(() => {
    checkApi();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const listAmendments = amendments => {
    return amendments.map((a, i) => (
      <span key={i} className={a === amendment ? "orange bold" : ""}>{a}{i !== amendments.length - 1 && ", "}</span>
    ))
  }

  return <>
    <SEO title={t("menu.xrpl.validators")} />
    <div className="content-text">
      <h1 className="center">{t("menu.xrpl.validators")}</h1>
      <div className="flex center">
        <div className="grey-box">
          {validators &&
            <Trans i18nKey="text0" ns='validators'>
              The validator list <b>{{ url: validators.url }}</b> has sequence {{ sequence: validators.sequence }} and expiration on {{ expiration: fullDateAndTime(validators.expiration) }}.<br />It includes {{ validatorCount: unlValidatorsCount }} validators which are listed below.
            </Trans>
          }
          <br />
          {validators?.error && <b><br />Validation error: <span className='red'>{validators?.error}</span>.</b>}
        </div>
      </div>
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
                        {v.domain ?
                          <p>
                            {t("table.domain")}<br />
                            <a href={"https://" + v.domain}>{v.domain}</a>
                          </p> :
                          <>
                            {v.domainLegacy &&
                              <p>
                                {t("domain-legacy", { ns: 'validators' })}<br />
                                <a href={"https://" + v.domainLegacy}>{v.domainLegacy}</a>
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
                          {v.amendments?.length > 0 &&
                            <>
                              {t("table.votes-for", { ns: 'validators' })}:
                              <br />
                              {listAmendments(v.amendments)}
                            </>
                          }
                        </p>
                        <p>
                          {t("table.public-key")}<br />
                          {shortHash(v.publicKey)} <CopyButton text={v.publicKey} />
                        </p>
                        <p>
                          {t("table.sequence")}: {v.sequence}
                        </p>
                        <p>
                          {t("last-ledger-information.base-reserve")}: {v.reserveBase ? amountFormat(v.reserveBase) : "N/A"}
                        </p>
                        <p>
                          {t("last-ledger-information.increment-reserve")}: {v.reserveIncrement ? amountFormat(v.reserveIncrement) : "N/A"}
                        </p>
                        <p>
                          {t("table.version")}: {v.serverVersion ? v.serverVersion : "N/A"}
                        </p>
                        <p>
                          {t("table.last-seen", { ns: 'validators' })}: {v.lastSeenTime ? moment((v.lastSeenTime - 1) * 1000, "unix").fromNow() : "N/A"}
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
              <th className='center'>{t("table.hash")}</th>
              <th>{t("table.domain")}</th>
              <th className='center'>UNL/nUNL</th>
              <th className='center'>{t("table.sequence")}</th>
              <th className='right'>{t("table.reserves", { ns: 'validators' })}</th>
              <th className='left'>{t("table.version")}</th>
              <th className='right'>{t("table.last-seen", { ns: 'validators' })}</th>
              {xahauNetwork &&
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
                      <td className='center'><CopyButton text={v.publicKey} /></td>
                      <td>
                        {v.domain ?
                          <a href={"https://" + v.domain}>{v.domain}</a> :
                          <>
                            {v.domainLegacy ?
                              <a href={"https://" + v.domainLegacy} className="green">{v.domainLegacy}</a>
                              :
                              <>
                                {windowWidth > 1420 ? v.publicKey : shortHash(v.publicKey)}
                              </>
                            }
                          </>
                        }
                        <br />
                        {v.amendments?.length > 0 && listAmendments(v.amendments)}
                      </td>
                      <td className='center'>{v.unl ? (v.nUnl ? "❌" : "✔️") : ""}</td>
                      <td className='center'>{v.sequence}</td>
                      <td className='right'>
                        {(v.reserveIncrement && v.reserveBase) ?
                          <>
                            {v.reserveIncrement / 1000000} / {v.reserveBase / 1000000}
                          </>
                          :
                          ""
                        }

                      </td>
                      <td className='left'>{v.serverVersion}</td>
                      <td className='right'>
                        {v.lastSeenTime ? moment((v.lastSeenTime - 1) * 1000, "unix").fromNow() : "N/A"}
                      </td>
                      {xahauNetwork &&
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
    </div>
  </>
}

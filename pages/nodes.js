import { useTranslation } from 'next-i18next'
import { useEffect, useState } from 'react'
import axios from 'axios'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { useWidth, server, ledgerName, countriesTranslated } from '../utils'
import {
  lpTokenName,
  shortHash,
  showAmmPercents,
  amountFormat,
  addressUsernameOrServiceLink,
  shortNiceNumber,
  fullDateAndTime,
} from '../utils/format'
import moment from 'moment'

export async function getServerSideProps(context) {
  const { locale, req } = context
  let initialData = null

  let headers = {};
  if (req.headers["x-real-ip"]) {
    headers["x-real-ip"] = req.headers["x-real-ip"]
  }
  if (req.headers["x-forwarded-for"]) {
    headers["x-forwarded-for"] = req.headers["x-forwarded-for"]
  }
  let initialErrorMessage = null
  try {
    const res = await axios({
      method: "get",
      url: server + "/api/cors/v2/nodes",
      headers,
    }).catch(error => {
      initialErrorMessage = error.message
    });
    initialData = res?.data
    console.log(initialData)
  } catch (error) {
    console.error(error)
  }

  return {
    props: {
      initialData: initialData || null,
      initialErrorMessage: initialErrorMessage || "",
      ...(await serverSideTranslations(locale, ["common"])),
    },
  }
}

import SEO from '../components/SEO'
import CopyButton from '../components/UI/CopyButton'
import { LinkAmm } from '../utils/links'

export default function Nodes({ initialData, initialErrorMessage }) {
  const { t } = useTranslation(['common'])

  const windowWidth = useWidth()
  const countries = countriesTranslated()

  const data = initialData || {}
  const errorMessage = initialErrorMessage || ""
  const loading = false

  const [isRendered, setIsRendered] = useState(false)

  useEffect(() => {
    setIsRendered(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return <>
    <SEO title={t("menu.xrpl.nodes")} />
    <div className="content-text">
      <h1 className="center">{data?.summary?.total} {ledgerName} nodes</h1>
      <h3 className="center">Versions</h3>
      <br />
      {data?.summary?.versions?.length > 0 &&
        <table className="table-large shrink">
          <thead>
            <tr>
              <th className='center'>{t("table.index")}</th>
              <th>{t("table.version")}</th>
              <th className='right'>Count</th>
              <th className='right'>%%</th>
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
                {!errorMessage ?
                  <>
                    {data.summary.versions.map((a, i) =>
                      <tr key={i}>
                        <td className='center'>{i + 1}</td>
                        <td>
                          {a.version.replace("rippled-", "")}
                        </td>
                        <td className='right'>
                          {a.count}
                        </td>
                        <td className='right'>
                          {Math.ceil(a.count / data.summary.total * 10000) / 100}%
                        </td>
                      </tr>
                    )
                    }
                  </>
                  :
                  <tr><td colSpan="100" className='center orange bold'>{errorMessage}</td></tr>
                }
              </>
            }
          </tbody>
        </table>
      }

      <h3 className="center">Countries</h3>
      <br />

      {data?.summary?.countryCodes?.length > 0 &&
        <table className="table-large shrink">
          <thead>
            <tr>
              <th className='center'>{t("table.index")}</th>
              <th>Country</th>
              <th className='right'>Count</th>
              <th className='right'>%%</th>
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
                {!errorMessage ?
                  <>
                    {data.summary.countryCodes.map((a, i) =>
                      <tr key={i}>
                        <td className='center'>{i + 1}</td>
                        <td>
                          {a.countryCode === "unknown" ? <b>Unknown</b> : (isRendered && countries.getNameTranslated(a.countryCode))}
                        </td>
                        <td className='right'>
                          {a.count}
                        </td>
                        <td className='right'>
                          {Math.ceil(a.count / data.summary.total * 10000) / 100}%
                        </td>
                      </tr>
                    )
                    }
                  </>
                  :
                  <tr><td colSpan="100" className='center orange bold'>{errorMessage}</td></tr>
                }
              </>
            }
          </tbody>
        </table>
      }

      <h3 className="center">Nodes</h3>
      <br />

      {(!windowWidth || windowWidth > 1000) ?
        <table className="table-large shrink">
          <thead>
            <tr>
              <th className='center'>{t("table.index")}</th>
              <th className='right'>Public key</th>
              <th>Asset 2</th>
              <th>LP balance</th>
              <th className='right'>AMM ID</th>
              <th>AMM address</th>
              <th>Currency code</th>
              <th>Created</th>
              <th className='right'>Trading fee</th>
              <th className='center'>Vote slots</th>
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
                {(!errorMessage && data) ?
                  <>
                    {data.nodes.length > 0 &&
                      data.nodes.map((a, i) =>
                        <tr key={i}>
                          <td className='center'>{i + 1}</td>
                          <td className='right'>
                            {shortHash(a.node_public_key)} <CopyButton text={a.node_public_key} />
                          </td>
                          <td>
                            {amountFormat(a.amount2, { short: true, maxFractionDigits: 6 })}
                            {a.amount2?.issuer &&
                              <>
                                <br />
                                {addressUsernameOrServiceLink(a.amount2, 'issuer', { short: true })}
                              </>
                            }
                          </td>
                          <td>
                            {lpTokenName(a)}
                          </td>
                          <td className='right'>
                            <LinkAmm ammId={a.ammID} hash={6} copy={true} icon={true} />
                          </td>
                          <td>
                            {addressUsernameOrServiceLink(a, 'account', { short: true })}
                          </td>
                          <td>

                          </td>
                          <td>
                            {isRendered ?
                              moment(a.createdAt * 1000, "unix").fromNow()
                              :
                              ""
                            }
                          </td>
                          <td className='right'>
                            {showAmmPercents(a.tradingFee)}
                          </td>
                          <td className='center'>
                            {a.voteSlots?.length}
                          </td>
                        </tr>
                      )
                    }
                  </>
                  :
                  <tr><td colSpan="100" className='center orange bold'>{errorMessage}</td></tr>
                }
              </>
            }
          </tbody>
        </table>
        :
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
                {!errorMessage ? data.map((a, i) =>
                  <tr key={i}>
                    <td style={{ padding: "5px" }} className='center'>
                      <b>{i + 1}</b>
                    </td>
                    <td>
                      <p>
                        Asset 1:
                        {" "}
                        {amountFormat(a.amount, { short: true, maxFractionDigits: 6 })}
                        {a.amount?.issuer &&
                          addressUsernameOrServiceLink(a.amount, 'issuer', { short: true })
                        }
                      </p>
                      <p>
                        Asset 2:
                        {" "}
                        {amountFormat(a.amount2, { short: true, maxFractionDigits: 6 })}
                        {a.amount2?.issuer &&
                          addressUsernameOrServiceLink(a.amount2, 'issuer', { short: true })
                        }
                      </p>
                      <p>
                        LP balance:
                        {" "}
                        {shortNiceNumber(a.lpTokenBalance.value)}
                        {" "}
                        {lpTokenName(a)}
                      </p>
                      <p>
                        AMM ID:
                        {" "}
                        <LinkAmm ammId={a.ammID} hash={6} copy={true} icon={true} />
                      </p>
                      <p>
                        AMM address:
                        {" "}
                        {addressUsernameOrServiceLink(a, 'account', { short: true })}
                      </p>
                      <p>
                        Currency code:
                        {" "}
                        {shortHash(a.lpTokenBalance.currency)}
                        {" "}
                        <CopyButton text={a.lpTokenBalance.currency} />
                      </p>
                      <p>
                        Created:
                        {" "}
                        {isRendered ?
                          <>
                            {moment(a.createdAt * 1000, "unix").fromNow()}
                            {", "}
                            {fullDateAndTime(a.createdAt)}
                          </>
                          :
                          ""
                        }
                      </p>
                      <p>
                        Trading fee:
                        {" "}
                        {showAmmPercents(a.tradingFee)}
                      </p>
                      <p>
                        Vote slots:
                        {" "}
                        {a.voteSlots?.length}
                      </p>
                    </td>
                  </tr>)
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

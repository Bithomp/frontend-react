import { useTranslation } from 'next-i18next'
import { useEffect, useState } from 'react'
import axios from 'axios'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { useWidth, server, ledgerName, countriesTranslated } from '../utils'
import {
  shortHash,
  duration,
  timeFromNow,
} from '../utils/format'
import ReactCountryFlag from 'react-country-flag'

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

const shortVersion = version => {
  version = version.replace("rippled-", "")
  version = version.replace("xahaud-", "")
  if (version.length > 26) {
    return version.substring(0, 12) + "..." + version.substring(version.length - 9)
  }
  return version
}

const countryCodeWithFlag = countryCode => {
  if (countryCode === "unknown") return ""
  return <>
    <ReactCountryFlag
      countryCode={countryCode}
      style={{
        fontSize: '1.5em',
        lineHeight: '1em',
      }}
    />
    {" "}
    {countryCode}
  </>
}

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

  const countryWithFlag = countryCode => {
    if (countryCode === "unknown") return <b>Unknown</b>
    return <>
      <ReactCountryFlag
        countryCode={countryCode}
        style={{
          fontSize: '1.5em',
          lineHeight: '1.5em',
        }}
      />
      {" "}
      {countries.getNameTranslated(countryCode)}
    </>
  }

  return <>
    <SEO title={t("menu.xrpl.nodes")} />
    <div className="content-text">
      <h1 className="center">{data?.summary?.total} {ledgerName} nodes</h1>
      <p className='center'>{data?.crawl_time && "updated " + timeFromNow(data.crawl_time)}</p>
      <div className='flex flex-center'>
        <div className='div-with-table'>
          <h4 className="center">Versions</h4>
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
                              {shortVersion(a.version)}
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
        </div>
        <div className='div-with-table'>
          <h4 className="center">Countries</h4>
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
                            <td>{isRendered && countryWithFlag(a.countryCode)}</td>
                            <td className='right'>{a.count}</td>
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
        </div>
      </div>

      <h4 className="center">Nodes</h4>

      {(!windowWidth || windowWidth > 1000) ?
        <table className="table-large shrink">
          <thead>
            <tr>
              <th className='center'>{t("table.index")}</th>
              <th className='right'>Country</th>
              <th className='right'>Public key</th>
              <th className='right'>IP</th>
              <th>Version</th>
              <th className='right'>Uptime</th>
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
                          <td>{isRendered && countryCodeWithFlag(a.country_code)}</td>
                          <td className='right'>
                            {shortHash(a.node_public_key)} <CopyButton text={a.node_public_key} />
                          </td>
                          <td className='right'>
                            {a.ip}
                          </td>
                          <td>
                            {shortVersion(a.version)}
                          </td>
                          <td className='right'>
                            {duration(t, a.uptime)}
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
                {!errorMessage ? data.nodes.map((a, i) =>
                  <tr key={i}>
                    <td style={{ padding: "5px" }} className='center'>
                      <b>{i + 1}</b>
                    </td>
                    <td>
                      <p>
                        {isRendered && countryWithFlag(a.country_code)}
                      </p>
                      <p>
                        Public key: {shortHash(a.node_public_key)} <CopyButton text={a.node_public_key} />
                      </p>
                      <p>
                        IP: {a.ip}
                      </p>
                      <p>
                        Version: {shortVersion(a.version)}
                      </p>
                      <p>
                        Uptime: {duration(t, a.uptime)}
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

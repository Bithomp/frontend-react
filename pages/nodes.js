import { useTranslation } from 'next-i18next'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { useWidth, ledgerName } from '../utils'
import { axiosServer, passHeaders } from '../utils/axios'
import { getIsSsrMobile } from '../utils/mobile'
import { shortHash, duration, timeFromNow } from '../utils/format'

export async function getServerSideProps(context) {
  const { locale, req } = context
  let initialData = null
  let initialErrorMessage = null
  try {
    const res = await axiosServer({
      method: 'get',
      url: 'v2/nodes',
      headers: passHeaders(req)
    }).catch((error) => {
      initialErrorMessage = error.message
    })
    initialData = res?.data
  } catch (error) {
    console.error(error)
  }

  return {
    props: {
      initialData: initialData || null,
      initialErrorMessage: initialErrorMessage || '',
      isSsrMobile: getIsSsrMobile(context),
      ...(await serverSideTranslations(locale, ['common']))
    }
  }
}

import SEO from '../components/SEO'
import CopyButton from '../components/UI/CopyButton'
import NetworkPagesTab from '../components/Tabs/NetworkPagesTabs'
import CountryWithFlag from '../components/UI/CountryWithFlag'

const shortVersion = (version) => {
  version = version.replace('rippled-', '')
  version = version.replace('xahaud-', '')
  if (version.length > 26) {
    return version.substring(0, 12) + '...' + version.substring(version.length - 9)
  }
  return version
}

export default function Nodes({ initialData, initialErrorMessage }) {
  const { t, i18n } = useTranslation()

  const windowWidth = useWidth()

  const data = initialData || {}
  const errorMessage = initialErrorMessage || ''
  const loading = false

  return (
    <>
      <SEO
        title="Nodes"
        description={
          'Explore the list of ' + ledgerName + ' nodes. View up-to-date statistics on node versions and countries.'
        }
      />
      <div className="content-text">
        <h1 className="center">
          {data?.summary?.total} {ledgerName} nodes
        </h1>
        <NetworkPagesTab tab="nodes" />

        <p className="center">
          Explore the list of {ledgerName} nodes. View up-to-date statistics on node versions and countries
          {data?.crawl_time && <> (updated {timeFromNow(data.crawl_time, i18n)}).</>}
        </p>

        <div className="flex flex-center">
          <div className="div-with-table">
            <h4 className="center">Versions</h4>
            {data?.summary?.versions?.length > 0 && (
              <table className="table-large shrink">
                <thead>
                  <tr>
                    <th className="center">{t('table.index')}</th>
                    <th>{t('table.version')}</th>
                    <th className="right">Count</th>
                    <th className="right">%%</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr className="center">
                      <td colSpan="100">
                        <br />
                        <span className="waiting"></span>
                        <br />
                        {t('general.loading')}
                        <br />
                        <br />
                      </td>
                    </tr>
                  ) : (
                    <>
                      {!errorMessage ? (
                        <>
                          {data.summary.versions.map((a, i) => (
                            <tr key={i}>
                              <td className="center">{i + 1}</td>
                              <td>{shortVersion(a.version)}</td>
                              <td className="right">{a.count}</td>
                              <td className="right">{Math.ceil((a.count / data.summary.total) * 10000) / 100}%</td>
                            </tr>
                          ))}
                        </>
                      ) : (
                        <tr>
                          <td colSpan="100" className="center orange bold">
                            {errorMessage}
                          </td>
                        </tr>
                      )}
                    </>
                  )}
                </tbody>
              </table>
            )}
          </div>
          <div className="div-with-table">
            <h4 className="center">Countries</h4>
            {data?.summary?.countryCodes?.length > 0 && (
              <table className="table-large shrink">
                <thead>
                  <tr>
                    <th className="center">{t('table.index')}</th>
                    <th>Country</th>
                    <th className="right">Count</th>
                    <th className="right">%%</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr className="center">
                      <td colSpan="100">
                        <br />
                        <span className="waiting"></span>
                        <br />
                        {t('general.loading')}
                        <br />
                        <br />
                      </td>
                    </tr>
                  ) : (
                    <>
                      {!errorMessage ? (
                        <>
                          {data.summary.countryCodes.map((a, i) => (
                            <tr key={i}>
                              <td className="center">{i + 1}</td>
                              <td>
                                <CountryWithFlag countryCode={a.countryCode} />
                              </td>
                              <td className="right">{a.count}</td>
                              <td className="right">{Math.ceil((a.count / data.summary.total) * 10000) / 100}%</td>
                            </tr>
                          ))}
                        </>
                      ) : (
                        <tr>
                          <td colSpan="100" className="center orange bold">
                            {errorMessage}
                          </td>
                        </tr>
                      )}
                    </>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>

        <h4 className="center">Nodes</h4>

        {!windowWidth || windowWidth > 1230 ? (
          <table className="table-large shrink">
            <thead>
              <tr>
                <th className="center">{t('table.index')}</th>
                <th className="right">Country</th>
                <th className="right">Public key</th>
                <th className="right">IP</th>
                <th>Version</th>
                <th className="right">Peers In</th>
                <th className="right">Peers Out</th>
                <th className="right">Uptime</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr className="center">
                  <td colSpan="100">
                    <br />
                    <span className="waiting"></span>
                    <br />
                    {t('general.loading')}
                    <br />
                    <br />
                  </td>
                </tr>
              ) : (
                <>
                  {!errorMessage && data ? (
                    <>
                      {data.nodes.length > 0 &&
                        data.nodes.map((a, i) => (
                          <tr key={i}>
                            <td className="center">{i + 1}</td>
                            <td>
                              <CountryWithFlag countryCode={a.country_code} type="code" />
                            </td>
                            <td className="right">
                              {windowWidth > 1560 ? a.node_public_key : shortHash(a.node_public_key)}{' '}
                              <CopyButton text={a.node_public_key} />
                            </td>
                            <td className="right">{a.ip}</td>
                            <td>{shortVersion(a.version)}</td>
                            <td className="right">{a.inbound_count}</td>
                            <td className="right">{a.outbound_count}</td>
                            <td className="right">{duration(t, a.uptime)}</td>
                          </tr>
                        ))}
                    </>
                  ) : (
                    <tr>
                      <td colSpan="100" className="center orange bold">
                        {errorMessage}
                      </td>
                    </tr>
                  )}
                </>
              )}
            </tbody>
          </table>
        ) : (
          <table className="table-mobile">
            <thead></thead>
            <tbody>
              {loading ? (
                <tr className="center">
                  <td colSpan="100">
                    <br />
                    <span className="waiting"></span>
                    <br />
                    {t('general.loading')}
                    <br />
                    <br />
                  </td>
                </tr>
              ) : (
                <>
                  {!errorMessage ? (
                    data.nodes.map((a, i) => (
                      <tr key={i}>
                        <td style={{ padding: '5px' }} className="center">
                          <b>{i + 1}</b>
                        </td>
                        <td>
                          <p>
                            <CountryWithFlag countryCode={a.country_code} />
                          </p>
                          <p>
                            Public key: {windowWidth > 540 ? a.node_public_key : shortHash(a.node_public_key)}{' '}
                            <CopyButton text={a.node_public_key} />
                          </p>
                          <p>IP: {a.ip}</p>
                          <p>Version: {shortVersion(a.version)}</p>
                          <p>Peers In: {a.inbound_count}</p>
                          <p>Peers Out: {a.outbound_count}</p>
                          <p>Uptime: {duration(t, a.uptime)}</p>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="100" className="center orange bold">
                        {errorMessage}
                      </td>
                    </tr>
                  )}
                </>
              )}
            </tbody>
          </table>
        )}
      </div>
    </>
  )
}

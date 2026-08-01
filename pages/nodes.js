import { useTranslation } from 'next-i18next'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { useWidth, ledgerName } from '../utils'
import { axiosServer, logServerSideError, passHeaders } from '../utils/axios'
import { getIsSsrMobile } from '../utils/mobile'
import { duration, timeFromNow } from '../utils/format'
import { shortServerVersion } from '../utils/serverVersion'
import { nodesPage } from '../styles/pages/nodes.module.scss'

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
    logServerSideError(error, req, 'nodes')
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
import DistributionCard from '../components/Network/DistributionCard'

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
      <div className={`content-text ${nodesPage}`}>
        <h1 className="center">
          {data?.summary?.total} {ledgerName} nodes
        </h1>
        <NetworkPagesTab tab="nodes" />

        <p className="center">
          Explore the list of {ledgerName} nodes. View up-to-date statistics on node versions and countries
          {data?.crawl_time && <> (updated {timeFromNow(data.crawl_time, i18n)}).</>}
        </p>

        {!errorMessage && (data?.summary?.versions?.length > 0 || data?.summary?.countryCodes?.length > 0) ? (
          <div className="nodeDistributionGrid">
            {data.summary.versions?.length > 0 ? (
              <DistributionCard
                title="Versions"
                rows={data.summary.versions}
                total={data.summary.total}
                renderLabel={(row) => shortServerVersion(row.version)}
                getLabel={(row) => shortServerVersion(row.version)}
                getKey={(row) => row.version}
                showLabel={t('table.text.show')}
                hideLabel={t('table.text.hide')}
                totalLabel={t('receipt.total')}
                previewRows={3}
                compact
              />
            ) : null}
            {data.summary.countryCodes?.length > 0 ? (
              <DistributionCard
                title="Countries"
                rows={data.summary.countryCodes}
                total={data.summary.total}
                renderLabel={(row) => <CountryWithFlag countryCode={row.countryCode} />}
                renderTooltipLabel={(row) => <CountryWithFlag countryCode={row.countryCode} />}
                getLabel={(row) => row.countryCode || 'Unknown'}
                getKey={(row) => row.countryCode || 'unknown'}
                showLabel={t('table.text.show')}
                hideLabel={t('table.text.hide')}
                totalLabel={t('receipt.total')}
                previewRows={3}
                compact
              />
            ) : null}
          </div>
        ) : null}

        <h4 className="center">Nodes</h4>

        {!windowWidth || windowWidth > 1230 ? (
          <table className="table-large nodesTable">
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
                            <td className="right nodePublicKeyCell">
                              <span className="nodePublicKeyValue" title={a.node_public_key}>
                                {a.node_public_key}
                              </span>
                              <CopyButton text={a.node_public_key} />
                            </td>
                            <td className="right">{a.ip}</td>
                            <td>{shortServerVersion(a.version)}</td>
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
                          <p className="nodePublicKeyRow">
                            <span>Public key:</span>
                            <span className="nodePublicKeyValue" title={a.node_public_key}>
                              {a.node_public_key}
                            </span>
                            <CopyButton text={a.node_public_key} />
                          </p>
                          <p>IP: {a.ip}</p>
                          <p>Version: {shortServerVersion(a.version)}</p>
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

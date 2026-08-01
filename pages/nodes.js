import { useTranslation } from 'next-i18next'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { useState } from 'react'
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

const DISTRIBUTION_PREVIEW_ROWS = 5

function NodeDistribution({ title, rows, total, renderLabel, t }) {
  const [expanded, setExpanded] = useState(false)
  const sortedRows = [...(rows || [])].sort((a, b) => b.count - a.count)
  const visibleRows = expanded ? sortedRows : sortedRows.slice(0, DISTRIBUTION_PREVIEW_ROWS)
  const hasMore = sortedRows.length > DISTRIBUTION_PREVIEW_ROWS

  return (
    <section className="nodeDistributionCard">
      <div className="nodeDistributionHeader">
        <h4>{title}</h4>
        <span>{sortedRows.length}</span>
      </div>
      <div className={`nodeDistributionList${expanded ? ' nodeDistributionListExpanded' : ''}`}>
        {visibleRows.map((row, index) => {
          const percentage = total > 0 ? (row.count / total) * 100 : 0
          return (
            <div className="nodeDistributionRow" key={renderLabel(row, true)}>
              <span className="nodeDistributionRank">{index + 1}</span>
              <span className="nodeDistributionLabel">{renderLabel(row)}</span>
              <strong>{row.count}</strong>
              <span className="nodeDistributionPercent">{percentage.toFixed(1)}%</span>
              <span className="nodeDistributionBar" aria-hidden="true">
                <span style={{ width: `${Math.min(percentage, 100)}%` }} />
              </span>
            </div>
          )
        })}
      </div>
      {hasMore ? (
        <button
          type="button"
          className="button-action thin nodeDistributionToggle"
          aria-expanded={expanded}
          onClick={() => setExpanded((current) => !current)}
        >
          {expanded
            ? t('table.text.hide')
            : `${t('table.text.show')} (+${sortedRows.length - DISTRIBUTION_PREVIEW_ROWS})`}
        </button>
      ) : null}
    </section>
  )
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
              <NodeDistribution
                title="Versions"
                rows={data.summary.versions}
                total={data.summary.total}
                renderLabel={(row, keyOnly) => (keyOnly ? row.version : shortServerVersion(row.version))}
                t={t}
              />
            ) : null}
            {data.summary.countryCodes?.length > 0 ? (
              <NodeDistribution
                title="Countries"
                rows={data.summary.countryCodes}
                total={data.summary.total}
                renderLabel={(row, keyOnly) =>
                  keyOnly ? row.countryCode : <CountryWithFlag countryCode={row.countryCode} />
                }
                t={t}
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
                              </span>{' '}
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
                            </span>{' '}
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

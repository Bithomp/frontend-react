import Link from 'next/link'
import { useTranslation } from 'next-i18next'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import ReactCountryFlag from 'react-country-flag'

import SEO from '../../components/SEO'
import Avatar from '../../components/UI/Avatar'
import CopyButton from '../../components/UI/CopyButton'
import NetworkPagesTab from '../../components/Tabs/NetworkPagesTabs'
import { useTheme } from '../../components/Layout/ThemeContext'

import { axiosServer, passHeaders } from '../../utils/axios'
import { getIsSsrMobile, useIsMobile } from '../../utils/mobile'
import { avatarServer, xahauNetwork } from '../../utils'
import {
  addressUsernameOrServiceLink,
  amountFormat,
  dateFormat,
  fullDateAndTime,
  shortHash,
  timeFromNow
} from '../../utils/format'
import VerifiedIcon from '../../public/images/verified.svg'

const scorePercent = (score) => {
  const numericScore = Number(score)
  if (!Number.isFinite(numericScore)) return 'N/A'
  const percent = numericScore * 100
  if (percent === 100) return '100%'
  return `${percent.toFixed(percent >= 99.99 ? 3 : 2)}%`
}

const agreementLabel = (key) => {
  if (key === 'agreement_1h') return '1h'
  if (key === 'agreement_24h') return '24h'
  if (key === 'agreement_30day') return '30d'
  return key
}

const fixCountry = (country) => {
  const countryCode = country?.toUpperCase()
  return countryCode === 'UK' ? 'GB' : countryCode
}

const validatorTitle = (validator) =>
  validator?.principals?.[0]?.name ||
  validator?.addressDetails?.service ||
  validator?.addressDetails?.username ||
  validator?.domain ||
  shortHash(validator?.validation_public_key, 10)

const normalizeValidator = (metrics, meta) => ({
  ...meta,
  ...metrics,
  validation_public_key: metrics?.validation_public_key || meta?.publicKey || meta?.validation_public_key,
  signing_key: metrics?.signing_key || meta?.signingKey || meta?.signing_key,
  master_key: metrics?.master_key || meta?.masterKey || meta?.master_key,
  domain: metrics?.domain || meta?.domain || meta?.domainLegacy
})

export async function getServerSideProps(context) {
  const { locale, req, params } = context
  const id = params?.id || ''

  let validator = null
  let reportsPayload = null
  let errorMessage = ''

  try {
    const [metricsRes, reportsRes, validatorRes] = await Promise.all([
      axiosServer({
        method: 'get',
        url: 'v2/validator/' + encodeURIComponent(id) + '/metrics',
        headers: passHeaders(req)
      }),
      axiosServer({
        method: 'get',
        url: 'v2/validator/' + encodeURIComponent(id) + '/reports',
        headers: passHeaders(req)
      }),
      axiosServer({
        method: 'get',
        url: 'v2/validator/' + encodeURIComponent(id),
        headers: passHeaders(req)
      })
    ])

    validator = normalizeValidator(metricsRes.data, validatorRes.data)
    reportsPayload = reportsRes?.data || null
  } catch (error) {
    errorMessage = error?.message || 'Failed to load validator'
  }

  if (!validator?.validation_public_key || validator?.result === 'error') {
    return {
      notFound: true
    }
  }

  return {
    props: {
      id,
      validator,
      reportsPayload: reportsPayload || { count: 0, reports: [] },
      errorMessage,
      serverTime: Math.floor(Date.now() / 1000),
      isSsrMobile: getIsSsrMobile(context),
      ...(await serverSideTranslations(locale, ['common', 'validators', 'last-ledger-information']))
    }
  }
}

export default function ValidatorPage({ validator, reportsPayload, errorMessage, serverTime }) {
  const { t, i18n } = useTranslation(['common', 'validators', 'last-ledger-information'])
  const { theme } = useTheme()
  const isMobile = useIsMobile(900)
  const hashLength = isMobile ? 8 : 16

  const reports = [...(reportsPayload?.reports || [])].sort((a, b) => new Date(b.date) - new Date(a.date))
  const recentReports = reports.slice(0, 100)
  const recentAverageScore =
    recentReports.length > 0
      ? (
          recentReports.reduce((sum, report) => sum + Number(report.score || 0), 0) / Math.max(recentReports.length, 1)
        ).toFixed(5)
      : null
  const totalMissedRecent = recentReports.reduce((sum, report) => sum + Number(report.missed || 0), 0)

  const title = validatorTitle(validator)
  const domain = validator?.domain || ''
  const legacyDomain = validator?.domainLegacy && validator.domainLegacy !== domain ? validator.domainLegacy : ''
  const ownerCountry = fixCountry(validator?.ownerCountry)
  const serverCountry = fixCountry(validator?.serverCountry)
  const isRevoked = !!validator?.revoked
  const isPartial = !!validator?.partial
  const isOnUnl = !!validator?.unl
  const lastSeenTime = Number(validator?.lastSeenTime || 0)
  const currentTime = Number(serverTime) || Math.floor(Date.now() / 1000)
  const seenRecently = lastSeenTime > 0 && currentTime - lastSeenTime <= 86400
  const agreementItems = ['agreement_1h', 'agreement_24h', 'agreement_30day']
    .map((key) => ({ key, value: validator?.[key] }))
    .filter((item) => item.value)

  const twitterLink = (twitter) => {
    if (!twitter) return ''
    const twitterHandle = twitter.replace('@', '')
    return (
      <a href={'https://x.com/' + twitterHandle} target="_blank" rel="noreferrer" className="validator-twitter-link">
        <span className="tooltip">
          <svg width="12" height="12.27" viewBox="0 0 1200 1227" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M714.163 519.284L1160.89 0H1055.03L667.137 450.887L357.328 0H0L468.492 681.821L0 1226.37H105.866L515.491 750.218L842.672 1226.37H1200L714.137 519.284H714.163ZM569.165 687.828L521.697 619.934L144.011 79.6944H306.615L611.412 515.685L658.88 583.579L1055.08 1150.3H892.476L569.165 687.854V687.828Z"
              fill={theme === 'dark' ? '#fff' : '#000'}
            />
          </svg>
          <span className="tooltiptext no-brake">{twitterHandle}</span>
        </span>
      </a>
    )
  }

  const verifiedSign = (domainVerified, verifiedDomain) => {
    if (!domainVerified || !verifiedDomain) return ''
    return (
      <span className="tooltip">
        <a
          href={'https://' + verifiedDomain + '/.well-known/' + (xahauNetwork ? 'xahau.toml' : 'xrp-ledger.toml')}
          target="_blank"
          rel="noreferrer"
          className="validator-verified-link"
        >
          <VerifiedIcon />
        </a>
        <span className="tooltiptext right no-brake">{t('table.text.domain-verified-toml', { ns: 'validators' })}</span>
      </span>
    )
  }

  const listAmendments = (amendments) => {
    if (!amendments?.length) return <span className="grey">{t('table.text.no-votes')}</span>
    return amendments.map((amendment, index) => {
      const amendmentId =
        typeof amendment === 'string' ? amendment : amendment?.id || amendment?.amendment || amendment?.name
      const amendmentName = typeof amendment === 'string' ? amendment : amendment?.name || amendmentId
      if (!amendmentId && !amendmentName) return null
      return (
        <span key={amendmentId || amendmentName || index}>
          <Link href={`/amendment/${encodeURIComponent(amendmentId || amendmentName)}`} className="orange">
            {amendmentName?.length === 64 ? shortHash(amendmentName) : amendmentName}
          </Link>
          {index !== amendments.length - 1 && ', '}
        </span>
      )
    })
  }

  return (
    <>
      <SEO
        title={`${title} Validator`}
        titleWithNetwork="true"
        description={`Validator details, agreement scores, network settings and reports for ${title}.`}
      />

      <div className="content-profile validator-page">
        <h1 className="center">Validator</h1>
        <NetworkPagesTab />

        {errorMessage && <p className="red center">{errorMessage}</p>}

        <section className="validator-hero bordered">
          <div className="validator-hero-main">
            <Avatar
              src={avatarServer + validator.validation_public_key}
              size={78}
              style={{ background: '#fff', border: '1px solid #fff', flexShrink: 0 }}
            />
            <div className="validator-hero-copy">
              <div className="validator-hero-title-row">
                <h2>{title}</h2>
                {domain && (
                  <span className="validator-domain-wrap">
                    <a href={`https://${domain}`} target="_blank" rel="noreferrer" className="validator-domain-link">
                      {domain}
                    </a>
                    {verifiedSign(validator.domainVerified, domain)}
                  </span>
                )}
              </div>
              <div className="validator-badges">
                {isOnUnl && (
                  <span className="validator-badge positive tooltip">
                    UNL
                    <span className="tooltiptext no-brake">{validator.unl}</span>
                  </span>
                )}
                {isPartial && <span className="validator-badge warning">Partial data</span>}
                {isRevoked && <span className="validator-badge negative">Revoked</span>}
                {!isRevoked &&
                  !isPartial &&
                  (seenRecently ? (
                    <span className="validator-badge neutral">Active</span>
                  ) : lastSeenTime > 0 ? (
                    <span className="validator-badge warning">Last seen {timeFromNow(lastSeenTime, i18n)}</span>
                  ) : (
                    <span className="validator-badge warning">Not seen recently</span>
                  ))}
              </div>
              <div className="validator-meta-line">
                {validator?.principals?.map((principal, index) => (
                  <span className="validator-principal-item" key={index}>
                    {principal.name && <b>{principal.name}</b>}
                    {twitterLink(principal.twitter || principal.x)}
                  </span>
                ))}
                {legacyDomain && (
                  <span className="validator-domain-wrap">
                    <b>{t('domain-legacy', { ns: 'validators' })}:</b>{' '}
                    <a
                      href={`https://${legacyDomain}`}
                      target="_blank"
                      rel="noreferrer"
                      className="validator-domain-link"
                    >
                      {legacyDomain}
                    </a>
                    {verifiedSign(validator.domainLegacyVerified, legacyDomain)}
                  </span>
                )}
                {ownerCountry && (
                  <span className="validator-flag-item">
                    <ReactCountryFlag countryCode={ownerCountry} svg style={{ width: '18px', height: '18px' }} />
                    <span>
                      <b>Operator:</b> {ownerCountry}
                    </span>
                  </span>
                )}
                {serverCountry && (
                  <span className="validator-flag-item">
                    <ReactCountryFlag countryCode={serverCountry} svg style={{ width: '18px', height: '18px' }} />
                    <span>
                      <b>Server:</b> {serverCountry}
                    </span>
                  </span>
                )}
                {validator?.server_version && <span>Version: {validator.server_version}</span>}
              </div>
            </div>
          </div>

          <div className="validator-agreements">
            {agreementItems.map(({ key, value }) => (
              <div className="validator-agreement-card" key={key}>
                <div className="validator-agreement-label">{agreementLabel(key)}</div>
                <div className="validator-agreement-score">{scorePercent(value?.score)}</div>
                <div className="validator-agreement-meta">
                  <span className="tooltip" tabIndex={0}>
                    Missed {Number(value?.missed || 0)} / {Number(value?.total || 0)}
                    <span className="tooltiptext right" style={{ width: '200px' }}>
                      <div>
                        <b>Missed</b> — ledgers this validator did not validate.
                      </div>
                      <div>
                        <b>Total</b> — all ledgers in this period.
                      </div>
                    </span>
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>

        <div className="validator-grid">
          <section className="validator-card bordered">
            <h3>Manifest</h3>
            <div className="validator-detail-list">
              <div className="validator-detail-row">
                <span>Master key</span>
                <span className="validator-copy-row">
                  {shortHash(validator.master_key, hashLength)}
                  <CopyButton text={validator.master_key} />
                </span>
              </div>
              <div className="validator-detail-row">
                <span>Signing key</span>
                <span className="validator-copy-row">
                  {shortHash(validator.signing_key, hashLength)}
                  <CopyButton text={validator.signing_key} />
                </span>
              </div>
              {validator.sequence && (
                <div className="validator-detail-row">
                  <span>{t('table.sequence')}</span>
                  <span>{validator.sequence}</span>
                </div>
              )}
            </div>
          </section>

          <section className="validator-card bordered">
            <h3>Network</h3>
            <div className="validator-detail-list">
              <div className="validator-detail-row">
                <span>Current ledger</span>
                <span>{validator.current_index?.toLocaleString?.() || 'N/A'}</span>
              </div>
              <div className="validator-detail-row">
                <span>Ledger hash</span>
                <span className="validator-copy-row">
                  {shortHash(validator.ledger_hash, hashLength)}
                  <CopyButton text={validator.ledger_hash} />
                </span>
              </div>
              {validator.serverLocation && (
                <div className="validator-detail-row">
                  <span>{t('table.server-location', { ns: 'validators' })}</span>
                  <span>{validator.serverLocation}</span>
                </div>
              )}
              {(validator.networkASN || validator.serverCloud === true || validator.serverCloud === false) && (
                <div className="validator-detail-row">
                  <span>{t('table.network-asn', { ns: 'validators' })}</span>
                  <span>
                    {validator.serverCloud === true && (
                      <span title={t('table.cloud-private', { ns: 'validators' })}>☁️</span>
                    )}
                    {validator.serverCloud === false && (
                      <span title={t('table.cloud-private', { ns: 'validators' })}>🏠</span>
                    )}
                    {validator.networkASN && <> {validator.networkASN}</>}
                  </span>
                </div>
              )}
            </div>
          </section>

          <section className="validator-card bordered">
            <h3>Voting</h3>
            <div className="validator-detail-list">
              <div className="validator-detail-row">
                <span>{t('table.votes-for', { ns: 'validators' })}</span>
                <span>{listAmendments(validator.amendments)}</span>
              </div>
              <div className="validator-detail-row">
                <span>{t('last-ledger-information.base-fee')}</span>
                <span>{validator.base_fee ? amountFormat(validator.base_fee) : 'N/A'}</span>
              </div>
              <div className="validator-detail-row">
                <span>{t('last-ledger-information.base-reserve')}</span>
                <span>{validator.reserve_base ? amountFormat(validator.reserve_base) : 'N/A'}</span>
              </div>
              <div className="validator-detail-row">
                <span>{t('last-ledger-information.increment-reserve')}</span>
                <span>{validator.reserve_inc ? amountFormat(validator.reserve_inc) : 'N/A'}</span>
              </div>
              {xahauNetwork && validator.address && (
                <div className="validator-detail-row">
                  <span>{t('table.address')}</span>
                  <span>
                    <CopyButton text={validator.address} /> {addressUsernameOrServiceLink(validator, 'address')}
                  </span>
                </div>
              )}
            </div>
          </section>

          <section className="validator-card bordered">
            <h3>Reports</h3>
            <div className="validator-detail-list">
              <div className="validator-detail-row">
                <span>Latest report</span>
                <span>{reports[0]?.date ? fullDateAndTime(reports[0].date) : 'N/A'}</span>
              </div>
              <div className="validator-detail-row">
                <span>Average recent score</span>
                <span>{recentAverageScore ? scorePercent(recentAverageScore) : 'N/A'}</span>
              </div>
              <div className="validator-detail-row">
                <span>Missed in recent {recentReports.length}</span>
                <span>{totalMissedRecent.toLocaleString()}</span>
              </div>
            </div>
          </section>
        </div>

        <section className="validator-card bordered">
          <h3>Latest {recentReports.length} daily reports</h3>

          <div className="validator-reports-desktop">
            <table className="validator-reports-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th className="right">Score</th>
                  <th className="right">
                    <span className="tooltip" tabIndex={0}>
                      Missed
                      <span className="tooltiptext left" style={{ width: '180px' }}>
                        Ledgers this validator did not validate that day.
                      </span>
                    </span>
                  </th>
                  <th className="right">
                    <span className="tooltip" tabIndex={0}>
                      Total
                      <span className="tooltiptext left" style={{ width: '160px' }}>
                        Total ledgers closed that day.
                      </span>
                    </span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {recentReports.map((report) => {
                  const missed = Number(report.missed || 0)
                  return (
                    <tr key={report.date} className={missed > 0 ? 'validator-report-missed' : ''}>
                      <td>{dateFormat(report.date, undefined, { type: 'ISO' })}</td>
                      <td className="right">{scorePercent(report.score)}</td>
                      <td className="right">{missed.toLocaleString()}</td>
                      <td className="right">{Number(report.total || 0).toLocaleString()}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <style jsx>{`
        .validator-page {
          max-width: 1180px;
        }

        .validator-hero,
        .validator-card {
          background: color-mix(in srgb, var(--background-secondary) 84%, transparent);
          border-color: color-mix(in srgb, var(--accent-link) 24%, transparent);
          border-radius: 18px;
          padding: 20px;
          margin-bottom: 20px;
        }

        .validator-hero-main {
          display: flex;
          gap: 18px;
          align-items: center;
          margin-bottom: 20px;
        }

        .validator-hero-copy {
          min-width: 0;
          flex: 1;
        }

        .validator-hero-title-row {
          display: flex;
          gap: 12px;
          align-items: center;
          flex-wrap: wrap;
          margin-bottom: 10px;
        }

        .validator-hero-title-row h2 {
          margin: 0;
        }

        .validator-domain-link {
          color: var(--accent-link);
          word-break: break-all;
        }

        .validator-domain-wrap,
        .validator-principal-item {
          display: inline-flex;
          gap: 5px;
          align-items: center;
          min-width: 0;
        }

        .validator-principal-item b {
          color: var(--text-main);
        }

        .validator-twitter-link,
        .validator-verified-link {
          display: inline-flex;
          align-items: center;
          line-height: 0;
        }

        .validator-verified-link :global(svg) {
          width: 15px;
          height: 15px;
          margin-left: 1px;
        }

        .validator-badges {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          margin-bottom: 10px;
        }

        .validator-badge {
          display: inline-flex;
          align-items: center;
          border-radius: 999px;
          padding: 5px 10px;
          font-size: 13px;
          font-weight: 700;
        }

        .validator-badge.positive {
          background: rgba(30, 167, 102, 0.14);
          color: #1c9a63;
        }

        .validator-badge.warning {
          background: rgba(244, 166, 49, 0.16);
          color: #ba7313;
        }

        .validator-badge.negative {
          background: rgba(222, 83, 83, 0.14);
          color: #cb4a4a;
        }

        .validator-badge.neutral {
          background: rgba(72, 143, 255, 0.14);
          color: var(--accent-link);
        }

        .validator-meta-line {
          display: flex;
          gap: 14px;
          flex-wrap: wrap;
          color: var(--text-secondary);
          font-size: 14px;
        }

        .validator-flag-item {
          display: inline-flex;
          gap: 6px;
          align-items: center;
        }

        .validator-flag-item b {
          color: var(--text-main);
        }

        .validator-agreements {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 14px;
        }

        .validator-agreement-card {
          border: 1px solid color-mix(in srgb, var(--accent-link) 18%, transparent);
          border-radius: 16px;
          padding: 16px;
          background: color-mix(in srgb, var(--background-main) 65%, transparent);
        }

        .validator-agreement-label {
          font-size: 13px;
          font-weight: 700;
          color: var(--text-secondary);
          margin-bottom: 8px;
        }

        .validator-agreement-score {
          font-size: 28px;
          font-weight: 800;
          line-height: 1;
          margin-bottom: 8px;
        }

        .validator-agreement-meta {
          font-size: 13px;
          color: var(--text-secondary);
        }

        .validator-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 20px;
        }

        .validator-card h3 {
          margin-top: 0;
          margin-bottom: 14px;
        }

        .validator-detail-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .validator-detail-row {
          display: flex;
          justify-content: space-between;
          gap: 16px;
          align-items: flex-start;
        }

        .validator-detail-row > span:first-child {
          color: var(--text-secondary);
          flex: 0 0 185px;
          white-space: nowrap;
        }

        .validator-detail-row > span:last-child {
          text-align: right;
          min-width: 0;
          word-break: break-word;
        }

        .validator-copy-row {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          flex-wrap: nowrap;
          justify-content: flex-end;
          white-space: nowrap;
          word-break: normal;
        }

        .validator-reports-desktop {
          margin-top: 8px;
        }

        .validator-reports-table {
          width: 100%;
          table-layout: fixed;
          border-collapse: collapse;
        }

        .validator-reports-table th,
        .validator-reports-table td {
          padding: 11px 0;
          border-bottom: 1px solid color-mix(in srgb, var(--accent-link) 14%, transparent);
        }

        .validator-reports-table th {
          color: var(--text-secondary);
          font-size: 13px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.02em;
        }

        .validator-reports-table tbody tr:last-child td {
          border-bottom: none;
        }

        .validator-reports-table th:first-child,
        .validator-reports-table td:first-child {
          padding-left: 0;
        }

        .validator-reports-table th:last-child,
        .validator-reports-table td:last-child {
          padding-right: 0;
        }

        .validator-reports-table th:first-child,
        .validator-reports-table td:first-child {
          width: 42%;
        }

        .validator-reports-table th:not(:first-child),
        .validator-reports-table td:not(:first-child) {
          width: 19.333%;
        }

        .validator-report-missed {
          background: rgba(222, 83, 83, 0.08);
        }

        .validator-report-missed td:nth-child(3) {
          color: #cb4a4a;
          font-weight: 700;
        }

        .grey {
          color: var(--text-secondary);
        }

        @media (max-width: 900px) {
          .validator-page {
            width: calc(100% - 30px);
            margin: 0 auto;
          }

          .validator-hero-main {
            flex-direction: column;
            align-items: flex-start;
          }

          .validator-agreements {
            grid-template-columns: 1fr;
          }

          .validator-grid {
            grid-template-columns: 1fr;
          }

          .validator-detail-row {
            flex-direction: column;
            gap: 4px;
          }

          .validator-detail-row > span:first-child,
          .validator-detail-row > span:last-child {
            flex: none;
            text-align: left;
          }

          .validator-copy-row {
            justify-content: flex-start;
          }

          .validator-reports-table th,
          .validator-reports-table td {
            padding: 9px 0;
            font-size: 13px;
          }

          .validator-reports-table th:first-child,
          .validator-reports-table td:first-child {
            width: 34%;
          }

          .validator-reports-table th:not(:first-child),
          .validator-reports-table td:not(:first-child) {
            width: 22%;
          }
        }
      `}</style>
    </>
  )
}

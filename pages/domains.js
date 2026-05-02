import { useTranslation, Trans } from 'next-i18next'
import React, { useState, useEffect } from 'react'
import axios from 'axios'
import Link from 'next/link'
import { LuFileCheck2 } from 'react-icons/lu'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'

import { AddressWithIconFilled } from '../utils/format'
import { getIsSsrMobile } from '../utils/mobile'
import { useWidth, xahauNetwork, explorerName, ledgerName, webSiteName } from '../utils'

import SEO from '../components/SEO'
import FiltersFrame from '../components/Layout/FiltersFrame'
import RadioOptions from '../components/UI/RadioOptions'
import styles from '../styles/pages/domains.module.scss'

const DOMAINS_LIMIT = 100
const DOMAIN_FAVICON_SIZE = 16
const DOMAIN_FAVICON_CDN_SIZE = DOMAIN_FAVICON_SIZE * 2

const sourceFilterOptions = [
  { value: 'exclude', label: 'Exclude' },
  { value: 'include', label: 'Include' }
]

const domainFaviconSrc = (domain) => {
  if (!domain) return ''
  return `https://cdn.${webSiteName}/favicons/${encodeURIComponent(domain)}?size=${DOMAIN_FAVICON_CDN_SIZE}`
}

const DomainLink = ({ domain }) => (
  <span className={styles.domainWithFavicon}>
    <a className="bold" href={'https://' + domain}>
      {domain}
    </a>
    <img
      className={`${styles.domainFavicon} entity-icon-outline`}
      src={domainFaviconSrc(domain)}
      alt=""
      width={DOMAIN_FAVICON_SIZE}
      height={DOMAIN_FAVICON_SIZE}
      loading="lazy"
      aria-hidden="true"
      onError={(e) => {
        e.currentTarget.style.display = 'none'
      }}
    />
  </span>
)

export const getServerSideProps = async (context) => {
  const { locale } = context
  return {
    props: {
      isSsrMobile: getIsSsrMobile(context),
      ...(await serverSideTranslations(locale, ['common', 'domains']))
    }
  }
}

export default function Domains({ setSignRequest }) {
  const { t } = useTranslation()
  const windowWidth = useWidth()

  const [data, setData] = useState([])
  const [marker, setMarker] = useState(null)
  const [errorMessage, setErrorMessage] = useState(null)
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [filtersHide, setFiltersHide] = useState(false)
  const [firstLedgerFilter, setFirstLedgerFilter] = useState('exclude')
  const [horizonXrplFilter, setHorizonXrplFilter] = useState('exclude')

  const buildDomainsUrl = (markerValue) => {
    const params = new URLSearchParams({
      excludeFirstledger: firstLedgerFilter === 'exclude' ? 'true' : 'false',
      excludeHorizonXrpl: horizonXrplFilter === 'exclude' ? 'true' : 'false',
      limit: DOMAINS_LIMIT
    })

    if (markerValue) {
      params.set('marker', markerValue)
    }

    return `xrpl/domains?${params.toString()}`
  }

  const checkApi = async ({ loadMore = false } = {}) => {
    const markerValue = loadMore ? marker : null

    if (loadMore) {
      setLoadingMore(true)
    } else {
      setLoading(true)
      setData([])
      setMarker(null)
    }
    setErrorMessage(null)

    try {
      const response = await axios(buildDomainsUrl(markerValue))
      const responseData = response.data
      const domains = Array.isArray(responseData?.domains) ? responseData.domains : []

      setData((prev) => (loadMore ? [...prev, ...domains] : domains))
      setMarker(responseData?.marker || null)
    } catch (error) {
      setErrorMessage(error?.message || 'Failed to load domains')
      if (!loadMore) {
        setData([])
        setMarker(null)
      }
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }

  /*
  {
    "total": 97,
    "domains": [
      {
        "domain": "bithomp.com",
        "validToml": true,
        "lastTomlCheck": 1693184438,
        "addresses": [
          {
            "address": "rsuUjfWxrACCAwGQDsNeZUhpzXf1n1NK5Z",
            "inToml": 1693184438,
            "verified": true,
            "domainSet": 1693253151,
            "lastInterest": 1693173887
          },
  */

  useEffect(() => {
    checkApi()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [firstLedgerFilter, horizonXrplFilter])

  return (
    <>
      <SEO title={t('menu.network.verified-domains')} />
      <h1 className="center">{t('menu.network.verified-domains')}</h1>
      <FiltersFrame
        count={data.length}
        hasMore={marker}
        data={data}
        filtersHide={filtersHide}
        setFiltersHide={setFiltersHide}
        filters={{
          'First Ledger': firstLedgerFilter === 'exclude' ? 'excluded' : 'included',
          'Horizon XRPL': horizonXrplFilter === 'exclude' ? 'excluded' : 'included'
        }}
      >
        <>
          <div>
            <div style={{ marginBottom: 10 }}>First Ledger domains</div>
            <RadioOptions
              tabList={sourceFilterOptions}
              tab={firstLedgerFilter}
              setTab={setFirstLedgerFilter}
              name="first-ledger-domains"
            />
          </div>
          <div>
            <div style={{ marginBottom: 10 }}>Horizon XRPL domains</div>
            <RadioOptions
              tabList={sourceFilterOptions}
              tab={horizonXrplFilter}
              setTab={setHorizonXrplFilter}
              name="horizon-xrpl-domains"
            />
          </div>
        </>
        <>
          <div className="domains-page-content">
            <div className="flex-container">
              <div className="grey-box">
                <h4>{t('domain-verification', { ns: 'domains' })}</h4>
                <p>{t('domain-verification-desc', { ns: 'domains', explorerName })}</p>
                <p>{t('reason-to-verify', { ns: 'domains', ledgerName })}</p>
                <p>{t('two-sides-verification', { ns: 'domains', ledgerName })}</p>
                <h4>{t('domain-claims-address', { ns: 'domains' })}</h4>
                <p>
                  {t('serve-toml', { ns: 'domains', tomlFile: xahauNetwork ? 'xahau.toml' : 'xrp-ledger.toml' })}
                  <br />
                  {xahauNetwork
                    ? 'https://{DOMAIN}/.well-known/xahau.toml'
                    : 'https://{DOMAIN}/.well-known/xrp-ledger.toml'}
                  <br />
                  {t('address-in-toml', { ns: 'domains' })}
                </p>
                <p>
                  <Trans
                    i18nKey="read-about-toml"
                    ns="domains"
                    components={[<Link key="toml-checker-link-read" href="/services/toml-checker" />]}
                  />
                </p>
              </div>
              <div className="grey-box">
                <h4>{t('address-claims-domain', { ns: 'domains' })}</h4>
                <p>
                  <Trans i18nKey="set-domain" ns="domains" values={{ ledgerName }}>
                    You should{' '}
                    <a
                      href={xahauNetwork ? '#' : 'https://xrpl.org/accountset.html'}
                      onClick={
                        xahauNetwork
                          ? (e) => {
                              e.preventDefault()
                              setSignRequest({
                                action: 'setDomain',
                                redirect: 'account',
                                request: {
                                  TransactionType: 'AccountSet'
                                }
                              })
                            }
                          : null
                      }
                    >
                      set a domain for your {ledgerName} address
                    </a>{' '}
                    which should match the domain your TOML file is served from.
                  </Trans>
                  <br />
                  <br />
                  <button
                    className="button-action center"
                    onClick={() =>
                      setSignRequest({
                        action: 'setDomain',
                        redirect: 'account',
                        request: {
                          TransactionType: 'AccountSet'
                        }
                      })
                    }
                  >
                    {t('button.set-domain')}
                  </button>
                </p>
                <h4>{t('verify', { ns: 'domains' })}</h4>
                <p>
                  <Trans
                    i18nKey="verify-desc"
                    ns="domains"
                    components={[<Link key="toml-checker-link-verify" href="/services/toml-checker" />]}
                  />
                </p>
                <br />
                <p>{t('desc', { ns: 'domains', ledgerName })}</p>
              </div>
            </div>
            <br />
            {windowWidth > 1000 ? (
              <table className="table-large shrink">
                <thead>
                  <tr>
                    <th>{t('table.index')}</th>
                    <th>{t('table.domain')}</th>
                    <th className="center">{t('table.toml-checker', { ns: 'domains' })}</th>
                    <th className="center">{t('table.addresses', { ns: 'domains' })}</th>
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
                  ) : errorMessage ? (
                    <tr className="center">
                      <td colSpan="100" className="red">
                        {errorMessage}
                      </td>
                    </tr>
                  ) : (
                    <>
                      {data?.map((d, i) => (
                        <tr key={i} style={{ borderBottom: '1px solid var(--accent-link)' }}>
                          <td>{i + 1}</td>
                          <td>
                            <DomainLink domain={d.domain} />
                          </td>
                          <td className="center no-brake">
                            <span className="tooltip">
                              <Link
                                href={{ pathname: '/services/toml-checker', query: { domain: d.domain } }}
                                className="toml-checker-icon-link"
                                aria-label={t('table.check-toml-for-domain', { ns: 'domains', domain: d.domain })}
                              >
                                <LuFileCheck2 aria-hidden="true" />
                              </Link>
                              <span className="tooltiptext no-brake">{t('table.check-toml', { ns: 'domains' })}</span>
                            </span>
                          </td>
                          <td>
                            {d.addresses.length === 1 ? (
                              <AddressWithIconFilled data={d.addresses[0]} />
                            ) : (
                              d.addresses.map((a, j) => (
                                <React.Fragment key={j}>
                                  {j + 1} . <AddressWithIconFilled data={a} />
                                  {j !== d.addresses.length - 1 && <br />}
                                </React.Fragment>
                              ))
                            )}
                          </td>
                        </tr>
                      ))}
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
                  ) : errorMessage ? (
                    <tr className="center">
                      <td colSpan="100" className="red">
                        {errorMessage}
                      </td>
                    </tr>
                  ) : (
                    <>
                      {data?.map((d, i) => (
                        <tr key={i}>
                          <td style={{ padding: '5px' }} className="center">
                            <b>{i + 1}</b>
                          </td>
                          <td>
                            <p className={styles.domainMobileRow}>
                              <DomainLink domain={d.domain} />
                              <Link
                                href={{ pathname: '/services/toml-checker', query: { domain: d.domain } }}
                                className="toml-checker-icon-link mobile"
                                title={t('table.check-toml', { ns: 'domains' })}
                                aria-label={t('table.check-toml-for-domain', { ns: 'domains', domain: d.domain })}
                              >
                                {t('table.check-toml', { ns: 'domains' })}
                              </Link>
                            </p>
                            {d.addresses.length === 1 ? (
                              <AddressWithIconFilled data={d.addresses[0]} />
                            ) : (
                              d.addresses.map((a, j) => (
                                <React.Fragment key={j}>
                                  {j + 1} . <AddressWithIconFilled data={a} />
                                  {j !== d.addresses.length - 1 && <br />}
                                </React.Fragment>
                              ))
                            )}
                          </td>
                        </tr>
                      ))}
                    </>
                  )}
                </tbody>
              </table>
            )}
            {marker && !loading && !errorMessage && (
              <p className="center">
                <button className="button-action" onClick={() => checkApi({ loadMore: true })} disabled={loadingMore}>
                  {loadingMore ? t('general.loading') : 'Load more'}
                </button>
              </p>
            )}
          </div>
          <style jsx>{`
            .domains-page-content {
              margin: 20px;
            }

            .toml-checker-icon-link {
              display: inline-flex;
              align-items: center;
              justify-content: center;
              width: 28px;
              height: 28px;
              color: var(--accent-link);
              vertical-align: middle;
            }

            .toml-checker-icon-link:hover {
              color: var(--accent-link-hover);
            }

            .toml-checker-icon-link :global(svg) {
              width: 20px;
              height: 20px;
            }

            .toml-checker-icon-link.mobile {
              flex: 0 0 auto;
              width: auto;
              height: 22px;
              font-size: 0.9em;
              line-height: 1;
            }

            @media only screen and (max-width: 800px) {
              .domains-page-content {
                margin: 20px 15px;
              }

              .domains-page-content :global(.flex-container) {
                gap: 20px;
              }
            }
          `}</style>
        </>
      </FiltersFrame>
    </>
  )
}

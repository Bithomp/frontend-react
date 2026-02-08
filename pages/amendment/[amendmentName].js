import { useTranslation } from 'next-i18next'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { useEffect, useState } from 'react'
import { axiosServer, passHeaders } from '../../utils/axios'
import { getIsSsrMobile } from '../../utils/mobile'
import { shortHash, fullDateAndTime, timeFromNow } from '../../utils/format'
import { avatarServer, xahauNetwork, useWidth, countriesTranslated, explorerName } from '../../utils'
import Avatar from '../../components/UI/Avatar'
import SEO from '../../components/SEO'
import CopyButton from '../../components/UI/CopyButton'
import ReactCountryFlag from 'react-country-flag'
import { useTheme } from '../../components/Layout/ThemeContext'
import VerifiedIcon from '../../public/images/verified.svg'
import NetworkPagesTab from '../../components/Tabs/NetworkPagesTabs'
import { LinkTx } from '../../utils/links'

export async function getServerSideProps(context) {
  const { params, locale, req } = context
  const amendmentName = params.amendmentName
  let amendmentData = null
  let featureData = null
  let validators = []
  let initialErrorMessage = null

  try {
    // Get all amendments
    const res = await axiosServer({
      method: 'get',
      url: 'v2/amendment',
      headers: passHeaders(req)
    }).catch((error) => {
      initialErrorMessage = error.message
    })
    const amendments = res?.data
    // Find the amendment by name or hash
    amendmentData = amendments.find(
      (a) =>
        String(a.name || '').toLowerCase() === String(amendmentName || '').toLowerCase() ||
        String(a.amendment || '').toLowerCase() === String(amendmentName || '').toLowerCase()
    )
    // Get features for more details
    const res2 = await axiosServer({
      method: 'get',
      url: 'v2/features',
      headers: passHeaders(req)
    })
    const features = res2.data?.result?.features || {}
    featureData = amendmentData?.amendment ? features[amendmentData.amendment] : null
    // Get validators
    const res3 = await axiosServer({
      method: 'get',
      url: 'v2/validators',
      headers: passHeaders(req)
    })
    validators = res3.data || []
    // Get UNL and merge
    const unlRes = await axiosServer({
      method: 'get',
      url: 'v2/unl',
      headers: passHeaders(req)
    })
    const unlValidators = unlRes.data?.validators || []
    const validatorMap = {}
    validators.forEach((v) => {
      validatorMap[v.publicKey] = v
    })
    unlValidators.forEach((u) => {
      if (validatorMap[u.publicKey]) {
        validatorMap[u.publicKey].unl = true
      }
    })
    validators = Object.values(validatorMap)
  } catch (error) {
    initialErrorMessage = error.message
  }

  return {
    props: {
      amendmentName: amendmentName || null,
      amendmentData: amendmentData || null,
      featureData: featureData || null,
      validators: validators || [],
      initialErrorMessage: initialErrorMessage || '',
      isSsrMobile: getIsSsrMobile(context),
      ...(await serverSideTranslations(locale, ['common']))
    }
  }
}

function splitValidatorsByAmendment(validators, amendmentName) {
  const yeas = []
  const nays = []
  for (const v of validators) {
    if (v.unl) {
      if (v.amendments && v.amendments.includes(amendmentName)) {
        yeas.push(v)
      } else {
        nays.push(v)
      }
    }
  }
  return { yeas, nays }
}

export default function AmendmentSummary({
  amendmentName,
  amendmentData,
  featureData,
  validators,
  initialErrorMessage
}) {
  const windowWidth = useWidth()
  const { t, i18n } = useTranslation()
  const { theme } = useTheme()
  const [countries, setCountries] = useState(null)
  const [yeas, setYeas] = useState([])
  const [nays, setNays] = useState([])

  useEffect(() => {
    if (validators) {
      const amendmentName = amendmentData?.name || amendmentData?.amendment
      const { yeas, nays } = splitValidatorsByAmendment(validators, amendmentName)
      setYeas(yeas)
      setNays(nays)
    }
  }, [validators, amendmentData])

  const amendmentId = amendmentData?.amendment
  const introduced = amendmentData?.introduced
  let threshold = ''
  if (featureData && typeof featureData.threshold !== 'undefined' && typeof featureData.validations !== 'undefined') {
    threshold = `${featureData.threshold} / ${featureData.validations} votes`
  }
  const detailsUrl = `https://xrpl.org/known-amendments.html#${amendmentName.toLowerCase()}`
  const status = amendmentData?.enabled ? 'ENABLED' : 'NOT ENABLED'
  const activationDays = xahauNetwork ? 5 : 14
  const eta = amendmentData?.majority
    ? fullDateAndTime(amendmentData.majority + activationDays * 86400 + 903)
    : 'Currently undefined'
  const consensus = yeas.length + nays.length > 0 ? ((yeas.length / (yeas.length + nays.length)) * 100).toFixed(2) : ''

  const fixCountry = (country) => {
    //accept UK as a country code for GB
    return country?.toUpperCase() === 'UK' ? 'GB' : country
  }

  useEffect(() => {
    const loadCountries = async () => {
      const data = await countriesTranslated(i18n.language)
      setCountries(data)
    }
    loadCountries()
  }, [i18n.language])

  const displayFlag = (country, typeName, em = 1) => {
    if (!country) return ''
    if (country.length === 2) {
      country = fixCountry(country)
      return (
        <span className="tooltip">
          <ReactCountryFlag
            countryCode={country}
            style={{
              fontSize: em + 'em',
              lineHeight: em + 'em'
            }}
          />
          {country.toLowerCase() !== 'eu' && (
            <span className="tooltiptext right no-brake">
              {typeName}: {countries?.getNameTranslated?.(country) || country}
            </span>
          )}
        </span>
      )
    }
  }

  const twitterLink = (twitter) => {
    if (!twitter) return ''
    twitter = twitter.replace('@', '')
    return (
      <>
        {' '}
        <a href={'https://x.com/' + twitter}>
          <span className="tooltip">
            <svg width="12" height="12.27" viewBox="0 0 1200 1227" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M714.163 519.284L1160.89 0H1055.03L667.137 450.887L357.328 0H0L468.492 681.821L0 1226.37H105.866L515.491 750.218L842.672 1226.37H1200L714.137 519.284H714.163ZM569.165 687.828L521.697 619.934L144.011 79.6944H306.615L611.412 515.685L658.88 583.579L1055.08 1150.3H892.476L569.165 687.854V687.828Z"
                fill={theme === 'dark' ? '#fff' : '#000'}
              />
            </svg>
            <span className="tooltiptext right no-brake">{twitter}</span>
          </span>
        </a>
      </>
    )
  }

  const verifiedSign = (domainVerified, domain, options) => {
    if (!domainVerified || !domain) return ''
    return (
      <span className="tooltip">
        <a
          href={'https://' + domain + '/.well-known/' + (xahauNetwork ? 'xahau.toml' : 'xrp-ledger.toml')}
          target="_blank"
          rel="noreferrer"
        >
          <VerifiedIcon style={{ marginLeft: '5px' }} />
        </a>
        {(!options || options.tooltip !== false) && (
          <span className="tooltiptext right no-brake">
            {t('table.text.domain-verified-toml', { ns: 'validators' })}
          </span>
        )}
      </span>
    )
  }

  const tableWithVotes = (votes) => {
    return (
      <tbody>
        {votes.map((v, i) => (
          <tr key={v.publicKey}>
            <td className="center">{i + 1}</td>
            <td>
              <table style={{ minWidth: 130 }}>
                <tbody>
                  <tr className="no-border">
                    <td style={{ width: 40, height: 35, padding: 0 }}>
                      <Avatar src={avatarServer + v.publicKey} alt="avatar" />
                    </td>
                    <td style={{ padding: 0 }}>
                      {v.principals?.map((p, i) => (
                        <span key={i}>
                          {p.name && <b> {p.name}</b>}
                          {twitterLink(p.twitter || p.x)}
                          {i < v.principals.length - 1 && ', '}
                        </span>
                      ))}{' '}
                      {!v.principals?.length && shortHash(v.publicKey)} {displayFlag(v.ownerCountry, 'country')}
                      <br />
                      {v.domain ? (
                        <>
                          <a href={`https://${v.domain}`}>{v.domain}</a>
                          {verifiedSign(v.domainVerified, v.domain, { tooltip: false })}
                        </>
                      ) : v.domainLegacy ? (
                        <>
                          <a href={`https://${v.domainLegacy}`}>{v.domainLegacy}</a>
                          {verifiedSign(v.domainLegacyVerified, v.domainLegacy, { tooltip: false })}
                        </>
                      ) : (
                        shortHash(v.publicKey)
                      )}
                    </td>
                  </tr>
                </tbody>
              </table>
            </td>
          </tr>
        ))}
        {votes.length === 0 && (
          <tr>
            <td colSpan={2} className="center grey">
              No validators voting for this amendment.
            </td>
          </tr>
        )}
      </tbody>
    )
  }

  const obsolete = featureData?.vetoed === 'Obsolete'
  const showVotingData = !obsolete && status !== 'ENABLED'

  return (
    <>
      <SEO title={`Amendment: ${amendmentName}`} />
      <div className="content-text">
        <h1 className="center">{amendmentData?.name || amendmentName} amendment</h1>
        <p className="center">
          This page displays information for the <span className="bold">{amendmentData?.name || amendmentName}</span>{' '}
          amendment on the {explorerName}.
        </p>
        <NetworkPagesTab />
        {!initialErrorMessage ? (
          <>
            {windowWidth > 768 ? (
              <table className="table-large no-hover">
                <tbody>
                  <tr>
                    <td>
                      <b>Name:</b>
                    </td>
                    <td>
                      {amendmentData?.name || amendmentName} (
                      <a href={detailsUrl} target="_blank" rel="noreferrer">
                        read more
                      </a>
                      )
                    </td>
                    {!obsolete && threshold && (
                      <>
                        <td>
                          <b>Quorum:</b>
                        </td>
                        <td>{threshold}</td>
                      </>
                    )}
                  </tr>
                  <tr>
                    {amendmentId && (
                      <>
                        <td>
                          <b>Amendment ID:</b>
                        </td>
                        <td>
                          {shortHash(amendmentId)} <CopyButton text={amendmentId} />
                        </td>
                      </>
                    )}
                    {showVotingData && (
                      <>
                        <td>
                          <b>Voted Yes:</b>
                        </td>
                        <td>
                          <b className="green">{yeas.length}</b>
                        </td>
                      </>
                    )}
                  </tr>
                  <tr>
                    {introduced && (
                      <>
                        <td>
                          <b>Introduced in Version:</b>
                        </td>
                        <td>{introduced}</td>
                      </>
                    )}
                    {showVotingData && (
                      <>
                        <td>
                          <b>Voted No (or haven't voted yet):</b>
                        </td>
                        <td>
                          <b className="red">{nays.length}</b>
                        </td>
                      </>
                    )}
                  </tr>
                  <tr>
                    {eta && showVotingData && (
                      <>
                        <td>
                          <b>Activation ETA:</b>
                        </td>
                        <td>{eta}</td>
                      </>
                    )}
                    <td>{showVotingData ? <b>Consensus level:</b> : <b>Status</b>}</td>
                    <td>
                      {showVotingData ? (
                        <>
                          <span className="bold">{consensus}%</span> / 80%
                        </>
                      ) : (
                        <>
                          {amendmentData?.enabledAt ? (
                            <span className="green bold">
                              Enabled {timeFromNow(amendmentData.enabledAt, i18n)} (
                              {fullDateAndTime(amendmentData.enabledAt)}){' '}
                              <LinkTx tx={amendmentData?.txHash} icon={true} />
                            </span>
                          ) : (
                            <span className="red bold">Obsolete</span>
                          )}
                        </>
                      )}
                    </td>
                  </tr>
                </tbody>
              </table>
            ) : (
              <table className="table-large no-hover">
                <tbody>
                  <tr>
                    <td>
                      <b>Name:</b>
                    </td>
                    <td>
                      {amendmentData?.name || amendmentName} (
                      <a href={detailsUrl} target="_blank" rel="noreferrer">
                        read more
                      </a>
                      )
                    </td>
                  </tr>
                  {amendmentId && (
                    <tr>
                      <td>
                        <b>Amendment ID:</b>
                      </td>
                      <td>
                        {shortHash(amendmentId)} <CopyButton text={amendmentId} />
                      </td>
                    </tr>
                  )}
                  {introduced && (
                    <tr>
                      <td>
                        <b>Introduced in Version:</b>
                      </td>
                      <td>{introduced}</td>
                    </tr>
                  )}
                  {eta && showVotingData && (
                    <tr>
                      <td>
                        <b>Activation ETA:</b>
                      </td>
                      <td>{eta}</td>
                    </tr>
                  )}
                  {!obsolete && threshold && (
                    <tr>
                      <td>
                        <b>Quorum:</b>
                      </td>
                      <td>{threshold}</td>
                    </tr>
                  )}
                  {showVotingData && (
                    <tr>
                      <td>
                        <b>Voted Yes:</b>
                      </td>
                      <td>
                        <b className="green">{yeas.length}</b>
                      </td>
                    </tr>
                  )}
                  {showVotingData && (
                    <tr>
                      <td>
                        <b>Voted No (or haven't voted yet):</b>
                      </td>
                      <td>
                        <b className="red">{nays.length}</b>
                      </td>
                    </tr>
                  )}
                  <tr>
                    <td>
                      <b>{showVotingData ? 'Consensus level:' : 'Status:'}</b>
                    </td>
                    <td>
                      {showVotingData ? (
                        <span className="bold">{consensus}% / 80%</span>
                      ) : (
                        <>
                          {amendmentData?.enabledAt ? (
                            <span className="green bold">
                              Enabled {timeFromNow(amendmentData.enabledAt, i18n)}
                              <br />
                              {fullDateAndTime(amendmentData.enabledAt)}{' '}
                              <LinkTx tx={amendmentData?.txHash} icon={true} />
                            </span>
                          ) : (
                            <span className="red bold">Obsolete</span>
                          )}
                        </>
                      )}
                    </td>
                  </tr>
                </tbody>
              </table>
            )}
            {!showVotingData ? (
              <></>
            ) : (
              <>
                <br />
                {windowWidth > 768 ? (
                  <div className="grid grid-cols-2 gap-4 max-w-screen-lg mx-auto">
                    <div className="div-with-table">
                      <h4 className="center">
                        Voted <span className="green">Yes</span>
                      </h4>
                      <table className="table-large no-hover" style={{ minWidth: '100%' }}>
                        <thead>
                          <tr>
                            <th className="center">Index</th>
                            <th>Validator</th>
                          </tr>
                        </thead>
                        {tableWithVotes(yeas)}
                      </table>
                    </div>
                    <div className="div-with-table">
                      <h4 className="center">
                        Voted <span className="red">No</span> (or haven't voted yet)
                      </h4>
                      <table className="table-large no-hover" style={{ minWidth: '100%' }}>
                        <thead>
                          <tr>
                            <th className="center">Index</th>
                            <th>Validator</th>
                          </tr>
                        </thead>
                        {tableWithVotes(nays)}
                      </table>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-4">
                    <div className="div-with-table">
                      <h4 className="center">
                        Voted <span className="green">Yes</span>
                      </h4>
                      <table className="table-mobile w-full">
                        <thead>
                          <tr>
                            <th className="center">Index</th>
                            <th className="left">Validator</th>
                          </tr>
                        </thead>
                        {tableWithVotes(yeas)}
                      </table>
                    </div>
                    <div className="div-with-table">
                      <h4 className="center">
                        Voted <span className="red">No</span> (or haven't voted yet)
                      </h4>
                      <table className="table-mobile w-full">
                        <thead>
                          <tr>
                            <th className="center">Index</th>
                            <th className="left">Validator</th>
                          </tr>
                        </thead>
                        {tableWithVotes(nays)}
                      </table>
                    </div>
                  </div>
                )}
              </>
            )}
          </>
        ) : (
          <div className="center">
            <h2>Error loading amendment data</h2>
            <p>{initialErrorMessage}</p>
          </div>
        )}
      </div>
    </>
  )
}

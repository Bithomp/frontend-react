import { useTranslation } from 'next-i18next'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { useEffect, useState, memo } from 'react'
import { axiosServer, passHeaders } from '../../utils/axios'
import { getIsSsrMobile } from '../../utils/mobile'
import { shortHash, fullDateAndTime, timeFromNow } from '../../utils/format'
import { avatarServer, xahauNetwork, useWidth, countriesTranslated, devNet } from '../../utils'
import Image from 'next/image'
import SEO from '../../components/SEO'
import CopyButton from '../../components/UI/CopyButton'
import ReactCountryFlag from 'react-country-flag'
import { useTheme } from 'next-themes'
import VerifiedIcon from '../../public/images/verified.svg'

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
      (a) => a.name === amendmentName || a.amendment === amendmentName
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
    validators.forEach(v => { validatorMap[v.publicKey] = v })
    unlValidators.forEach(u => {
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

export default function AmendmentSummary({ amendmentName, amendmentData, featureData, validators, initialErrorMessage }) {
  const windowWidth = useWidth()
  const { t, i18n } = useTranslation()
  const theme = useTheme()
  const [countries, setCountries] = useState(null)
  const [yeas, setYeas] = useState([])
  const [nays, setNays] = useState([])

  useEffect(() => {
    if (validators) {
      const { yeas, nays } = splitValidatorsByAmendment(validators, amendmentName)
      setYeas(yeas)
      setNays(nays)
    }
  }, [validators, amendmentName])

  const amendmentId = amendmentData?.amendment || '-'
  const introduced = amendmentData?.introduced || '-'
  let threshold = '-'
  if (featureData && typeof featureData.threshold !== 'undefined' && typeof featureData.validations !== 'undefined') {
    threshold = `${featureData.threshold} / ${featureData.validations} votes`
  }
  const detailsUrl = `https://xrpl.org/known-amendments.html#${amendmentName.toLowerCase()}`
  const status = amendmentData?.enabled ? 'ENABLED' : 'NOT ENABLED'
  const activationDays = xahauNetwork ? 5 : 14
  const eta = amendmentData?.majority ? fullDateAndTime(amendmentData.majority + activationDays * 86400 + 903) : '-'
  const consensus = yeas.length + nays.length > 0 ? ((yeas.length / (yeas.length + nays.length)) * 100).toFixed(2) : '0.00'

  const showHash = (hash) => {
    return windowWidth > 1140 ? <>{hash} </> : <>{shortHash(hash)} </> 
  }
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

  const displayFlag = (country, typeName, em = 1.5) => {
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
  const showTime = ({ time }) => {
    if (!time) return 'N/A'
    return (
      <span className={Math.floor(Date.now() / 1000) - (devNet ? 40 : 10) > time ? 'red bold' : ''}>
        {timeFromNow(time - 1, i18n)}
      </span>
    )
  }

  const ShowTimeMemo = memo(showTime)

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

  return (
    <>
      <SEO title={`Amendment: ${amendmentName}`} />
      <div className="content-text">
        <h1 className="center">Amendment summary</h1>
        {!initialErrorMessage ? (
          <>
            <table className="table-large">
              <tbody>
                <tr>
                  <td><b>Name:</b></td>
                  <td>{amendmentData?.name || amendmentName}</td>
                  <td><b>Status:</b></td>
                  <td><span className={status === 'ENABLED' ? 'green bold' : 'red bold'}>{status}</span></td>
                </tr>
                <tr>
                  <td><b>Amendment ID:</b></td>
                  <td>{showHash(amendmentId)} <CopyButton text={amendmentId} /></td>
                  <td><b>Yeas:</b></td>
                  <td>{status !== 'ENABLED' ? yeas.length : '-'}</td>
                </tr>
                <tr>
                  <td><b>Introduced in:</b></td>
                  <td>{introduced}</td>
                  <td><b>Nays:</b></td>
                  <td>{status !== 'ENABLED' ? nays.length : '-'}</td>
                </tr>
                <tr>
                  <td><b>Threshold:</b></td>
                  <td>{threshold}</td>
                  <td><b>ETA:</b></td>
                  <td>{eta}</td>
                </tr>
                <tr>
                  <td><b>Details:</b></td>
                  <td><a href={detailsUrl} target="_blank" rel="noreferrer">{showHash(detailsUrl)} <CopyButton text={detailsUrl} /></a></td>
                  <td><b>Consensus:</b></td>
                  <td>{status !== 'ENABLED' ? <span style={{ background: '#e6f4ea', padding: '2px 8px', borderRadius: 4 }}>{consensus}%</span> : '-'}</td>
                </tr>
              </tbody>
            </table>
            {
              status !== 'ENABLED' && (
                <>
                  <br />
                  {windowWidth > 1100 ? (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="div-with-table">
                        <h4 className="center green">Yeas</h4>
                        <table className="table-large" style={{ minWidth: '100%' }}>
                          <thead>
                            <tr>
                              <th className="center">Index</th>
                              <th>Validator</th>
                              <th>Server</th>
                              <th>Last seen</th>
                            </tr>
                          </thead>
                          <tbody>
                            {yeas.map((v, i) => (
                              <tr key={v.publicKey}>
                                <td className="center">
                                  <Image alt="avatar" src={avatarServer + v.publicKey} width="35" height="35" />
                                  <br />
                                  {i + 1}
                                </td>
                                <td>
                                  {displayFlag(v.ownerCountry, 'owner-country')}
                                  {v.principals?.map((p, i) => (
                                    <span key={i}>
                                      {p.name && <b> {p.name}</b>}
                                      {twitterLink(p.twitter || p.x)} 
                                      <br />
                                    </span>
                                  ))}
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
                                <td>
                                  {displayFlag(v.serverCountry, 'server-country')} {v.serverVersion}
                                </td>
                                <td>
                                  <ShowTimeMemo time={v.lastSeenTime} />
                                </td>
                              </tr>
                            ))}
                            {yeas.length === 0 && (
                              <tr><td colSpan={2} className="center grey">No validators voting for this amendment.</td></tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                      <div className="div-with-table">
                        <h4 className="center red">Nays</h4>
                        <table className="table-large" style={{ minWidth: '100%' }}>
                          <thead>
                            <tr>
                              <th className="center">Index</th>
                              <th>Validator</th>
                              <th>Server</th>
                              <th>Last seen</th>
                            </tr>
                          </thead>
                          <tbody>
                            {nays.map((v, i) => (
                              <tr key={v.publicKey}>
                                <td className="center">
                                  <Image alt="avatar" src={avatarServer + v.publicKey} width="35" height="35" />
                                  <br />
                                  {i + 1}
                                </td>
                                <td>
                                  {displayFlag(v.ownerCountry, 'owner-country')} {v.ownerCountry && ' '}
                                  {v.principals?.map((p, i) => (
                                    <span key={i}>
                                      {p.name && <b> {p.name}</b>}
                                      {twitterLink(p.twitter || p.x)}
                                      <br />
                                    </span>
                                  ))}
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
                                <td>
                                  {displayFlag(v.serverCountry, 'server-country')} {v.serverVersion}
                                </td>
                                <td>
                                  <ShowTimeMemo time={v.lastSeenTime} />
                                </td>
                              </tr>
                            ))}
                            {nays.length === 0 && (
                              <tr><td colSpan={2} className="center grey">No validators voting against or not voting.</td></tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ) : windowWidth > 768 ? (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="div-with-table">
                        <h4 className="center green">Yeas</h4>
                        <table className="table-large" style={{ minWidth: '100%' }}>
                          <thead>
                            <tr>
                              <th className="center">Index</th>
                              <th>Validator</th>
                            </tr>
                          </thead>
                          <tbody>
                            {yeas.map((v, i) => (
                              <tr key={v.publicKey}>
                                <td className="center">
                                  <Image alt="avatar" src={avatarServer + v.publicKey} width="35" height="35" />
                                  <br />
                                  {i + 1}
                                </td>
                                <td>
                                  {displayFlag(v.ownerCountry, 'owner-country')}
                                  {v.principals?.map((p, i) => (
                                    <span key={i}>
                                      {p.name && <b> {p.name}</b>}
                                      {twitterLink(p.twitter || p.x)} 
                                      <br />
                                    </span>
                                  ))}
                                  {v.domain ? (
                                    <>
                                      Domain: 
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
                                  <br />
                                  Server: {displayFlag(v.serverCountry, 'server-country')} {v.serverVersion}
                                  <br />
                                  Last seen: <ShowTimeMemo time={v.lastSeenTime} />
                                </td>
                              </tr>
                            ))}
                            {yeas.length === 0 && (
                              <tr><td colSpan={2} className="center grey">No validators voting for this amendment.</td></tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                      <div className="div-with-table">
                        <h4 className="center red">Nays</h4>
                        <table className="table-large" style={{ minWidth: '100%' }}>
                          <thead>
                            <tr>
                              <th className="center">Index</th>
                              <th>Validator</th>
                            </tr>
                          </thead>
                          <tbody>
                            {nays.map((v, i) => (
                              <tr key={v.publicKey}>
                                <td className="center">
                                  <Image alt="avatar" src={avatarServer + v.publicKey} width="35" height="35" />
                                  <br />
                                  {i + 1}
                                </td>
                                <td>
                                  {displayFlag(v.ownerCountry, 'owner-country')} {v.ownerCountry && ' '}
                                  {v.principals?.map((p, i) => (
                                    <span key={i}>
                                      {p.name && <b> {p.name}</b>}
                                      {twitterLink(p.twitter || p.x)}
                                      <br />
                                    </span>
                                  ))}
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
                                  <br />
                                  Server: {displayFlag(v.serverCountry, 'server-country')} {v.serverVersion}
                                  <br />
                                  Last seen: <ShowTimeMemo time={v.lastSeenTime} />
                                </td>
                              </tr>
                            ))}
                            {nays.length === 0 && (
                              <tr><td colSpan={2} className="center grey">No validators voting against or not voting.</td></tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ) : (
                      <div className="grid grid-cols-1 gap-4">
                        <div className="div-with-table">
                          <h4 className="center green">Yeas</h4>
                          <table className="table-mobile w-full">
                            <thead>
                              <tr>
                                <th className="center">Index</th>
                                <th className="left">Validator</th>
                              </tr>
                            </thead>
                            <tbody>
                              {yeas.map((v, i) => (
                                <tr key={v.publicKey} className="py-2">
                                  <td className="center">
                                    <Image alt="avatar" src={avatarServer + v.publicKey} width="35" height="35" />
                                    <br />
                                    {i + 1}
                                  </td>
                                  <td>
                                    {displayFlag(v.ownerCountry, 'owner-country')}
                                    {v.principals?.map((p, i) => (
                                      <span key={i}>
                                        {p.name && <b> {p.name}</b>}
                                        {twitterLink(p.twitter || p.x)} 
                                        <br />
                                      </span>
                                    ))}
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
                                    <br />
                                    Server: {displayFlag(v.serverCountry, 'server-country')} {v.serverVersion}
                                    <br />
                                    Last seen: <ShowTimeMemo time={v.lastSeenTime} />
                                  </td>                                 
                                </tr>
                              ))}
                              {yeas.length === 0 && (
                                <tr><td colSpan={2} className="center grey">No validators voting for this amendment.</td></tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                        <div className="div-with-table">
                          <h4 className="center red">Nays</h4>
                          <table className="table-mobile w-full">
                            <thead>
                              <tr>
                                <th className="center">Index</th>
                                <th className="left">Validator</th>
                              </tr>
                            </thead>
                            <tbody>
                              {nays.map((v, i) => (
                                <tr key={v.publicKey}>
                                  <td className="center">
                                    <Image alt="avatar" src={avatarServer + v.publicKey} width="35" height="35" />
                                    <br />
                                    {i + 1}
                                  </td>
                                  <td>
                                    {displayFlag(v.ownerCountry, 'owner-country')} {v.ownerCountry && ' '}
                                    {v.principals?.map((p, i) => (
                                      <span key={i}>
                                        {p.name && <b> {p.name}</b>}
                                        {twitterLink(p.twitter || p.x)}
                                        <br />
                                      </span>
                                    ))}
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
                                    <br />
                                    Server: {displayFlag(v.serverCountry, 'server-country')} {v.serverVersion}
                                    <br />
                                    Last seen: <ShowTimeMemo time={v.lastSeenTime} />
                                  </td>
                                </tr>
                              ))}
                              {nays.length === 0 && (
                                <tr><td colSpan={2} className="center grey">No validators voting against or not voting.</td></tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>                      
                  )}                  
                </>
              )
            }
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

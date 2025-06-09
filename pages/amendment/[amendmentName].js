import { useTranslation } from 'next-i18next'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { useEffect, useState } from 'react'
import { axiosServer, passHeaders } from '../../utils/axios'
import { getIsSsrMobile } from '../../utils/mobile'
import { shortHash, fullDateAndTime } from '../../utils/format'
import { avatarServer, xahauNetwork, useWidth } from '../../utils'
import Image from 'next/image'
import SEO from '../../components/SEO'
import CopyButton from '../../components/UI/CopyButton'

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
  const { t } = useTranslation()
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
                  <td>{yeas.length}</td>
                </tr>
                <tr>
                  <td><b>Introduced in:</b></td>
                  <td>{introduced}</td>
                  <td><b>Nays:</b></td>
                  <td>{nays.length}</td>
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
                  <td><span style={{ background: '#e6f4ea', padding: '2px 8px', borderRadius: 4 }}>{consensus}%</span></td>
                </tr>
              </tbody>
            </table>
            <br />
            <div className="flex flex-center">
              <div className="div-with-table">
                <h4 className="center green">Yeas</h4>
                <table className="table-large">
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
                          {v.domain ? (
                            <a href={`https://${v.domain}`}>{v.domain}</a>
                          ) : v.domainLegacy ? (
                            <a href={`https://${v.domainLegacy}`}>{v.domainLegacy}</a>
                          ) : (
                            shortHash(v.publicKey)
                          )}
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
                <table className="table-large">
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
                          {v.domain ? (
                            <a href={`https://${v.domain}`}>{v.domain}</a>
                          ) : v.domainLegacy ? (
                            <a href={`https://${v.domainLegacy}`}>{v.domainLegacy}</a>
                          ) : (
                            shortHash(v.publicKey)
                          )}
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

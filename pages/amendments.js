import { useTranslation } from 'next-i18next'
import { useState, useEffect, useRef } from 'react'
import axios from 'axios'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'

import { fullDateAndTime, shortHash, timeOrDate } from '../utils/format'
import { shortName, useWidth, xahauNetwork } from '../utils'
import { getIsSsrMobile } from '../utils/mobile'
import { axiosServer, passHeaders } from '../utils/axios'

import SEO from '../components/SEO'
import CopyButton from '../components/UI/CopyButton'
import Link from 'next/link'
import NetworkPagesTab from '../components/Tabs/NetworkPagesTabs'
import { LinkTx } from '../utils/links'

export const getServerSideProps = async (context) => {
  const { locale, req } = context

  let initialData = null
  let initialErrorMessage = null

  try {
    const response = await axiosServer({
      method: 'get',
      url: 'v2/amendment',
      headers: passHeaders(req)
    }).catch((error) => {
      initialErrorMessage = error.message
    })

    const response2 = await axiosServer({
      method: 'get',
      url: 'v2/features',
      headers: passHeaders(req)
    }).catch((error) => {
      initialErrorMessage = initialErrorMessage || error.message
    })

    if (response?.data) {
      initialData = {
        amendments: response.data,
        features: response2?.data || null
      }
    } else {
      initialErrorMessage = initialErrorMessage || 'Amendments not found'
    }
  } catch (error) {
    console.error(error)
  }

  return {
    props: {
      isSsrMobile: getIsSsrMobile(context),
      initialData: initialData || null,
      initialErrorMessage: initialErrorMessage || '',
      ...(await serverSideTranslations(locale, ['common', 'amendments']))
    }
  }
}

const amendmentLink = (a, options) => {
  let name = options?.short ? shortName(a.name, { maxLength: xahauNetwork ? 12 : 18 }) : a.name
  return <Link href={'amendment/' + (name || a.amendment)}>{name || shortHash(a.amendment)}</Link>
}

export default function Amendment({ initialData, initialErrorMessage, isSsrMobile }) {
  const windowWidth = useWidth()
  const { t } = useTranslation()
  const [majorityAmendments, setMajorityAmendments] = useState(null)
  const [enabledAmendments, setEnabledAmendments] = useState(null)
  const [newAmendments, setNewAmendments] = useState(null)
  const [obsoleteAmendments, setObsoleteAmendments] = useState(null)
  const [notAvailableAmendments, setNotAvailableAmendments] = useState(null)

  const [loadedFeatures, setLoadedFeatures] = useState(false)
  const [validations, setValidations] = useState(null)
  const [threshold, setThreshold] = useState(null)
  const [errorMessage] = useState(
    t(`error.${initialErrorMessage}`, { defaultValue: initialErrorMessage }) || ''
  )

  const initialProcessedRef = useRef(false)

  const applyData = (data, featuresData) => {
    let disabled = [] //withoutMajourity
    let enabled = []
    let majority = []

    if (data) {
      for (let i = 0; i < data.length; i++) {
        if (data[i].enabled) {
          enabled.push(data[i])
        } else if (!!data[i].majority) {
          majority.push(data[i])
        } else {
          disabled.push(data[i])
        }
      }
      setMajorityAmendments(majority)
      //sort enabled by enabledLedgerIndex with higher on top (so most recent first), non-empty first
      enabled.sort((a, b) => {
        if (a.enabledLedgerIndex == null && b.enabledLedgerIndex == null) return 0
        if (a.enabledLedgerIndex == null) return 1 // a has no data → move down
        if (b.enabledLedgerIndex == null) return -1 // b has no data → move down
        return b.enabledLedgerIndex - a.enabledLedgerIndex // sort descending
      })
      setEnabledAmendments(enabled)
    }

    const newdata = featuresData
    if (newdata?.result?.features) {
      setLoadedFeatures(true)
      const features = newdata.result.features

      let voting = [] // the list of amendments that are voting

      Object.keys(features).forEach((key) => {
        if (!features[key].enabled && features[key].vetoed !== 'Obsolete') {
          voting.push(key)
          setValidations(features[key].validations)
          setThreshold(features[key].threshold)
        }
      })

      //add possible missing names and vetoed status (obsolete)
      for (let i = 0; i < disabled.length; i++) {
        if (features[disabled[i].amendment]) {
          disabled[i].name = features[disabled[i].amendment].name
          disabled[i].vetoed = features[disabled[i].amendment].vetoed
          disabled[i].count = features[disabled[i].amendment].count
        }
      }

      //add possible missing names
      for (let i = 0; i < enabled.length; i++) {
        if (features[enabled[i].amendment]) {
          enabled[i].name = features[enabled[i].amendment].name
        }
      }

      //add possible missing names and count
      for (let i = 0; i < majority.length; i++) {
        if (features[majority[i].amendment]) {
          majority[i].name = features[majority[i].amendment].name
          majority[i].count = features[majority[i].amendment].count
        }
      }

      let obsoleteArray = []
      let newArray = []
      let notAvailableArray = []

      //split disabled (without majourity) to new and obsolete
      for (let i = 0; i < disabled.length; i++) {
        if (disabled[i].vetoed === 'Obsolete') {
          obsoleteArray.push(disabled[i])
        } else if (voting.includes(disabled[i].amendment)) {
          newArray.push(disabled[i])
        } else {
          notAvailableArray.push(disabled[i])
        }
      }

      //with more votes on top
      newArray.sort((a, b) => (a.count > b.count ? -1 : 1))

      setNotAvailableAmendments(notAvailableArray)
      setObsoleteAmendments(obsoleteArray)
      setNewAmendments(newArray)
      setEnabledAmendments(enabled)
      setMajorityAmendments(majority)
    }
  }

  const checkApi = async () => {
    if (initialData) return
    const response = await axios('v2/amendment')
    const data = response.data

    const response2 = await axios('v2/features')
    const newdata = response2.data

    applyData(data, newdata)
  }

  /*
  [
    {
      "amendment": "DF8B4536989BDACE3F934F29423848B9F1D76D09BE6A1FCFE7E7F06AA26ABEAD",
      "name": "fixRemoveNFTokenAutoTrustLine",
      "enabled": false,
      "supported": true,
      "vetoed": false,
      "introduced": "1.9.4",
      "majority": 1663892802
    }
  ]
  */

  useEffect(() => {
    if (!initialProcessedRef.current && initialData) {
      applyData(initialData.amendments, initialData.features)
      initialProcessedRef.current = true
      return
    }
    checkApi()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const showHash = (hash) => {
    const width = windowWidth || (isSsrMobile ? 600 : 1200)
    return width > 1140 ? <>{hash} </> : width > 800 ? <>{shortHash(hash)} </> : ''
  }

  const activationDays = xahauNetwork ? 5 : 14

  return (
    <>
      <SEO
        title={t('menu.network.amendments')}
        image={{
          width: 1200,
          height: 630,
          file: 'previews/1200x630/amendments.png'
        }}
        twitterImage={{ file: 'previews/630x630/amendments.png' }}
      />
      <div className="content-text">
        <h1 className="center">{t('menu.network.amendments')}</h1>
        <NetworkPagesTab tab="amendments" />
        {errorMessage ? (
          <div className="center orange bold" style={{ marginTop: 20 }}>
            {errorMessage}
          </div>
        ) : null}
        {majorityAmendments?.length > 0 && (
          <>
            <h2 className="center">{t('soon', { ns: 'amendments' })}</h2>
            <table className="table-large">
              <thead>
                <tr>
                  <th className="center">{t('table.index')}</th>
                  <th>{t('table.name')}</th>
                  <th>{t('majority', { ns: 'amendments' })}</th>
                  <th>{t('eta', { ns: 'amendments' })}</th>
                  <th className="right">
                    {threshold} / {validations}
                  </th>
                  <th className="right">{t('table.version')}</th>
                  <th className="right">{t('table.hash')}</th>
                </tr>
              </thead>
              <tbody>
                {majorityAmendments.map((a, i) => (
                  <tr key={a.amendment}>
                    <td className="center">{i + 1}</td>
                    <td className="brake">{amendmentLink(a)}</td>
                    <td>{fullDateAndTime(a.majority)}</td>
                    <td>{fullDateAndTime(a.majority + activationDays * 86400 + 903)}</td>
                    <td className="right">{a.count > threshold ? <b className="green">{a.count}</b> : a.count}</td>
                    <td className="right">{a.introduced}</td>
                    <td className="right">
                      {showHash(a.amendment)}
                      <CopyButton text={a.amendment} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
        {loadedFeatures && newAmendments?.length > 0 && (
          <>
            <h2 className="center">{t('new', { ns: 'amendments' })}</h2>
            <table className="table-large">
              <thead>
                <tr>
                  <th className="center">{t('table.index')}</th>
                  <th>{t('table.name')}</th>
                  <th className="right">
                    {threshold} / {validations}
                  </th>
                  <th className="right">{t('table.version')}</th>
                  <th className="right">{t('table.hash')}</th>
                </tr>
              </thead>
              <tbody>
                {newAmendments.map((a, i) => (
                  <tr key={a.amendment}>
                    <td className="center">{i + 1}</td>
                    <td>{amendmentLink(a)}</td>
                    <td className="right">{a.count > threshold ? <b className="green">{a.count}</b> : a.count}</td>
                    <td className="right">{a.introduced}</td>
                    <td className="right">
                      {showHash(a.amendment)}
                      <CopyButton text={a.amendment} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
        {enabledAmendments?.length > 0 && (
          <>
            <h2 className="center">{t('enabled', { ns: 'amendments' })}</h2>
            <table className="table-large">
              <thead>
                <tr>
                  <th className="center">{t('table.index')}</th>
                  <th>Enabled</th>
                  <th>{t('table.name')}</th>
                  <th className="right">{t('table.version')}</th>
                  <th className="right">{t('table.hash')}</th>
                </tr>
              </thead>
              <tbody>
                {enabledAmendments.map((a, i) => (
                  <tr key={a.amendment}>
                    <td className="center">{i + 1}</td>
                    <td>
                      {timeOrDate(a.enabledAt)} <LinkTx tx={a.txHash} icon={true} />
                    </td>
                    <td>{amendmentLink(a, { short: windowWidth < 1140 })}</td>
                    <td className="right">{a.introduced}</td>
                    <td className="right">
                      {showHash(a.amendment)}
                      <CopyButton text={a.amendment} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}

        {obsoleteAmendments?.length > 0 && (
          <>
            <h2 className="center">{t('obsolete', { ns: 'amendments' })}</h2>
            <table className="table-large">
              <thead>
                <tr>
                  <th className="center">{t('table.index')}</th>
                  <th>{t('table.name')}</th>
                  <th className="right">{t('table.version')}</th>
                  <th className="right">{t('table.hash')}</th>
                </tr>
              </thead>
              <tbody>
                {obsoleteAmendments.map((a, i) => (
                  <tr key={a.amendment}>
                    <td className="center">{i + 1}</td>
                    <td>{amendmentLink(a)}</td>
                    <td className="right">{a.introduced}</td>
                    <td className="right">
                      {showHash(a.amendment)}
                      <CopyButton text={a.amendment} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}

        {loadedFeatures && notAvailableAmendments?.length > 0 && (
          <>
            <h2 className="center">{t('not-available', { ns: 'amendments' })}</h2>
            <table className="table-large">
              <thead>
                <tr>
                  <th className="center">{t('table.index')}</th>
                  <th>{t('table.name')}</th>
                  <th className="right">{t('table.hash')}</th>
                </tr>
              </thead>
              <tbody>
                {notAvailableAmendments.map((a, i) => (
                  <tr key={a.amendment}>
                    <td className="center">{i + 1}</td>
                    <td className="brake">{amendmentLink(a)}</td>
                    <td className="right">
                      {showHash(a.amendment)}
                      <CopyButton text={a.amendment} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </div>
    </>
  )
}

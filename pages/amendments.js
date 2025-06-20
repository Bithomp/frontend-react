import { useTranslation } from 'next-i18next'
import { useState, useEffect } from 'react'
import axios from 'axios'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'

import { fullDateAndTime, shortHash } from '../utils/format'
import { useWidth, xahauNetwork } from '../utils'
import { getIsSsrMobile } from '../utils/mobile'

import SEO from '../components/SEO'
import CopyButton from '../components/UI/CopyButton'
import Link from 'next/link'
import NetworkPagesTab from '../components/Tabs/NetworkPagesTabs'

import LinkIcon from '../public/images/link.svg'

export const getServerSideProps = async (context) => {
  const { locale } = context
  return {
    props: {
      isSsrMobile: getIsSsrMobile(context),
      ...(await serverSideTranslations(locale, ['common', 'amendments']))
    }
  }
}

const amendmentLink = (a) => {
  if (a.name) {
    if (a.introduced && !xahauNetwork) {
      return <a href={'https://xrpl.org/known-amendments.html#' + a.name.toLowerCase()}>{a.name}</a>
    }
    return a.name
  }
  return shortHash(a.amendment)
}

export default function Amendment() {
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

  const checkApi = async () => {
    const response = await axios('v2/amendment')
    const data = response.data //.sort(a => (!a.introduced) ? -1 : 1) // empty versions on top

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
      setEnabledAmendments(enabled)
    }

    const response2 = await axios('v2/features')
    //here 1) we can get names for sure
    //split disabled to new (withMajority and Without Majourity) and obsolete
    let newdata = response2.data
    if (newdata.result?.features) {
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
    checkApi()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const showHash = (hash) => {
    return windowWidth > 1140 ? <>{hash} </> : windowWidth > 800 ? <>{shortHash(hash)} </> : ''
  }

  const activationDays = xahauNetwork ? 5 : 14

  return (
    <>
      <SEO
        title={t('menu.network.amendments')}
        images={[
          {
            width: 1200,
            height: 630,
            file: 'previews/1200x630/amendments.png'
          },
          {
            width: 630,
            height: 630,
            file: 'previews/630x630/amendments.png'
          }
        ]}
      />
      <div className="content-text">
        <h1 className="center">{t('menu.network.amendments')}</h1>
        <NetworkPagesTab tab="amendments" />
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
                    <td className="right">
                      {a.count > threshold ? <b className="green">{a.count}</b> : a.count}{' '}
                      <Link href={'/validators?amendment=' + a.name}>
                        <LinkIcon />
                      </Link>
                    </td>
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
                    <td className="right">
                      {a.count > threshold ? <b className="green">{a.count}</b> : a.count}{' '}
                      <Link href={'/validators?amendment=' + a.name}>
                        <LinkIcon />
                      </Link>
                    </td>
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
                  <th>{t('table.name')}</th>
                  <th className="right">{t('table.version')}</th>
                  <th className="right">{t('table.hash')}</th>
                </tr>
              </thead>
              <tbody>
                {enabledAmendments.map((a, i) => (
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

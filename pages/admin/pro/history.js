import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { useTranslation } from 'next-i18next'

import { getIsSsrMobile } from '../../../utils/mobile'
import AdminTabs from '../../../components/Tabs/AdminTabs'
import { axiosAdmin } from '../../../utils/axios'

import SEO from '../../../components/SEO'
import { useWidth } from '../../../utils'
import { addressLink, amountFormat, fullDateAndTime, txIdLink } from '../../../utils/format'
import ProTabs from '../../../components/Tabs/ProTabs'
import { crawlerStatus } from '../../../utils/pro'
import CheckBox from '../../../components/UI/CheckBox'

export const getServerSideProps = async (context) => {
  const { locale, query } = context
  const { address } = query
  return {
    props: {
      queryAddress: address || '',
      isSsrMobile: getIsSsrMobile(context),
      ...(await serverSideTranslations(locale, ['common', 'admin']))
    }
  }
}

const showAmount = (amount) => {
  if (!amount) return ''
  let positive = null
  if (amount.issuer) {
    positive = amount.value > 0
  } else {
    positive = Number(amount) > 0
  }
  return <span className={positive ? 'green' : 'red'}>{amountFormat(amount)}</span>
}

const showFiat = (fiat) => {
  if (!fiat) return ''
  let positive = fiat > 0
  let options = {
    //maximumSignificantDigits: 10,
    maximumFractionDigits: 6
  }
  return <span className={positive ? 'green' : 'red'}>{Number(fiat).toLocaleString(undefined, options)}</span>
}

import { GiReceiveMoney } from 'react-icons/gi'
import { GiPayMoney } from 'react-icons/gi'
import { RiNftFill } from 'react-icons/ri'
import { CiSettings } from 'react-icons/ci'
import { CiLink } from 'react-icons/ci'
import { CiFileOn } from 'react-icons/ci'

const typeToIcon = (type, direction) => {
  let icon = null
  if (type === 'Payment') {
    icon = direction === 'sent' ? <GiPayMoney /> : <GiReceiveMoney />
  } else if (type.includes('NFT')) {
    icon = <RiNftFill />
  } else if (type === 'AccountSet') {
    icon = <CiSettings />
  } else if (type === 'TrustSet') {
    icon = <CiLink />
  } else {
    icon = <CiFileOn />
  }

  return (
    <span className="tooltip">
      <span style={{ fontSize: '20px' }}>{icon}</span>
      <span className="tooltiptext">
        {type}
        {type === 'Payment' ? ' ' + direction : ''}
      </span>
    </span>
  )
}

export default function History({ account, setAccount, queryAddress, selectedCurrency }) {
  const router = useRouter()
  const width = useWidth()

  const { t } = useTranslation(['common', 'admin'])
  const [errorMessage, setErrorMessage] = useState('')
  const [data, setData] = useState(null)
  const [activities, setActivities] = useState([])
  const [loading, setLoading] = useState(false)
  const [loadingVerifiedAddresses, setLoadingVerifiedAddresses] = useState(false)
  const [verifiedAddresses, setVerifiedAddresses] = useState([])
  const [addressesToCheck, setAddressesToCheck] = useState(queryAddress ? [queryAddress] : [])

  const getProAddressHistory = async () => {
    if (addressesToCheck.length === 0) return
    setLoading(true)
    const response = await axiosAdmin
      .get('user/addresses/activities?convertCurrency=' + selectedCurrency + '&addresses=' + addressesToCheck)
      .catch((error) => {
        setLoading(false)
        if (error.response?.data?.error === 'errors.token.required') {
          onLogOut()
          return
        }
        if (error && error.message !== 'canceled') {
          setErrorMessage(t(error.response?.data?.error || 'error.' + error.message))
        }
      })
    setLoading(false)
    const data = response?.data
    /*
      {
        "total": 414,
        "count": 200,
        "marker": "200",
        "activities": [
          {
            "address": "raNf8ibQZECTaiFqkDXKRmM2GfdWK76cSu",
            "timestamp": 1677327372,
            "ledgerIndex": 78035481,
            "txIndex": 5,
            "hash": "1C463FA4DC1D14C2A5890F39A3120946EB1F44EECC0C752C1E0194B8677B6F12",
            "direction": "sent",
            "txType": "TrustSet",
            "counterparty": null,
            "st": null,
            "dt": null,
            "currency": "XRP",
            "amount": "-0.000012",
            "amountNative": "-0.000012",
            "amountInFiats": {
              "aed": "-0.0000167092330343814396",
    */
    if (data) {
      setData(data) // for stats data, may we need extract only some fields
      setActivities(data.activities) // add more data by pages
    }
  }

  const onLogOut = () => {
    localStorage.removeItem('sessionToken')
    setAccount({ ...account, pro: null })
    setErrorMessage('')
  }

  const getVerifiedAddresses = async () => {
    setLoadingVerifiedAddresses(true)
    const response = await axiosAdmin.get('user/addresses').catch((error) => {
      setLoadingVerifiedAddresses(false)
      if (error.response?.data?.error === 'errors.token.required') {
        onLogOut()
        return
      }
      if (error && error.message !== 'canceled') {
        setErrorMessage(t(error.response?.data?.error || 'error.' + error.message))
      }
    })
    setLoadingVerifiedAddresses(false)
    const data = response?.data
    /*
      {
        "total": 1,
        "count": 1,
        "addresses": [
          {
            "id": 28,
            "createdAt": 1721741550,
            "address": "raN6cSu",
            "name": "vasia",
            "crawler": {
              "status": "queued",
              "createdAt": 1728212999,
              "updatedAt": 1728212999,
              "lastCrawledAt": null,
              "firstLedgerIndex": null,
              "currentLedgerIndex": null,
              "lastLedgerIndex": null
            }
          }
        ]
      }
    */
    setVerifiedAddresses(data?.addresses)
  }

  useEffect(() => {
    const sessionToken = localStorage.getItem('sessionToken')
    if (!sessionToken) {
      router.push('/admin')
    } else {
      axiosAdmin.defaults.headers.common['Authorization'] = 'Bearer ' + sessionToken
      setErrorMessage('')
    }
    getVerifiedAddresses()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    getProAddressHistory()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addressesToCheck, selectedCurrency])

  return (
    <>
      <SEO title="Pro address: history" />
      <div className="page-admin content-center">
        <h1 className="center">Pro address balances history</h1>

        <AdminTabs name="mainTabs" tab="pro" />

        <ProTabs tab="balance-changes" />

        <h4 className="center">Balances history</h4>

        <table className="table-large no-hover">
          <thead>
            <tr>
              <th className="center">Include</th>
              <th className="left">Address</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {verifiedAddresses?.length > 0 ? (
              <>
                {verifiedAddresses.map((address, i) => (
                  <tr key={i}>
                    <td>
                      <CheckBox
                        checked={addressesToCheck.includes(address.address)}
                        setChecked={() => {
                          setAddressesToCheck(
                            addressesToCheck.includes(address.address)
                              ? addressesToCheck.filter((a) => a !== address.address)
                              : [...addressesToCheck, address.address]
                          )
                        }}
                        style={{ height: '23px', width: '23px', margin: 'auto', padding: 0 }}
                      />
                    </td>
                    <td className="left">
                      <b className="orange">{address.name}</b>
                      <br />
                      {addressLink(address.address)}
                    </td>
                    <td>{crawlerStatus(address.crawler)}</td>
                  </tr>
                ))}
              </>
            ) : (
              <tr>
                <td colSpan="100" className="center">
                  {loadingVerifiedAddresses ? 'Loading data...' : 'You do not have verified addresses yet.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {addressesToCheck.length > 0 && (
          <>
            <p className="center">
              Showing {data?.count || 'xxx'} balance changes from {data?.total || 'xxx'} total.
            </p>

            {!width || width > 750 ? (
              <table className="table-large">
                <thead>
                  <tr>
                    <th className="center">#</th>
                    <th>Timestamp</th>
                    <th className="center">Type</th>
                    <th className="right">Ledger Amount</th>
                    <th suppressHydrationWarning className="right">
                      {selectedCurrency.toUpperCase()} equavalent
                    </th>
                    <th>Tx</th>
                  </tr>
                </thead>
                <tbody>
                  {activities?.length > 0 ? (
                    <>
                      {activities.map((a, i) => (
                        <tr key={i}>
                          <td className="center">{i + 1}</td>
                          <td>{fullDateAndTime(a.timestamp)}</td>
                          <td className="center">{typeToIcon(a.txType, a.direction)}</td>
                          <td className="right">{showAmount(a.amount)}</td>
                          <td className="right">{showFiat(a.amountInFiats[selectedCurrency])}</td>
                          <td>{txIdLink(a.hash, 0)}</td>
                        </tr>
                      ))}
                    </>
                  ) : (
                    <tr>
                      <td colSpan="100" className="center">
                        {loading ? 'Loading data...' : 'You do not have verified addresses yet.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            ) : (
              <table className="table-mobile">
                <tbody>
                  {activities?.length > 0 ? (
                    <>
                      {activities.map((a, i) => (
                        <tr key={i}>
                          <td style={{ padding: '5px' }}>#{i + 1}</td>
                          <td>
                            <p>
                              Timestamp: <b>{fullDateAndTime(a.timestamp)}</b>
                            </p>
                            <p>Type: {a.txType}</p>
                            <p>
                              Ledger Amount: <b>{showAmount(a.amount)}</b>
                            </p>
                            <p>
                              {selectedCurrency.toUpperCase()} equavalent: {showFiat(a.amountInFiats[selectedCurrency])}
                            </p>
                            <p>Tx: {txIdLink(a.hash, 0)}</p>
                          </td>
                        </tr>
                      ))}
                    </>
                  ) : (
                    <tr>
                      <td colSpan="100" className="center">
                        {loading ? 'Loading data...' : 'You do not have verified addresses yet.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </>
        )}
        <br />
        <br />
        {errorMessage ? <div className="center orange bold">{errorMessage}</div> : <br />}
      </div>
    </>
  )
}

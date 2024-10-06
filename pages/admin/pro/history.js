import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { useTranslation } from 'next-i18next'

import { getIsSsrMobile } from '../../../utils/mobile'
import AdminTabs from '../../../components/Tabs/AdminTabs'
import { axiosAdmin } from '../../../utils/axios'

import SEO from '../../../components/SEO'
import { useWidth } from '../../../utils'
import { fullDateAndTime, txIdLink } from '../../../utils/format'

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

export default function History({ account, setAccount, queryAddress, selectedCurrency }) {
  const router = useRouter()
  const width = useWidth()

  const { t } = useTranslation(['common', 'admin'])
  const [errorMessage, setErrorMessage] = useState('')
  const [data, setData] = useState(null)
  const [activities, setActivities] = useState([])
  const [loading, setLoading] = useState(false)

  const getProAddressHistory = async () => {
    setLoading(true)
    const response = await axiosAdmin.get('user/address/' + queryAddress + '/activities').catch((error) => {
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

  useEffect(() => {
    const sessionToken = localStorage.getItem('sessionToken')
    if (!sessionToken) {
      router.push('/admin')
    } else {
      axiosAdmin.defaults.headers.common['Authorization'] = 'Bearer ' + sessionToken
      setErrorMessage('')
    }
    getProAddressHistory()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const onLogOut = () => {
    localStorage.removeItem('sessionToken')
    setAccount({ ...account, pro: null })
    setErrorMessage('')
  }

  return (
    <>
      <SEO title="Pro address: history" />
      <div className="page-admin content-center">
        <h1 className="center">Pro address balances history</h1>

        <AdminTabs name="mainTabs" tab="pro" />

        <h4 className="center">Balances history</h4>

        <p className="center">
          Showing {data?.count || 'xxx'} balance changes from {data?.total || 'xxx'} total.
        </p>

        {!width || width > 750 ? (
          <table className="table-large">
            <thead>
              <tr>
                <th className="center">#</th>
                <th>Timestamp</th>
                <th>Tx Type</th>
                <th>Ledger Amount</th>
                <th>{selectedCurrency.toUpperCase()} equavalent</th>
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
                      <td>{a.txType}</td>
                      <td>
                        {a.amount} {/* a.currency */}
                      </td>
                      <td>{a.amountInFiats[selectedCurrency]}</td>
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
                        <p>Tx Type: {a.txType}</p>
                        <p>
                          Ledger Amount: <b>{a.amount}</b>
                        </p>
                        <p>
                          {selectedCurrency.toUpperCase()} equavalent: {a.amountInFiats[selectedCurrency]}
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
        <br />
        <br />
        {errorMessage ? <div className="center orange bold">{errorMessage}</div> : <br />}
      </div>
    </>
  )
}

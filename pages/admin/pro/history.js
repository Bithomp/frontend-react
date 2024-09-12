import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { useTranslation } from 'next-i18next'

import { getIsSsrMobile } from '../../../utils/mobile'
import AdminTabs from '../../../components/Tabs/AdminTabs'
import { axiosAdmin } from '../../../utils/axios'

import SEO from '../../../components/SEO'
import { useWidth } from '../../../utils'
import { fullDateAndTime } from '../../../utils/format'

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

export default function History({ account, setAccount, queryAddress }) {
  const router = useRouter()
  const width = useWidth()

  const { t } = useTranslation(['common', 'admin'])
  const [errorMessage, setErrorMessage] = useState('')
  const [data, setData] = useState(null)
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

    */
    if (data) {
      setData(data)
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

        {!width || width > 750 ? (
          <table className="table-large">
            <thead>
              <tr>
                <th className="center">#</th>
                <th className="left">Address</th>
                <th className="right">Private name</th>
                <th>Verified at</th>
              </tr>
            </thead>
            <tbody>
              {data?.length > 0 ? (
                <>
                  {data.map((address, i) => (
                    <tr key={i}>
                      <td className="center">{i + 1}</td>
                      <td className="left">{address.address}</td>
                      <td className="right">{address.name}</td>
                      <td>{fullDateAndTime(address.createdAt)}</td>
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
              {data?.length > 0 ? (
                <>
                  {data.map((address, i) => (
                    <tr key={i}>
                      <td style={{ padding: '5px' }}>#{i + 1}</td>
                      <td>
                        <p>
                          Address: <b>{address.address}</b>
                        </p>
                        <p>
                          Name: <b>{address.name}</b>
                        </p>
                        <p>Verified at: {fullDateAndTime(address.createdAt)}</p>
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
        <div style={{ textAlign: 'left' }}>
          In order to use PRO functionality for your accounts, you would need to verify them first.
          <br />
          <br />
          <div>
            - Get your personal historical transaction's extracts and statistics.
            <br />
            - Auto cancelation of expired NFT offers
            <br />- Auto execution of time based escrows
          </div>
          {width > 851 && <br />}
          <br />
          <br />
        </div>
        <br />
        {errorMessage ? <div className="center orange bold">{errorMessage}</div> : <br />}
      </div>
    </>
  )
}

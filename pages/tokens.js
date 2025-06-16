import { useTranslation } from 'next-i18next'
import React from 'react'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import axios from 'axios'
import { useState, useEffect } from 'react'

import SEO from '../components/SEO'
import FiltersFrame from '../components/Layout/FiltersFrame'
import InfiniteScrolling from '../components/Layout/InfiniteScrolling'
import FormInput from '../components/UI/FormInput'
import { AddressWithIcon, niceCurrency, shortAddress, shortNiceNumber } from '../utils/format'
import { axiosServer, passHeaders } from '../utils/axios'
import { getIsSsrMobile } from '../utils/mobile'
import { useWidth } from '../utils'

// Server side initial data fetch
export async function getServerSideProps (context) {
  const { locale, req } = context
  let initialData = null
  let initialErrorMessage = null
  try {
    const res = await axiosServer({
      method: 'get',
      url: 'v2/trustlines/tokens?limit=100&order=trustlinesHigh',
      headers: passHeaders(req)
    }).catch((error) => {
      initialErrorMessage = error.message
    })
    initialData = res?.data
  } catch (e) {
    console.error(e)
  }
  return {
    props: {
      initialData: initialData || null,
      initialErrorMessage: initialErrorMessage || '',
      isSsrMobile: getIsSsrMobile(context),
      ...(await serverSideTranslations(locale, ['common']))
    }
  }
}

export default function Tokens ({
  initialData,
  initialErrorMessage,
  subscriptionExpired,
  sessionToken
}) {
  const { t } = useTranslation()
  const width = useWidth()

  // States
  const [data, setData] = useState(initialData?.tokens || [])
  const [marker, setMarker] = useState(initialData?.marker)
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState(initialErrorMessage || '')
  const [order, setOrder] = useState('trustlinesHigh')
  const [search, setSearch] = useState('')
  const [filtersHide, setFiltersHide] = useState(false)

  const controller = new AbortController()

  // Utility to build api url
  const apiUrl = (options = {}) => {
    const limit = 100
    const parts = []
    if (search) {
      parts.push(`v2/trustlines/tokens/search/${encodeURIComponent(search)}`)
    } else {
      parts.push('v2/trustlines/tokens')
    }
    parts.push(`?limit=${limit}`)
    parts.push(`&order=${order}`)
    if (options.marker) {
      parts.push(`&marker=${options.marker}`)
    }
    return parts.join('')
  }

  // Fetch tokens
  const checkApi = async (options = {}) => {
    if (loading) return
    setLoading(true)

    let markerToUse = undefined
    if (!options.restart) {
      markerToUse = options.marker || marker
    }

    const response = await axios
      .get(apiUrl({ marker: markerToUse }), {
        signal: controller.signal
      })
      .catch((error) => {
        if (error && error.message !== 'canceled') {
          setErrorMessage(t('error.' + error.message))
          setLoading(false)
        }
      })

    const newdata = response?.data
    if (newdata) {
      // If we are restarting (search/order changed) we replace list, else concat
      const restart = options.restart
      if (restart) {
        setData(newdata.tokens || [])
      } else {
        setData((prev) => [...prev, ...(newdata.tokens || [])])
      }
      setMarker(newdata.marker)
      setErrorMessage('')
    } else {
      setErrorMessage(t('general.no-data'))
    }
    setLoading(false)
  }

  // Effect: refetch when order or search changes
  useEffect(() => {
    setMarker('first')
    checkApi({ restart: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order, search])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      controller.abort()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // CSV headers for export
  const csvHeaders = [
    { label: 'Currency', key: 'currency' },
    { label: 'Issuer', key: 'issuer' },
    { label: 'Trustlines', key: 'trustlines' },
    { label: 'Holders', key: 'holders' }
  ]

  // Helper component to render token with icon
  const TokenCell = ({ token }) => {
    return (
      <AddressWithIcon address={token?.issuer}>
        {niceCurrency(token.currency)}
        {token.issuer && (
          <>
            <br />
            {shortAddress(token.issuer)}
          </>
        )}
      </AddressWithIcon>
    )
  }

  return (
    <>
      <SEO title="Tokens" />
      <h1 className="center">Tokens</h1>

      <FiltersFrame
        order={order}
        setOrder={setOrder}
        orderList={[
          { value: 'trustlinesHigh', label: 'Trustlines: High to Low' },
          { value: 'trustlinesLow', label: 'Trustlines: Low to High' }
        ]}
        count={data?.length}
        hasMore={marker}
        data={data || []}
        csvHeaders={csvHeaders}
        filtersHide={filtersHide}
        setFiltersHide={setFiltersHide}
      >
        {/* Left filters */}
        <>
          <FormInput
            title={t('general.search') || 'Search'}
            placeholder="Currency, issuer, or username"
            setValue={(val) => setSearch(val)}
            defaultValue={search}
          />
        </>
        {/* Main content */}
        <InfiniteScrolling
          dataLength={data.length}
          loadMore={() => {
            if (marker && marker !== 'first') {
              checkApi({ marker })
            }
          }}
          hasMore={marker}
          errorMessage={errorMessage}
          subscriptionExpired={subscriptionExpired}
          sessionToken={sessionToken}
        >
          {/* Desktop table */}
          {!width || width > 860 ? (
            <table className="table-large">
              <thead>
                <tr>
                  <th className="center">#</th>
                  <th>Token</th>
                  <th className="right">Trustlines</th>
                  <th className="right">Holders</th>
                </tr>
              </thead>
              <tbody>
                {errorMessage ? (
                  <tr>
                    <td colSpan="100" className="center orange bold">
                      {errorMessage}
                    </td>
                  </tr>
                ) : (
                  <>
                    {data.map((token, i) => (
                      <tr key={i}>
                        <td className="center">{i + 1}</td>
                        <td>
                          <TokenCell token={token} />
                        </td>
                        <td className="right" suppressHydrationWarning>
                          {shortNiceNumber(token.trustlines, 0)}
                        </td>
                        <td className="right" suppressHydrationWarning>
                          {shortNiceNumber(token.holders, 0)}
                        </td>
                      </tr>
                    ))}
                    {loading && (
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
                    )}
                  </>
                )}
              </tbody>
            </table>
          ) : (
            // Mobile table
            <table className="table-mobile">
              <thead></thead>
              <tbody>
                {errorMessage ? (
                  <tr>
                    <td colSpan="100" className="center orange bold">
                      {errorMessage}
                    </td>
                  </tr>
                ) : (
                  <>
                    {data.map((token, i) => (
                      <tr key={i}>
                        <td style={{ padding: '5px' }} className="center">
                          <b>{i + 1}</b>
                        </td>
                        <td>
                          <TokenCell token={token} />
                          <p>
                            Trustlines: {shortNiceNumber(token.trustlines, 0)}
                            <br />
                            Holders: {shortNiceNumber(token.holders, 0)}
                          </p>
                        </td>
                      </tr>
                    ))}
                    {loading && marker === 'first' && (
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
                    )}
                  </>
                )}
              </tbody>
            </table>
          )}
        </InfiniteScrolling>
      </FiltersFrame>
    </>
  )
} 
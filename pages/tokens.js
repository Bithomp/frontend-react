import { useTranslation } from 'next-i18next'
import React from 'react'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import axios from 'axios'
import { useState, useEffect } from 'react'

import SEO from '../components/SEO'
import FiltersFrame from '../components/Layout/FiltersFrame'
import InfiniteScrolling from '../components/Layout/InfiniteScrolling'
import IssuerSearchSelect from '../components/UI/IssuerSearchSelect'
import CurrencySearchSelect from '../components/UI/CurrencySearchSelect'
import { AddressWithIcon, niceCurrency, shortNiceNumber } from '../utils/format'
import { axiosServer, passHeaders } from '../utils/axios'
import { getIsSsrMobile } from '../utils/mobile'
import { useWidth } from '../utils'
import { LinkAccount } from '../utils/links'

// Server side initial data fetch
export async function getServerSideProps (context) {
  const { locale, req } = context
  let initialData = null
  let initialErrorMessage = null
  try {
    const res = await axiosServer({
      method: 'get',
      url: 'v2/trustlines/tokens?limit=100&order=rating',
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
  sessionToken,
  setSignRequest  
}) {
  const { t } = useTranslation()
  const width = useWidth()

  // States
  const [data, setData] = useState(initialData?.tokens || [])
  const [marker, setMarker] = useState(initialData?.marker)
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState(initialErrorMessage || '')
  const [order, setOrder] = useState('rating')
  const [filtersHide, setFiltersHide] = useState(false)
  const [issuer, setIssuer] = useState('')
  const [currency, setCurrency] = useState('')

  const controller = new AbortController()

  // Utility to build api url
  const apiUrl = (options = {}) => {
    const limit = 100
    const parts = []
    parts.push('v2/trustlines/tokens')
    parts.push(`?limit=${limit}`)
    parts.push(`&order=${order}`)
    if (issuer) {
      parts.push(`&issuer=${encodeURIComponent(issuer)}`)
    }
    if (currency) {
      parts.push(`&currency=${encodeURIComponent(currency)}`)
    }
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

    // Check subscription for pagination beyond initial 100 items
    if (markerToUse && markerToUse !== 'first') {
      // do not load more if there is no session token or if Bithomp Pro is expired
      if (!sessionToken || (sessionToken && subscriptionExpired)) {
        setLoading(false)
        return
      }
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
  }, [order, issuer, currency])

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
    const issuerDetails = token.issuerDetails || {}
    const serviceOrUsername = () => {
      if (issuerDetails.service) {
        return (
          <>
            <span className="green bold">{issuerDetails.service}</span>
          </>
        )
      } else if (issuerDetails.username) {
        return (
          <>
            <span className="blue bold">{issuerDetails.username}</span>
          </>
        )
      } 
    }
    return (
      <AddressWithIcon address={token?.issuer}>
        {niceCurrency(token.currency)} {serviceOrUsername()}
        {token.issuer && (
          <>
            <br />
            <LinkAccount address={token.issuer} />
          </>
        )}
      </AddressWithIcon>
    )
  }

  const handleSetTrustline = (token) => {
    
    // Format supply to have at most 6 decimal places
    const formatSupply = (supply) => {
      if (!supply) return '1000000000'
      const num = parseFloat(supply)
      if (isNaN(num)) return '1000000000'
      return num.toFixed(6)
    }
    
    setSignRequest({
      request: {
        TransactionType: 'TrustSet',
        LimitAmount: {
          currency: token.currency,
          issuer: token.issuer,
          value: formatSupply(token.supply)
        }
      }
    })
  }

  return (
    <>
      <SEO title="Tokens" />
      <h1 className="center">Tokens</h1>

      <FiltersFrame
        order={order}
        setOrder={setOrder}
        orderList={[
          { value: 'rating', label: 'Rating: High to Low' },
          { value: 'trustlinesHigh', label: 'Trustlines: High to Low' },
          { value: 'holdersHigh', label: 'Holders: High to Low' }
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
          <div className="flex flex-col sm:gap-4 md:h-[400px]">
            <CurrencySearchSelect setCurrency={setCurrency} defaultValue={currency} />
            <IssuerSearchSelect setIssuer={setIssuer} defaultValue={issuer} />
          </div>
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
            <table className="table-large no-hover">
              <thead>
                <tr>
                  <th className="center">#</th>
                  <th>Token</th>
                  <th className="right">Marketcap</th>
                  <th className="right">Trustlines</th>
                  <th className="right">Holders</th>
                  <th className="center">Action</th>
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
                        <td className="right">
                          {shortNiceNumber(token.statistics?.marketcap, 0)}
                        </td>
                        <td className="right" suppressHydrationWarning>
                          {shortNiceNumber(token.trustlines, 0)}
                        </td>
                        <td className="right" suppressHydrationWarning>
                          {shortNiceNumber(token.holders, 0)}
                        </td>
                        <td>
                          <button className="button-action thin" onClick={() => {
                            handleSetTrustline(token)
                          }}>
                            Set trustline
                          </button>
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
                            {token.statistics?.marketcap && (
                              <>
                                Marketcap: {shortNiceNumber(token.statistics?.marketcap, 0)}
                                <br />
                              </>
                            )}
                            Trustlines: {shortNiceNumber(token.trustlines, 0)}
                            <br />
                            Holders: {shortNiceNumber(token.holders, 0)}
                            <br />
                            <button className="button-action thin" onClick={() => {
                              handleSetTrustline(token)
                            }}>
                              Set trustline
                            </button>
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
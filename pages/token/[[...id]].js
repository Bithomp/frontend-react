import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'

import SEO from '../../components/SEO'
import TokenSelector from '../../components/UI/TokenSelector'
import { tokenClass } from '../../styles/pages/token.module.scss'
import { niceNumber, shortNiceNumber, fullNiceNumber, AddressWithIconFilled } from '../../utils/format'
import { axiosServer, getFiatRateServer, passHeaders } from '../../utils/axios'
import { getIsSsrMobile } from '../../utils/mobile'
import { isAddressOrUsername, nativeCurrency, tokenImageSrc, validateCurrencyCode, xahauNetwork } from '../../utils'
import CopyButton from '../../components/UI/CopyButton'

// Server side initial data fetch
export async function getServerSideProps(context) {
  const { locale, req, params } = context
  const { id } = params || {}

  let initialData = null
  let initialErrorMessage = null
  let issuer = null
  let currency = null

  // Parse the dynamic route parameters
  if (id && Array.isArray(id) && id.length >= 2) {
    issuer = id[0]
    currency = id[1]
  } else {
    initialErrorMessage = 'Invalid token URL. Expected format: /token/{issuer}/{currencyCode}'
  }

  const { fiatRateServer, selectedCurrencyServer } = await getFiatRateServer(req)

  if (issuer && currency) {
    // Validate issuer
    if (!isAddressOrUsername(issuer)) {
      initialErrorMessage = 'Invalid issuer address or username'
    }

    // Validate currency code
    const { valid, currencyCode } = validateCurrencyCode(currency)
    if (!valid) {
      initialErrorMessage = 'Invalid currency code'
    }

    if (!initialErrorMessage) {
      try {
        // Fetch token data
        const url = `v2/trustlines/token/${issuer}/${currencyCode}?statistics=true&currencyDetails=true&convertCurrencies=${selectedCurrencyServer}`
        const res = await axiosServer({
          method: 'get',
          url,
          headers: passHeaders(req)
        }).catch((error) => {
          initialErrorMessage = error.message
        })
        if (res?.data) {
          if (res.data?.error) {
            initialErrorMessage = res.data.error
          } else {
            initialData = res.data
          }
        } else {
          initialErrorMessage = 'Token not found'
        }
      } catch (e) {
        console.error(e)
        initialErrorMessage = 'Failed to fetch token data'
      }
    }
  }

  return {
    props: {
      initialData: initialData || null,
      initialErrorMessage: initialErrorMessage || '',
      isSsrMobile: getIsSsrMobile(context),
      fiatRateServer,
      selectedCurrencyServer,
      issuer,
      currency,
      ...(await serverSideTranslations(locale, ['common']))
    }
  }
}

export default function TokenPage({
  initialData,
  initialErrorMessage,
  selectedCurrency: selectedCurrencyApp,
  selectedCurrencyServer,
  fiatRate: fiatRateApp,
  fiatRateServer,
  setSignRequest,
  isSsrMobile
}) {
  const router = useRouter()
  const [token, setToken] = useState(initialData)
  const [loading, setLoading] = useState(false)
  const [selectedToken, setSelectedToken] = useState(initialData)
  const errorMessage = initialErrorMessage || ''
  const firstRenderRef = useRef(true)

  let selectedCurrency = selectedCurrencyServer
  let fiatRate = fiatRateServer

  if (fiatRateApp) {
    fiatRate = fiatRateApp
    selectedCurrency = selectedCurrencyApp
  }

  // Redirect if no token data
  useEffect(() => {
    if (!initialData && !initialErrorMessage) {
      router.push('/tokens')
    }
  }, [initialData, initialErrorMessage, router])

  const getData = async () => {
    setLoading(true)
    const cur = selectedCurrency?.toLowerCase()
    if (!cur) return
    const url = `v2/trustlines/token/${selectedToken.issuer}/${selectedToken.currency}?statistics=true&currencyDetails=true&convertCurrencies=${cur}`
    const res = await axiosServer({
      method: 'get',
      url
    }).catch((error) => {
      initialErrorMessage = error.message
    })
    setToken(res.data)
    setLoading(false)
  }

  useEffect(() => {
    // Skip fetch on first render for pages that get on the server side
    if (firstRenderRef.current) {
      firstRenderRef.current = false
      return
    }
    getData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCurrency, selectedToken])

  useEffect(() => {
    const { pathname, query } = router
    query.id = [selectedToken?.issuer, selectedToken?.currency]
    router.replace({ pathname, query }, null, { shallow: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedToken])

  // Helper: price line as "fiat (XRP)" using historical rate when available
  const priceLine = ({ priceNative, priceFiat }) => {
    const price = priceNative
    return (
      <span suppressHydrationWarning>
        {niceNumber(priceFiat || 0, 4, selectedCurrency)}
        {isSsrMobile ? <br /> : ' '}
        <span className="grey">
          {!isSsrMobile && '('}
          {price < 0.0001 ? (
            <>
              <span className="no-brake">
                1M <span className="green">{token?.currencyDetails?.currency}</span> = {niceNumber(price * 1000000, 6)}{' '}
              </span>
              <span className="red no-brake">{nativeCurrency}</span>,{' '}
            </>
          ) : (
            <span className="no-brake">
              {niceNumber(price, 6)} <span className="red">{nativeCurrency}</span>,{' '}
            </span>
          )}
          <span className="no-brake">
            1 <span className="red">{nativeCurrency}</span> = {niceNumber(1 / price, 6)}{' '}
            <span className="green">{token?.currencyDetails?.currency}</span>
          </span>
          {!isSsrMobile && ')'}
        </span>
      </span>
    )
  }

  const marketcapLine = ({ marketcap }) => {
    if (!fiatRate || !marketcap) return null
    const marketcapFiat = marketcap * fiatRate
    return (
      <span suppressHydrationWarning>
        {niceNumber(marketcapFiat, 2, selectedCurrency)}
        {isSsrMobile ? <br /> : ' '}
        <span className="grey">
          {!isSsrMobile && '('}
          {niceNumber(marketcap, 2)} {nativeCurrency}
          {!isSsrMobile && ')'}
        </span>
      </span>
    )
  }

  const volumeLine = ({ token, type }) => {
    const { statistics, currencyDetails } = token
    if (!fiatRate) return null
    let volume
    if (!type || type === 'total') {
      volume = Number(statistics?.buyVolume || 0) + Number(statistics?.sellVolume || 0)
    } else {
      volume = statistics?.[type + 'Volume'] || 0
    }
    const volumeFiat = volume * (statistics?.priceNativeCurrency || 0) * fiatRate || 0
    return (
      <span suppressHydrationWarning>
        {niceNumber(volumeFiat, 2, selectedCurrency)}
        {isSsrMobile ? <br /> : ' '}
        <span className="grey">
          {!isSsrMobile && '('}
          {niceNumber(volume, 2)} {currencyDetails?.currency}
          {!isSsrMobile && ')'}
        </span>
      </span>
    )
  }

  if (errorMessage) {
    return (
      <>
        <SEO title="Token not found" />
        <div className="center">
          <h1>Token not found</h1>
          <p>{errorMessage}</p>
          <Link href="/tokens" className="button-action">
            View all tokens
          </Link>
          <br />
          <br />
        </div>
      </>
    )
  }

  if (!token) {
    return (
      <>
        <SEO title="Loading Token..." />
        <div className="center">
          <h1>Loading...</h1>
        </div>
      </>
    )
  }

  const { statistics } = token

  // Helper function to format supply for trustline
  const formatSupply = (supply) => {
    if (!supply) return '1000000000'
    const num = parseFloat(supply)
    if (isNaN(num)) return '1000000000'
    return num.toFixed(6)
  }

  // Handle set trustline
  const handleSetTrustline = () => {
    if (!setSignRequest) return

    setSignRequest({
      request: {
        TransactionType: 'TrustSet',
        LimitAmount: {
          currency: token.currency,
          issuer: token.issuer,
          value: formatSupply(token.supply)
        },
        Flags: 131072
      }
    })
  }

  return (
    <>
      <SEO
        title={`${token?.currencyDetails?.currency} Token - ${
          token.issuerDetails?.service || token.issuerDetails?.username || 'Token Details'
        }`}
      />
      <div className={tokenClass}>
        <div className="content-profile">
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center'
            }}
          >
            <div style={{ width: isSsrMobile ? '100%' : '80%', marginBottom: '20px' }}>
              <TokenSelector value={selectedToken} onChange={setSelectedToken} excludeNative={true} />
            </div>
          </div>
          <div className="column-left">
            {/* Big Token Icon */}
            <img
              alt="token"
              src={tokenImageSrc(token)}
              className="token-image"
              style={{ width: 'calc(100% - 4px)', height: 'auto' }}
            />
            <h1>{token?.currencyDetails?.currency}</h1>

            {/* Action Buttons */}
            <button className="button-action wide center" onClick={handleSetTrustline}>
              Set Trustline
            </button>
          </div>

          <div className="column-right">
            {/* Token Information */}
            <table className="table-details">
              <thead>
                <tr>
                  <th colSpan="100">Token Information</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Currency</td>
                  <td>{token?.currencyDetails?.currency}</td>
                </tr>
                {token?.name && (
                  <tr>
                    <td>Name</td>
                    <td>{token.name}</td>
                  </tr>
                )}
                {token?.description && (
                  <tr>
                    <td>Description</td>
                    <td>{token.description}</td>
                  </tr>
                )}
                <tr>
                  <td>Issuer</td>
                  <td>
                    <AddressWithIconFilled
                      data={token}
                      name="issuer"
                      copyButton={true}
                      options={isSsrMobile ? { short: 10 } : null}
                    />
                  </td>
                </tr>
                <tr>
                  <td>Currency Code</td>
                  <td>
                    {token.currencyDetails?.currencyCode} <CopyButton text={token.currencyDetails?.currencyCode} />
                  </td>
                </tr>
                <tr>
                  <td>Supply</td>
                  <td>
                    {fullNiceNumber(token.supply)} {token.currencyDetails?.currency}
                  </td>
                </tr>
                <tr>
                  <td>Holders</td>
                  <td>
                    <Link
                      href={
                        '/distribution?currencyIssuer=' +
                        token.issuer +
                        '&currency=' +
                        token.currencyDetails?.currencyCode
                      }
                    >
                      {fullNiceNumber(token.holders)}
                    </Link>
                  </td>
                </tr>
                <tr>
                  <td>Trustlines</td>
                  <td>{fullNiceNumber(token.trustlines)}</td>
                </tr>
                {/*
                <tr>
                  <td>KYC Status</td>
                  <td>{token.kyc ? 'Verified' : 'Not Verified'}</td>
                </tr>
                */}
                {/*
                <tr>
                  <td>Token Type</td>
                  <td>
                    {token.lp_token ? 'LP Token' : 'Standard Token'}
                    {token.stablecoin && ' (Stablecoin)'}
                    {token.fiat && ` (${token.fiat})`}
                  </td>
                </tr>
                */}
                {/*
                {token.statistics?.timeAt && (
                  <tr>
                    <td>Last Updated</td>
                    <td>{fullDateAndTime(token.statistics?.timeAt)}</td>
                  </tr>
                )}
                */}
              </tbody>
            </table>

            {/* Price Information */}
            <table className="table-details">
              <thead>
                <tr>
                  <th colSpan="100">Price information</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr className="center">
                    <td colSpan="100">
                      <span className="waiting"></span>
                    </td>
                  </tr>
                ) : (
                  <>
                    <tr>
                      <td>Last price</td>
                      <td>
                        {priceLine({
                          priceNative: statistics?.priceNativeCurrency,
                          priceFiat: statistics?.priceFiats[selectedCurrency]
                        })}
                      </td>
                    </tr>
                    {statistics?.priceNativeCurrencySpot && (
                      <tr>
                        <td>Spot price</td>
                        <td>
                          {priceLine({
                            priceNative: statistics?.priceNativeCurrencySpot,
                            priceFiat: statistics?.priceFiatsSpot[selectedCurrency]
                          })}
                        </td>
                      </tr>
                    )}
                    <tr>
                      <td>Market cap</td>
                      <td>{marketcapLine({ marketcap: statistics?.marketcap })}</td>
                    </tr>
                    {statistics?.priceNativeCurrency5m && (
                      <tr>
                        <td>5 minutes ago</td>
                        <td>
                          {priceLine({
                            priceNative: statistics?.priceNativeCurrency5m,
                            priceFiat: statistics?.priceFiats5m[selectedCurrency]
                          })}
                        </td>
                      </tr>
                    )}
                    {statistics?.priceNativeCurrency1h && (
                      <tr>
                        <td>1 hour ago</td>
                        <td>
                          {priceLine({
                            priceNative: statistics?.priceNativeCurrency1h,
                            priceFiat: statistics?.priceFiats1h[selectedCurrency]
                          })}
                        </td>
                      </tr>
                    )}
                    {statistics?.priceNativeCurrency24h && (
                      <tr>
                        <td>24 hours ago</td>
                        <td>
                          {priceLine({
                            priceNative: statistics?.priceNativeCurrency24h,
                            priceFiat: statistics?.priceFiats24h[selectedCurrency]
                          })}
                        </td>
                      </tr>
                    )}
                    {statistics?.priceNativeCurrency7d && (
                      <tr>
                        <td>7 days ago</td>
                        <td>
                          {priceLine({
                            priceNative: statistics?.priceNativeCurrency7d,
                            priceFiat: statistics?.priceFiats7d[selectedCurrency]
                          })}
                        </td>
                      </tr>
                    )}
                  </>
                )}
              </tbody>
            </table>

            {/* Stats for the last 24h */}
            <table className="table-details">
              <thead>
                <tr>
                  <th colSpan="100">Stats for the last 24h</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Volume (Total)</td>
                  <td>{volumeLine({ token, type: 'total' })}</td>
                </tr>
                <tr>
                  <td>Volume (Buy)</td>
                  <td>{volumeLine({ token, type: 'buy' })}</td>
                </tr>
                <tr>
                  <td>Volume (Sell)</td>
                  <td>{volumeLine({ token, type: 'sell' })}</td>
                </tr>
                <tr>
                  <td>Trades</td>
                  <td>{fullNiceNumber(statistics?.dexes || 0)}</td>
                </tr>
                <tr>
                  <td>DEX TXs</td>
                  <td>{fullNiceNumber(statistics?.dexTxs || 0)}</td>
                </tr>
                <tr>
                  <td>Buyers</td>
                  <td>{fullNiceNumber(statistics?.uniqueBuyers || 0)}</td>
                </tr>
                <tr>
                  <td>Sellers</td>
                  <td>{fullNiceNumber(statistics?.uniqueSellers || 0)}</td>
                </tr>
                <tr>
                  <td>Traders</td>
                  <td>{fullNiceNumber(statistics?.uniqueDexAccounts || 0)}</td>
                </tr>
                <tr>
                  <td>Transfer Volume</td>
                  <td>{volumeLine({ token, type: 'transfer' })}</td>
                </tr>
                <tr>
                  <td>Transfer Transactions</td>
                  <td>{niceNumber(statistics?.transferTxs || 0)}</td>
                </tr>
                <tr>
                  <td>Rippling txs</td>
                  <td>{fullNiceNumber(statistics?.ripplingTxs || 0)}</td>
                </tr>
                <tr>
                  <td>Mint Volume</td>
                  <td>{volumeLine({ token, type: 'mint' })}</td>
                </tr>
                <tr>
                  <td>Mint Transactions</td>
                  <td>{shortNiceNumber(statistics?.mintTxs || 0, 0, 1)}</td>
                </tr>
                <tr>
                  <td>Burn Volume</td>
                  <td>{volumeLine({ token, type: 'burn' })}</td>
                </tr>
                <tr>
                  <td>Burn Transactions</td>
                  <td>{shortNiceNumber(statistics?.burnTxs || 0, 0, 1)}</td>
                </tr>
                <tr>
                  <td>Unique accounts</td>
                  <td>{fullNiceNumber(statistics?.uniqueAccounts || 0)}</td>
                </tr>
                {!xahauNetwork && (
                  <tr>
                    <td>AMM Pools</td>
                    <td>
                      <Link href={`/amms?currency=${token.currency}&currencyIssuer=${token.issuer}`}>
                        {statistics?.ammPools || 0}
                      </Link>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

            {/* Stats for the last closed day */}
            <table className="table-details">
              <thead>
                <tr>
                  <th colSpan="100">Stats for the last closed day</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Trading Pairs</td>
                  <td>{fullNiceNumber(statistics?.activeCounters || 0)}</td>
                </tr>
                <tr>
                  <td>Active Holders</td>
                  <td>{fullNiceNumber(statistics?.activeHolders || 0)}</td>
                </tr>
                <tr>
                  <td>Active Offers</td>
                  <td>{fullNiceNumber(statistics?.activeOffers || 0)}</td>
                </tr>
                {!xahauNetwork && (
                  <tr>
                    <td>Active AMM Pools</td>
                    <td>{niceNumber(statistics?.activeAmmPools || 0)}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  )
}

import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { FaHandshake } from 'react-icons/fa'

import SEO from '../../components/SEO'
import TokenSelector from '../../components/UI/TokenSelector'
import { tokenClass } from '../../styles/pages/token.module.scss'
import {
  niceNumber,
  shortNiceNumber,
  fullNiceNumber,
  AddressWithIconFilled,
  addressUsernameOrServiceLink,
  CurrencyWithIconInline,
  dateFormat,
  timeFormat
} from '../../utils/format'
import { axiosServer, getFiatRateServer, passHeaders } from '../../utils/axios'
import { getIsSsrMobile } from '../../utils/mobile'
import { isAddressOrUsername, nativeCurrency, tokenImageSrc, validateCurrencyCode, xahauNetwork } from '../../utils'
import CopyButton from '../../components/UI/CopyButton'
import TokenTabs from '../../components/Tabs/TokenTabs'

// Server side initial data fetch
export async function getServerSideProps(context) {
  const { locale, req, params } = context
  const { id } = params || {}

  let initialData = null
  let initialErrorMessage = null
  let issuer = null
  let currency = null
  let isNativeTokenRoute = false
  let tokenId = null

  // Parse the dynamic route parameters
  if (id && Array.isArray(id) && id.length >= 2) {
    issuer = id[0]
    currency = id[1]
  } else if (id && Array.isArray(id) && id.length === 1 && id[0] === nativeCurrency) {
    currency = nativeCurrency
    isNativeTokenRoute = true
  } else if (id && Array.isArray(id) && id.length === 1) {
    tokenId = id[0]
  } else {
    initialErrorMessage =
      'Invalid token URL. Expected format: /token/{issuer}/{currencyCode} or /token/' + nativeCurrency
  }

  const { fiatRateServer, selectedCurrencyServer } = await getFiatRateServer(req)

  if (currency || tokenId) {
    if (isNativeTokenRoute) {
      try {
        const url = `v2/token/${nativeCurrency}?statistics=true&convertCurrencies=${selectedCurrencyServer}`
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
    } else if (tokenId) {
      try {
        const url = `v2/token/${encodeURIComponent(tokenId)}?statistics=true&currencyDetails=true&convertCurrencies=${selectedCurrencyServer}`
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
    } else if (issuer) {
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
          const url = `v2/token/${issuer}/${currencyCode}?statistics=true&currencyDetails=true&convertCurrencies=${selectedCurrencyServer}`
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
    } else {
      initialErrorMessage =
        'Invalid token URL. Expected format: /token/{issuer}/{currencyCode} or /token/' + nativeCurrency
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
      tokenId,
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
    const selectedMptId = selectedToken?.mptokenIssuanceID
    const url = selectedMptId
      ? `v2/token/${encodeURIComponent(selectedMptId)}?statistics=true&currencyDetails=true&convertCurrencies=${cur}`
      : selectedToken?.issuer
        ? `v2/token/${selectedToken.issuer}/${selectedToken.currency}?statistics=true&currencyDetails=true&convertCurrencies=${cur}`
        : `v2/token/${nativeCurrency}?statistics=true&convertCurrencies=${cur}`
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
    if (!selectedToken?.currency) return
    const { pathname, query } = router
    const selectedMptId = selectedToken?.mptokenIssuanceID
    query.id = selectedMptId
      ? [selectedMptId]
      : selectedToken?.issuer
        ? [selectedToken.issuer, selectedToken.currency]
        : [selectedToken.currency]
    router.replace({ pathname, query }, null, { shallow: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedToken])

  // Helper: price line as "fiat (XRP)" using historical rate when available
  const priceLine = ({ priceNative, priceFiat }) => {
    const price = priceNative
    const currencyText = token?.currencyDetails?.currency || token?.currency || nativeCurrency
    const isNativeFromToken = !token?.issuer && token?.currency === nativeCurrency
    return (
      <span suppressHydrationWarning>
        {niceNumber(priceFiat || 0, 4, selectedCurrency)}
        {!isNativeFromToken && (
          <>
            {isSsrMobile ? <br /> : ' '}
            <span className="grey">
              {!isSsrMobile && '('}
              {price < 0.0001 ? (
                <>
                  <span className="no-brake">
                    1M {currencyText} = {niceNumber(price * 1000000, 6)}{' '}
                  </span>
                  <span className="no-brake">{nativeCurrency}</span>,{' '}
                </>
              ) : (
                <span className="no-brake">
                  {niceNumber(price, 6)} {nativeCurrency},{' '}
                </span>
              )}
              <span className="no-brake">
                1 {nativeCurrency} = {niceNumber(1 / price, 6)} {currencyText}
              </span>
              {!isSsrMobile && ')'}
            </span>
          </>
        )}
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
    const priceInNative = statistics?.priceNativeCurrency ?? (token?.issuer ? 0 : 1)
    const volumeFiat = volume * priceInNative * fiatRate || 0
    return (
      <span suppressHydrationWarning>
        {niceNumber(volumeFiat, 2, selectedCurrency)}
        {isSsrMobile ? <br /> : ' '}
        <span className="grey">
          {!isSsrMobile && '('}
          {niceNumber(volume, 2)} {currencyDetails?.currency || token?.currency || nativeCurrency}
          {!isSsrMobile && ')'}
        </span>
      </span>
    )
  }

  const renderPercentCell = ({ currentPrice, pastPrice }) => {
    const current = Number(currentPrice || 0)
    const past = Number(pastPrice || 0)
    if (!current || !past) return <span className="grey">--%</span>
    const change = current / past - 1
    const colorClass = change >= 0 ? 'green' : 'red'
    const percentText = niceNumber(Math.abs(change * 100), 2) + '%'

    return (
      <span className={`tooltip ${colorClass}`} suppressHydrationWarning>
        {change >= 0 ? '+' : '-'}
        {percentText}
        <span className="tooltiptext right no-brake" suppressHydrationWarning>
          Now: {fullNiceNumber(currentPrice, selectedCurrency)}
          <br />
          Before: {fullNiceNumber(pastPrice, selectedCurrency)}
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
  const mptId = token?.mptokenIssuanceID
  const isMptToken = !!mptId
  const isNativeToken = !token?.issuer && token?.currency === nativeCurrency
  const isRoundTokenImage = !!token?.issuer || isMptToken || isNativeToken
  const tokenDisplayCurrency = isMptToken
    ? token?.metadata?.name || token?.currency || 'MPT'
    : token?.currencyDetails?.currency || token?.currency || nativeCurrency
  const effectiveNativePrice = statistics?.priceNativeCurrency ?? (isNativeToken ? 1 : null)
  const escrowStatus =
    token?.canLock === true ? (
      <span className="bold">Can be escrowed</span>
    ) : token?.canLock === false ? (
      'Can not be escrowed'
    ) : (
      'Unknown'
    )
  const changeItems = [
    {
      key: '5m',
      label: '5m',
      pastPrice: statistics?.priceFiats5m?.[selectedCurrency],
      hasData: statistics?.priceFiats5m?.[selectedCurrency] !== undefined
    },
    {
      key: '1h',
      label: '1h',
      pastPrice: statistics?.priceFiats1h?.[selectedCurrency],
      hasData: statistics?.priceFiats1h?.[selectedCurrency] !== undefined
    },
    {
      key: '24h',
      label: '24h',
      pastPrice: statistics?.priceFiats24h?.[selectedCurrency],
      hasData: statistics?.priceFiats24h?.[selectedCurrency] !== undefined
    },
    {
      key: '7d',
      label: '7d',
      pastPrice: statistics?.priceFiats7d?.[selectedCurrency],
      hasData: statistics?.priceFiats7d?.[selectedCurrency] !== undefined
    }
  ].filter((item) => item.hasData)
  const showPriceInformation =
    loading ||
    effectiveNativePrice ||
    changeItems.length > 0 ||
    statistics?.priceNativeCurrencySpot ||
    statistics?.marketcap

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

  const handleAuthorizeMpt = () => {
    if (!setSignRequest || !mptId) return
    setSignRequest({
      request: {
        TransactionType: 'MPTokenAuthorize',
        MPTokenIssuanceID: mptId
      }
    })
  }

  const title = isNativeToken ? (
    <>{tokenDisplayCurrency} (native currency)</>
  ) : (
    <>
      {tokenDisplayCurrency} issued by {addressUsernameOrServiceLink(token, 'issuer', { short: true })}
    </>
  )
  const isLpToken = token?.currencyDetails?.type === 'lp_token'
  const lpAmmId = token?.currencyDetails?.ammID
  const lpAsset = token?.currencyDetails?.asset
  const lpAsset2 = token?.currencyDetails?.asset2
  const renderLpAsset = (asset) => {
    if (!asset) return ''
    if (asset?.currency === nativeCurrency) {
      return <span className="bold">{nativeCurrency}</span>
    }
    return <CurrencyWithIconInline token={asset} link={true} showIssuer={true} />
  }

  return (
    <>
      <SEO
        title={
          isNativeToken
            ? tokenDisplayCurrency + ' (native currency)'
            : tokenDisplayCurrency +
              ' issued by ' +
              (token?.issuerDetails?.service || token?.issuerDetails?.username || token?.issuer)
        }
      />
      <div className={tokenClass}>
        <h1 className="center">{title}</h1>

        {!xahauNetwork && <TokenTabs />}

        <div className="content-profile">
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center'
            }}
          >
            <div style={{ width: '100%', marginBottom: '20px' }}>
              <TokenSelector value={selectedToken} onChange={setSelectedToken} excludeNative={false} />
            </div>
          </div>
          <div className="column-left">
            {/* Big Token Icon */}
            <img
              alt="token"
              src={tokenImageSrc(token)}
              className="token-image"
              style={{
                width: 'calc(100% - 2px)',
                height: 'auto',
                borderRadius: isRoundTokenImage ? '50%' : undefined,
                aspectRatio: isRoundTokenImage ? '1 / 1' : undefined,
                objectFit: isRoundTokenImage ? 'cover' : undefined
              }}
            />
            <h1>{tokenDisplayCurrency}</h1>

            {/* Action Buttons */}
            {!isNativeToken && !isMptToken && (
              <button className="button-action wide center" onClick={handleSetTrustline}>
                Set Trustline
              </button>
            )}
            {isMptToken && (
              <button className="button-action wide center" onClick={handleAuthorizeMpt}>
                <FaHandshake style={{ fontSize: 18, marginBottom: -4 }} /> Authorize
              </button>
            )}
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
                  <td>{tokenDisplayCurrency}</td>
                </tr>
                {isMptToken && (
                  <tr>
                    <td>MPT ID</td>
                    <td>
                      {mptId} <CopyButton text={mptId} />
                    </td>
                  </tr>
                )}
                {isLpToken && (
                  <tr>
                    <td>AMM pool</td>
                    <td>{lpAmmId ? <Link href={`/amm/${lpAmmId}`}>View pool</Link> : '-'}</td>
                  </tr>
                )}
                {isLpToken && (
                  <tr>
                    <td>Asset 1</td>
                    <td>{renderLpAsset(lpAsset)}</td>
                  </tr>
                )}
                {isLpToken && (
                  <tr>
                    <td>Asset 2</td>
                    <td>{renderLpAsset(lpAsset2)}</td>
                  </tr>
                )}
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
                {!isNativeToken && (
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
                )}
                {!isMptToken && (
                  <tr>
                    <td>Currency code</td>
                    <td className="brake">
                      {token.currencyDetails?.currencyCode || token.currency}{' '}
                      <CopyButton text={token.currencyDetails?.currencyCode || token.currency} />
                    </td>
                  </tr>
                )}
                {!isMptToken ? (
                  <>
                    <tr>
                      <td>Supply</td>
                      <td>
                        {fullNiceNumber(token.supply)} {tokenDisplayCurrency}
                      </td>
                    </tr>
                    <tr>
                      <td>Holders</td>
                      <td>
                        {isNativeToken ? (
                          <Link href="/distribution">{fullNiceNumber(token.holders)}</Link>
                        ) : (
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
                        )}
                      </td>
                    </tr>
                    {!isNativeToken && (
                      <tr>
                        <td>Trustlines</td>
                        <td>{fullNiceNumber(token.trustlines)}</td>
                      </tr>
                    )}
                    <tr>
                      <td>Escrow</td>
                      <td>{escrowStatus}</td>
                    </tr>
                  </>
                ) : (
                  <>
                    <tr>
                      <td>Outstanding</td>
                      <td>{fullNiceNumber(Number(token.outstandingAmount || 0) / 10 ** (token.scale || 0) || 0)}</td>
                    </tr>
                    <tr>
                      <td>Max supply</td>
                      <td>{fullNiceNumber(Number(token.maximumAmount || 0) / 10 ** (token.scale || 0) || 0)}</td>
                    </tr>
                    <tr>
                      <td>Locked amount</td>
                      <td>{fullNiceNumber(Number(token.lockedAmount || 0) / 10 ** (token.scale || 0) || 0)}</td>
                    </tr>
                    <tr>
                      <td>Holders</td>
                      <td>{fullNiceNumber(token.holders || 0)}</td>
                    </tr>
                    <tr>
                      <td>Authorized addresses</td>
                      <td>{fullNiceNumber(token.mptokens || 0)}</td>
                    </tr>
                    <tr>
                      <td>Transfer fee</td>
                      <td>{token.transferFee ? token.transferFee / 1000 + '%' : 'none'}</td>
                    </tr>
                    <tr>
                      <td>Decimal places</td>
                      <td>{token.scale || 0}</td>
                    </tr>
                    <tr>
                      <td>Token sequence</td>
                      <td>{fullNiceNumber(token.sequence || 0)}</td>
                    </tr>
                    <tr>
                      <td>Created</td>
                      <td>
                        {token.createdAt ? (
                          <>
                            {dateFormat(token.createdAt)} {timeFormat(token.createdAt)}
                          </>
                        ) : (
                          '-'
                        )}
                      </td>
                    </tr>
                    <tr>
                      <td>Last updated</td>
                      <td>
                        {token.updatedAt ? (
                          <>
                            {dateFormat(token.updatedAt)} {timeFormat(token.updatedAt)}
                          </>
                        ) : (
                          '-'
                        )}
                      </td>
                    </tr>
                    <tr>
                      <td>Last used</td>
                      <td>
                        {token.lastUsedAt ? (
                          <>
                            {dateFormat(token.lastUsedAt)} {timeFormat(token.lastUsedAt)}
                          </>
                        ) : (
                          '-'
                        )}
                      </td>
                    </tr>
                    <tr>
                      <td>Flags</td>
                      <td>
                        {token.flags
                          ? Object.keys(token.flags)
                              .filter((flag) => token.flags[flag])
                              .join(', ') || 'none set'
                          : 'none'}
                      </td>
                    </tr>
                  </>
                )}
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

            {isMptToken && token.metadata && (
              <table className="table-details">
                <thead>
                  <tr>
                    <th colSpan="100">MPT metadata</th>
                  </tr>
                </thead>
                <tbody>
                  {token.metadata?.name && (
                    <tr>
                      <td>Name</td>
                      <td>{token.metadata.name}</td>
                    </tr>
                  )}
                  {(token.metadata?.description || token.description) && (
                    <tr>
                      <td>Description</td>
                      <td>{token.metadata?.description || token.description}</td>
                    </tr>
                  )}
                  <tr>
                    <td>Raw metadata</td>
                    <td>
                      <pre style={{ maxHeight: 260, overflow: 'auto', margin: 0 }}>
                        <code>{JSON.stringify(token.metadata, null, 2)}</code>
                      </pre>
                    </td>
                  </tr>
                </tbody>
              </table>
            )}

            {/* Price Information */}
            {showPriceInformation && (
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
                      {effectiveNativePrice && (
                        <tr>
                          <td>Last price</td>
                          <td>
                            {priceLine({
                              priceNative: effectiveNativePrice,
                              priceFiat: statistics?.priceFiats[selectedCurrency]
                            })}
                          </td>
                        </tr>
                      )}
                      {changeItems.length > 0 && (
                        <tr>
                          <td>Change</td>
                          <td className="brake">
                            {changeItems.map((item, index) => (
                              <span key={item.key} className="no-brake">
                                {index > 0 && <span className="grey"> | </span>}
                                {item.label}:{' '}
                                {renderPercentCell({
                                  currentPrice: statistics?.priceFiats[selectedCurrency],
                                  pastPrice: item.pastPrice
                                })}
                              </span>
                            ))}
                          </td>
                        </tr>
                      )}
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
                    </>
                  )}
                </tbody>
              </table>
            )}

            {/* Stats for the last 24h */}
            {statistics && (
              <table className="table-details">
                <thead>
                  <tr>
                    <th colSpan="100">Stats for the last 24h</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Volume (total)</td>
                    <td>{volumeLine({ token, type: 'total' })}</td>
                  </tr>
                  <tr>
                    <td>Volume (buy)</td>
                    <td>{volumeLine({ token, type: 'buy' })}</td>
                  </tr>
                  <tr>
                    <td>Volume (sell)</td>
                    <td>{volumeLine({ token, type: 'sell' })}</td>
                  </tr>
                  <tr>
                    <td>Trades</td>
                    <td>{fullNiceNumber(statistics?.dexes || 0)}</td>
                  </tr>
                  <tr>
                    <td>DEX txs</td>
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
                    <td>Transfer volume</td>
                    <td>{volumeLine({ token, type: 'transfer' })}</td>
                  </tr>
                  <tr>
                    <td>Transfer transactions</td>
                    <td>{niceNumber(statistics?.transferTxs || 0)}</td>
                  </tr>
                  <tr>
                    <td>Rippling txs</td>
                    <td>{fullNiceNumber(statistics?.ripplingTxs || 0)}</td>
                  </tr>
                  <tr>
                    <td>Mint volume</td>
                    <td>{volumeLine({ token, type: 'mint' })}</td>
                  </tr>
                  <tr>
                    <td>Mint transactions</td>
                    <td>{shortNiceNumber(statistics?.mintTxs || 0, 0, 1)}</td>
                  </tr>
                  <tr>
                    <td>Burn volume</td>
                    <td>{volumeLine({ token, type: 'burn' })}</td>
                  </tr>
                  <tr>
                    <td>Burn transactions</td>
                    <td>{shortNiceNumber(statistics?.burnTxs || 0, 0, 1)}</td>
                  </tr>
                  <tr>
                    <td>Unique accounts</td>
                    <td>{fullNiceNumber(statistics?.uniqueAccounts || 0)}</td>
                  </tr>
                  {!xahauNetwork && !isMptToken && (
                    <tr>
                      <td>AMM pools</td>
                      <td>
                        <Link
                          href={
                            token?.issuer
                              ? `/amms?currency=${token.currency}&currencyIssuer=${token.issuer}`
                              : `/amms?currency=${token.currency}`
                          }
                        >
                          {statistics?.ammPools || 0}
                        </Link>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}

            {/* Stats for the last closed day */}
            {statistics && (
              <table className="table-details">
                <thead>
                  <tr>
                    <th colSpan="100">Stats for the last closed day</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Trading pairs</td>
                    <td>{fullNiceNumber(statistics?.activeCounters || 0)}</td>
                  </tr>
                  <tr>
                    <td>Active holders</td>
                    <td>{fullNiceNumber(statistics?.activeHolders || 0)}</td>
                  </tr>
                  <tr>
                    <td>Active offers</td>
                    <td>{fullNiceNumber(statistics?.activeOffers || 0)}</td>
                  </tr>
                  {!xahauNetwork && !isMptToken && (
                    <tr>
                      <td>Active AMM pools</td>
                      <td>{niceNumber(statistics?.activeAmmPools || 0)}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { useEffect } from 'react'
import { Link, useRouter } from 'next/router'

import SEO from '../../components/SEO'
import { TData } from '../../components/Table'
import {
  capitalize,
  niceNumber,
  shortNiceNumber,
  fullNiceNumber,
  CurrencyWithIcon,
  AddressWithIconFilled
} from '../../utils/format'
import { axiosServer, getFiatRateServer, passHeaders } from '../../utils/axios'
import { getIsSsrMobile } from '../../utils/mobile'
import {
  isAddressOrUsername,
  nativeCurrency,
  validateCurrencyCode,
  xahauNetwork
} from '../../utils'
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
        const url = `v2/trustlines/token/${issuer}/${currencyCode}?statistics=true&currencyDetails=true`
        const res = await axiosServer({
          method: 'get',
          url,
          headers: passHeaders(req)
        }).catch((error) => {
          initialErrorMessage = error.message
        })

        if (res?.data) {
          initialData = res.data
        } else {
          initialErrorMessage = 'Token not found'
        }
      } catch (e) {
        console.error(e)
        initialErrorMessage = 'Failed to fetch token data'
      }
    }
  }

  const { fiatRateServer, selectedCurrencyServer } = await getFiatRateServer(req)

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
}) {
  const router = useRouter()
  const token = initialData
  const errorMessage = initialErrorMessage || ''
  

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


  // Helper functions for formatting
  const priceToFiat = ({ price, mobile }) => {
    if (!fiatRate || !price) return null
    const priceFiat = price * fiatRate

    if (mobile) {
      return (
        <>
          <span suppressHydrationWarning>{niceNumber(priceFiat, 0, selectedCurrency)}</span>
          <br />
          Price in {nativeCurrency}: {niceNumber(price, 6)}
        </>
      )
    }

    return (
      <>
        <span className="tooltip" suppressHydrationWarning>
          {shortNiceNumber(priceFiat, 2, 1, selectedCurrency)}
          <span className="tooltiptext right no-brake" suppressHydrationWarning>
            {fullNiceNumber(priceFiat, selectedCurrency)}
          </span>
        </span>
        <br />
        <span className="tooltip grey" suppressHydrationWarning>
          {shortNiceNumber(price, 6, 1)} {nativeCurrency}
          <span className="tooltiptext right no-brake" suppressHydrationWarning>
            {fullNiceNumber(price)} {nativeCurrency}
          </span>
        </span>
      </>
    )
  }

  const marketcapToFiat = ({ marketcap, mobile }) => {
    if (!fiatRate || !marketcap) return null
    const marketcapFiat = marketcap * fiatRate

    if (mobile) {
      return (
        <>
          <span suppressHydrationWarning>{niceNumber(marketcapFiat, 0, selectedCurrency)}</span>
          <br />
          Marketcap: {niceNumber(marketcap, 0)} {nativeCurrency}
        </>
      )
    }

    return (
      <>
        <span className="tooltip" suppressHydrationWarning>
          {shortNiceNumber(marketcapFiat, 2, 1, selectedCurrency)}
          <span className="tooltiptext right no-brake" suppressHydrationWarning>
            {fullNiceNumber(marketcapFiat, selectedCurrency)}
          </span>
        </span>
        <br />
        <span className="tooltip grey" suppressHydrationWarning>
          {shortNiceNumber(marketcap, 2, 1)} {nativeCurrency}
          <span className="tooltiptext right no-brake" suppressHydrationWarning>
            {fullNiceNumber(marketcap)} {nativeCurrency}
          </span>
        </span>
      </>
    )
  }

  const volumeToFiat = ({ token, mobile, type }) => {
    const { statistics, currencyDetails } = token
    if (!fiatRate) return null
    let volume
    if (!type || type === 'total') {
      volume = Number(statistics?.buyVolume || 0) + Number(statistics?.sellVolume || 0)
    } else {
      volume = statistics?.[type + 'Volume'] || 0
    }
    const volumeFiat = volume * statistics?.priceXrp * fiatRate || 0

    if (mobile) {
      return (
        <>
          <span suppressHydrationWarning>{niceNumber(volumeFiat, 0, selectedCurrency)}</span>
          <br />
          {type !== 'total' ? capitalize(type) : ''} Volume (24h) token: {niceNumber(volume, 0)}{' '}
          {currencyDetails.currency}
        </>
      )
    }

    return (
      <>
        <span className="tooltip" suppressHydrationWarning>
          {shortNiceNumber(volumeFiat, 2, 1, selectedCurrency)}
          <span className="tooltiptext right no-brake" suppressHydrationWarning>
            {fullNiceNumber(volumeFiat, selectedCurrency)}
          </span>
        </span>
        <br />
        <span className="tooltip grey" suppressHydrationWarning>
          {shortNiceNumber(volume, 2, 1)} {currencyDetails.currency}
          <span className="tooltiptext right no-brake" suppressHydrationWarning>
            {fullNiceNumber(volume)} {currencyDetails.currency}
          </span>
        </span>
      </>
    )
  }

  if (errorMessage) {
    return (
      <>
        <SEO title="Token Not Found" />
        <div className="center">
          <h1>Token Not Found</h1>
          <p>{errorMessage}</p>
          <Link href="/tokens" className="button-action">
            Back to Tokens
          </Link>
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

  console.log(token)

  return (
    <>
      <SEO title={`${token?.currencyDetails?.currency} Token - ${token.issuerDetails?.service || token.issuerDetails?.username || 'Token Details'}`} />
      
      <div className="tx-body">
        <h1 className="tx-header">{token?.currencyDetails?.currency} token</h1>
        <div className="card-block">
          <table className="base">
            <tbody>
              <tr>
                <TData>Token</TData>
                <TData>
                  <CurrencyWithIcon token={token} />
                </TData>
              </tr>
              <tr>
                <TData>Issuer</TData>
                <TData>
                  <AddressWithIconFilled data={token} name="issuer" copyButton={true} />
                </TData>
              </tr>              
              <tr>
                <TData>Currency code</TData>
                <TData>
                  {token.currencyDetails.currencyCode} <CopyButton text={token.currencyDetails.currencyCode} />
                </TData>
              </tr>
              <tr>
                <TData>Description</TData>
                <TData>
                  {token?.description}
                </TData>
              </tr>
              <tr>
                <TData>Price</TData>
                <TData>{priceToFiat({ price: statistics?.priceXrp })}</TData>
              </tr>
              <tr>
                <TData>Market cap</TData>
                <TData>{marketcapToFiat({ marketcap: statistics?.marketcap })}</TData>
              </tr>
              <tr>
                <TData>Supply</TData>
                <TData>
                  <span className="tooltip">
                    {shortNiceNumber(token.supply, 2, 1)} {token.currencyDetails.currency}
                    <span className="tooltiptext">{fullNiceNumber(token.supply)} {token.currencyDetails.currency}</span>
                  </span>
                </TData>
              </tr>
              <tr>
                <TData>Holders</TData>
                <TData>
                  <span className="tooltip">
                    {shortNiceNumber(token.holders, 0, 1)}
                    <span className="tooltiptext">{fullNiceNumber(token.holders)}</span>
                  </span>
                  <br />
                  Active (24h): {niceNumber(statistics?.activeHolders || 0)}
                </TData>
              </tr>
              <tr>
                <TData>Trustlines</TData>
                <TData>
                  <span className="tooltip">
                    {shortNiceNumber(token.trustlines, 0, 1)}
                    <span className="tooltiptext">{fullNiceNumber(token.trustlines)}</span>
                  </span>
                </TData>
              </tr>
              <tr>
                <TData>Volume (24h)</TData>
                <TData>
                  Total: {volumeToFiat({ token, type: 'total' })}
                  <br />
                  Buy: {volumeToFiat({ token, type: 'buy', mobile: true })}
                  <br />
                  Sell: {volumeToFiat({ token, type: 'sell', mobile: true })}
                </TData>
              </tr>
              <tr>
                <TData>Trading activity</TData>
                <TData>
                  Trades (24h): {shortNiceNumber(statistics?.dexes || 0, 0, 1)}
                  <br />
                  Buyers: {niceNumber(statistics?.uniqueBuyers || 0)} | Sellers: {niceNumber(statistics?.uniqueSellers || 0)} | Traders: {niceNumber(statistics?.uniqueDexAccounts || 0)}
                </TData>
              </tr>
              {!xahauNetwork && statistics?.ammPools > 0 && (
                <tr>
                  <TData>AMM Pools</TData>
                  <TData>
                    <a href={`/amms?currency=${token.currency}&currencyIssuer=${token.issuer}`}>
                      {statistics?.ammPools || 0}
                    </a>
                    <br />
                    Active AMM pools (last closed day): {niceNumber(statistics?.activeAmmPools || 0)}
                  </TData>
                </tr>
              )}
              <tr>
                <TData>Transfer activity</TData>
                <TData>
                  Txs (24h): {niceNumber(statistics?.transferTxs || 0)}
                  {statistics?.transferTxs > 0 && (
                    <>
                      <br />
                      Volume (24h): {volumeToFiat({ token, type: 'transfer', mobile: true })}
                    </>
                  )}
                </TData>
              </tr>
              {statistics?.mintTxs > 0 && (
                <tr>
                  <TData>Mint activity</TData>
                  <TData>
                    Txs: {shortNiceNumber(statistics?.mintTxs || 0, 0, 1)}
                    <br />
                    Volume: {volumeToFiat({ token, type: 'mint', mobile: true })}
                  </TData>
                </tr>
              )}
              {statistics?.burnTxs > 0 && (
                <tr>
                  <TData>Burn activity</TData>
                  <TData>
                    Txs: {shortNiceNumber(statistics?.burnTxs || 0, 0, 1)}
                    <br />
                    Volume: {volumeToFiat({ token, type: 'burn', mobile: true })}
                  </TData>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="back-link">
          <Link href="/tokens" className="button-action">Back to All Tokens</Link>
        </div>
      </div>

      <style jsx>{`
        .card-block {
          border-top: 4px solid var(--accent-link);
          box-shadow: 0 1px 3px 0 var(--shadow);
          padding: 8px;
          background: var(--card-bg);
        }
        .tx-body {
          margin: 40px auto;
          width: calc(100% - 40px);
          max-width: 760px;
          z-index: 1;
          position: relative;
        }
        .tx-header {
          margin: 24px 0;
          color: var(--text-main);
          font-size: 16px;
          font-weight: 700;
          text-align: left;
          text-transform: uppercase;
        }

        .back-link {
          text-align: center;
          margin-top: 30px;
        }

        @media (max-width: 768px) {
          .tx-body {
            width: calc(100% - 20px);
            margin: 20px auto;
          }
        }
      `}</style>
    </>
  )
}

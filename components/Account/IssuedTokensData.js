import { useState, useEffect } from 'react'
import axios from 'axios'
import { useTranslation } from 'next-i18next'
import {
  fullDateAndTime,
  shortNiceNumber,
  fullNiceNumber,
  niceCurrency,
  niceNumber,
  CurrencyWithIcon
} from '../../utils/format'
import { nativeCurrency } from '../../utils'

export default function IssuedTokensData({ data, selectedCurrency, pageFiatRate }) {
  const { address, ledgerInfo } = data || {}
  const { ledgerTimestamp, ledgerIndex } = ledgerInfo || {}

  const { t } = useTranslation()
  const [issuedTokens, setIssuedTokens] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!address) return

    const fetchIssuedTokens = async () => {
      setLoading(true)
      setError('')

      let url = `v2/trustlines/tokens?issuer=${address}&limit=100&currencyDetails=true&statistics=true&order=holdersHigh`

      if (ledgerTimestamp) {
        //the endpoint is under development
        url = `v2/obligations/${address}?&ledgerIndex=${ledgerIndex}`
      }

      try {
        const response = await axios(url)
        setIssuedTokens(response.data?.tokens || [])
      } catch (err) {
        console.error('Error fetching issued tokens:', err)
        setError('Failed to load issued tokens')
      } finally {
        setLoading(false)
      }
    }

    fetchIssuedTokens()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address])

  // Don't show the section if there are no issued tokens
  if (!loading && (!issuedTokens || issuedTokens.length === 0)) {
    return ''
  }

  const historicalTitle = ledgerTimestamp ? (
    <span className="red bold"> Historical data ({fullDateAndTime(ledgerTimestamp)})</span>
  ) : (
    ''
  )

  const issuedTokensRows = (mobile = false) =>
    issuedTokens.map((token, i) => {
      const supply = parseFloat(token.supply || 0)
      const stats = token.statistics || {}
      const volume24hToken = (Number(stats.buyVolume || 0) || 0) + (Number(stats.sellVolume || 0) || 0)
      const marketcap = token.statistics?.marketcap || 0

      return (
        <tr key={i}>
          <td className="center" style={{ width: 30 }}>
            {i + 1}
          </td>
          {mobile ? (
            <td className="left">
              <CurrencyWithIcon token={token} copy={true} />
              <span>Price: {fullNiceNumber(stats.priceNativeCurrency * pageFiatRate, selectedCurrency)}</span>
              <br />
              <span>
                Price in {nativeCurrency}: {fullNiceNumber(stats.priceNativeCurrency || 0)} {nativeCurrency}
              </span>
              <br />
              <span>Marketcap: {niceNumber(marketcap * pageFiatRate, 2, selectedCurrency)}</span>
              <br />
              <span>Supply: {fullNiceNumber(supply)}</span>
              <br />
              <span>Holders: {fullNiceNumber(token.holders || 0)}</span>
              <br />
              <span>Trustlines: {fullNiceNumber(token.trustlines || 0)}</span>
              <br />
              <span>
                Volume (24h):{' '}
                {niceNumber(volume24hToken * stats.priceNativeCurrency * pageFiatRate, 2, selectedCurrency)}
              </span>
              <br />
              <span>
                Volume (24h) in {nativeCurrency}: {niceNumber(volume24hToken * stats.priceNativeCurrency || 0, 6)}{' '}
                {nativeCurrency}
              </span>
            </td>
          ) : (
            <>
              <td className="left">
                <CurrencyWithIcon token={token} copy={true} hideIssuer={true} />
              </td>
              <td className="right">
                <span className="tooltip">
                  {shortNiceNumber(stats.priceNativeCurrency * pageFiatRate, 2, 1, selectedCurrency)}
                  <span className="tooltiptext right no-brake">
                    {fullNiceNumber(stats.priceNativeCurrency * pageFiatRate, selectedCurrency)}
                  </span>
                </span>
                <br />
                <span className="tooltip grey">
                  {shortNiceNumber(stats.priceNativeCurrency || 0, 2, 1)} {nativeCurrency}
                  <span className="tooltiptext right no-brake">
                    {fullNiceNumber(stats.priceNativeCurrency || 0)} {nativeCurrency}
                  </span>
                </span>
              </td>
              <td className="right">
                <span className="tooltip">
                  {shortNiceNumber(marketcap * pageFiatRate, 2, 1, selectedCurrency)}
                  <span className="tooltiptext no-brake">
                    {niceNumber(marketcap * pageFiatRate, 2, selectedCurrency)}
                  </span>
                </span>
                <br />
                <span className="tooltip grey">
                  {shortNiceNumber(supply)}
                  <span className="tooltiptext no-brake">{niceNumber(supply, 6)}</span>
                </span>
              </td>
              <td className="right">
                <span className="tooltip">
                  {shortNiceNumber(token.holders || 0, 0, 0)}
                  <span className="tooltiptext no-brake">{fullNiceNumber(token.holders || 0)}</span>
                </span>
              </td>
              <td className="right">
                <span className="tooltip">
                  {shortNiceNumber(token.trustlines || 0, 0, 0)}
                  <span className="tooltiptext no-brake">{fullNiceNumber(token.trustlines || 0)}</span>
                </span>
              </td>
              <td className="right">
                {pageFiatRate && stats?.priceNativeCurrency ? (
                  <>
                    <span className="tooltip" suppressHydrationWarning>
                      {shortNiceNumber(
                        volume24hToken * stats.priceNativeCurrency * pageFiatRate,
                        2,
                        1,
                        selectedCurrency
                      )}
                      <span className="tooltiptext no-brake" suppressHydrationWarning>
                        {niceNumber(volume24hToken * stats.priceNativeCurrency * pageFiatRate, 2, selectedCurrency)}
                      </span>
                    </span>
                    <br />
                    <span className="tooltip grey" suppressHydrationWarning>
                      {shortNiceNumber(volume24hToken, 2, 1)} {niceCurrency(token.currency)}
                      <span className="tooltiptext no-brake" suppressHydrationWarning>
                        {fullNiceNumber(volume24hToken)} {niceCurrency(token.currency)}
                      </span>
                    </span>
                  </>
                ) : (
                  <span className="tooltip">
                    {shortNiceNumber(volume24hToken, 2, 1)}
                    <span className="tooltiptext no-brake">{fullNiceNumber(volume24hToken)}</span>
                  </span>
                )}
              </td>
            </>
          )}
        </tr>
      )
    })

  const tokensCountText = (tokens) => {
    if (!tokens || tokens.length === 0) return '0'
    if (tokens.length === 1) return '1'
    return tokens.length
  }

  return (
    <>
      <table className="table-details hide-on-small-w800">
        <thead>
          <tr>
            <th colSpan="100">
              {tokensCountText(issuedTokens)} Issued Tokens{historicalTitle} [
              <a href={'/tokens?issuer=' + address}>View more details</a>]
            </th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <th>#</th>
            <th className="left">Currency</th>
            <th className="right">Price</th>
            <th className="right">
              Marketcap
              <br />
              Supply
            </th>
            <th className="right">Holders</th>
            <th className="right">Trustlines</th>
            <th className="right">Volume (24h)</th>
          </tr>
          {loading ? (
            <tr>
              <td colSpan="100" className="center">
                <span className="waiting"></span>
                <br />
                {t('general.loading')}
              </td>
            </tr>
          ) : error ? (
            <tr>
              <td colSpan="100" className="center orange bold">
                {error}
              </td>
            </tr>
          ) : (
            issuedTokensRows()
          )}
        </tbody>
      </table>

      <div className="show-on-small-w800">
        <br />
        <center>
          {tokensCountText(issuedTokens)} Issued Tokens{historicalTitle} [
          <a href={'/tokens?issuer=' + address}>View more details</a>]
        </center>
        <br />
        {loading ? (
          <div className="center">
            <span className="waiting"></span>
            <br />
            {t('general.loading')}
          </div>
        ) : error ? (
          <div className="center orange bold">{error}</div>
        ) : issuedTokens.length > 0 ? (
          <table className="table-mobile wide">
            <tbody>
              <tr>
                <th>#</th>
                <th></th>
              </tr>
              {issuedTokensRows(true)}
            </tbody>
          </table>
        ) : (
          <div className="center">No issued tokens found.</div>
        )}
        <br />
      </div>
    </>
  )
}

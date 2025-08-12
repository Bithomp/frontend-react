import { useState, useEffect } from 'react'
import axios from 'axios'
import { useTranslation } from 'next-i18next'
import { fullDateAndTime, shortNiceNumber, fullNiceNumber, CurrencyWithIcon, niceNumber, niceCurrency } from '../../utils/format'
import { xahauNetwork } from '../../utils'

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

  const issuedTokensRows = issuedTokens.map((token, i) => {
    const supply = parseFloat(token.supply || 0)
    const stats = token.statistics || {}
    const volume24hToken = (Number(stats.buyVolume || 0) || 0) + (Number(stats.sellVolume || 0) || 0)
    const uniqueBuyers = stats.uniqueBuyers || 0
    const uniqueSellers = stats.uniqueSellers || 0
    const traders24h = stats.uniqueDexAccounts || 0
    const ammPools = stats.ammPools || 0
    const activeAmmPools = stats.activeAmmPools || 0

    return (
      <tr key={i}>
        <td className="center" style={{ width: 30 }}>
          {i + 1}
        </td>
        <td className="left">
          <CurrencyWithIcon token={token} />
        </td>
        <td className="right">
          <span className="tooltip">
            {shortNiceNumber(supply)}
            <span className="tooltiptext">{fullNiceNumber(supply)}</span>
          </span>
        </td>
        <td className="right">
          <span className="tooltip">
            {shortNiceNumber(token.holders || 0, 0, 0)}
            <span className="tooltiptext">{fullNiceNumber(token.holders || 0)}</span>
          </span>
        </td>
        <td className="right">
          <span className="tooltip">
            {shortNiceNumber(token.trustlines || 0, 0, 0)}
            <span className="tooltiptext">{fullNiceNumber(token.trustlines || 0)}</span>
          </span>
        </td>
        <td className="right">
          {pageFiatRate && stats?.priceXrp ? (
            <>
              <span className="tooltip" suppressHydrationWarning>
                {shortNiceNumber(volume24hToken * stats.priceXrp * pageFiatRate, 2, 1, selectedCurrency)}
                <span className="tooltiptext right no-brake" suppressHydrationWarning>
                  {niceNumber(volume24hToken * stats.priceXrp * pageFiatRate, 0, selectedCurrency)}
                </span>
              </span>
              <br />
              <span className="tooltip grey" suppressHydrationWarning>
                {shortNiceNumber(volume24hToken, 2, 1)} {niceCurrency(token.currency)}
                <span className="tooltiptext right no-brake" suppressHydrationWarning>
                  {niceNumber(volume24hToken, 0)} {niceCurrency(token.currency)}
                </span>
              </span>
            </>
          ) : (
            <span className="tooltip">
              {shortNiceNumber(volume24hToken, 2, 1)}
              <span className="tooltiptext">{fullNiceNumber(volume24hToken)}</span>
            </span>
          )}
        </td>
        <td className="right">
          <span className="tooltip green">
            {shortNiceNumber(uniqueBuyers, 0, 1)}
            <span className="tooltiptext no-brake">{fullNiceNumber(uniqueBuyers)}</span>
          </span>{' '}
          /{' '}
          <span className="tooltip red">
            {shortNiceNumber(uniqueSellers, 0, 1)}
            <span className="tooltiptext no-brake">{fullNiceNumber(uniqueSellers)}</span>
          </span>
          <br />
          <span className="tooltip">
            {shortNiceNumber(traders24h, 0, 1)}
            <span className="tooltiptext no-brake">{fullNiceNumber(traders24h)}</span>
          </span>
        </td>
        {!xahauNetwork && (
          <td className="center">
            <a href={`/amms?currency=${token.currency}&currencyIssuer=${token.issuer}`} className="tooltip">
              {ammPools}
              <span className="tooltiptext no-brake">View AMMs</span>
            </a>
            <br />
            <span className="tooltip green">
              {shortNiceNumber(activeAmmPools, 0, 1)}
              <span className="tooltiptext no-brake">{fullNiceNumber(activeAmmPools)}</span>
            </span>
          </td>
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
              {tokensCountText(issuedTokens)} Issued Tokens{historicalTitle}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <th>#</th>
            <th className="left">Currency</th>
            <th className="right">Supply</th>
            <th className="right">Holders</th>
            <th className="right">Trustlines</th>
            <th className="right">Volume (24h)</th>
            <th className="right">
              Buyers/Sellers
              <br />
              Traders (24h)
            </th>
            {!xahauNetwork && <th className="center">AMMs</th>}
          </tr>
          {loading ? (
            <tr>
              <td colSpan="5" className="center">
                <span className="waiting"></span>
                <br />
                {t('general.loading')}
              </td>
            </tr>
          ) : error ? (
            <tr>
              <td colSpan="5" className="center orange bold">
                {error}
              </td>
            </tr>
          ) : (
            issuedTokensRows
          )}
        </tbody>
      </table>

      <div className="show-on-small-w800">
        <br />
        <center>
          {tokensCountText(issuedTokens)} Issued Tokens{historicalTitle}
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
                <th className="left">Currency</th>
                <th className="right">Supply</th>
                <th className="right">Holders</th>
                <th className="right">Trustlines</th>
                <th className="right">Volume (24h)</th>
                <th className="right">
                  {/* Buyers/Sellers
                  <br /> */}
                  Traders (24h)
                </th>
                {!xahauNetwork && <th className="center">AMMs</th>}
              </tr>
              {issuedTokensRows}
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

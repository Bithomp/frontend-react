import { useState, useEffect } from 'react'
import axios from 'axios'
import { useTranslation } from 'next-i18next'
import { useWidth } from '../../utils'
import { AddressWithIcon, fullDateAndTime, niceCurrency, shortNiceNumber, fullNiceNumber, addressUsernameOrServiceLink } from '../../utils/format'

export default function IssuedTokensData({ address, ledgerTimestamp }) {
  const { t } = useTranslation()
  const width = useWidth()
  const [issuedTokens, setIssuedTokens] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!address) return

    const fetchIssuedTokens = async () => {
      setLoading(true)
      setError('')
      
      try {
        const response = await axios(`v2/trustlines/tokens?issuer=${address}&limit=100&currencyDetails=true${ledgerTimestamp ? '&toDate=' + new Date(ledgerTimestamp).toISOString() : ''}`)
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

  console.log(issuedTokens)
  const issuedTokensRows = issuedTokens.map((token, i) => {
    const supply = parseFloat(token.supply || 0)
    
    return (
      <tr key={i}>
        <td className="center" style={{ width: 30 }}>
          {i + 1}
        </td>
        <td className="left">
          <AddressWithIcon address={token?.issuer} currency={token?.currency}>
            {token.lp_token ? (
              <b>{token.currencyDetails.currency}</b>
            ) : (
              <>
                <b>{niceCurrency(token.currency)}</b>
              </>
            )}
            {token.issuer && (
              <>
                <br />
                {addressUsernameOrServiceLink(token, 'issuer', { short: true })}
              </>
            )}
          </AddressWithIcon>
        </td>
        <td className="right">
          <span className="bold tooltip">
            {shortNiceNumber(supply)}
            <span className="tooltiptext">{fullNiceNumber(supply)}</span>
          </span>
        </td>
        <td className="right">
          <span className="tooltip">
            {shortNiceNumber(token.holders || 0)}
            <span className="tooltiptext">{fullNiceNumber(token.holders || 0)}</span>
          </span>
        </td>
        <td className="right">
          <span className="tooltip">
            {shortNiceNumber(token.trustlines || 0)}
            <span className="tooltiptext">{fullNiceNumber(token.trustlines || 0)}</span>
          </span>
        </td>
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
              <a href={'/tokens?issuer=' + address}>View All</a>]
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
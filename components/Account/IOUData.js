import {
  fullDateAndTime,
  niceCurrency,
  shortNiceNumber,
  amountFormat,
  fullNiceNumber,
  AddressWithIconFilled
} from '../../utils/format'
import { objectsCountText, useWidth } from '../../utils'
import { FaSnowflake, FaLock, FaExchangeAlt, FaIcicles, FaShieldAlt, FaInfoCircle } from 'react-icons/fa'
import { subtract } from '../../utils/calc'
import { useTranslation } from 'next-i18next'
import { useState, useEffect } from 'react'

// Component to display flag icons with tooltips
const FlagIcons = ({ flags }) => {
  if (!flags) return null

  const flagConfigs = [
    {
      key: 'freeze',
      condition: flags.lowFreeze || flags.highFreeze,
      icon: FaSnowflake,
      tooltip: 'Freeze'
    },
    {
      key: 'noRipple',
      condition: flags.lowNoRipple || flags.highNoRipple,
      icon: FaShieldAlt,
      tooltip: 'No Rippling'
    },
    {
      key: 'auth',
      condition: flags.lowAuth || flags.highAuth,
      icon: FaLock,
      tooltip: 'Authorized'
    },
    /*
    {
      key: 'reserve',
      condition: flags.lowReserve || flags.highReserve,
      icon: FaCoins,
      tooltip: 'Reserve'
    },
    */
    {
      key: 'ammNode',
      condition: flags.ammNode,
      icon: FaExchangeAlt,
      tooltip: 'AMM Node'
    },
    {
      key: 'deepFreeze',
      condition: flags.lowDeepFreeze || flags.highDeepFreeze,
      icon: FaIcicles,
      tooltip: 'Deep Freeze'
    }
  ]

  const activeFlags = flagConfigs.filter((flag) => flag.condition)

  return (
    <>
      {activeFlags.length > 0 && (
        <div style={{ display: 'flex', gap: '4px', justifyContent: 'flex-end' }}>
          {activeFlags.map((flag) => {
            const IconComponent = flag.icon
            return (
              <span key={flag.key} className="tooltip no-brake">
                <IconComponent style={{ fontSize: 18, marginBottom: -4 }} />
                <span className="tooltiptext">{flag.tooltip}</span>
              </span>
            )
          })}
        </div>
      )}
    </>
  )
}

// Component to display limits icon with tooltip
const LimitsIcon = ({ trustline }) => {
  if (!trustline) return null

  const highLimit = trustline.HighLimit.value
  const lowLimit = trustline.LowLimit.value

  const biggerLimit = Math.max(highLimit, lowLimit).toString()
  const tooltipText = `Limit: ${
    biggerLimit === highLimit
      ? amountFormat(trustline?.HighLimit, { short: true })
      : amountFormat(trustline?.LowLimit, { short: true })
  }`

  return (
    <span className="tooltip">
      <FaInfoCircle style={{ fontSize: 18, marginBottom: -4 }} />
      <span className="tooltiptext no-brake">{tooltipText}</span>
    </span>
  )
}

export default function IOUData({
  address,
  rippleStateList,
  ledgerTimestamp,
  pageFiatRate,
  selectedCurrency,
  account,
  setSignRequest
}) {
  const width = useWidth()
  const { t } = useTranslation()
  const [totalBalance, setTotalBalance] = useState(0)

  useEffect(() => {
    if (!pageFiatRate || !rippleStateList?.length) return
    const total = rippleStateList.reduce((sum, tl) => {
      const balance = Math.abs(subtract(tl.Balance?.value, tl.LockedBalance?.value ? tl.LockedBalance?.value : 0))
      const tokenWorth = tl.priceNativeCurrencySpot * pageFiatRate * balance || 0
      return sum + tokenWorth
    }, 0)
    setTotalBalance(total)
  }, [rippleStateList, pageFiatRate])

  // if no tokens, and if not loggedin, or loggedin but not the owner of the account, return nothing
  if (!rippleStateList?.length && account?.address !== address) return ''

  const historicalTitle = ledgerTimestamp ? (
    <span className="red bold"> Historical data ({fullDateAndTime(ledgerTimestamp)})</span>
  ) : (
    ''
  )
  /*
  [
    {
        "Balance": {
            "currency": "EUR",
            "issuer": "rrrrrrrrrrrrrrrrrrrrBZbvji",
            "value": "0"
        },
        "Flags": 2228224,
        "HighLimit": {
            "currency": "EUR",
            "issuer": "rwietsevLFg8XSmG3bEZzFein1g8RBqWDZ",
            "value": "1000000000",
            "issuerDetails": {
                "address": "rwietsevLFg8XSmG3bEZzFein1g8RBqWDZ",
                "username": null,
                "service": "XRPL-Labs"
            }
        },
        "HighNode": "1",
        "LedgerEntryType": "RippleState",
        "LowLimit": {
            "currency": "EUR",
            "issuer": "rhub8VRN55s94qWKDv6jmDy1pUykJzF3wq",
            "value": "0",
            "issuerDetails": {
                "address": "rhub8VRN55s94qWKDv6jmDy1pUykJzF3wq",
                "username": "gatehub",
                "service": "GateHub Crypto"
            }
        },
        "LowNode": "1d3b",
        "PreviousTxnID": "089783179C2C22C8B511F760C49BA78336FFA7C6E3CB13BDC72D906C36A84DF3",
        "PreviousTxnLgrSeq": 96124408,
        "index": "1AEA98113F835CA0CAFFA2355F5B280A95AF6D312180053453E462AE73242202",
        "flags": {
            "lowReserve": false,
            "highReserve": true,
            "lowAuth": false,
            "highAuth": false,
            "lowNoRipple": false,
            "highNoRipple": true,
            "lowFreeze": false,
            "highFreeze": false,
            "ammNode": false,
            "lowDeepFreeze": false,
            "highDeepFreeze": false
        },
        "previousTxAt": 1747261031,
        "priceNativeCurrencySpot": "0.34800765616843570559"
    }
  ]
  */

  // Check if user is logged in (has wallet connected)
  const isLoggedIn = account?.address && account?.wallet

  const noTokensNode =
    isLoggedIn && account?.address === address ? (
      "You don't have any tokens."
    ) : (
      <>
        This account doesn't have any tokens
        {!isLoggedIn ? (
          <>
            ,{' '}
            <span onClick={() => setSignRequest({})} className="link underline">
              sign in
            </span>{' '}
            to manage your tokens.
          </>
        ) : (
          '.'
        )}
      </>
    )

  // Sort tokens by fiat value (largest first), with 0 amount tokens at the end
  const sortedTokens = rippleStateList?.length
    ? rippleStateList.sort((a, b) => {
        const balanceA = Math.abs(subtract(a.Balance?.value, a.LockedBalance?.value ? a.LockedBalance?.value : 0))
        const balanceB = Math.abs(subtract(b.Balance?.value, b.LockedBalance?.value ? b.LockedBalance?.value : 0))

        // If both have 0 balance, maintain original order
        if (balanceA === 0 && balanceB === 0) return 0

        // If only one has 0 balance, put it at the end
        if (balanceA === 0) return 1
        if (balanceB === 0) return -1

        // Both have non-zero balance, sort by fiat value (largest first)
        const fiatValueA = a.priceNativeCurrencySpot * balanceA || 0
        const fiatValueB = b.priceNativeCurrencySpot * balanceB || 0

        return fiatValueB - fiatValueA
      })
    : []

  const tokenLength = sortedTokens?.length

  // amount / gateway details / trustline settings
  const tokenRows = tokenLength ? (
    sortedTokens.map((tl, i) => {
      const issuer = tl.HighLimit?.issuer === address ? tl.LowLimit : tl.HighLimit
      const balance = Math.abs(subtract(tl.Balance?.value, tl.LockedBalance?.value ? tl.LockedBalance?.value : 0))

      return (
        <tr key={i}>
          <td className="center" style={{ width: 30 }}>
            {i + 1}
          </td>
          <td className="left">
            <AddressWithIconFilled
              data={issuer}
              name="issuer"
              currency={tl.Balance?.currency}
              options={{ short: width < 970, currencyDetails: tl.Balance?.currencyDetails }}
            />
          </td>
          <td className="right">
            <div style={{ display: 'flex', gap: '4px', justifyContent: 'flex-end', alignItems: 'center' }}>
              <FlagIcons flags={tl.flags} />
              <LimitsIcon trustline={tl} />
            </div>
          </td>
          <td className="right">
            {pageFiatRate && tl.priceNativeCurrencySpot ? (
              <>
                <span className="tooltip bold">
                  {shortNiceNumber(tl.priceNativeCurrencySpot * pageFiatRate * balance || 0, 2, 1, selectedCurrency)}
                  <span className="tooltiptext no-brake">
                    {fullNiceNumber(tl.priceNativeCurrencySpot * pageFiatRate * balance || 0, selectedCurrency)}
                    <br />1 {niceCurrency(tl.Balance?.currency)} ={' '}
                    {fullNiceNumber(tl.priceNativeCurrencySpot * pageFiatRate || 0, selectedCurrency)}
                  </span>
                </span>
                <br />
              </>
            ) : null}
            <span className="tooltip grey">
              {shortNiceNumber(balance)} {niceCurrency(tl.Balance?.currency)}
              <span className="tooltiptext no-brake">
                {fullNiceNumber(balance)} {niceCurrency(tl.Balance?.currency)}
              </span>
            </span>
          </td>
        </tr>
      )
    })
  ) : (
    <tr key="none">
      <td colSpan="100">{noTokensNode}</td>
    </tr>
  )

  const actionLink =
    isLoggedIn && account.address === address ? (
      <>
        [<a href={'/services/trustline'}>Add a token</a>]
      </>
    ) : (
      !isLoggedIn && (
        <>
          [
          <span className="link" onClick={() => setSignRequest({})}>
            Sign In
          </span>
          ]
        </>
      )
    )

  return (
    <div id="tokens-section">
      <table className="table-details hide-on-small-w800">
        <thead>
          <tr>
            <th colSpan="100">
              {objectsCountText(rippleStateList)} {t('menu.tokens')} {historicalTitle}
              {actionLink}
              {totalBalance > 0 && (
                <span style={{ float: 'right' }}>
                  Total worth:{' '}
                  <span className="tooltip bold">
                    {shortNiceNumber(totalBalance, 2, 1, selectedCurrency)}
                    <span className="tooltiptext no-brake">{fullNiceNumber(totalBalance, selectedCurrency)}</span>
                  </span>
                </span>
              )}
            </th>
          </tr>
        </thead>
        <tbody>
          {tokenLength ? (
            <tr>
              <th>#</th>
              <th className="left">Currency</th>
              <th className="right">Params</th>
              <th className="right">Balance</th>
            </tr>
          ) : (
            ''
          )}
          {tokenRows}
        </tbody>
      </table>
      <div className="show-on-small-w800">
        <br />
        <center>
          {objectsCountText(rippleStateList)}
          {t('menu.tokens').toUpperCase()} {historicalTitle}
          {actionLink}
          {totalBalance > 0 && (
            <div>
              <br />
              Total worth:{' '}
              <span className="tooltip bold">
                {shortNiceNumber(totalBalance, 2, 1, selectedCurrency)}
                <span className="tooltiptext no-brake">{fullNiceNumber(totalBalance, selectedCurrency)}</span>
              </span>
            </div>
          )}
        </center>
        <br />
        {!rippleStateList?.length ? (
          <>
            {noTokensNode}
            <br />
          </>
        ) : (
          <table className="table-mobile wide">
            <tbody>
              <tr>
                <th>#</th>
                <th className="left">Currency</th>
                <th className="right">Params</th>
                <th className="right">Balance</th>
              </tr>
              {tokenRows}
            </tbody>
          </table>
        )}
        <br />
      </div>
    </div>
  )
}

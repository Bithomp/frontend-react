import {
  fullDateAndTime,
  niceCurrency,
  shortNiceNumber,
  AddressWithIcon,
  amountFormat,
  userOrServiceName,
  fullNiceNumber
} from '../../utils/format'
import { LinkAccount } from '../../utils/links'
import { useWidth } from '../../utils'
import { FaSnowflake, FaLock, FaExchangeAlt, FaIcicles, FaShieldAlt, FaChartLine } from 'react-icons/fa'
import { subtract } from '../../utils/calc'
import { useTranslation } from 'next-i18next'
import { useState, useEffect } from 'react'
import Link from 'next/link'

const tokensCountText = (rippleStateList) => {
  if (!rippleStateList) return ''
  let countList = rippleStateList.filter((p) => p !== undefined)
  if (countList.length > 1) return countList.length + ' '
  return ''
}

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
      <FaChartLine style={{ fontSize: 18, marginBottom: -4 }} />
      <span className="tooltiptext no-brake">{tooltipText}</span>
    </span>
  )
}

export default function IOUData({ address, rippleStateList, ledgerTimestamp, pageFiatRate, selectedCurrency }) {
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

  // amount / gateway details / trustline settings
  const tokenRows = rippleStateList?.length ? (
    rippleStateList.map((tl, i) => {
      const issuer = tl.HighLimit?.issuer === address ? tl.LowLimit : tl.HighLimit
      const balance = Math.abs(subtract(tl.Balance?.value, tl.LockedBalance?.value ? tl.LockedBalance?.value : 0))

      return (
        <tr key={i}>
          <td className="center" style={{ width: 30 }}>
            {i + 1}
          </td>
          <td className="left">
            <AddressWithIcon address={issuer.issuer} currency={tl.Balance?.currency}>
              <span className="bold">{niceCurrency(tl.Balance?.currency)}</span>{' '}
              {userOrServiceName(issuer.issuerDetails, 'address')}
              <br />
              {width > 800 ? (
                <LinkAccount address={issuer.issuerDetails.address} />
              ) : (
                <LinkAccount address={issuer.issuerDetails.address} short={6} />
              )}
            </AddressWithIcon>
          </td>
          <td className="right">
            <div style={{ display: 'flex', gap: '4px', justifyContent: 'flex-end', alignItems: 'center' }}>
              <LimitsIcon trustline={tl} />
              <FlagIcons flags={tl.flags} />
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
      <td colSpan="100" className="center">
        This account does not hold any issued tokens.
      </td>
    </tr>
  )

  return (
    <>
      <table className="table-details hide-on-small-w800">
        <thead>
          <tr>
            <th colSpan="100">
              {tokensCountText(rippleStateList)} {t('menu.tokens')} {historicalTitle} [
              <a href={'/explorer/' + address}>Old View</a>]
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
          {rippleStateList?.length ? (
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
          {!rippleStateList?.length ? (
            <tr>
              <td className="center" colSpan="100">
                <Link href={'/services/trustline?address=' + address} className="button-action">
                  Add a token
                </Link>
              </td>
            </tr>
          ) : (
            ''
          )}
        </tbody>
      </table>
      <div className="show-on-small-w800">
        <br />
        <center>
          {tokensCountText(rippleStateList)}
          {t('menu.tokens').toUpperCase()} {historicalTitle}[<a href={'/explorer/' + address}>Old View</a>]
          {!rippleStateList?.length && (
            <>
              [<a href={'/services/trustline?address=' + address}>Add a token</a>]
            </>
          )}
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
        {
          <table className="table-mobile wide">
            <tbody>
              <tr>
                <th>#</th>
                <th className="left">Currency</th>
                <th className="right">Balance</th>
                <th className="right">Params</th>
              </tr>
              {tokenRows}
            </tbody>
          </table>
        }
        <br />
      </div>
    </>
  )
}

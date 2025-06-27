import { fullDateAndTime, niceCurrency, shortNiceNumber, AddressWithIcon, amountFormat } from '../../utils/format'
import { LinkAccount } from '../../utils/links'
import { useWidth } from '../../utils'
import { 
  FaSnowflake, 
  FaLock, 
  FaCoins, 
  FaExchangeAlt, 
  FaIcicles,
  FaShieldAlt,
  FaChartLine
} from 'react-icons/fa'

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
      tooltip: 'No Ripple'
    },
    {
      key: 'auth',
      condition: flags.lowAuth || flags.highAuth,
      icon: FaLock,
      tooltip: 'Authorized'
    },
    {
      key: 'reserve',
      condition: flags.lowReserve || flags.highReserve,
      icon: FaCoins,
      tooltip: 'Reserve'
    },
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

  const activeFlags = flagConfigs.filter(flag => flag.condition)

  return (
    <>
      {activeFlags.length > 0 && (
        <div style={{ display: 'flex', gap: '4px', justifyContent: 'flex-end' }}>
          {activeFlags.map((flag) => {
            const IconComponent = flag.icon
            return (
              <span key={flag.key} className="orange tooltip">
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
const LimitsIcon = ({ trustline, userData }) => {
  if (!trustline) return null

  // Determine which limit belongs to the current user vs the other party
  const isUserHighLimit = trustline.HighLimit?.issuer === userData?.address
  const userLimit = isUserHighLimit ? trustline.HighLimit : trustline.LowLimit
  const otherPartyLimit = isUserHighLimit ? trustline.LowLimit : trustline.HighLimit

  const tooltipText = `Trustline Limits:
• User can hold up to: ${amountFormat(userLimit, { short: true })}
• User trusts ${otherPartyLimit.issuerDetails?.service || otherPartyLimit.issuerDetails?.username || 'this issuer'} up to: ${amountFormat(otherPartyLimit, { short: true })}`

  return (
    <span className="blue tooltip">
      <FaChartLine style={{ fontSize: 18, marginBottom: -4 }} />
      <span className="tooltiptext" style={{ whiteSpace: 'pre-line', width: '300px' }}>{tooltipText}</span>
    </span>
  )
}

export default function IOUData({ rippleStateList, ledgerTimestamp, userData }) {
  const width = useWidth()
  //show the section only if there are tokens to show
  if (!rippleStateList?.length) return ''

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
        "previousTxAt": 1747261031
    }
  ]
  */

  // amount / gateway details / trustline settings
  const tokenRows = rippleStateList.map((tl, i) => {
    const issuer = tl.HighLimit?.issuer === userData?.address ? tl.LowLimit : tl.HighLimit
    const serviceOrUsername = () => {
      if (issuer.issuerDetails.service) {
        return (
          <span className="bold green">
            {issuer.issuerDetails.service}
          </span>
        )
      } else if (issuer.issuerDetails.username) {
        return (
          <span className="bold blue">
            {issuer.issuerDetails.username}
          </span>
        )
      }
      return ''
    }

    return (
      <tr key={i}>
        <td className="center" style={{ width: 30 }}>{i + 1}</td>
        <td className="left">
          <AddressWithIcon address={issuer.issuer}>
            {niceCurrency(tl.Balance?.currency)} {serviceOrUsername()}
            <br />
            {width > 800 ? <LinkAccount address={issuer.issuerDetails.address} /> : <LinkAccount address={issuer.issuerDetails.address} short={6} />}
          </AddressWithIcon>
        </td>
        <td className="right">{shortNiceNumber(Math.abs(tl.Balance?.value))}</td>
        <td className="right">
          <div style={{ display: 'flex', gap: '4px', justifyContent: 'flex-end', alignItems: 'center' }}>
            <LimitsIcon trustline={tl} userData={userData} />
            <FlagIcons flags={tl.flags} />
          </div>
        </td>
      </tr>
    )
  })

  return (
    <>
      <table className="table-details hide-on-small-w800">
        <thead>
          <tr>
            <th colSpan="100">{tokensCountText(rippleStateList)} Tokens (IOUs){historicalTitle}</th>
          </tr>          
        </thead>
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
      <div className="show-on-small-w800">
        <br />
        <center>
          {tokensCountText(rippleStateList)}
          {'Tokens (IOUs)'.toUpperCase()}
          {historicalTitle}
        </center>
        <br />
        {rippleStateList.length > 0 && (
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
        )}
      </div>
    </>
  )
}

import { i18n } from 'next-i18next'
import { objectsCountText, shortName } from '../../utils'
import {
  addressUsernameOrServiceLink,
  fullDateAndTime,
  shortHash,
  shortNiceNumber,
  timeFromNow
} from '../../utils/format'
import { LinkTx } from '../../utils/links'
import CopyButton from '../UI/CopyButton'

const mptCurrency = (data) => {
  if (!data) return 'N/A'
  let meta = data.metadata
  // MPT tokens
  if (data.mptokenCurrencyDetails) {
    const details = data.mptokenCurrencyDetails
    if (details.currency) return details.currency
    if (!meta) meta = details.metadata
  }
  // Issued mpttokens
  if (meta) {
    return meta.currency || meta.c || 'N/A'
  }
  return 'N/A'
}

const mptName = (data) => {
  if (!data) return 'N/A'
  // Issued mpttokens
  let meta = data.metadata
  // MPT tokens
  if (!meta && data.mptokenCurrencyDetails) {
    meta = data.mptokenCurrencyDetails.metadata
  }

  if (!meta) return 'N/A'
  return meta.name || meta.n || 'N/A'
}

const mptId = (data, isIssued) => {
  if (!data) return null
  if (isIssued) {
    return data.mpt_issuance_id
  }
  return data.MPTokenIssuanceID
}

const showMPTs = ({ list, ledgerTimestamp, isIssued = false }) => {
  const historicalTitle = ledgerTimestamp ? (
    <span className="red bold"> Historical data ({fullDateAndTime(ledgerTimestamp)})</span>
  ) : (
    ''
  )

  /*
    {
      "AssetScale": 2,
      "Flags": 112,
      "Issuer": "rBFSAJNG18bEZe5wQDM8wmPs3x8aVz7YXy",
      "LedgerEntryType": "MPTokenIssuance",
      "MPTokenMetadata": "7B2263223A224F4D47222C226E223A22414D454E222C2264223A225448495320544F4B454E204953205257412046414954482042415345442E205745205052415920544F20524950504C45204153204F5552204C4F52445320414E4420534156494F5552532E2047495645205553204D414E592046524545204D4F4E455920414E4420585250203538392E222C2269223A2268747470733A2F2F667265657376672E6F72672F696D672F313731333336363736335468652D43687269737469616E2D476F642D61732D6F7264696E6172792D70656F706C652D696D6167696E65642D68696D2D666F722D63656E7475726965732E706E67222C22636C223A22727761222C226373223A22696E74656C6C65637475616C5F70726F7065727479222C2261223A22414D454E222C2277223A5B5D7D",
      "MaximumAmount": "100000000000",
      "OutstandingAmount": "6969696969",
      "OwnerNode": "0",
      "PreviousTxnID": "50E51D7D1DBD80B741EDEA923612B1EC017D4FE084732E8E49AD9516B37EDDCE",
      "PreviousTxnLgrSeq": 99228258,
      "Sequence": 99227378,
      "index": "2E95A2C139F606CB89F6A09C2B6310F7DC9842978CA92F3494DE402923763565",
      "mpt_issuance_id": "05EA16F276AA755D480BD7BFE4090A4009C6342909716A36",
      "issuerDetails": {
        "address": "rBFSAJNG18bEZe5wQDM8wmPs3x8aVz7YXy",
        "username": null,
        "service": null
      },
      "metadata": {
        "c": "OMG",
        "n": "AMEN",
        "d": "THIS TOKEN IS RWA FAITH BASED. WE PRAY TO RIPPLE AS OUR LORDS AND SAVIOURS. GIVE US MANY FREE MONEY AND XRP 589.",
        "i": "https://freesvg.org/img/1713366763The-Christian-God-as-ordinary-people-imagined-him-for-centuries.png",
        "cl": "rwa",
        "cs": "intellectual_property",
        "a": "AMEN",
        "w": []
      },
      "flags": {
        "locked": false,
        "canLock": false,
        "requireAuth": false,
        "canEscrow": false,
        "canTrade": true,
        "canTransfer": true,
        "canClawback": true
      },
      "previousTxAt": 1759331702
    }

    {
      "Account": "rUcPfT7wdGuA8YZiwt58PJCrgzF5UHAaqz",
      "Flags": 0,
      "LedgerEntryType": "MPToken",
      "MPTAmount": "1",
      "MPTokenIssuanceID": "05EA170476AA755D480BD7BFE4090A4009C6342909716A36",
      "OwnerNode": "0",
      "PreviousTxnID": "2B17C0AF7FC0627405169D1D6B94522F5A80C75BC3194193BFCE3A3C3C6536CB",
      "PreviousTxnLgrSeq": 99234444,
      "index": "68DEF1CDC736F90CE84274AD8C06262385DD5BD361D7F53AB3607157C2A14523",
      "accountDetails": {
        "address": "rUcPfT7wdGuA8YZiwt58PJCrgzF5UHAaqz",
        "username": null,
        "service": null
      },
      "mptokenCurrencyDetails": {
        "type": "mp_token",
        "mptokenIssuanceID": "05EA170476AA755D480BD7BFE4090A4009C6342909716A36",
        "account": "rBFSAJNG18bEZe5wQDM8wmPs3x8aVz7YXy",
        "accountDetails": {
          "address": "rBFSAJNG18bEZe5wQDM8wmPs3x8aVz7YXy",
          "username": null,
          "service": null
        },
        "scale": null,
        "currency": "SDS",
        "metadata": {
          "c": "SDS",
          "n": "dfadad",
          "d": "asssssssss",
          "cl": "stablecoin",
          "a": "dfadad"
        }
      },
      "flags": {
        "locked": false,
        "authorized": false
      },
      "previousTxAt": 1759355640
    }
  */

  const title = (isIssued ? 'Issued ' : '') + 'Multi-Purpose Tokens'

  return (
    <div id={'mpt-section' + (isIssued ? '-issued' : '')}>
      <table className="table-details hide-on-small-w800">
        <thead>
          <tr>
            <th colSpan="100">
              {objectsCountText(list)}
              {title}
              {historicalTitle}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <th>#</th>
            <th className="left">ID</th>
            <th className="left">Currency</th>
            <th className="right">Name</th>
            {isIssued ? (
              <>
                <th className="right">Outstanding</th>
                <th className="right">Max</th>
              </>
            ) : (
              <>
                <th className="right">Issuer</th>
                <th className="right">Balance</th>
              </>
            )}
          </tr>
          {list.map((c, i) => {
            const cMptId = mptId(c, isIssued)
            return (
              <tr key={i}>
                <td className="center" style={{ width: 30 }}>
                  {i + 1}
                </td>
                <td>
                  <CopyButton text={cMptId} />
                </td>
                <td className="left">{mptCurrency(c)}</td>
                <td className="right">{shortName(mptName(c), { maxLength: 10 })}</td>
                {isIssued ? (
                  <>
                    <td className="right">
                      {shortNiceNumber(c.OutstandingAmount * Math.pow(10, -1 * (c.AssetScale || 0)))}
                    </td>
                    <td className="right">
                      {shortNiceNumber(c.MaximumAmount * Math.pow(10, -1 * (c.AssetScale || 0)))}
                    </td>
                  </>
                ) : (
                  <>
                    <td className="right">
                      {c.mptokenCurrencyDetails &&
                        addressUsernameOrServiceLink(c.mptokenCurrencyDetails, 'account', { short: true })}
                    </td>
                    <td className="right">
                      {shortNiceNumber(c.MPTAmount * Math.pow(10, -1 * (c.mptokenCurrencyDetails?.scale || 0)) || 0)}
                    </td>
                  </>
                )}
              </tr>
            )
          })}
        </tbody>
      </table>
      <div className="show-on-small-w800">
        <br />
        <center>
          {objectsCountText(list)}
          {title.toUpperCase()}
          {historicalTitle}
        </center>
        <br />
        {list.map((c, i) => {
          const cMptId = mptId(c, isIssued)
          return (
            <table className="table-mobile wide" key={i}>
              <tbody>
                <tr>
                  <td className="center">{i + 1}</td>
                  <td>
                    <p>
                      <span className="grey">ID</span> {shortHash(cMptId)} <CopyButton text={cMptId} />
                    </p>
                    <p>
                      <span className="grey">Currency</span> {mptCurrency(c)}
                    </p>
                    <p>
                      <span className="grey">Name</span> {mptName(c)}
                    </p>
                    {isIssued ? (
                      <>
                        <p>
                          <span className="grey">Outstanding amount</span> {shortNiceNumber(c.OutstandingAmount)}
                        </p>
                        <p>
                          <span className="grey">Maximum amount</span> {shortNiceNumber(c.MaximumAmount)}
                        </p>
                      </>
                    ) : (
                      <>
                        <p>
                          <span className="grey">Issuer</span>
                          {(c.mptokenCurrencyDetails &&
                            addressUsernameOrServiceLink(c.mptokenCurrencyDetails, 'account', { short: true })) ||
                            'N/A'}
                        </p>
                        <p>
                          <span className="grey">Amount</span> {shortNiceNumber(c.MPTAmount || 0)}
                        </p>
                      </>
                    )}
                    <p>
                      <span className="grey">Last update</span> {timeFromNow(c.previousTxAt, i18n)}{' '}
                      <LinkTx tx={c.PreviousTxnID} icon={true} />
                    </p>
                  </td>
                </tr>
              </tbody>
            </table>
          )
        })}
      </div>
    </div>
  )
}

export default function MPTData({ mptList, mptIssuanceList, ledgerTimestamp }) {
  return (
    <>
      {mptList?.length > 0 && showMPTs({ list: mptList, ledgerTimestamp })}
      {mptIssuanceList?.length > 0 && showMPTs({ list: mptIssuanceList, ledgerTimestamp, isIssued: true })}
    </>
  )
}

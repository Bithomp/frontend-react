import { i18n } from 'next-i18next'
import { objectsCountText } from '../../utils'
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

  const title = (isIssued ? 'Issued ' : '') + 'Multi-Purpose Tokens'

  return (
    <>
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
                <th className="right">Amount</th>
              </>
            )}
            <th>Last update</th>
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
                <td className="right">{mptName(c)}</td>
                {isIssued ? (
                  <>
                    <td className="right">{shortNiceNumber(c.OutstandingAmount)}</td>
                    <td className="right">{shortNiceNumber(c.MaximumAmount)}</td>
                  </>
                ) : (
                  <>
                    <td className="right">
                      {addressUsernameOrServiceLink(c.mptokenCurrencyDetails, 'account', { short: true })}
                    </td>
                    <td className="right">{shortNiceNumber(c.MPTAmount || 0)}</td>
                  </>
                )}
                <td className="center">
                  {timeFromNow(c.previousTxAt, i18n)} <LinkTx tx={c.PreviousTxnID} icon={true} />
                </td>
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
                          <span className="grey">Issuer</span>{' '}
                          {addressUsernameOrServiceLink(c.mptokenCurrencyDetails, 'account', { short: true }) || 'N/A'}
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
    </>
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

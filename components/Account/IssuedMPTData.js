import { i18n } from 'next-i18next'
import { objectsCountText } from '../../utils'
import { fullDateAndTime, shortHash, shortNiceNumber, timeFromNow, timeOrDate } from '../../utils/format'
import { LinkTx } from '../../utils/links'
import CopyButton from '../UI/CopyButton'

const mptCurrency = (meta) => {
  return meta.currency || meta.c || 'N/A'
}

const mptName = (meta) => {
  return meta.name || meta.n || 'N/A'
}

export default function IssuedMPTData({ mptIssuanceList, ledgerTimestamp }) {
  if (!mptIssuanceList || mptIssuanceList.length === 0) return ''

  const historicalTitle = ledgerTimestamp ? (
    <span className="red bold"> Historical data ({fullDateAndTime(ledgerTimestamp)})</span>
  ) : (
    ''
  )

  return (
    <>
      <table className="table-details hide-on-small-w800">
        <thead>
          <tr>
            <th colSpan="100">
              {objectsCountText(mptIssuanceList)}Issued Multi-Purpose Tokens
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
            <th className="right">Outstanding</th>
            <th className="right">Max</th>
            <th>Last update</th>
          </tr>
          {mptIssuanceList.map((c, i) => (
            <tr key={i}>
              <td className="center" style={{ width: 30 }}>
                {i + 1}
              </td>
              <td>
                <CopyButton text={c.mpt_issuance_id} />
              </td>
              <td className="left">{mptCurrency(c.metadata)}</td>
              <td className="right">{mptName(c.metadata)}</td>
              <td className="right">{shortNiceNumber(c.OutstandingAmount)}</td>
              <td className="right">{shortNiceNumber(c.MaximumAmount)}</td>
              <td className="center">
                {timeFromNow(c.previousTxAt, i18n)} <LinkTx tx={c.PreviousTxnID} icon={true} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="show-on-small-w800">
        <br />
        <center>
          {objectsCountText(mptIssuanceList)}
          {'Multi-Purpose Token issuance'.toUpperCase()}
          {historicalTitle}
        </center>
        <br />
        {mptIssuanceList.map((c, i) => (
          <table className="table-mobile wide" key={i}>
            <tbody>
              <tr>
                <td className="center">{i + 1}</td>
                <td>
                  <p>
                    <span className="grey">ID</span> {shortHash(c.mpt_issuance_id)}{' '}
                    <CopyButton text={c.mpt_issuance_id} />
                  </p>
                  <p>
                    <span className="grey">Currency</span> {mptCurrency(c.metadata)}
                  </p>
                  <p>
                    <span className="grey">Name</span> {mptName(c.metadata)}
                  </p>
                  <p>
                    <span className="grey">Outstanding amount</span> {shortNiceNumber(c.OutstandingAmount)}
                  </p>
                  <p>
                    <span className="grey">Maximum amount</span> {shortNiceNumber(c.MaximumAmount)}
                  </p>
                  <p>
                    <span className="grey">Last update</span> {timeOrDate(c.previousTxAt, i18n)}{' '}
                    <LinkTx tx={c.PreviousTxnID} icon={true} />
                  </p>
                </td>
              </tr>
            </tbody>
          </table>
        ))}
      </div>
    </>
  )
}

import { objectsCountText } from '../../utils'
import { fullDateAndTime, shortHash, timeOrDate } from '../../utils/format'
import { LinkTx } from '../../utils/links'
import CopyButton from '../UI/CopyButton'

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
              {objectsCountText(mptIssuanceList)}Multi-Purpose Token issuance{historicalTitle}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <th>#</th>
            <th className="left">ID</th>
            <th className="right">Outstanding amount</th>
            <th>Last update</th>
          </tr>
          {mptIssuanceList.map((c, i) => (
            <tr key={i}>
              <td className="center" style={{ width: 30 }}>
                {i + 1}
              </td>
              <td>
                {shortHash(c.mpt_issuance_id)} <CopyButton text={c.mpt_issuance_id} />
              </td>
              <td className="right">{c.OutstandingAmount}</td>
              <td className="center">
                {timeOrDate(c.previousTxAt)} <LinkTx tx={c.PreviousTxnID} icon={true} />
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
                    <span className="grey">Outstanding amount</span> {c.OutstandingAmount}
                  </p>
                  <p>
                    <span className="grey">Last update</span> {timeOrDate(c.previousTxAt)}{' '}
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

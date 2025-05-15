import { fullDateAndTime } from '../../utils/format'

export default function IOUData({ rippleStateList, ledgerTimestamp }) {
  const title = ledgerTimestamp ? (
    <span className="red bold">Historical Token data ({fullDateAndTime(ledgerTimestamp)})</span>
  ) : (
    'Tokens (IOUs)'
  )

  const tokensNode = !rippleStateList ? (
    'Loading...'
  ) : rippleStateList?.length > 0 ? (
    <span>There are {rippleStateList?.length} tokens</span>
  ) : (
    "This account doesn't hold Tokens."
  )

  return (
    <>
      <table className="table-details hide-on-small-w800">
        <thead>
          <tr>
            <th colSpan="100">{title}</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Status</td>
            <td>{tokensNode}</td>
          </tr>
        </tbody>
      </table>
      <div className="show-on-small-w800">
        <br />
        <center>{title}</center>
        <p>
          <span className="grey">Status</span> {tokensNode}
        </p>
      </div>
      <style jsx>{``}</style>
    </>
  )
}

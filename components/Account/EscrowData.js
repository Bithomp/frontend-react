import { fullDateAndTime } from '../../utils/format'

export default function EscrowData({ escrowList, ledgerTimestamp }) {
  //show the section only if there are escrows to show
  if (!escrowList?.length) return ''

  const title = ledgerTimestamp ? (
    <span className="red bold">Historical Escrow data ({fullDateAndTime(ledgerTimestamp)})</span>
  ) : (
    'Escrows'
  )

  const statusNode = !escrowList ? 'Loading...' : <span>There are {escrowList?.length} escrows</span>

  //console.log(escrowList) //delete

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
            <td>{statusNode}</td>
          </tr>
        </tbody>
      </table>
      <div className="show-on-small-w800">
        <br />
        <center>{title}</center>
        <p>
          <span className="grey">Status</span> {statusNode}
        </p>
      </div>
      <style jsx>{``}</style>
    </>
  )
}

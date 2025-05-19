import { fullDateAndTime } from '../../utils/format'

export default function DexOrdersData({ offerList, ledgerTimestamp }) {
  //show the section only if there are dex orders to show
  if (!offerList?.length) return ''

  const title = ledgerTimestamp ? (
    <span className="red bold">Historical DEX orders data ({fullDateAndTime(ledgerTimestamp)})</span>
  ) : (
    'DEX orders'
  )

  const statusNode = !offerList ? 'Loading...' : <span>There are {offerList?.length} DEX orders</span>

  //console.log(offerList) //delete

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

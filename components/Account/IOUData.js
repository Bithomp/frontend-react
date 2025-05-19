import { fullDateAndTime } from '../../utils/format'

export default function IOUData({ rippleStateList, ledgerTimestamp }) {
  //show the section only if there are tokens to show
  if (!rippleStateList?.length) return ''

  const title = ledgerTimestamp ? (
    <span className="red bold">Historical Token data ({fullDateAndTime(ledgerTimestamp)})</span>
  ) : (
    'Tokens (IOUs)'
  )

  const statusNode = !rippleStateList ? 'Loading...' : <span>There are {rippleStateList?.length} tokens</span>

  // console.log(rippleStateList) //delete
  // amount / gateway details / trustline settings

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

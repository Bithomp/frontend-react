export default function EvernodeLease({ data }) {
  return (
    <table className="table-details autowidth">
      <thead>
        <tr>
          <th colSpan="100">Evernode lease</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>Version</td>
          <td>{data.version}</td>
        </tr>
        <tr>
          <td>Lease Index</td>
          <td>{data.leaseIndex}</td>
        </tr>
        <tr>
          <td>Half Tos</td>
          <td>{data.halfTos}</td>
        </tr>
        <tr>
          <td>Lease amount</td>
          <td>{data.leaseAmount} EVR</td>
        </tr>
        <tr>
          <td>Identifier</td>
          <td>{data.identifier}</td>
        </tr>
        <tr>
          <td>IP</td>
          <td>{data.ip}</td>
        </tr>
      </tbody>
    </table>
  )
}

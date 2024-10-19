import { fullDateAndTime, txIdLink } from '../../utils/format'
import CountryWithFlag from '../UI/CountryWithFlag'
import Mailto from 'react-protected-mailto'
import { LedgerLink } from '../../utils/links'
import CopyButton from '../UI/CopyButton'

export default function EvernodeRegistartion({ data }) {
  return (
    <table className="table-details autowidth">
      <thead>
        <tr>
          <th colSpan="100">Evernode registration</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>Country</td>
          <td>
            <CountryWithFlag countryCode={data.countryCode} />
          </td>
        </tr>
        <tr>
          <td>Timestamp</td>
          <td>{fullDateAndTime(data.timestamp)}</td>
        </tr>
        <tr>
          <td>Ledger index</td>
          <td>
            <LedgerLink version={data.ledgerIndex} />
          </td>
        </tr>
        <tr>
          <td>Hash</td>
          <td>
            {txIdLink(data.hash, 6)} <CopyButton text={data.hash} />{' '}
          </td>
        </tr>
        <tr>
          <td>Amount</td>
          <td>{data.amount} EVR</td>
        </tr>
        <tr>
          <td>CPU MicroSec</td>
          <td>{data.cpuMicroSec}</td>
        </tr>
        <tr>
          <td>RAM MB</td>
          <td>{data.ramMb}</td>
        </tr>
        <tr>
          <td>Disk MB</td>
          <td>{data.diskMb}</td>
        </tr>
        <tr>
          <td>Total instance count</td>
          <td>{data.totalInstanceCount}</td>
        </tr>
        <tr>
          <td>CPU model</td>
          <td>{data.cpuModel}</td>
        </tr>
        <tr>
          <td>CPU count</td>
          <td>{data.cpuCount}</td>
        </tr>
        <tr>
          <td>CPU speed</td>
          <td>{data.cpuSpeed}</td>
        </tr>
        {data.description && (
          <tr>
            <td>Description</td>
            <td>{data.description}</td>
          </tr>
        )}
        {data.leaseAmount && (
          <tr>
            <td>Lease amount</td>
            <td>{data.leaseAmount}</td>
          </tr>
        )}
        <tr>
          <td colspan="2" className="center no-brake">
            <Mailto email={data.emailAddress} />
          </td>
        </tr>
      </tbody>
    </table>
  )
}

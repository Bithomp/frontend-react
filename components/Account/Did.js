import { i18n } from 'next-i18next'
import { codeHighlight, fullDateAndTime, shortHash, timeFromNow, txIdLink } from '../../utils/format'
import CopyButton from '../UI/CopyButton'
import { decode } from '../../utils'

export default function Did({ data }) {
  /*
  "did": {
    "didID": "ECE205A44D95E5D7A008823BFCBC597788F840F64AB93E0503A48F6E06B4319F",
    "address": "rGBAxRJGKz6Zu2ETRThs8yEGxhbRCqijcG",
    "uri": "68747470733A2F2F676174657761792E70696E6174612E636C6F75642F697066732F516D574A735766794A47346A6137754C41465A754D466B77487575346A78434B75726E714E4637784C6E796F426E",
    "data": null,
    "didDocument": null,
    "createdAt": 1731190361,
    "updatedAt": 1731487620,
    "createdTxHash": "4855B5A2A2D922DF11D0A54DD1D16DE10FCF26949EA6C2356C12D4897EB89123",
    "updatedTxHash": "3DCF0B0F4E775CD8C3C03BB2BD0078DB31FEBC129C9BD20D82440C3C63122E88",
    "url": "https://ipfs.io/ipfs/QmWJsWfyJG4ja7uLAFZuMFkwHuu4jxCKurnqNF7xLnyoBn",
    "metadata": {
      "@context": ["https://www.w3.org/2018/credentials/v1", "https://www.w3.org/2018/credentials/examples/v1"],
      "id": "a0da78e4-491b-4f75-b514-35707c75ab89",
      "type": ["VerifiableCredential", "TrainingCredential"],
      "issuer": "rGBAxRJGKz6Zu2ETRThs8yEGxhbRCqijcG",
      "issuanceDate": "2024-11-13T08:46:54.566Z",
      "credentialSubject": {
        "did": "did:xrpl:1:rwJfQ9UCkQ81Z2J5fpqbAh6WRwxkX6SG1T",
        "name": "XRP Ledger Education Week - Building on XRP Ledger",
        "provider": "XRPL Commons",
        "location": "Paris, France",
        "date": "4-7 November 2024"
      },
      "image": "https://www.cr3dential.com/images/logo-xrpl-commons.jpg",
      "proof": {
        "type": "XrplSecp256k1Signature2019",
        "created": "2024-11-13T08:46:54.566Z",
        "verificationMethod": "did:xrpl:1:rwJfQ9UCkQ81Z2J5fpqbAh6WRwxkX6SG1T#keys-1",
        "proofPurpose": "assertionMethod",
        "proofValue": { "code": -32603 }
      }
    }
  },
  */

  return (
    <table className="table-details">
      <thead>
        <tr>
          <th colSpan="100">Decentralized Identifier (DID)</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>DID ID</td>
          <td>
            {shortHash(data.didID, 10)} <CopyButton text={data.didID} />
          </td>
        </tr>
        {data.data && (
          <tr>
            <td>Data</td>
            <td>{decode(data.data)}</td>
          </tr>
        )}
        {data.didDocument && (
          <tr>
            <td>DID Document</td>
            <td>{decode(data.didDocument)}</td>
          </tr>
        )}
        <tr>
          <td>Created At</td>
          <td>
            {timeFromNow(data.createdAt, i18n)} ({fullDateAndTime(data.createdAt)}) {txIdLink(data.createdTxHash, 0)}
          </td>
        </tr>
        <tr>
          <td>Updated At</td>
          <td>
            {timeFromNow(data.updatedAt, i18n)} ({fullDateAndTime(data.updatedAt)}) {txIdLink(data.updatedTxHash, 0)}
          </td>
        </tr>
        <tr>
          <td>URL</td>
          <td>
            <pre>{data.url}</pre>
          </td>
        </tr>
        <tr>
          <td>Metadata</td>
          <td>{codeHighlight(data.metadata)}</td>
        </tr>
      </tbody>
    </table>
  )
}

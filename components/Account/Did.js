import { i18n } from 'next-i18next'
import { codeHighlight, fullDateAndTime, shortHash, timeFromNow } from '../../utils/format'
import CopyButton from '../UI/CopyButton'
import { decode, isUrlValid } from '../../utils'
import { useTranslation } from 'next-i18next'
import { LinkTx } from '../../utils/links'

export default function Did({ data, setSignRequest, account, ledgerTimestamp }) {
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

  const { t } = useTranslation()

  const title = ledgerTimestamp ? (
    <span className="red bold">Historical DID data ({fullDateAndTime(ledgerTimestamp)})</span>
  ) : (
    'Decentralized Identifier (DID)'
  )

  const didData = data?.ledgerInfo?.did

  if (!didData) return ''

  const url = decode(didData.uri)

  const idNode = (
    <>
      {shortHash(didData.didID, 10)} <CopyButton text={didData.didID} />
    </>
  )

  const dataNode = decode(didData.data)
  const documentNode = decode(didData.didDocument)
  const metadataNode = codeHighlight(didData.metadata)

  const actionsNode = (
    <>
      <button
        className="button-action thin button-margin"
        onClick={() =>
          setSignRequest({
            action: 'setDid',
            request: {
              TransactionType: 'DIDSet',
              Account: data?.address
            }
          })
        }
        disabled={!data?.ledgerInfo?.activated}
      >
        {t('button.update-did', { ns: 'account' })}
      </button>{' '}
      {data?.ledgerInfo?.did && (
        <button
          className="button-action thin button-margin"
          onClick={() =>
            setSignRequest({
              request: {
                TransactionType: 'DIDDelete',
                Account: data?.address
              }
            })
          }
          disabled={!data?.ledgerInfo?.activated}
        >
          {t('button.delete-did', { ns: 'account' })}
        </button>
      )}
    </>
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
            <td>DID ID</td>
            <td>{idNode}</td>
          </tr>
          {didData.data && (
            <tr>
              <td>Data</td>
              <td>{dataNode}</td>
            </tr>
          )}
          {didData.didDocument && (
            <tr>
              <td>DID Document</td>
              <td>{documentNode}</td>
            </tr>
          )}
          {didData.createdAt && (
            <tr>
              <td>Created</td>
              <td>
                {timeFromNow(didData.createdAt, i18n)} ({fullDateAndTime(didData.createdAt)}){' '}
                <LinkTx tx={didData.createdTxHash} icon={true} />
              </td>
            </tr>
          )}
          {didData.updatedAt && didData.updatedAt !== didData.createdAt && (
            <tr>
              <td>Updated</td>
              <td>
                {timeFromNow(didData.updatedAt, i18n)} ({fullDateAndTime(didData.updatedAt)}){' '}
                <LinkTx tx={didData.updatedTxHash} icon={true} />
              </td>
            </tr>
          )}
          {url && (
            <tr>
              <td>URL</td>
              <td>
                {isUrlValid(url) ? (
                  <>
                    <a href={url} target="_blank" rel="noopener noreferrer">
                      {url}
                    </a>{' '}
                    <span className="orange">(unverified)</span>
                  </>
                ) : (
                  <pre>{url}</pre>
                )}
              </td>
            </tr>
          )}
          {didData.metadata && (
            <tr>
              <td>Metadata</td>
              <td>{metadataNode}</td>
            </tr>
          )}
          {data.address === account?.address && !ledgerTimestamp && (
            <tr>
              <td>Actions</td>
              <td className="action-buttons">{actionsNode}</td>
            </tr>
          )}
        </tbody>
      </table>
      <div className="show-on-small-w800">
        <br />
        <center>{title}</center>
        <p>
          <span className="grey">DID ID</span> {idNode}
        </p>
        {didData.data && (
          <p>
            <span className="grey">Data</span>
            <br />
            {dataNode}
          </p>
        )}
        {didData.didDocument && (
          <p>
            <span className="grey">DID Document</span>
            <br />
            {documentNode}
          </p>
        )}
        {didData.createdAt && (
          <p>
            <span className="grey">Created</span> {timeFromNow(didData.createdAt, i18n)}{' '}
            <LinkTx tx={didData.createdTxHash} icon={true} />
          </p>
        )}
        {didData.updatedAt && didData.updatedAt !== didData.createdAt && (
          <p>
            <span className="grey">Updated</span> {timeFromNow(didData.updatedAt, i18n)}{' '}
            <LinkTx tx={didData.updatedTxHash} icon={true} />
          </p>
        )}
        {url && (
          <p>
            <span className="grey">URL</span> <span className="orange">(unverified)</span>
            <br />
            {isUrlValid(url) ? (
              <a href={url} target="_blank" rel="noopener noreferrer">
                {url}
              </a>
            ) : (
              <pre>{url}</pre>
            )}
          </p>
        )}
        {didData.metadata && (
          <p>
            <span className="grey">Metadata</span>
            <br />
            {metadataNode}
          </p>
        )}
        {data.address === account?.address && !ledgerTimestamp && <div className="center">{actionsNode}</div>}
      </div>
      <style jsx>{`
        .action-buttons > :not(:first-child) {
          margin-left: 5px;
        }
        @media (max-width: 800px) {
          .button-margin {
            min-width: unset;
          }
        }
      `}</style>
    </>
  )
}

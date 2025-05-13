import { TData } from '../Table'
import {
  addressUsernameOrServiceLink,
  AddressWithIconFilled,
  amountFormat,
  nativeCurrencyToFiat,
  nftIdLink,
  shortHash
} from '../../utils/format'

import { TransactionCard } from './TransactionCard'
import CopyButton from '../UI/CopyButton'
import { addressBalanceChanges, dappBySourceTag } from '../../utils/transaction'

export const TransactionRemit = ({ data, pageFiatRate, selectedCurrency }) => {
  if (!data) return null

  const { outcome, specification, tx } = data

  const destinationBalanceChangesList = addressBalanceChanges(data, specification.destination.address)

  const isSuccessful = outcome?.result == 'tesSUCCESS'

  /*
  https://docs.xahau.network/technical/protocol-reference/transactions/transaction-types/remit
  {
    tx: {
      "TransactionType": "Remit",
      "Account": "rGvbdrdCxG2tk9ZU2673XmsjRdHCDQEpt7",
      "Amounts": [
        {
          "AmountEntry": {
            "Amount": "1000000"
          }
        }, {
          "AmountEntry": {
            "Amount": {
              "currency": "USD",
              "issuer": "rExKpRKXNz25UAjbckCRtQsJFcSfjL9Er3",
              "value": "1"
          }
          }
        }
      ],
      "Destination": "rG1QQv2nh2gr7RCZ1P8YYcBUKCCN633jCn",
      "URITokenIDs": [
        "714F206C865D334721B2F3388BEAF33AA91BC1D78C71941D10A2A653C873EDD3"
      ],
      "MintURIToken": {
        "Digest": "6F11A4DF4EE794E2800BB361173D454BFBECB3D7506C4F4CB0EC5AE98BE43747",
        "Flags": 1,
        "URI": "697066733A2F2F"
      }
    },
    meta: {
      AffectedNodes: [ [Object], [Object] ],
      TransactionIndex: 83,
      TransactionResult: 'tesSUCCESS',
      delivered_amount: '30000000000000'
    },
    specification: {
      source: {
        address: 'rMJXDzU1N9ZSDzPF7s1i2GGKyjM2wB3iom',
        maxAmount: [Object]
      },
      destination: { address: 'rLD5k36bJkNk1HkYSSCJwM4jBXChHjRViQ', tag: 3681967221 }
    },
    outcome: {
    "result": "tesSUCCESS",
    "timestamp": "2025-05-08T23:07:11.000Z",
    "fee": "0.00001",
    "balanceChanges": [
        {
            "address": "raXdWCS1Ro8gVER2zRQMPn3pm4kLdD7okD",
            "addressDetails": {
                "address": "raXdWCS1Ro8gVER2zRQMPn3pm4kLdD7okD",
                "username": null,
                "service": null
            },
            "balanceChanges": [
                {
                    "currency": "XAH",
                    "value": "-0.20001"
                }
            ]
        },
        {
            "address": "rE3MpMdmESmHhPvLwUJycpx8VdUAkKD1k4",
            "addressDetails": {
                "address": "rE3MpMdmESmHhPvLwUJycpx8VdUAkKD1k4",
                "username": null,
                "service": null
            },
            "balanceChanges": [
                {
                    "currency": "XAH",
                    "value": "0.2"
                }
            ]
        }
    ],
    "uritokenChanges": [
        {
            "address": "rE3MpMdmESmHhPvLwUJycpx8VdUAkKD1k4",
            "addressDetails": {
                "address": "rE3MpMdmESmHhPvLwUJycpx8VdUAkKD1k4",
                "username": null,
                "service": null
            },
            "uritokenChanges": [
                {
                    "status": "added",
                    "uritokenID": "3DA67C2950CE9EE5E0A6897D457E0FF70D7EDEC32058BD69D0DC6DCF150A0B1A",
                    "uri": "697066733A2F2F626166796265696177616279777366776A33376235337373636264716C78706269786B6F746D766B6E657179726133796F767161677A77736B7A612F3030303030352E6A736F6E",
                    "issuer": "raXdWCS1Ro8gVER2zRQMPn3pm4kLdD7okD",
                    "issuerDetails": {
                        "address": "raXdWCS1Ro8gVER2zRQMPn3pm4kLdD7okD",
                        "username": null,
                        "service": null
                    }
                }
            ]
        }
    ],
    "affectedObjects": {
        "uritokens": {
            "3DA67C2950CE9EE5E0A6897D457E0FF70D7EDEC32058BD69D0DC6DCF150A0B1A": {
                "uritokenID": "3DA67C2950CE9EE5E0A6897D457E0FF70D7EDEC32058BD69D0DC6DCF150A0B1A",
                "flags": {
                    "burnable": false
                },
                "uri": "697066733A2F2F626166796265696177616279777366776A33376235337373636264716C78706269786B6F746D766B6E657179726133796F767161677A77736B7A612F3030303030352E6A736F6E",
                "issuer": "raXdWCS1Ro8gVER2zRQMPn3pm4kLdD7okD",
                "owner": "rE3MpMdmESmHhPvLwUJycpx8VdUAkKD1k4",
                "issuerDetails": {
                    "address": "raXdWCS1Ro8gVER2zRQMPn3pm4kLdD7okD",
                    "username": null,
                    "service": null
                },
                "ownerDetails": {
                    "address": "rE3MpMdmESmHhPvLwUJycpx8VdUAkKD1k4",
                    "username": null,
                    "service": null
                }
            }
        }
    },
    "ledgerIndex": 14036661,
    "indexInLedger": 119,
    "ledgerTimestamp": 1746745631
    },
    validated: true
  }
  */

  const optionalAbsAmount = (change) => {
    return (change?.value ? change.value.toString()[0] === '-' : change?.toString()[0] === '-')
      ? {
          ...change,
          value: change?.value ? change?.value.toString().slice(1) : change?.toString().slice(1)
        }
      : change
  }

  //don't show sourcetag if it's the tag of a known dapp
  const dapp = dappBySourceTag(specification.source.tag)

  //find the first nft with status added
  const mintedTokenInfo = outcome?.uritokenChanges
    ?.filter((entry) => entry.address === specification.destination.address)?.[0]
    ?.uritokenChanges.filter((entry) => entry.status === 'added')?.[0]

  return (
    <TransactionCard data={data} pageFiatRate={pageFiatRate} selectedCurrency={selectedCurrency}>
      {!isSuccessful && specification?.source?.addressDetails?.service && (
        <tr>
          <TData className="bold orange">Problem solving</TData>
          <TData className="bold">
            The transaction <span class="red">FAILED</span>, if your balance changed, contact{' '}
            {addressUsernameOrServiceLink(specification.source, 'address')} support.
          </TData>
        </tr>
      )}
      <tr>
        <TData>Source</TData>
        <TData>
          <AddressWithIconFilled data={specification.source} name="address" />
        </TData>
      </tr>
      {specification.source?.tag !== undefined && !dapp && (
        <tr>
          <TData>Source tag</TData>
          <TData className="bold">{specification.source.tag}</TData>
        </tr>
      )}
      <tr>
        <TData>Destination</TData>
        <TData>
          <AddressWithIconFilled data={specification.destination} name="address" />
        </TData>
      </tr>
      {specification.destination?.tag !== undefined && (
        <tr>
          <TData>Destination tag</TData>
          <TData className="bold">{specification.destination.tag}</TData>
        </tr>
      )}
      {tx?.InvoiceID && (
        <tr>
          <TData>Invoice ID</TData>
          <TData>
            {shortHash(tx.InvoiceID, 10)} <CopyButton text={tx.InvoiceID} />
          </TData>
        </tr>
      )}
      <tr>
        <TData>
          Delivered
          {destinationBalanceChangesList.map((change, index) => {
            return <br key={index} />
          })}
        </TData>
        <TData>
          {destinationBalanceChangesList.map((change, index) => (
            <div key={index}>
              <span className={'bold ' + (Number(change?.value) > 0 ? 'green' : 'red')}>
                {amountFormat(optionalAbsAmount(change))}
              </span>
              {change?.issuer && <>({addressUsernameOrServiceLink(change, 'issuer', { short: true })})</>}
              {nativeCurrencyToFiat({
                amount: optionalAbsAmount(change),
                selectedCurrency,
                fiatRate: pageFiatRate
              })}
            </div>
          ))}
        </TData>
      </tr>
      {tx?.URITokenIDs?.length > 0 && (
        <tr>
          <TData>URIToken IDs</TData>
          <TData>
            {tx?.URITokenIDs?.map((id, index) => (
              <div key={index}>{nftIdLink(id)}</div>
            ))}
          </TData>
        </tr>
      )}
      {mintedTokenInfo && (
        <>
          <tr>
            <TData className="bold">
              <br />
              Minted & Delivered NFT
            </TData>
            <TData>
              <br />
              <br />
            </TData>
          </tr>
          <tr>
            <TData colSpan="2">
              <hr />
            </TData>
          </tr>
          <tr>
            <TData>NFT ID</TData>
            <TData>{nftIdLink(mintedTokenInfo.uritokenID)}</TData>
          </tr>
          {mintedTokenInfo.flags?.burnable && (
            <tr>
              <TData>Flag</TData>
              <TData className="orange">burnable</TData>
            </tr>
          )}
          <tr>
            <TData colSpan="2">
              <hr />
            </TData>
          </tr>
        </>
      )}
    </TransactionCard>
  )
}

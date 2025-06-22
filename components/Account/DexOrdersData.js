import { fullDateAndTime, addressUsernameOrServiceLink, niceNumber, amountFormat } from '../../utils/format'
import { divide } from '../../utils/calc'

export default function DexOrdersData({ offerList, ledgerTimestamp }) {
  //show the section only if there are dex orders to show
  if (!offerList?.length) return ''

  // Sort offerList by sequence in ascending order
  const sortedOfferList = [...offerList].sort((a, b) => a.Sequence - b.Sequence)

  const title = ledgerTimestamp ? (
    <span className="red bold">Historical DEX orders data ({fullDateAndTime(ledgerTimestamp)})</span>
  ) : (
    'DEX orders'
  )

  /*
  [
    {
        "Account": "rwietsevLFg8XSmG3bEZzFein1g8RBqWDZ",
        "BookDirectory": "DF3B53548CA2E6F1211A220D4146494E0AC99D6AEDDC5F005D2386F26FC0FFF7",
        "BookNode": "0",
        "Flags": 131072,
        "LedgerEntryType": "Offer",
        "OwnerNode": "3",
        "PreviousTxnID": "02E09F4A7FBF3E76375E472ED249BF97B7E117CFA513C7D05979B54415FDE8BC",
        "PreviousTxnLgrSeq": 78942270,
        "Sequence": 1561,
        "TakerGets": {
            "currency": "POO",
            "issuer": "rshitKoinuxBNACMhL6QLwAsfWCUDxYobm",
            "value": "98900.97291755109",
            "issuerDetails": {
                "address": "rshitKoinuxBNACMhL6QLwAsfWCUDxYobm",
                "username": null,
                "service": null
            }
        },
        "TakerPays": "98900972917551",
        "index": "F9A23DEDE38BAB7E4A6DA7A37DB433FD8F77EA000DC12FF575358A8DBF427C44",
        "flags": {
            "passive": false,
            "sell": true
        },
        "accountDetails": {
            "address": "rwietsevLFg8XSmG3bEZzFein1g8RBqWDZ",
            "username": null,
            "service": "XRPL-Labs"
        },
        "quality": "999999999.9999991",
        "previousTxAt": 1680873430
    }
  ]
  */

  const orderRows = sortedOfferList.map((offer, i) => {
    return (
      <tr key={i}>
        <td className="center" style={{ width: 30 }}>{i + 1}</td>
        <td>
          {amountFormat(offer.TakerGets, { precise: true })}
          {offer.TakerGets?.issuer && <>({addressUsernameOrServiceLink(offer.TakerGets, 'issuer', { short: true })})</>}
        </td>
        <td>
          {amountFormat(offer.TakerPays, { precise: true })}
          {offer.TakerPays?.issuer && <>({addressUsernameOrServiceLink(offer.TakerPays, 'issuer', { short: true })})</>}
        </td>
        <td className={offer.flags?.sell ? 'red' : 'green'}>{offer.flags?.sell ? 'Sell' : 'Buy'}</td>
        {
          offer.flags?.sell ? (
            <td>{niceNumber(divide(offer.quality, 1000000), 0, null, 5)}</td>
          ) : (
            <td>{niceNumber(divide(1, offer.quality * 1000000), 0, null, 5)}</td>
          )
        }
        <td>#{offer.Sequence}</td>
      </tr>
    )
  })

  return (
    <>
      <table className="table-details hide-on-small-w800">
        <thead>
          <tr>
            <th colSpan="100">{title}</th>
          </tr>
          <tr>
            <th>#</th>
            <th>Taker Gets</th>
            <th>Taker Pays</th>
            <th>Type</th>
            <th>Exchange Rate</th>
            <th>Sequence</th>
          </tr>
        </thead>
        <tbody>
          {orderRows}
        </tbody>
      </table>
      <div className="show-on-small-w800">
        <br />
        <center>{title}</center>
        {sortedOfferList.map((offer, i) => {
          return (
            <div key={i} style={{ marginBottom: '6px' }} suppressHydrationWarning>
              <span className="grey">{i + 1}. </span>
              <span className={`${offer.flags?.sell ? 'red' : 'green'} bold`}>{offer.flags?.sell ? 'Sell' : 'Buy'}</span>
              <br />
              <span className="grey">Taker Gets: </span>
              {amountFormat(offer.TakerGets, { precise: true })}
              {offer.TakerGets?.issuer && <>({addressUsernameOrServiceLink(offer.TakerGets, 'issuer', { short: true })})</>}
              <br />
              <span className="grey">Taker Pays: </span>
              {amountFormat(offer.TakerPays, { precise: true })}
              {offer.TakerPays?.issuer && <>({addressUsernameOrServiceLink(offer.TakerPays, 'issuer', { short: true })})</>}
              <br />              
              <span className="grey">Exchange Rate: </span>
              {
                offer.flags?.sell ? (
                  <>
                    {niceNumber(divide(offer.quality, 1000000), 0, null, 5)}
                  </>
                ) : (
                  <>
                    {niceNumber(divide(1, offer.quality * 1000000), 0, null, 5)}
                  </>
                )
              }
              <br />
              <span className="grey">Sequence: </span>
              #{offer.Sequence}
            </div>
          )
        })}
      </div>
      <style jsx>{``}</style>
    </>
  )
}

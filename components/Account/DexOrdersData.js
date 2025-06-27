import { fullDateAndTime, addressUsernameOrServiceLink, niceNumber, amountFormat, niceCurrency } from '../../utils/format'
import { nativeCurrency } from '../../utils'
import { divide, multiply } from '../../utils/calc'
import { MdMoneyOff } from 'react-icons/md'

export default function DexOrdersData({ account, offerList, ledgerTimestamp, setSignRequest }) {
  //show the section only if there are dex orders to show
  if (!offerList?.length) return ''

  // Sort offerList by sequence in ascending order
  const sortedOfferList = [...offerList].sort((a, b) => a.Sequence - b.Sequence)

  const historicalTitle = ledgerTimestamp ? (
    <span className="red bold"> Historical data ({fullDateAndTime(ledgerTimestamp)})</span>
  ) : (
    ''
  )

  const offerListCountText = (offerList) => {
    if (!offerList) return ''
    let countList = offerList.filter((p) => p !== undefined)
    if (countList.length > 1) return countList.length + ' '
    return ''
  }

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
        <td className="center" style={{ width: 30 }}>#{offer.Sequence}</td>
        <td className="left">
          <span className={offer.flags?.sell ? 'red' : 'green'}>
            {offer.flags?.sell ? 'Selling ' : 'Buying '}            
          </span>
          <span className="bold">
            {amountFormat(offer.TakerGets, { short: true })}
            {offer.TakerGets?.issuer && <>({addressUsernameOrServiceLink(offer.TakerGets, 'issuer', { short: true })})</>}
          </span>
          <span className="grey">
            {' for '}
          </span>
          <span className="bold">
            {amountFormat(offer.TakerPays, { short: true })}
            {offer.TakerPays?.issuer && <>({addressUsernameOrServiceLink(offer.TakerPays, 'issuer', { short: true })})</>}
          </span>
        </td>        
        {
          offer.flags?.sell ? (
            <td className="right">
              {
                typeof offer.TakerGets === 'string' ? (
                  <>
                    1 {nativeCurrency} = {niceNumber(multiply(offer.quality, 1000000), 0, null, 5)} {niceCurrency(offer.TakerPays?.currency || nativeCurrency)}
                  </>  
                ) : (
                  <>
                    1 {niceCurrency(offer.TakerGets?.currency)} = {niceNumber(divide(offer.quality, 1000000), 0, null, 5)} {niceCurrency(offer.TakerPays?.currency || nativeCurrency)}
                  </>
                )
              }
            </td>
          ) : (
            <td className="right">
              {
                typeof offer.TakerGets === 'string' ? (
                  <>
                    1 {nativeCurrency} = {niceNumber(divide(1, offer.quality * 1000000), 0, null, 5)} {niceCurrency(offer.TakerPays?.currency || nativeCurrency)}
                  </>
                ) : (
                  <>
                    1 {niceCurrency(offer.TakerGets?.currency)} = {niceNumber(divide(1, offer.quality), 0, null, 5)} {niceCurrency(offer.TakerPays?.currency || nativeCurrency)}
                  </>
                )
              }
            </td>
          )
        }        
        <td className="center">
          { offer.Account === account?.address ? (
            <a
              href="#"
              onClick={() =>
                setSignRequest({
                  request: {
                    TransactionType: 'OfferCancel',
                    OfferSequence: offer.Sequence
                  }
                })
              }
              className="red tooltip"
            >
              <MdMoneyOff style={{ fontSize: 18, marginBottom: -4 }} />
              <span className="tooltiptext">Cancel</span>
            </a>
          ) : (
            <span className="grey tooltip">
              <MdMoneyOff style={{ fontSize: 18, marginBottom: -4 }} />
              <span className="tooltiptext">Cancel</span>
            </span>
          )}
        </td>
      </tr>
    )
  })

  return (
    <>
      <table className="table-details hide-on-small-w800">
        <thead>
          <tr>
            <th colSpan="100">
              {offerListCountText(offerList)} DEX orders{historicalTitle}
              {!account?.address && !ledgerTimestamp && (
                <>
                  {' '}
                  [
                  <a href="#" onClick={() => setSignRequest({})} className="bold">
                    Sign in
                  </a>{' '}
                  to Cancel]
                </>
              )}
            </th>
          </tr>          
        </thead>
        <tbody>
          <tr>
            <th>#</th>
            <th className="left">Offer</th>
            <th className="right">Rate</th>
            <th className="center">Action</th>
          </tr>
          {orderRows}
        </tbody>
      </table>
      <div className="show-on-small-w800">
        <br />
        <center>
          {offerListCountText(offerList)}
          {'DEX Orders'.toUpperCase()}
          {historicalTitle}
        </center>
        <br />
        <table className="table-mobile wide">
          <tbody>
            <tr>
              <th>#</th>
              <th className="left">Offer</th>
              <th className="right">Rate</th>
              <th className="center">Action</th>
            </tr>
            {orderRows}
          </tbody>
        </table>
        <br />
      </div>
    </>
  )
}

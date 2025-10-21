import { fullDateAndTime, niceNumber, niceCurrency, amountFormatWithIcon, fullNiceNumber } from '../../utils/format'
import { nativeCurrency } from '../../utils'
import { divide, multiply } from '../../utils/calc'
import { MdMoneyOff } from 'react-icons/md'
import { FaArrowRight } from 'react-icons/fa'

export default function DexOrdersData({ account, offerList, ledgerTimestamp, setSignRequest, address }) {
  //show the section only if there are dex orders to show
  if (!offerList?.length) return ''

  // Sort offerList by sequence in ascending order and take only the last 5
  const sortedOfferList = [...offerList].sort((a, b) => a.Sequence - b.Sequence).slice(-5)

  const historicalTitle = ledgerTimestamp ? (
    <span className="red bold"> Historical data ({fullDateAndTime(ledgerTimestamp)})</span>
  ) : (
    ''
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

  const getOfferDetails = (sell, offer, type = 'desktop') => {
    return (
      <>
        <span className="bold flex">
          {amountFormatWithIcon({ amount: sell ? offer.TakerGets : offer.TakerPays })}
        </span>
        <span className="grey flex" style={{alignItems: 'center'}}>
          {' '}
          {type === "mobile"
            ? <FaArrowRight />
            : sell
              ? 'wants a minimum of'
              : 'can pay a maximum of'}
          {' '}
        </span>
        <span className="bold flex">
          {amountFormatWithIcon({ amount: sell ? offer.TakerPays : offer.TakerGets })}
        </span>
      </>
    )
  }

  const getRateDetails = (sell, offer) => {
    return sell ? (
      typeof offer.TakerGets === 'string' ? (
        <>
          <span>1 {nativeCurrency} = </span>
          <span className="no-brake">
            {niceNumber(multiply(offer.quality, 1000000), 0, null, 5)}{' '}
            {niceCurrency(offer.TakerPays?.currency || nativeCurrency)}
          </span>
        </>
      ) : typeof offer.TakerPays === 'string' ? (
        <>
          <span>1 {niceCurrency(offer.TakerGets?.currency)} = </span>
          <span className="no-brake">
            {niceNumber(divide(offer.quality, 1000000), 0, null, 5)} {nativeCurrency}
          </span>
        </>
      ) : (
        <>
          <span>1 {niceCurrency(offer.TakerGets?.currency)} = </span>
          <span className="no-brake">
            {niceNumber(offer.quality, 0, null, 5)} {niceCurrency(offer.TakerPays?.currency)}
          </span>
        </>
      )
    ) : typeof offer.TakerGets === 'string' ? (
      <>
        <span>1 {niceCurrency(offer.TakerPays?.currency)} = </span>
        <span className="tooltip">
          <span className="no-brake">
            {niceNumber(divide(1, offer.quality * 1000000), 0, null, 2)} {nativeCurrency}
          </span>
          <span className="tooltiptext no-brake">
            {fullNiceNumber(divide(1, offer.quality * 1000000))} {nativeCurrency}
          </span>
        </span>
      </>
    ) : typeof offer.TakerPays === 'string' ? (
      <>
        <span>1 {nativeCurrency} = </span>
        <span className="tooltip">
          <span className="no-brake">
            {niceNumber(divide(1000000, offer.quality), 0, null, 2)} {niceCurrency(offer.TakerGets?.currency)}
          </span>
          <span className="tooltiptext no-brake">
            {fullNiceNumber(divide(1000000, offer.quality))}
            {niceCurrency(offer.TakerGets?.currency)}
          </span>
        </span>
      </>
    ) : (
      <>
        <span>1 {niceCurrency(offer.TakerPays?.currency)} = </span>
        <span className="tooltip">
          <span className="no-brake">
            {niceNumber(divide(1, offer.quality), 0, null, 2)} {niceCurrency(offer.TakerGets?.currency)}
          </span>
          <span className="tooltiptext no-brake">
            {fullNiceNumber(divide(1, offer.quality))}
            {niceCurrency(offer.TakerGets?.currency)}
          </span>
        </span>
      </>
    )
  }

  const getHeaders = () => {
    return (
      offerList.length > 5 ? (
        <>
          The last 5 DEX orders{historicalTitle} [
          <a href={`/account/${address}/dex`} className="link">
            View all ({offerList.length} total)
          </a>{' '}
          ]
        </>
      ) : (
        <>
          {offerList.length} DEX orders{historicalTitle} [
          <a href={`/account/${address}/dex`} className="link">
            View details
          </a>
          ]
        </>
      )
    )
  }

  const getActionDetails = (offer, type='desktop') => {
    return (
      offer.Account === account?.address ? (
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
          {type ==='desktop' && <MdMoneyOff style={{ fontSize: 18, marginBottom: -4 }} />}
          <span
            className={type === 'desktop' ? 'tooltiptext' : ''}
          >
            {type === 'desktop' ? 'Cancel' : 'Cancel the offer'}
          </span>
        </a>
      ) : (
        <span className="grey tooltip">
          {type ==='desktop' && <MdMoneyOff style={{ fontSize: 18, marginBottom: -4 }} />}
          <span
            className={type === 'desktop' ? 'tooltiptext' : ''}
          >
            {type === 'desktop' ? 'Cancel' : 'Cancel the offer'}
          </span>
        </span>
      )
    )
  }

  const orderRows = sortedOfferList.map((offer, i) => {
    const sell = offer.flags?.sell
    return (
      <tr key={i}>
        <td className="left flex align-items-center gap-2" style={{ width: '100%' }}>
          <span className="tooltip">
            <span className={sell ? 'red' : 'green'}>{sell ? 'Selling ' : 'Buying '}</span>
            <span className="tooltiptext no-brake">Sequence: {offer.Sequence}</span>
          </span>
          {getOfferDetails(sell, offer)}
        </td>
        <td className="right">
          {getRateDetails(sell, offer)}
        </td>
        <td className="center">
          {getActionDetails(offer)}
        </td>
      </tr>
    )
  })

  // Mobile-specific row format
  const mobileOrderRows = sortedOfferList.map((offer, i) => {
    const sell = offer.flags?.sell

    return (
      <tr key={i} className="mobile-dex-row">
        <td colSpan="4">
          <div className="mobile-dex-line1">
            <span className="mobile-dex-sequence">#{offer.Sequence}</span>
            <span className={`mobile-dex-type ${sell ? 'red' : 'green'}`}>{sell ? 'Selling' : 'Buying'}</span>
          </div>

          <div className="mobile-dex-line2 flex align-items-center gap-2">
            <span className="mobile-dex-label">Offer: </span>
            {getOfferDetails(sell, offer, 'mobile')}
          </div>

          <div className="mobile-dex-line3">
            <span className="mobile-dex-label">Rate: </span>
            {getRateDetails(sell, offer)}
          </div>

          <div className="mobile-dex-line3 flex">
            <span className="mobile-dex-label">Action: </span>
            <span className="mobile-dex-action">
              {getActionDetails(offer, 'mobile')}
            </span>
          </div>
        </td>
      </tr>
    )
  })

  return (
    <div id="dex-orders-section">
      <table className="table-details hide-on-small-w800">
        <thead>
          <tr>
            <th colSpan="100">
              {getHeaders()}
              {!account?.address && !ledgerTimestamp && (
                <>
                  {' '}
                  [
                  <span onClick={() => setSignRequest({})} className="link bold">
                    Sign in
                  </span>{' '}
                  to Cancel]
                </>
              )}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <th className="left" style={{ paddingLeft: '20px' }}>
              Offer
            </th>
            <th className="right">Rate</th>
            <th className="center">Action</th>
          </tr>
          {orderRows}
        </tbody>
      </table>
      <div className="show-on-small-w800">
        <br />
        <center>
          {getHeaders()}
        </center>
        <br />
        <table className="table-mobile wide">
          <tbody>{mobileOrderRows}</tbody>
        </table>
        <br />
      </div>
    </div>
  )
}

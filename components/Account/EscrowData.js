import { i18n } from 'next-i18next'
import { fullDateAndTime, amountFormat, timeFromNow, AddressWithIconInline } from '../../utils/format'
import { useState, useEffect } from 'react'
import { objectsCountText, timestampExpired } from '../../utils'
import { TbPigMoney } from 'react-icons/tb'
import { MdMoneyOff } from 'react-icons/md'
import { LinkTx } from '../../utils/links'

export default function EscrowData({ setSignRequest, address, escrowList, ledgerTimestamp }) {
  const [receivedEscrowList, setReceivedEscrowList] = useState([])
  const [sentEscrowList, setSentEscrowList] = useState([])
  const [selfEscrowList, setSelfEscrowList] = useState([])

  useEffect(() => {
    setReceivedEscrowList(escrowList?.filter((escrow) => escrow.Destination === address && escrow.Account !== address))
    setSentEscrowList(escrowList?.filter((escrow) => escrow.Account === address && escrow.Destination !== address))
    setSelfEscrowList(escrowList?.filter((escrow) => escrow.Account === address && escrow.Destination === address))
  }, [escrowList, address])

  const handleEscrowFinish = (escrow) => {
    if (escrow.escrowSequence) {
      setSignRequest({
        request: {
          TransactionType: 'EscrowFinish',
          Owner: escrow.Account,
          OfferSequence: escrow.escrowSequence
        }
      })
    } else {
      console.error('Escrow sequence not available for finish')
    }
  }

  const handleEscrowCancel = (escrow) => {
    if (escrow.escrowSequence) {
      setSignRequest({
        request: {
          TransactionType: 'EscrowCancel',
          Owner: escrow.Account,
          OfferSequence: escrow.escrowSequence
        }
      })
    } else {
      console.error('Escrow sequence not available for cancel')
    }
  }

  const historicalTitle = ledgerTimestamp ? (
    <span className="red bold"> Historical data ({fullDateAndTime(ledgerTimestamp)})</span>
  ) : (
    ''
  )

  const escrowListNode = (escrowList, options) => {
    const adrLabel = options?.type === 'received' ? 'Account' : 'Destination'

    const rows = escrowList.map((escrow, i) => {
      return (
        <tr key={i}>
          <td className="center" style={{ width: 30 }}>
            {i + 1}
          </td>
          {options?.type !== 'self' && (
            <td>
              <AddressWithIconInline data={escrow} name={adrLabel} options={{ short: true }} />
            </td>
          )}
          <td className="right">
            {typeof escrow.DestinationTag !== 'undefined' ? escrow.DestinationTag : <span className="grey">none</span>}
          </td>
          <td className="right">
            {escrow.CancelAfter ? (
              <span className={timestampExpired(escrow.CancelAfter, 'ripple') ? 'red tooltip' : 'tooltip'}>
                {timeFromNow(escrow.CancelAfter, i18n, 'ripple')}
                <span className="tooltiptext">{fullDateAndTime(escrow.CancelAfter, 'ripple')}</span>
              </span>
            ) : (
              <span className="grey">not set</span>
            )}
          </td>
          <td className="right">
            {escrow.FinishAfter ? (
              <span className={timestampExpired(escrow.FinishAfter, 'ripple') ? 'green tooltip' : 'tooltip'}>
                {timeFromNow(escrow.FinishAfter, i18n, 'ripple')}
                <span className="tooltiptext">{fullDateAndTime(escrow.FinishAfter, 'ripple')}</span>
              </span>
            ) : (
              <span className="grey">not set</span>
            )}
          </td>
          <td className="center">
            <LinkTx tx={escrow.PreviousTxnID} icon={true} />
          </td>
          <td className="bold right">{amountFormat(escrow.Amount, { short: true })}</td>
          {!ledgerTimestamp && (
            <td className="center">
              {(() => {
                const canFinish =
                  escrow.FinishAfter &&
                  timestampExpired(escrow.FinishAfter, 'ripple') &&
                  !timestampExpired(escrow.CancelAfter, 'ripple')
                const canCancel = escrow.CancelAfter && timestampExpired(escrow.CancelAfter, 'ripple')

                if (!canFinish && !canCancel) {
                  return <span className="grey">none</span>
                }

                return (
                  <>
                    {canFinish && (
                      <span
                        onClick={(e) => {
                          e.preventDefault()
                          handleEscrowFinish(escrow)
                        }}
                        className="orange tooltip"
                      >
                        <TbPigMoney style={{ fontSize: 18, marginBottom: -4 }} />
                        <span className="tooltiptext">Finish</span>
                      </span>
                    )}
                    {canFinish && canCancel && <span style={{ display: 'inline-block', width: 15 }}> </span>}
                    {canCancel && (
                      <span
                        onClick={(e) => {
                          e.preventDefault()
                          handleEscrowCancel(escrow)
                        }}
                        className="red tooltip"
                      >
                        <MdMoneyOff style={{ fontSize: 18, marginBottom: -4 }} />
                        <span className="tooltiptext">Cancel</span>
                      </span>
                    )}
                  </>
                )
              })()}
            </td>
          )}
        </tr>
      )
    })
    return (
      <>
        <tr>
          <th>#</th>
          {options?.type !== 'self' && <th className="left">{options?.type === 'received' ? 'From' : 'To'}</th>}
          <th className="right">Dest. tag</th>
          <th className="right">Expire</th>
          <th className="right">Unlock</th>
          <th className="center">Tx</th>
          <th className="right">Amount</th>
          {!ledgerTimestamp && <th>Actions</th>}
        </tr>
        {rows}
      </>
    )
  }

  return (
    <div id="escrows-section">
      {receivedEscrowList?.length > 0 && (
        <>
          <table className="table-details hide-on-small-w800">
            <thead>
              <tr>
                <th colSpan="100">
                  {objectsCountText(receivedEscrowList)} Received Escrows {historicalTitle}
                </th>
              </tr>
            </thead>
            <tbody>{escrowListNode(receivedEscrowList, { type: 'received' })}</tbody>
          </table>
          <div className="show-on-small-w800">
            <br />
            <center>
              {objectsCountText(receivedEscrowList)}
              {'Received Escrows'.toUpperCase()}
              {historicalTitle}
            </center>
            <br />
            <table className="table-mobile wide">
              <tbody>{escrowListNode(receivedEscrowList, { type: 'received', mobile: true })}</tbody>
            </table>
          </div>
        </>
      )}
      {sentEscrowList?.length > 0 && (
        <>
          <table className="table-details hide-on-small-w800">
            <thead>
              <tr>
                <th colSpan="100">
                  {objectsCountText(sentEscrowList)} Sent Escrows {historicalTitle}
                </th>
              </tr>
            </thead>
            <tbody>{escrowListNode(sentEscrowList, { type: 'sent' })}</tbody>
          </table>
          <div className="show-on-small-w800">
            <br />
            <center>
              {objectsCountText(sentEscrowList)}
              {'Sent Escrows'.toUpperCase()}
              {historicalTitle}
            </center>
            <br />
            <table className="table-mobile wide">
              <tbody>{escrowListNode(sentEscrowList, { type: 'sent', mobile: true })}</tbody>
            </table>
          </div>
        </>
      )}
      {selfEscrowList?.length > 0 && (
        <>
          <table className="table-details hide-on-small-w800">
            <thead>
              <tr>
                <th colSpan="100">
                  {objectsCountText(selfEscrowList)} Self Escrows {historicalTitle}
                </th>
              </tr>
            </thead>
            <tbody>{escrowListNode(selfEscrowList, { type: 'self' })}</tbody>
          </table>
          <div className="show-on-small-w800">
            <br />
            <center>
              {objectsCountText(selfEscrowList)}
              {'Self Escrows'.toUpperCase()}
              {historicalTitle}
            </center>
            <br />
            <table className="table-mobile wide">
              <tbody>{escrowListNode(selfEscrowList, { type: 'self', mobile: true })}</tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}

import { i18n } from 'next-i18next'
import { fullDateAndTime, addressUsernameOrServiceLink, amountFormat, timeFromNow } from '../../utils/format'
import { useState, useEffect } from 'react'
import { avatarServer, timestampExpired } from '../../utils'
import Image from 'next/image'
import Link from 'next/link'
import { TbPigMoney } from 'react-icons/tb'
import { MdMoneyOff } from 'react-icons/md'

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

  const escrowCountText = (escrow) => {
    if (!escrow) return ''
    let countList = escrow.filter((p) => p !== undefined)
    if (countList.length > 1) return countList.length + ' '
    return ''
  }

  const escrowListNode = (escrowList, options) => {
    const adrLabel = options?.type === 'received' ? 'Account' : 'Destination'

    const rows = escrowList.map((escrow, i) => {
      const accountAddress = escrow[adrLabel]

      const formattedAccountInfo = {
        address: accountAddress,
        addressDetails: {
          username: escrow[adrLabel + 'Details']?.username,
          service: escrow[adrLabel + 'Details']?.service?.name
        }
      }

      return (
        <tr key={i}>
          <td className="center" style={{ width: 30 }}>
            {i + 1}
          </td>
          {options?.type !== 'self' && (
            <td>
              <Link href={'/account/' + accountAddress}>
                <Image
                  src={avatarServer + accountAddress}
                  alt={'service logo'}
                  height={20}
                  width={20}
                  style={{ marginRight: '5px', marginBottom: '-5px' }}
                />
              </Link>
              {addressUsernameOrServiceLink(formattedAccountInfo, 'address', { short: true })}
            </td>
          )}
          <td className="right">
            {typeof escrow.DestinationTag !== 'undefined' ? escrow.DestinationTag : <span className="grey">none</span>}
          </td>
          <td className="right">
            {escrow.CancelAfter ? (
              <span className={timestampExpired(escrow.CancelAfter, 'ripple') ? 'red' : ''}>
                {timeFromNow(escrow.CancelAfter, i18n, 'ripple')}
              </span>
            ) : (
              <span className="grey">no expiration</span>
            )}
          </td>
          <td className="right">
            {escrow.FinishAfter ? (
              <span className={timestampExpired(escrow.FinishAfter, 'ripple') ? 'green' : ''}>
                {timeFromNow(escrow.FinishAfter, i18n, 'ripple')}
              </span>
            ) : (
              <span className="grey">no expiration</span>
            )}
          </td>
          <td className="bold right">{amountFormat(escrow.Amount, { short: true })}</td>
          {!ledgerTimestamp && (
            <td className="center">
              {escrow.FinishAfter &&
              timestampExpired(escrow.FinishAfter, 'ripple') &&
              !timestampExpired(escrow.CancelAfter, 'ripple') ? (
                <a
                  href="#"
                  onClick={(e) => {
                    e.preventDefault()
                    handleEscrowFinish(escrow)
                  }}
                  className="orange tooltip"
                >
                  <TbPigMoney style={{ fontSize: 18, marginBottom: -4 }} />
                  <span className="tooltiptext">Finish</span>
                </a>
              ) : (
                <span className="grey tooltip">
                  <TbPigMoney style={{ fontSize: 18, marginBottom: -4 }} />
                  <span className="tooltiptext">Finish</span>
                </span>
              )}
              <span style={{ display: 'inline-block', width: options?.mobile ? 0 : 15 }}> </span>
              {escrow.CancelAfter && timestampExpired(escrow.CancelAfter, 'ripple') ? (
                <a
                  href="#"
                  onClick={(e) => {
                    e.preventDefault()
                    handleEscrowCancel(escrow)
                  }}
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
          <th className="right">Amount</th>
          {!ledgerTimestamp && <th>Actions</th>}
        </tr>
        {rows}
      </>
    )
  }

  return (
    <>
      {receivedEscrowList?.length > 0 && (
        <>
          <table className="table-details hide-on-small-w800">
            <thead>
              <tr>
                <th colSpan="100">
                  {escrowCountText(receivedEscrowList)} Received Escrows {historicalTitle}
                </th>
              </tr>
            </thead>
            <tbody>{escrowListNode(receivedEscrowList, { type: 'received' })}</tbody>
          </table>
          <div className="show-on-small-w800">
            <br />
            <center>
              {escrowCountText(receivedEscrowList)}
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
                  {escrowCountText(sentEscrowList)} Sent Escrows {historicalTitle}
                </th>
              </tr>
            </thead>
            <tbody>{escrowListNode(sentEscrowList, { type: 'sent' })}</tbody>
          </table>
          <div className="show-on-small-w800">
            <br />
            <center>
              {escrowCountText(sentEscrowList)}
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
                  {escrowCountText(selfEscrowList)} Self Escrows {historicalTitle}
                </th>
              </tr>
            </thead>
            <tbody>{escrowListNode(selfEscrowList, { type: 'self' })}</tbody>
          </table>
          <div className="show-on-small-w800">
            <br />
            <center>
              {escrowCountText(selfEscrowList)}
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
    </>
  )
}

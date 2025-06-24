import { fullDateAndTime, addressUsernameOrServiceLink, amountFormat } from '../../utils/format'
import { useState, useEffect } from 'react'
import { avatarServer, timestampExpired } from '../../utils'
import axios from 'axios'
import Image from 'next/image'
import Link from 'next/link'
import { TbPigMoney } from 'react-icons/tb'
import { MdMoneyOff } from 'react-icons/md'

export default function EscrowData({ account, setSignRequest, address, escrowList, ledgerTimestamp }) {

  const [receivedEscrowList, setReceivedEscrowList] = useState([])
  const [sentEscrowList, setSentEscrowList] = useState([])
  const [escrowSequences, setEscrowSequences] = useState({})

  useEffect(() => {
    setReceivedEscrowList(escrowList?.filter((escrow) => escrow.Destination === address))
    setSentEscrowList(escrowList?.filter((escrow) => escrow.Account === address))
  }, [escrowList, address])

  // Fetch escrow sequences for all escrows
  useEffect(() => {
    const fetchEscrowSequences = async () => {
      const sequences = {}
      for (const escrow of escrowList) {
        try {
          const response = await axios(`v2/escrow/${escrow.index}`)
          if (response?.data?.escrowSequence) {
              sequences[escrow.index] = response.data.escrowSequence
          }
        } catch (error) {
          console.error(`Failed to fetch escrow sequence for ${escrow.index}:`, error)
        }
      }
      setEscrowSequences(sequences)
    }

    if (escrowList?.length > 0 && !ledgerTimestamp) {
      fetchEscrowSequences()
    }
  }, [escrowList, ledgerTimestamp])

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
      return <tr key={i}>
        <td className="center" style={{ width: 30 }}>{i + 1}</td>
        <td>
          <Link href={'/account/' + escrow[adrLabel]}>
            <Image
              src={avatarServer + escrow[adrLabel]}
              alt={'service logo'}
              height={20}
              width={20}
              style={{ marginRight: '5px', marginBottom: '-5px' }}
            />
          </Link>
          {addressUsernameOrServiceLink(escrow, adrLabel, { short: true })}
        </td>
        <td className="bold right">{amountFormat(escrow.Amount)}</td>
        <td className="right">{typeof escrow.DestinationTag !== 'undefined' && escrow.DestinationTag}</td>
        <td>
          {escrow.CancelAfter ? (
            <span className={timestampExpired(escrow.CancelAfter, 'ripple') ? 'red' : ''}>{fullDateAndTime(escrow.CancelAfter, 'ripple')}</span>
          ) : (
            <span className="grey">does not cancel</span>
          )}
        </td>
        <td>
          {escrow.FinishAfter ? (
            <span className={timestampExpired(escrow.FinishAfter, 'ripple') ? 'red' : ''}>{fullDateAndTime(escrow.FinishAfter, 'ripple')}</span>
          ) : (
            <span className="grey">does not finish</span>
          )}
        </td>
        {!ledgerTimestamp && (
          <td className="center">
            {escrow.Account === account?.address && escrow.FinishAfter && timestampExpired(escrow.FinishAfter, 'ripple') ? (
              <a
                href="#"
                onClick={() =>
                  setSignRequest({
                    request: {
                      TransactionType: 'EscrowFinish',
                      Owner: escrow.Account,
                      OfferSequence: escrowSequences[escrow.index]
                    }
                  })
                }
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
            {escrow.CancelAfter && timestampExpired(escrow.CancelAfter, 'ripple') && escrow.Account === account?.address ? (
              <a
                href="#"
                onClick={() =>
                  setSignRequest({
                    request: {
                      TransactionType: 'EscrowCancel',
                      Owner: escrow.Account,
                      OfferSequence: escrowSequences[escrow.index]
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
        )}
      </tr>
    })
    return (
      <>
        <tr>
          <th>#</th>
          <th className="left">{options?.type === 'received' ? 'From' : 'To'}</th>
          <th className="right">Amount</th>
          <th className="right">DT</th>
          <th className="right" style={{ width: 100 }}>Cancel After</th>
          <th className="right" style={{ width: 100 }}>Finish After</th>
          {!ledgerTimestamp && <th>Actions</th>}
        </tr>
        {rows}
      </>
    )
  }

  return (
    <>
      {receivedEscrowList?.length > 0 && (
        <table className="table-details hide-on-small-w800">
          <thead>
            <tr>
              <th colSpan="100">
                {escrowCountText(receivedEscrowList)} Received Escrows {historicalTitle}
                {!account?.address && !ledgerTimestamp && (
                  <>
                    {' '}
                    [
                    <a href="#" onClick={() => setSignRequest({})} className="bold">
                      Sign in
                    </a>{' '}
                    to Redeem]
                  </>
                )}
              </th>
            </tr>          
          </thead>
          <tbody>
            {escrowListNode(receivedEscrowList, { type: 'received' })}
          </tbody>
        </table>        
      )}
      {sentEscrowList?.length > 0 && (
        <table className="table-details hide-on-small-w800">
          <thead>
            <tr>
              <th colSpan="100">
                {escrowCountText(sentEscrowList)} Sent Escrows {historicalTitle}
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
            {escrowListNode(sentEscrowList, { type: 'sent' })}
          </tbody>
        </table>        
      )}
    </>
  )
}
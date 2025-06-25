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
  const [accountDetails, setAccountDetails] = useState({})

  useEffect(() => {
    setReceivedEscrowList(escrowList?.filter((escrow) => escrow.Destination === address))
    setSentEscrowList(escrowList?.filter((escrow) => escrow.Account === address))
  }, [escrowList, address])

  // Fetch account details for all accounts involved in escrows
  useEffect(() => {
    const fetchAccountDetails = async () => {
      const details = {}
      const accountsToFetch = new Set()
      
      // Collect all unique account addresses from escrows
      for (const escrow of escrowList || []) {
        if (escrow.Account) accountsToFetch.add(escrow.Account)
        if (escrow.Destination) accountsToFetch.add(escrow.Destination)
      }
      
      // Fetch details for each account
      for (const accountAddress of accountsToFetch) {
        try {
          const response = await axios(`v2/address/${accountAddress}?username=true&service=true&verifiedDomain=true`)
          if (response?.data) {
            details[accountAddress] = response.data
          }
        } catch (error) {
          console.error(`Failed to fetch account details for ${accountAddress}:`, error)
        }
      }
      
      setAccountDetails(details)
    }

    if (escrowList?.length > 0) {
      fetchAccountDetails()
    }
  }, [escrowList])

  // Function to handle escrow finish with lazy sequence fetching
  const handleEscrowFinish = async (escrow) => {
    try {
      const response = await axios(`v2/escrow/${escrow.index}`)
      if (response?.data?.escrowSequence) {
        setSignRequest({
          request: {
            TransactionType: 'EscrowFinish',
            Owner: escrow.Account,
            OfferSequence: response.data.escrowSequence
          }
        })
      } else {
        console.error('Failed to get escrow sequence for finish')
      }
    } catch (error) {
      console.error('Failed to fetch escrow sequence for finish:', error)
    }
  }

  // Function to handle escrow cancel with lazy sequence fetching
  const handleEscrowCancel = async (escrow) => {
    try {
      const response = await axios(`v2/escrow/${escrow.index}`)
      if (response?.data?.escrowSequence) {
        setSignRequest({
          request: {
            TransactionType: 'EscrowCancel',
            Owner: escrow.Account,
            OfferSequence: response.data.escrowSequence
          }
        })
      } else {
        console.error('Failed to get escrow sequence for cancel')
      }
    } catch (error) {
      console.error('Failed to fetch escrow sequence for cancel:', error)
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
      const accountInfo = accountDetails[accountAddress] || {}
      
      const formattedAccountInfo = {
        address: accountAddress,
        addressDetails: {
          username: accountInfo.username,
          service: accountInfo.service?.name
        }
      }
      
      return <tr key={i}>
        <td className="center" style={{ width: 30 }}>{i + 1}</td>
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
        <td className="bold right">{amountFormat(escrow.Amount)}</td>
        <td className="right">{typeof escrow.DestinationTag !== 'undefined' && escrow.DestinationTag}</td>
        <td className="right">
          {escrow.CancelAfter ? (
            <span className={timestampExpired(escrow.CancelAfter, 'ripple') ? 'red' : ''}>{fullDateAndTime(escrow.CancelAfter, 'ripple')}</span>
          ) : (
            <span className="grey">does not cancel</span>
          )}
        </td>
        <td className="right">
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
            {escrow.CancelAfter && timestampExpired(escrow.CancelAfter, 'ripple') && escrow.Account === account?.address ? (
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
        <>
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
    </>
  )
}
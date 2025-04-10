import { useState, useEffect } from 'react'
import {
  addressUsernameOrServiceLink,
  AddressWithIconFilled,
  amountFormat,
  fullDateAndTime,
  nativeCurrencyToFiat,
  NiceNativeBalance,
  shortHash,
  timeOrDate
} from '../../utils/format'
import CopyButton from '../UI/CopyButton'
import axios from 'axios'
import { useTranslation } from 'next-i18next'
import { avatarServer, timestampExpired } from '../../utils'
import Image from 'next/image'
import Link from 'next/link'
import { TbPigMoney } from 'react-icons/tb'
import { MdMoneyOff } from 'react-icons/md'
import { LinkTx } from '../../utils/links'

const isPositiveBalance = (balance) => {
  return balance !== '0' && balance[0] !== '-'
}

const isNegativeBalance = (balance) => {
  return balance !== '0' && balance[0] === '-'
}

const objectsCountText = (objects) => {
  if (!objects) return ''
  if (objects.length > 1) return objects.length + ' '
  return ''
}

/* Pay Channel
  {
    "Account": "rf1BiGeXwwQoi8Z2ueFYTEXSwuJYfV2Jpn",
    "Amount": "1000",
    "Balance": "0",
    "Destination": "ra5nK24KXen9AHvsdFTKHSANinZseWnPcX",
    "DestinationNode": "0",
    "Flags": 0,
    "LedgerEntryType": "PayChannel",
    "OwnerNode": "0",
    "PreviousTxnID": "711C4F606C63076137FAE90ADC36379D7066CF551E96DA6FE2BDAB5ECBFACF2B",
    "PreviousTxnLgrSeq": 61965340,
    "PublicKey": "03CFD18E689434F032A4E84C63E2A3A6472D684EAF4FD52CA67742F3E24BAE81B2",
    "SettleDelay": 60,
    "index": "C7F634794B79DB40E87179A9D1BF05D05797AE7E92DF8E93FD6656E8C4BE3AE7",
    "accountDetails": {
      "address": "rf1BiGeXwwQoi8Z2ueFYTEXSwuJYfV2Jpn",
      "username": "Reginelli",
      "service": "Mduo13"
    },
    "destinationDetails": {
      "address": "ra5nK24KXen9AHvsdFTKHSANinZseWnPcX",
      "username": "mDuo13",
      "service": "Mduo13"
    }
  },
*/

export default function ObjectsData({
  address,
  account,
  setSignRequest,
  setObjects,
  ledgerTimestamp,
  selectedCurrency,
  pageFiatRate
}) {
  const [errorMessage, setErrorMessage] = useState('')
  const [loadingObjects, setLoadingObjects] = useState(false)
  const [checkList, setCheckList] = useState([])
  const [issuedCheckList, setIssuedCheckList] = useState([])
  const [hookList, setHookList] = useState([])
  const [depositPreauthList, setDepositPreauthList] = useState([])
  const [payChannelList, setPayChannelList] = useState([])
  const [incomingPayChannelList, setIncomingPayChannelList] = useState([])
  const [mptIssuanceList, setMptIssuanceList] = useState([])
  const [mptList, setMptList] = useState([])

  const { t } = useTranslation()

  const controller = new AbortController()

  const historicalTitle = ledgerTimestamp ? (
    <span className="red bold"> Historical data ({fullDateAndTime(ledgerTimestamp)})</span>
  ) : (
    ''
  )

  useEffect(() => {
    setObjects({})
    async function checkObjects() {
      setLoadingObjects(true)
      const accountObjectsData = await axios
        .get('v2/objects/' + address + '?limit=1000' + (ledgerTimestamp ? '&ledgerTimestamp=' + ledgerTimestamp : ''), {
          signal: controller.signal
        })
        .catch((error) => {
          if (error && error.message !== 'canceled') {
            setErrorMessage(t('error.' + error.message))
            setLoadingObjects(false)
          }
        })
      const accountObjects = accountObjectsData?.data?.objects
      if (accountObjects) {
        setLoadingObjects(false)
        if (accountObjects.length > 0) {
          const accountObjectWithHooks = accountObjects.find((o) => o.LedgerEntryType === 'Hook')
          if (accountObjectWithHooks?.Hooks?.length > 0) {
            const hooks = accountObjectWithHooks.Hooks
            const hookHashes = hooks.map((h) => h.Hook.HookHash)
            setHookList(hookHashes)
          }
          let accountObjectWithChecks = accountObjects.filter((o) => o.LedgerEntryType === 'Check') || []
          accountObjectWithChecks = accountObjectWithChecks.sort((a, b) => {
            // 1. Sort by issuer (undefined/null issuers come first)
            const issuerCompare =
              (a.SendMax?.issuer || '') === (b.SendMax?.issuer || '') ? 0 : a.SendMax?.issuer ? 1 : -1
            if (issuerCompare !== 0) return issuerCompare

            // 2. Sort by Destination alphabetically
            const destinationCompare = (a.Destination || '').localeCompare(b.Destination || '')
            if (destinationCompare !== 0) return destinationCompare

            // 3. Sort by SendMax?.value — if missing, use Number(SendMax)
            const valueA = Number(a.SendMax?.value || a.SendMax) || 0
            const valueB = Number(b.SendMax?.value || b.SendMax) || 0

            return valueB - valueA
          })
          setCheckList(accountObjectWithChecks.filter((o) => o.Destination === address))
          setIssuedCheckList(accountObjectWithChecks.filter((o) => o.Account === address))

          // DepositPreauth, Escrow, NFTokenOffer, NFTokenPage, Offer, PayChannel, SignerList, Ticket, RippleState,
          // devnet: MPTokenIssuance
          let accountObjectWithDepositPreauth =
            accountObjects.filter((o) => o.LedgerEntryType === 'DepositPreauth') || []
          let accountObjectWithEscrow = accountObjects.filter((o) => o.LedgerEntryType === 'Escrow') || []
          let accountObjectWithNFTokenOffer = accountObjects.filter((o) => o.LedgerEntryType === 'NFTokenOffer') || []
          let accountObjectWithOffer = accountObjects.filter((o) => o.LedgerEntryType === 'Offer') || []

          let accountObjectWithPayChannel = accountObjects.filter((o) => o.LedgerEntryType === 'PayChannel') || []
          setPayChannelList(accountObjectWithPayChannel.filter((o) => o.Account === address))
          setIncomingPayChannelList(accountObjectWithPayChannel.filter((o) => o.Destination === address))

          let accountObjectWithMptIssuance = accountObjects.filter((o) => o.LedgerEntryType === 'MPTokenIssuance') || []
          setMptIssuanceList(accountObjectWithMptIssuance)

          let accountObjectsWithMpt = accountObjects.filter((o) => o.LedgerEntryType === 'MPToken') || []
          setMptList(accountObjectsWithMpt)

          //https://github.com/Bithomp/xrpl-api/blob/master/src/models/account_object.ts#L95-L131

          let accountObjectWithRippleState =
            accountObjects.filter((node) => {
              if (node.LedgerEntryType !== 'RippleState') {
                return false
              }
              if (node.HighLimit.issuer === address) {
                if (node.Flags & 131072) {
                  if (isPositiveBalance(node.Balance.value)) {
                    return false
                  }
                  return true
                }
                if (isNegativeBalance(node.Balance.value)) {
                  return true
                }
              } else {
                if (node.Flags & 65536) {
                  if (isNegativeBalance(node.Balance.value)) {
                    return false
                  }
                  return true
                }
                if (isPositiveBalance(node.Balance.value)) {
                  return true
                }
              }
              return false
            }) || []

          setDepositPreauthList(accountObjectWithDepositPreauth)

          let accountObjectWithNFTokenPage = accountObjects.filter((o) => o.LedgerEntryType === 'NFTokenPage') || []
          let nfts = []
          if (accountObjectWithNFTokenPage.length > 0) {
            for (let nftPage of accountObjectWithNFTokenPage) {
              nfts.push(...nftPage.NFTokens)
            }
          }
          setObjects({
            depositPreauthList: accountObjectWithDepositPreauth,
            escrowList: accountObjectWithEscrow,
            nftOfferList: accountObjectWithNFTokenOffer,
            nftList: nfts,
            offerList: accountObjectWithOffer,
            payChannelList: accountObjectWithPayChannel,
            rippleStateList: accountObjectWithRippleState,
            mptIssuanceList: accountObjectWithMptIssuance,
            mptList: accountObjectsWithMpt
          })
        } else {
          // no objects
          setObjects({
            depositPreauthList: [],
            escrowList: [],
            nftOfferList: [],
            nftList: [],
            offerList: [],
            payChannelList: [],
            rippleStateList: [],
            mptIssuanceList: [],
            mptList: []
          })
        }
      }
    }
    checkObjects()

    return () => {
      controller.abort()
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const checkListNode = (checkList, options) => {
    const adrLabel = options?.type === 'issued' ? 'Destination' : 'Account'

    const rows = checkList.map((c, i) => (
      <tr key={i}>
        <td className="center" style={{ width: 30 }}>
          {i + 1}
        </td>
        <td>
          <Link href={'/account/' + c[adrLabel]}>
            <Image
              src={avatarServer + c[adrLabel]}
              alt={'service logo'}
              height={20}
              width={20}
              style={{ marginRight: '5px', marginBottom: '-5px' }}
            />
          </Link>
          {addressUsernameOrServiceLink(c, adrLabel, { short: true })}
        </td>
        <td className="bold right">{amountFormat(c.SendMax)}</td>
        <td className="right">{typeof c.DestinationTag !== 'undefined' && c.DestinationTag}</td>
        <td className="right">
          {c.expiration ? (
            <span className={timestampExpired(c.expiration) ? 'red' : ''}>{timeOrDate(c.expiration)}</span>
          ) : (
            <span className="grey">does not expire</span>
          )}
        </td>
        {!ledgerTimestamp && (
          <td className="center">
            {c.Destination === account?.address ? (
              <a
                href="#"
                onClick={() =>
                  setSignRequest({
                    request: {
                      TransactionType: 'CheckCash',
                      Account: c.Destination,
                      Amount: c.SendMax,
                      CheckID: c.index
                    }
                  })
                }
                className="orange tooltip"
              >
                <TbPigMoney style={{ fontSize: 18, marginBottom: -4 }} />
                <span className="tooltiptext">Redeem</span>
              </a>
            ) : (
              <span className="grey tooltip">
                <TbPigMoney style={{ fontSize: 18, marginBottom: -4 }} />
                <span className="tooltiptext">Redeem</span>
              </span>
            )}
            <span style={{ display: 'inline-block', width: options?.mobile ? 0 : 15 }}> </span>
            {c.Destination === account?.address ||
            c.Account === account?.address ||
            timestampExpired(c.Expiration, 'ripple') ? (
              <a
                href="#"
                onClick={() =>
                  setSignRequest({
                    request: {
                      TransactionType: 'CheckCancel',
                      CheckID: c.index
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
    ))
    return (
      <>
        <tr>
          <th>#</th>
          <th className="left">{options?.type === 'issued' ? 'To' : 'From'}</th>
          <th className="right">Amount</th>
          <th className="right">DT</th>
          <th className="right">Expiration</th>
          {!ledgerTimestamp && <th>Actions</th>}
        </tr>
        {rows}
      </>
    )
  }

  const formatedNativeBalance = (balance, options) => {
    return (
      <>
        <NiceNativeBalance amount={balance} />
        {options?.mobile ? ' ' : <br />}
        <span className="grey">
          {nativeCurrencyToFiat({
            amount: balance,
            selectedCurrency,
            fiatRate: pageFiatRate
          })}
        </span>
      </>
    )
  }

  const payChannelListNode = (payChannelList, options) => {
    const adrLabel = options?.type === 'incoming' ? 'Account' : 'Destination'
    const title = options?.type === 'incoming' ? 'Incoming' : 'Outgoing'
    return (
      <>
        <table className="table-details hide-on-small-w800">
          <thead>
            <tr>
              <th colSpan="100">
                {objectsCountText(payChannelList)}
                {title} Pay Channels{historicalTitle}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <th>#</th>
              <th className="left">{adrLabel}</th>
              <th className="right">Amount</th>
              <th className="right">Balance</th>
            </tr>
            {payChannelList.map((c, i) => (
              <tr key={i}>
                <td className="center" style={{ width: 30 }}>
                  {i + 1}
                </td>
                <td>
                  <AddressWithIconFilled data={c} name={adrLabel} />
                </td>
                <td className="right">{formatedNativeBalance(c.Amount)}</td>
                <td className="right">{formatedNativeBalance(c.Balance)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="show-on-small-w800">
          <br />
          <center>
            {objectsCountText(payChannelList)}
            {title} Pay Channels{historicalTitle}
          </center>
          <br />
          <br />
          {payChannelList.map((c, i) => (
            <table className="table-mobile wide" key={i}>
              <tbody>
                <tr>
                  <td className="center">{i + 1}</td>
                  <td>
                    <span className="grey">{adrLabel}</span>
                    <AddressWithIconFilled data={c} name={adrLabel} />
                    <p>
                      <span className="grey">Amount</span> {formatedNativeBalance(c.Amount, { mobile: true })}
                    </p>
                    <p>
                      <span className="grey">Balance</span> {formatedNativeBalance(c.Balance, { mobile: true })}
                    </p>
                  </td>
                </tr>
              </tbody>
            </table>
          ))}
        </div>
      </>
    )
  }

  return (
    <>
      {loadingObjects || errorMessage ? (
        <>
          <table className="table-details hide-on-small-w800">
            <thead>
              <tr>
                <th colSpan="100">Objects{historicalTitle}</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="center">
                  <br />
                  <div className="center">
                    {loadingObjects ? (
                      <>
                        <span className="waiting"></span>
                        <br />
                        {t('general.loading')}
                      </>
                    ) : (
                      <span className="orange bold">{errorMessage}</span>
                    )}
                  </div>
                  <br />
                </td>
              </tr>
            </tbody>
          </table>
          <div className="show-on-small-w800">
            <br />
            <center>
              {'Objects'.toUpperCase()}
              {historicalTitle}
            </center>
            <p className="center">
              {loadingObjects ? (
                <>
                  <span className="waiting"></span>
                  <br />
                  {t('general.loading')}
                </>
              ) : (
                <span className="orange bold">{errorMessage}</span>
              )}
            </p>
          </div>
        </>
      ) : (
        <>
          {checkList.length > 0 && (
            <>
              <table className="table-details hide-on-small-w800">
                <thead>
                  <tr>
                    <th colSpan="100">
                      {objectsCountText(checkList)}Received Checks{historicalTitle}
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
                <tbody>{checkList.length > 0 && checkListNode(checkList)}</tbody>
              </table>
              <div className="show-on-small-w800">
                <br />
                <center>
                  {objectsCountText(checkList)}
                  {'Received Checks'.toUpperCase()}
                  {historicalTitle}
                </center>
                <br />
                {checkList.length > 0 && (
                  <table className="table-mobile wide">
                    <tbody>{checkListNode(checkList, { mobile: true })}</tbody>
                  </table>
                )}
              </div>
            </>
          )}
          {issuedCheckList.length > 0 && (
            <>
              <table className="table-details hide-on-small-w800">
                <thead>
                  <tr>
                    <th colSpan="100">
                      {objectsCountText(issuedCheckList)}Issued Checks{historicalTitle}
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
                <tbody>{checkListNode(issuedCheckList, { type: 'issued' })}</tbody>
              </table>
              <div className="show-on-small-w800">
                <br />
                <center>
                  {objectsCountText(issuedCheckList)}
                  {'Issued Checks'.toUpperCase()}
                  {historicalTitle}
                </center>
                <br />
                <table className="table-mobile wide">
                  <tbody>{checkListNode(issuedCheckList, { type: 'issued', mobile: true })}</tbody>
                </table>
              </div>
            </>
          )}
          {depositPreauthList.length > 0 && (
            <>
              <table className="table-details hide-on-small-w800">
                <thead>
                  <tr>
                    <th colSpan="100">
                      {objectsCountText(depositPreauthList)}Deposit preauthorized accounts{historicalTitle}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <th>#</th>
                    <th className="left">Address</th>
                    <th>Last update</th>
                  </tr>
                  {depositPreauthList.map((c, i) => (
                    <tr key={i}>
                      <td className="center" style={{ width: 30 }}>
                        {i + 1}
                      </td>
                      <td>
                        <AddressWithIconFilled data={c} name="Authorize" />
                      </td>
                      <td className="center">
                        {timeOrDate(c.previousTxAt)} <LinkTx tx={c.PreviousTxnID} icon={true} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="show-on-small-w800">
                <br />
                <center>
                  {objectsCountText(depositPreauthList)}
                  {'Deposit preauthorized accounts'.toUpperCase()}
                  {historicalTitle}
                </center>
                <br />
                {depositPreauthList.map((c, i) => (
                  <table className="table-mobile wide" key={i}>
                    <tbody>
                      <tr>
                        <td className="center">{i + 1}</td>
                        <td>
                          <AddressWithIconFilled data={c} name="Authorize" />
                          <p>
                            <span className="grey">Last update</span> {timeOrDate(c.previousTxAt)}{' '}
                            <LinkTx tx={c.PreviousTxnID} icon={true} />
                          </p>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                ))}
              </div>
            </>
          )}
          {hookList.length > 0 && (
            <>
              <table className="table-details hide-on-small-w800">
                <thead>
                  <tr>
                    <th colSpan="100">
                      {objectsCountText(hookList)}Hooks{historicalTitle}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {hookList.map((p, i) => (
                    <tr key={i}>
                      <td>{i}</td>
                      <td className="right">
                        {p} <CopyButton text={p} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="show-on-small-w800">
                <br />
                <center>
                  {objectsCountText(hookList)}
                  {'Hooks'.toUpperCase()}
                  {historicalTitle}
                </center>
                {hookList.map((p, i) => (
                  <p key={i}>
                    <span className="grey">{i}</span> {shortHash(p, 16)} <CopyButton text={p} />
                  </p>
                ))}
              </div>
            </>
          )}
          {payChannelList.length > 0 && payChannelListNode(payChannelList)}
          {incomingPayChannelList.length > 0 && payChannelListNode(incomingPayChannelList, { type: 'incoming' })}

          {mptIssuanceList.length > 0 && (
            <>
              <table className="table-details hide-on-small-w800">
                <thead>
                  <tr>
                    <th colSpan="100">
                      {objectsCountText(mptIssuanceList)}Multi-Purpose Token issuance{historicalTitle}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <th>#</th>
                    <th className="left">ID</th>
                    <th className="right">Outstanding amount</th>
                    <th>Last update</th>
                  </tr>
                  {mptIssuanceList.map((c, i) => (
                    <tr key={i}>
                      <td className="center" style={{ width: 30 }}>
                        {i + 1}
                      </td>
                      <td>
                        {shortHash(c.mpt_issuance_id)} <CopyButton text={c.mpt_issuance_id} />
                      </td>
                      <td className="right">{c.OutstandingAmount}</td>
                      <td className="center">
                        {timeOrDate(c.previousTxAt)} <LinkTx tx={c.PreviousTxnID} icon={true} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="show-on-small-w800">
                <br />
                <center>
                  {objectsCountText(mptIssuanceList)}
                  {'Multi-Purpose Token issuance'.toUpperCase()}
                  {historicalTitle}
                </center>
                <br />
                {mptIssuanceList.map((c, i) => (
                  <table className="table-mobile wide" key={i}>
                    <tbody>
                      <tr>
                        <td className="center">{i + 1}</td>
                        <td>
                          <p>
                            <span className="grey">ID</span> {shortHash(c.mpt_issuance_id)}{' '}
                            <CopyButton text={c.mpt_issuance_id} />
                          </p>
                          <p>
                            <span className="grey">Outstanding amount</span> {c.OutstandingAmount}
                          </p>
                          <p>
                            <span className="grey">Last update</span> {timeOrDate(c.previousTxAt)}{' '}
                            <LinkTx tx={c.PreviousTxnID} icon={true} />
                          </p>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                ))}
              </div>
            </>
          )}

          {mptList.length > 0 && (
            <>
              <table className="table-details hide-on-small-w800">
                <thead>
                  <tr>
                    <th colSpan="100">
                      {objectsCountText(mptList)}Multi-Purpose Token{historicalTitle}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <th>#</th>
                    <th className="left">ID</th>
                    <th className="right">Amount</th>
                    <th>Last update</th>
                  </tr>
                  {mptList.map((c, i) => (
                    <tr key={i}>
                      <td className="center" style={{ width: 30 }}>
                        {i + 1}
                      </td>
                      <td>
                        {shortHash(c.MPTokenIssuanceID)} <CopyButton text={c.MPTokenIssuanceID} />
                      </td>
                      <td className="right">{c.MPTAmount}</td>
                      <td className="center">
                        {timeOrDate(c.previousTxAt)} <LinkTx tx={c.PreviousTxnID} icon={true} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="show-on-small-w800">
                <br />
                <center>
                  {objectsCountText(mptList)}
                  {'Multi-Purpose Token'.toUpperCase()}
                  {historicalTitle}
                </center>
                <br />
                {mptList.map((c, i) => (
                  <table className="table-mobile wide" key={i}>
                    <tbody>
                      <tr>
                        <td className="center">{i + 1}</td>
                        <td>
                          <p>
                            <span className="grey">ID</span> {shortHash(c.MPTokenIssuanceID)}{' '}
                            <CopyButton text={c.MPTokenIssuanceID} />
                          </p>
                          <p>
                            <span className="grey">Amount</span> {c.MPTAmount}
                          </p>
                          <p>
                            <span className="grey">Last update</span> {timeOrDate(c.previousTxAt)}{' '}
                            <LinkTx tx={c.PreviousTxnID} icon={true} />
                          </p>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                ))}
              </div>
            </>
          )}
        </>
      )}
    </>
  )
}

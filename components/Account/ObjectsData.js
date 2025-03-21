import { useState, useEffect } from 'react'
import { amountFormat, shortHash } from '../../utils/format'
import CopyButton from '../UI/CopyButton'
import axios from 'axios'
import { useTranslation } from 'next-i18next'
import { avatarServer, timestampExpired } from '../../utils'
import Image from 'next/image'
import Link from 'next/link'
import { TbPigMoney } from 'react-icons/tb'
import { MdMoneyOff } from 'react-icons/md'

export default function ObjectsData({ address, account, setSignRequest, setObjects }) {
  const [errorMessage, setErrorMessage] = useState('')
  const [loadingObjects, setLoadingObjects] = useState(false)
  const [checkList, setCheckList] = useState([])
  const [issuedCheckList, setIssuedCheckList] = useState([])
  const [hookList, setHookList] = useState([])
  const [depositPreauthList, setDepositPreauthList] = useState([])
  const [escrowList, setEscrowList] = useState([])
  const [payChannelList, setPayChannelList] = useState([])

  const { t } = useTranslation()

  const controller = new AbortController()

  useEffect(() => {
    setObjects({})
    async function checkObjects() {
      setLoadingObjects(true)
      const accountObjectsData = await axios
        .get('xrpl/objects/' + address, {
          signal: controller.signal
        })
        .catch((error) => {
          if (error && error.message !== 'canceled') {
            setErrorMessage(t('error.' + error.message))
            setLoadingObjects(false)
          }
        })
      const accountObjects = accountObjectsData?.data
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

          // DepositPreauth, Escrow, NFTokenOffer, NFTokenPage, Offer, PayChannel, SignerList, Ticket, RippleState
          let accountObjectWithDepositPreauth =
            accountObjects.filter((o) => o.LedgerEntryType === 'DepositPreauth') || []
          let accountObjectWithEscrow = accountObjects.filter((o) => o.LedgerEntryType === 'Escrow') || []
          let accountObjectWithNFTokenOffer = accountObjects.filter((o) => o.LedgerEntryType === 'NFTokenOffer') || []
          let accountObjectWithOffer = accountObjects.filter((o) => o.LedgerEntryType === 'Offer') || []
          let accountObjectWithPayChannel = accountObjects.filter((o) => o.LedgerEntryType === 'PayChannel') || []
          let accountObjectWithRippleState = accountObjects.filter((o) => o.LedgerEntryType === 'RippleState') || []

          setDepositPreauthList(accountObjectWithDepositPreauth)
          setEscrowList(accountObjectWithEscrow)
          setPayChannelList(accountObjectWithPayChannel)

          let accountObjectWithNFTokenPage = accountObjects.filter((o) => o.LedgerEntryType === 'NFTokenPage') || []
          let nfts = []
          if (accountObjectWithNFTokenPage.length > 0) {
            for (let nftPage of accountObjectWithNFTokenPage) {
              nfts = [...nftPage.NFTokens]
            }
          }
          setObjects({
            depositPreauthList: accountObjectWithDepositPreauth,
            escrowList: accountObjectWithEscrow,
            nftOfferList: accountObjectWithNFTokenOffer,
            nftList: nfts,
            offerList: accountObjectWithOffer,
            payChannelList: accountObjectWithPayChannel,
            rippleStateList: accountObjectWithRippleState
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

    return checkList.map((c, i) => (
      <tr key={i}>
        <td className="center" style={{ width: 30 }}>
          {i + 1}
        </td>
        <td className="bold right">{amountFormat(c.SendMax)}</td>
        <td>
          {options?.type === 'issued' ? 'to' : 'from'}{' '}
          <Link href={'/account/' + c[adrLabel]}>
            <Image
              src={avatarServer + c[adrLabel]}
              alt={'service logo'}
              height={20}
              width={20}
              style={{ marginRight: '5px', marginBottom: '-5px' }}
            />
          </Link>
          <Link href={'/account/' + c[adrLabel]}>{shortHash(c[adrLabel])}</Link>
        </td>
        <td>
          {typeof c.DestinationTag !== undefined && (
            <>
              DT: <span className="bold">{c.DestinationTag}</span>
            </>
          )}
        </td>
        <td>
          {c.Destination === account?.address ? (
            <>
              <span className="orange">
                <TbPigMoney style={{ fontSize: 18, marginBottom: -4 }} />{' '}
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
                >
                  Redeem
                </a>
              </span>
            </>
          ) : (
            <span className="grey">
              <TbPigMoney style={{ fontSize: 18, marginBottom: -4 }} /> Redeem
            </span>
          )}
        </td>
        <td>
          {c.Destination === account?.address ||
          c.Account === account?.address ||
          timestampExpired(c.Expiration, 'ripple') ? (
            <>
              <span className="red">
                <MdMoneyOff style={{ fontSize: 18, marginBottom: -4 }} />{' '}
                <a
                  href="#"
                  onClick={() =>
                    setSignRequest({
                      request: {
                        TransactionType: 'CheckCancel',
                        Account: c.Account,
                        CheckID: c.index
                      }
                    })
                  }
                  className="red"
                >
                  Cancel
                </a>
              </span>
            </>
          ) : (
            <span className="grey">
              <MdMoneyOff style={{ fontSize: 18, marginBottom: -4 }} /> Cancel
            </span>
          )}
        </td>
      </tr>
    ))
  }

  const objectsToShow = depositPreauthList.length + escrowList.length + payChannelList.length

  return (
    <>
      {loadingObjects || errorMessage ? (
        <>
          <table className="table-details hide-on-small-w800">
            <thead>
              <tr>
                <th colSpan="100">Objects</th>
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
            <center>{'Objects'.toUpperCase()}</center>
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
          {objectsToShow > 0 && (
            <>
              <table className="table-details hide-on-small-w800">
                <thead>
                  <tr>
                    <th colSpan="100">Objects</th>
                  </tr>
                </thead>
                <tbody>
                  {depositPreauthList.length > 0 && (
                    <tr>
                      <td>Deposit Preauth</td>
                      <td className="bold">{depositPreauthList.length}</td>
                    </tr>
                  )}
                  {escrowList.length > 0 && (
                    <tr>
                      <td>Escrows</td>
                      <td className="bold">{escrowList.length}</td>
                    </tr>
                  )}
                  {payChannelList.length > 0 && (
                    <tr>
                      <td>Pay Channels</td>
                      <td className="bold">{payChannelList.length}</td>
                    </tr>
                  )}
                </tbody>
              </table>
              <div className="show-on-small-w800">
                <br />
                <center>Objects</center>
                <br />
                {depositPreauthList.length > 0 && (
                  <p>
                    Deposit Preauth: <span className="bold">{depositPreauthList.length}</span>
                  </p>
                )}
                {escrowList.length > 0 && (
                  <p>
                    Escrows: <span className="bold">{escrowList.length}</span>
                  </p>
                )}
                {payChannelList.length > 0 && (
                  <p>
                    Pay Channels: <span className="bold">{payChannelList.length}</span>
                  </p>
                )}
              </div>
            </>
          )}

          {checkList.length > 0 && (
            <>
              <table className="table-details hide-on-small-w800">
                <thead>
                  <tr>
                    <th colSpan="100">
                      {checkList.length} Received Checks
                      {!account?.address && (
                        <>
                          {' '}
                          [
                          <a href="#" onClick={() => setSignRequest({})}>
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
                <center>{'Received Checks'.toUpperCase()}</center>
                <br />
                {checkList.length > 0 && (
                  <table className="table-mobile">
                    <tbody>{checkListNode(checkList)}</tbody>
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
                      {issuedCheckList.length} Issued Checks
                      {!account?.address && (
                        <>
                          {' '}
                          [
                          <a href="#" onClick={() => setSignRequest({})}>
                            Sign in
                          </a>{' '}
                          to Cancel]
                        </>
                      )}
                    </th>
                  </tr>
                </thead>
                <tbody>{issuedCheckList.length > 0 && checkListNode(issuedCheckList, { type: 'issued' })}</tbody>
              </table>
              <div className="show-on-small-w800">
                <br />
                <center>{'Issued Checks'.toUpperCase()}</center>
                <br />
                {issuedCheckList.length > 0 && (
                  <table className="table-mobile">
                    <tbody>{checkListNode(issuedCheckList, { type: 'issued' })}</tbody>
                  </table>
                )}
              </div>
            </>
          )}
          {hookList.length > 0 && (
            <>
              <table className="table-details hide-on-small-w800">
                <thead>
                  <tr>
                    <th colSpan="100">Hooks</th>
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
                <center>{'Hooks'.toUpperCase()}</center>
                {hookList.map((p, i) => (
                  <p key={i}>
                    <span className="grey">{i}</span> {shortHash(p, 16)} <CopyButton text={p} />
                  </p>
                ))}
              </div>
            </>
          )}
        </>
      )}
    </>
  )
}

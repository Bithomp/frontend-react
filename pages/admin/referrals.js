import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { i18n, useTranslation } from 'next-i18next'
import { useEffect, useMemo, useRef, useState } from 'react'

import { axiosAdmin } from '../../utils/axios'
import { getIsSsrMobile } from '../../utils/mobile'
import { isAddressValid, ledgerName, server, siteName, useWidth, webSiteName } from '../../utils'
import { amountFormat, fullDateAndTime } from '../../utils/format'
import { LinkTx } from '../../utils/links'

import SEO from '../../components/SEO'
import AdminTabs from '../../components/Tabs/AdminTabs'
import CopyButton from '../../components/UI/CopyButton'
import AddressInput from '../../components/UI/AddressInput'
import { IoMdClose, IoMdCheckmark, IoMdCreate } from 'react-icons/io'
import Link from 'next/link'

export const getServerSideProps = async (context) => {
  const { locale } = context
  return {
    props: {
      isSsrMobile: getIsSsrMobile(context),
      ...(await serverSideTranslations(locale, ['common', 'admin']))
    }
  }
}

const nowInS = () => Math.floor(Date.now() / 1000)

const getRewardStatus = (reward) => {
  if (!reward) return null

  // Backend rules:
  // - if no checkID => failed
  // - if cashed => cashed
  // - if canceled => canceled
  // - if expired => expired
  // - else => issued
  if (!reward.checkID) return 'failed'
  if (reward.checkCashedAt) return 'cashed'
  if (reward.checkCanceledAt) return 'canceled'
  if (reward.expirationAt && reward.expirationAt < nowInS()) return 'expired'
  return 'issued'
}

const formatTs = (tsInS) => {
  if (!tsInS) return ''
  return fullDateAndTime(new Date(tsInS * 1000))
}

const badge = (text, colorClass) => <b className={colorClass}>{text}</b>

const checkCell = (reward) => {
  // No reward => self purchase => not eligible
  if (!reward) return badge('not eligible', 'orange')

  // Reward exists but cannot issue (no create tx hash) => not issued (no links)
  // This is separate from "failed" status (which is missing checkID).
  if (!reward.checkCreateTxHash) return badge('not issued', 'red')

  const st = getRewardStatus(reward)

  // Decide which tx to link to based on final state
  if (st === 'cashed' && reward.checkCashedTxHash) {
    return (
      <>
        {badge('cashed', 'green')} <LinkTx tx={reward.checkCashedTxHash} icon={true} />
      </>
    )
  }

  if (st === 'canceled' && reward.checkCanceledTxHash) {
    return (
      <>
        {badge('canceled', 'red')} <LinkTx tx={reward.checkCanceledTxHash} icon={true} />
      </>
    )
  }

  if (st === 'failed') {
    return badge('failed', 'red')
  }

  if (st === 'expired') {
    return (
      <>
        {badge('expired', 'red')} <LinkTx tx={reward.checkCreateTxHash} icon={true} />
      </>
    )
  }

  // issued
  return (
    <>
      {badge('issued', 'green')} <LinkTx tx={reward.checkCreateTxHash} icon={true} />
    </>
  )
}

export default function Referrals({ account, sessionToken, openEmailLogin }) {
  const { t } = useTranslation(['common', 'admin'])
  const width = useWidth()

  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const [codesData, setCodesData] = useState(null)
  const [paymentsData, setPaymentsData] = useState(null)

  const [address, setAddress] = useState('')
  const [editingAddress, setEditingAddress] = useState(false)
  const [savingAddress, setSavingAddress] = useState(false)

  const addressRef = useRef(null)

  const referral = codesData?.referrals?.[0] || null // currently only one allowed

  const referralLinks = useMemo(() => {
    if (!referral?.referralCode) return null

    const ref = referral.referralCode

    return {
      api: `${server}/${i18n.language}/admin/subscriptions?tab=api&ref=${ref}`,
      pro: `${server}/${i18n.language}/admin/subscriptions?ref=${ref}`,
      username: `${server}/${i18n.language}/username?ref=${ref}`,
      landing: `${server}?ref=${ref}`
    }
  }, [referral?.referralCode])

  useEffect(() => {
    if (sessionToken) {
      loadAll()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionToken])

  useEffect(() => {
    if (referral?.address) {
      setAddress(referral.address)
      return
    }

    if (account?.address) {
      setAddress(account.address)
    }
  }, [referral?.address, account?.address])

  const loadAll = async () => {
    await Promise.all([getCodes(), getPayments()])
  }

  const getCodes = async () => {
    setLoading(true)
    setErrorMessage('')

    const resp = await axiosAdmin.get('partner/referrals/codes').catch((error) => {
      if (error && error.message !== 'canceled') {
        if (error.response?.data?.error === 'errors.token.required') {
          openEmailLogin()
        } else {
          setErrorMessage(t(error.response?.data?.error || 'error.' + error.message))
        }
      }
    })

    if (resp?.data) {
      setCodesData(resp.data)
      const first = resp.data?.referrals?.[0]
      if (first?.address) setAddress(first.address)
    }

    setLoading(false)
  }

  const getPayments = async () => {
    const resp = await axiosAdmin.get('partner/referrals/payments').catch((error) => {
      if (error && error.message !== 'canceled') {
        if (error.response?.data?.error === 'errors.token.required') {
          openEmailLogin()
        } else {
          setErrorMessage(t(error.response?.data?.error || 'error.' + error.message))
        }
      }
    })

    if (resp?.data) {
      const payments = Array.isArray(resp.data) ? resp.data : resp.data?.payments || []
      setPaymentsData({
        payments,
        total: resp.data?.total ?? payments.length,
        count: resp.data?.count ?? payments.length
      })
    }
  }

  const requestCode = async () => {
    setErrorMessage('')

    if (!address) {
      setErrorMessage('Please enter a destination address for rewards.')
      addressRef.current?.focus?.()
      return
    }

    if (!isAddressValid(address)) {
      setErrorMessage('Invalid address.')
      addressRef.current?.focus?.()
      return
    }

    setSavingAddress(true)

    const resp = await axiosAdmin.post('partner/referrals/codes', { address }).catch((error) => {
      if (error && error.message !== 'canceled') {
        setErrorMessage(t(error.response?.data?.error || 'error.' + error.message))
      }
    })

    setSavingAddress(false)

    if (resp?.data) {
      await loadAll()
    }
  }

  const savePayoutAddress = async () => {
    if (!referral?.id) return

    setErrorMessage('')

    if (!address) {
      setErrorMessage('Please enter a destination address for rewards.')
      addressRef.current?.focus?.()
      return
    }

    if (!isAddressValid(address)) {
      setErrorMessage('Invalid address.')
      addressRef.current?.focus?.()
      return
    }

    setSavingAddress(true)

    const resp = await axiosAdmin.put(`partner/referrals/codes/${referral.id}`, { address }).catch((error) => {
      if (error && error.message !== 'canceled') {
        setErrorMessage(t(error.response?.data?.error || 'error.' + error.message))
      }
    })

    setSavingAddress(false)

    if (resp?.data) {
      setEditingAddress(false)
      await loadAll()
    }
  }

  const accountAddress = useMemo(() => {
    return account?.address ? { address: account.address, addressDetails: { username: account.username } } : null
  }, [account?.address, account?.username])

  return (
    <>
      <SEO title="Referrals" />

      <div className="page-admin content-center">
        <h1 className="center">{t('header', { ns: 'admin' })}</h1>

        <AdminTabs name="mainTabs" tab="referrals" />

        <h4 className="center">Affiliate program</h4>

        <p>
          Join our Affiliate Program and earn <b>10% commission</b> on paid services.
        </p>

        <p>You earn 10% when your referral purchases:</p>
        <ul>
          <li>
            a <Link href="/username">username</Link>
          </li>
          <li>
            a <Link href="/admin/subscriptions">Bithomp Pro</Link> subscription
          </li>
          <li>
            <Link href="/admin/subscriptions?tab=api">API access</Link>
          </li>
        </ul>

        <p>
          Commissions are paid <b>instantly</b> as an <b>{ledgerName} Check</b>, which you can <b>redeem immediately</b>{' '}
          to receive your funds.
        </p>

        {!referral && (
          <>
            <p>How it works:</p>
            <ul>
              <li>Get your personal referral link</li>
              <li>Share it with your audience</li>
              <li>Earn 10% commission on every completed purchase</li>
            </ul>
          </>
        )}

        <p>
          There is <b>no limit</b> to your earnings.
        </p>

        {sessionToken ? (
          <div>
            {loading ? (
              <div className="center">
                <span className="waiting"></span>
                <br />
                {t('general.loading')}
                <br />
                <br />
              </div>
            ) : (
              <>
                {/* Code section */}
                <div>
                  <h4 className="center">Your referral code</h4>

                  {referral ? (
                    <>
                      <p>
                        Code:{' '}
                        <b className="orange" style={{ fontSize: '18px' }}>
                          {referral.referralCode}
                        </b>
                      </p>
                      <p>
                        If someone opens any page on {siteName} using a link with your referral code like
                        <br />
                        <br />
                        <div className="bold">{referralLinks?.landing}</div>
                        <br />
                        the referral code is immediately saved in their browser. It doesn’t matter which page they land
                        on — it can be the homepage, a transaction page, an account page, or any other page on{' '}
                        {webSiteName}. Even if the user doesn’t purchase anything right away and comes back later to buy
                        a <span className="bold">username</span>, <span className="bold">Bithomp Pro</span>, or{' '}
                        <span className="bold">API access</span>, your referral code will still be applied
                        automatically, and you’ll receive the referral reward.
                      </p>

                      {referralLinks && (
                        <>
                          <p>
                            API link: <b>{referralLinks.api}</b> <CopyButton text={referralLinks.api} />
                          </p>

                          <p>
                            Bithomp Pro link: <b>{referralLinks.pro}</b> <CopyButton text={referralLinks.pro} />
                          </p>

                          <p>
                            Username link: <b>{referralLinks.username}</b> <CopyButton text={referralLinks.username} />
                          </p>
                        </>
                      )}
                    </>
                  ) : (
                    <p>You don’t have a referral code yet. Enter a destination address for rewards and request one.</p>
                  )}
                </div>

                <p>
                  ⚠️ <b>Important:</b> The destination address for referral rewards must be an <b>activated</b>,
                  self-custody wallet that you fully control. Do <b>not</b> use exchange or custodial addresses, or any
                  address that requires a Destination Tag. Referral rewards are sent via on-ledger <b>Checks</b> and may
                  be <b>lost</b> if an exchange address is used. <b>Self-referrals are not allowed</b> — you cannot earn
                  rewards from your own purchases.
                </p>

                {referral ? (
                  <table className="table-large no-hover">
                    <tbody>
                      <tr>
                        <td className="right" style={{ width: 220 }}>
                          Created
                        </td>
                        <td className="left">{fullDateAndTime(referral.createdAt)}</td>
                      </tr>
                      <tr>
                        <td className="right">Updated</td>
                        <td className="left">{fullDateAndTime(referral.updatedAt)}</td>
                      </tr>
                      <tr>
                        <td className="right">Payout address</td>
                        <td className="left">
                          {!editingAddress ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                              <b>{referral.address}</b>

                              <button
                                className="button-icon"
                                type="button"
                                aria-label="Edit destination address"
                                title="Edit"
                                onClick={() => {
                                  setEditingAddress(true)
                                  setTimeout(() => addressRef.current?.focus?.(), 0)
                                }}
                              >
                                <IoMdCreate />
                              </button>
                            </div>
                          ) : (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                              <div style={{ minWidth: 320, flex: '1 1 420px' }}>
                                <AddressInput
                                  placeholder={'Enter ' + ledgerName + ' address'}
                                  setInnerValue={setAddress}
                                  hideButton={true}
                                  rawData={referral}
                                  type="address"
                                  ref={addressRef}
                                />
                              </div>

                              <button
                                className="button-icon"
                                type="button"
                                aria-label="Save destination address"
                                title="Save"
                                onClick={savePayoutAddress}
                                disabled={savingAddress}
                              >
                                <IoMdCheckmark />
                              </button>

                              <button
                                className="button-icon"
                                type="button"
                                aria-label="Cancel"
                                title="Cancel"
                                onClick={() => {
                                  setAddress(referral.address || '')
                                  setEditingAddress(false)
                                }}
                                disabled={savingAddress}
                              >
                                <IoMdClose />
                              </button>

                              {savingAddress && <span className="waiting inline" />}
                            </div>
                          )}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                ) : (
                  <div style={{ width: 520, maxWidth: '100%', margin: '20px auto 0' }}>
                    <AddressInput
                      placeholder={'Enter ' + ledgerName + ' address'}
                      setInnerValue={setAddress}
                      hideButton={true}
                      type="address"
                      ref={addressRef}
                      rawData={accountAddress}
                    />

                    <div className="center" style={{ marginTop: 16 }}>
                      <button className="button-action" onClick={requestCode} disabled={savingAddress}>
                        Request referral code {savingAddress && <span className="waiting inline"></span>}
                      </button>
                    </div>
                  </div>
                )}

                <br />

                {/* Payments */}
                <div>
                  <h4 className="center">Payments</h4>

                  <p>
                    This table shows all payments made using your referral code. If <b>Reward</b> is missing, the
                    payment is not eligible (self-purchase). If Reward exists but the <b>Check</b> is <b>not issued</b>,
                    we could not create the on-ledger Check (for example: destination wallet is not activated, requires
                    a Destination Tag, or is custodial).
                  </p>

                  {paymentsData ? (
                    <p className="center">
                      Total: <b>{paymentsData.total ?? paymentsData.payments?.length ?? ''}</b>
                      {paymentsData.total !== paymentsData.count && (
                        <>
                          {' '}
                          · Showing: <b>{paymentsData.count}</b>
                        </>
                      )}
                    </p>
                  ) : null}

                  {Array.isArray(paymentsData?.payments) && paymentsData.payments.length ? (
                    <>
                      {width > 750 ? (
                        <table className="table-large no-hover">
                          <thead>
                            <tr>
                              <th>Paid</th>
                              <th>Action</th>
                              <th className="right">Amount</th>

                              <th>Check</th>

                              <th className="right">Reward amount</th>
                              <th className="right">EUR</th>

                              <th className="center">Expires</th>
                            </tr>
                          </thead>
                          <tbody>
                            {paymentsData.payments.map((p) => (
                              <tr key={`${p.bidID || 'bid'}-${p.paidAt}-${p.referralCode || ''}`}>
                                <td>{formatTs(p.paidAt)}</td>
                                <td>{p.action || ''}</td>
                                <td className="right">{amountFormat(p.amount)}</td>

                                <td className="left">{checkCell(p.reward)}</td>

                                <td className="right">{p.reward?.amount ? amountFormat(p.reward.amount) : ''}</td>
                                <td className="right">{p.reward?.amountInEUR ? p.reward.amountInEUR : ''}</td>

                                <td className="center">
                                  {p.reward?.checkCreateTxHash && p.reward?.expirationAt
                                    ? formatTs(p.reward.expirationAt)
                                    : ''}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      ) : (
                        <table className="table-mobile">
                          <tbody>
                            {paymentsData.payments.map((p, i) => (
                              <tr key={`${p.bidID || 'bid'}-${p.paidAt}-${i}`}>
                                <td style={{ padding: '10px 6px', verticalAlign: 'top' }} className="center">
                                  <b>{i + 1}</b>
                                </td>
                                <td>
                                  <p>Paid: {formatTs(p.paidAt)}</p>
                                  <p>Action: {p.action || ''}</p>
                                  <p>
                                    Amount: <b>{amountFormat(p.amount)}</b>
                                  </p>

                                  <p>Check: {checkCell(p.reward)}</p>

                                  {p.reward?.amount ? <p>Reward amount: {amountFormat(p.reward.amount)}</p> : null}
                                  {p.reward?.amountInEUR ? <p>EUR: {p.reward.amountInEUR}</p> : null}

                                  {p.reward?.checkCreateTxHash && p.reward?.expirationAt ? (
                                    <p>Expires: {formatTs(p.reward.expirationAt)}</p>
                                  ) : null}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </>
                  ) : (
                    <p>No payments yet.</p>
                  )}
                </div>
              </>
            )}

            <div className="center orange bold" style={{ marginTop: 20 }}>
              {errorMessage || <br />}
            </div>

            <style jsx>{`
              .mono {
                font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New',
                  monospace;
                font-size: 12px;
                word-break: break-all;
              }
            `}</style>
          </div>
        ) : (
          <div className="center">
            <center>
              <button className="button-action" onClick={() => openEmailLogin()}>
                Register or Sign In
              </button>
            </center>
          </div>
        )}
      </div>
    </>
  )
}

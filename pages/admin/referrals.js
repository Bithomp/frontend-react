import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { i18n, useTranslation } from 'next-i18next'
import { useEffect, useMemo, useRef, useState } from 'react'

import { axiosAdmin } from '../../utils/axios'
import { getIsSsrMobile } from '../../utils/mobile'
import { isAddressValid, ledgerName, server, siteName, useWidth } from '../../utils'
import { amountFormat, fullDateAndTime, timeFromNow } from '../../utils/format'
import { LinkAccount, LinkTx } from '../../utils/links'

import SEO from '../../components/SEO'
import AdminTabs from '../../components/Tabs/AdminTabs'
import CopyButton from '../../components/UI/CopyButton'
import AddressInput from '../../components/UI/AddressInput'
import { IoMdClose, IoMdCheckmark, IoMdCreate } from 'react-icons/io'
import Link from 'next/link'
import { bidFullServiceName } from '../../utils/bids'

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

const badge = (text, colorClass) => <span className={colorClass}>{text}</span>

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

  const issuedChecksCount = useMemo(() => {
    const list = paymentsData?.payments || []
    return list.filter((p) => getRewardStatus(p?.reward) === 'issued').length
  }, [paymentsData])

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
            <Link href="/username">Username</Link>
          </li>
          <li>
            <Link href="/admin/subscriptions">Bithomp Pro</Link> subscription
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
                  <h4 className="center">Your referral links</h4>

                  {referral ? (
                    <>
                      <details>
                        <summary style={{ cursor: 'pointer' }}>
                          <span className="link bold">How it works</span> (links, tracking, examples)
                        </summary>

                        <div>
                          <p>
                            Your referral code works on <b>any</b> link on {siteName}. Add{' '}
                            <b>?ref={referral?.referralCode}</b> to links to a <b>transaction</b>, <b>account</b>,{' '}
                            <b>NFT</b>, or any other page.
                          </p>
                          <p>
                            When someone opens such a link, the code is <b>saved in their browser</b>. If they purchase
                            later, you receive the reward automatically.
                          </p>

                          {referralLinks && (
                            <>
                              <p>
                                Your <span className="bold">Bithomp Pro</span> link{' '}
                                <CopyButton text={referralLinks.pro} />, <span className="bold">API</span> link{' '}
                                <CopyButton text={referralLinks.api} />, <span className="bold">Username</span> link{' '}
                                <CopyButton text={referralLinks.username} />
                              </p>
                            </>
                          )}
                        </div>
                      </details>
                      <p>
                        Example: <span className="brake bold">{referralLinks.landing}</span>{' '}
                        <CopyButton text={referralLinks.landing} />
                      </p>
                    </>
                  ) : (
                    <p>You don’t have a referral code yet. Enter a destination address for rewards and request one.</p>
                  )}
                </div>

                <div>
                  <br />
                  <h4 className="center">Payout address</h4>
                  <details style={{ margin: '0 auto 16px' }}>
                    <summary style={{ cursor: 'pointer' }}>
                      <span className="bold blue">Important requirements</span> (activated wallet, no exchanges, no
                      self-referrals)
                    </summary>

                    <p style={{ marginTop: 10 }}>
                      ⚠️ The destination address for referral rewards must be an <b>activated</b>, self-custody wallet
                      you control. Do
                      <b> not</b> use exchange/custodial addresses or addresses that require a Destination Tag. Rewards
                      are sent via on-ledger <b>Checks</b> and may be lost. <b>Self-referrals are not allowed</b>.
                    </p>
                  </details>
                </div>
                {referral ? (
                  <table className="table-large no-hover">
                    <tbody>
                      <tr>
                        <td className="right">Created</td>
                        <td className="left">{fullDateAndTime(referral.createdAt)}</td>
                      </tr>
                      {referral.createdAt !== referral.updatedAt && (
                        <tr>
                          <td className="right">Updated</td>
                          <td className="left">{fullDateAndTime(referral.updatedAt)}</td>
                        </tr>
                      )}
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

                {issuedChecksCount > 0 && referral?.address ? (
                  <div className="box center" style={{ maxWidth: 900, margin: '0 auto 16px' }}>
                    <span className="orange bold">
                      You have {issuedChecksCount} unredeemed Check{issuedChecksCount > 1 ? 's' : ''}.
                    </span>{' '}
                    Go to your address and redeem {issuedChecksCount > 1 ? 'them' : 'it'}:{' '}
                    <LinkAccount address={referral.address} />
                  </div>
                ) : null}

                {/* Payments */}
                <div>
                  <h4 className="center">Payments</h4>

                  <p>
                    This table shows all payments made using your referral code. If <span className="bold">Reward</span>{' '}
                    is missing, the payment is not eligible (self-purchase). If Reward exists but the{' '}
                    <span className="bold">Check</span> is <span className="bold">not issued</span>, we could not create
                    the on-ledger Check. 🕒 Checks expire in <span className="bold">1 month</span>.
                  </p>

                  {Array.isArray(paymentsData?.payments) && paymentsData.payments.length ? (
                    <>
                      {width > 750 ? (
                        <table className="table-large no-hover">
                          <thead>
                            <tr>
                              <th>Date & Time</th>
                              <th>Service</th>
                              <th>Reward amount</th>
                              <th>Check</th>
                              <th>Check expires</th>
                            </tr>
                          </thead>
                          <tbody>
                            {paymentsData.payments.map((p, i) => (
                              <tr key={i}>
                                <td>{fullDateAndTime(p.paidAt)}</td>
                                <td>{bidFullServiceName(p)}</td>
                                <td className="right">{p.reward?.amount ? amountFormat(p.reward.amount) : ''}</td>
                                <td>{checkCell(p.reward)}</td>
                                <td>
                                  {getRewardStatus(p.reward) === 'issued' ? (
                                    <>
                                      {timeFromNow(p.reward.expirationAt, i18n)}
                                      <br />
                                      {fullDateAndTime(p.reward.expirationAt, 'expiration')}
                                    </>
                                  ) : (
                                    ''
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      ) : (
                        <table className="table-mobile">
                          <tbody>
                            {paymentsData.payments.map((p, i) => (
                              <tr key={i}>
                                <td style={{ padding: '10px 6px', verticalAlign: 'top' }} className="center">
                                  <b>{i + 1}</b>
                                </td>
                                <td>
                                  <p>Date & Time: {fullDateAndTime(p.paidAt)}</p>
                                  <p>Service: {bidFullServiceName(p)}</p>
                                  {p.reward?.amount ? <p>Reward amount: {amountFormat(p.reward.amount)}</p> : null}
                                  <p>Check: {checkCell(p.reward)}</p>
                                  {getRewardStatus(p.reward) === 'issued' ? (
                                    <p>
                                      Check expires: {timeFromNow(p.reward.expirationAt, i18n)}
                                      <br />
                                      {fullDateAndTime(p.reward.expirationAt, 'expiration')}
                                    </p>
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
      <style jsx>{`
        summary::marker {
          color: var(--accent-link);
        }
        summary:hover::marker {
          color: var(--main-text);
        }
        details[open] > summary::marker {
          color: var(--main-text);
        }
        details[open] > summary > span {
          color: var(--main-text);
        }
      `}</style>
    </>
  )
}

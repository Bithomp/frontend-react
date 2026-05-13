import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { i18n, useTranslation } from 'next-i18next'
import { useEffect, useMemo, useRef, useState } from 'react'

import { axiosAdmin } from '../../utils/axios'
import { getIsSsrMobile } from '../../utils/mobile'
import { isAddressValid, ledgerName, localePath, server, siteName, useWidth } from '../../utils'
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

const checkCell = (reward, t) => {
  // No reward => self purchase => not eligible
  if (!reward) return badge(t('referrals.status.not-eligible'), 'orange')

  // Reward exists but cannot issue (no create tx hash) => not issued (no links)
  // This is separate from "failed" status (which is missing checkID).
  if (!reward.checkCreateTxHash) return badge(t('referrals.status.not-issued'), 'red')

  const st = getRewardStatus(reward)

  // Decide which tx to link to based on final state
  if (st === 'cashed' && reward.checkCashedTxHash) {
    return (
      <>
        {badge(t('referrals.status.cashed'), 'green')} <LinkTx tx={reward.checkCashedTxHash} icon={true} />
      </>
    )
  }

  if (st === 'canceled' && reward.checkCanceledTxHash) {
    return (
      <>
        {badge(t('referrals.status.canceled'), 'red')} <LinkTx tx={reward.checkCanceledTxHash} icon={true} />
      </>
    )
  }

  if (st === 'failed') {
    return badge(t('referrals.status.failed'), 'red')
  }

  if (st === 'expired') {
    return (
      <>
        {badge(t('referrals.status.expired'), 'red')} <LinkTx tx={reward.checkCreateTxHash} icon={true} />
      </>
    )
  }

  // issued
  return (
    <>
      {badge(t('referrals.status.issued'), 'green')} <LinkTx tx={reward.checkCreateTxHash} icon={true} />
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
      api: `${server}${localePath('/admin/api', i18n.language)}?ref=${ref}#api-subscription`,
      pro: `${server}${localePath('/admin', i18n.language)}?ref=${ref}#bithomp-pro-subscription`,
      username: `${server}${localePath('/username', i18n.language)}?ref=${ref}`,
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
      setErrorMessage(t('referrals.errors.address-required', { ns: 'admin' }))
      addressRef.current?.focus?.()
      return
    }

    if (!isAddressValid(address)) {
      setErrorMessage(t('referrals.errors.address-invalid', { ns: 'admin' }))
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
      setErrorMessage(t('referrals.errors.address-required', { ns: 'admin' }))
      addressRef.current?.focus?.()
      return
    }

    if (!isAddressValid(address)) {
      setErrorMessage(t('referrals.errors.address-invalid', { ns: 'admin' }))
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
      <SEO title={t('tabs.referrals', { ns: 'admin' })} />

      <div className="page-admin content-center">
        <h1 className="center">{t('header', { ns: 'admin' })}</h1>

        <AdminTabs name="mainTabs" tab="referrals" />

        <h4 className="center">{t('referrals.title', { ns: 'admin' })}</h4>

        <p>
          {t('referrals.intro-before', { ns: 'admin' })} <b>{t('referrals.commission', { ns: 'admin' })}</b>{' '}
          {t('referrals.intro-after', { ns: 'admin' })}
        </p>

        <p>{t('referrals.earn-when', { ns: 'admin' })}</p>
        <ul>
          <li>
            <Link href="/username">Username</Link>
          </li>
          <li>
            <Link href="/admin#bithomp-pro-subscription">Bithomp Pro</Link>{' '}
            {t('subscriptions.subscription', { ns: 'admin' })}
          </li>
          <li>
            <Link href="/admin/api#api-subscription">{t('referrals.api-access', { ns: 'admin' })}</Link>
          </li>
        </ul>

        <p>
          {t('referrals.paid-before', { ns: 'admin' })} <b>{t('referrals.instantly', { ns: 'admin' })}</b>{' '}
          {t('referrals.paid-as', { ns: 'admin' })} <b>{ledgerName} Check</b>,{' '}
          {t('referrals.paid-after', { ns: 'admin' })}
        </p>

        {!referral && (
          <>
            <p>{t('referrals.how-it-works', { ns: 'admin' })}</p>
            <ul>
              <li>{t('referrals.steps.link', { ns: 'admin' })}</li>
              <li>{t('referrals.steps.share', { ns: 'admin' })}</li>
              <li>{t('referrals.steps.earn', { ns: 'admin' })}</li>
            </ul>
          </>
        )}

        <p>
          {t('referrals.no-limit-before', { ns: 'admin' })} <b>{t('referrals.no-limit', { ns: 'admin' })}</b>{' '}
          {t('referrals.no-limit-after', { ns: 'admin' })}
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
                  <h4 className="center">{t('referrals.links-title', { ns: 'admin' })}</h4>

                  {referral ? (
                    <>
                      <details>
                        <summary style={{ cursor: 'pointer' }}>
                          <span className="link bold">{t('referrals.how-it-works', { ns: 'admin' })}</span>{' '}
                          ({t('referrals.how-summary', { ns: 'admin' })})
                        </summary>

                        <div>
                          <p>
                            {t('referrals.code-works-before', { ns: 'admin' })} <b>{t('referrals.any', { ns: 'admin' })}</b>{' '}
                            {t('referrals.code-works-on', { ns: 'admin', siteName })}{' '}
                            <b>?ref={referral?.referralCode}</b> {t('referrals.code-works-after', { ns: 'admin' })}
                          </p>
                          <p>
                            {t('referrals.browser-save-before', { ns: 'admin' })}{' '}
                            <b>{t('referrals.browser-save-bold', { ns: 'admin' })}</b>.{' '}
                            {t('referrals.browser-save-after', { ns: 'admin' })}
                          </p>

                          {referralLinks && (
                            <>
                              <p>
                                {t('referrals.your-links-before', { ns: 'admin' })}{' '}
                                <span className="bold">Bithomp Pro</span> {t('referrals.link', { ns: 'admin' })}{' '}
                                <CopyButton text={referralLinks.pro} />, <span className="bold">API</span>{' '}
                                {t('referrals.link', { ns: 'admin' })} <CopyButton text={referralLinks.api} />,
                                <span className="bold"> Username</span> {t('referrals.link', { ns: 'admin' })}{' '}
                                <CopyButton text={referralLinks.username} />
                              </p>
                            </>
                          )}
                        </div>
                      </details>
                      <p>
                        {t('referrals.example', { ns: 'admin' })}: <span className="brake bold">{referralLinks.landing}</span>{' '}
                        <CopyButton text={referralLinks.landing} />
                      </p>
                    </>
                  ) : (
                    <p>{t('referrals.no-code', { ns: 'admin' })}</p>
                  )}
                </div>

                <div>
                  <br />
                  <h4 className="center">{t('referrals.payout-address', { ns: 'admin' })}</h4>
                  <details style={{ margin: '0 auto 16px' }}>
                    <summary style={{ cursor: 'pointer' }}>
                      <span className="bold blue">{t('referrals.requirements-title', { ns: 'admin' })}</span>{' '}
                      ({t('referrals.requirements-summary', { ns: 'admin' })})
                    </summary>

                    <p style={{ marginTop: 10 }}>
                      {t('referrals.requirements-text', { ns: 'admin' })}
                    </p>
                  </details>
                </div>
                {referral ? (
                  <table className="table-large no-hover">
                    <tbody>
                      <tr>
                        <td className="right">{t('table.created', { ns: 'admin' })}</td>
                        <td className="left">{fullDateAndTime(referral.createdAt)}</td>
                      </tr>
                      {referral.createdAt !== referral.updatedAt && (
                        <tr>
                          <td className="right">{t('table.updated', { ns: 'admin' })}</td>
                          <td className="left">{fullDateAndTime(referral.updatedAt)}</td>
                        </tr>
                      )}
                      <tr>
                        <td className="right">{t('referrals.payout-address', { ns: 'admin' })}</td>
                        <td className="left">
                          {!editingAddress ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                              <b>{referral.address}</b>

                              <button
                                className="button-icon"
                                type="button"
                                aria-label={t('referrals.edit-address', { ns: 'admin' })}
                                title={t('button.edit', { ns: 'admin' })}
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
                                  placeholder={t('referrals.address-placeholder', { ns: 'admin', ledgerName })}
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
                                aria-label={t('referrals.save-address', { ns: 'admin' })}
                                title={t('button.save', { ns: 'admin' })}
                                onClick={savePayoutAddress}
                                disabled={savingAddress}
                              >
                                <IoMdCheckmark />
                              </button>

                              <button
                                className="button-icon"
                                type="button"
                                aria-label={t('button.cancel', { ns: 'admin' })}
                                title={t('button.cancel', { ns: 'admin' })}
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
                      placeholder={t('referrals.address-placeholder', { ns: 'admin', ledgerName })}
                      setInnerValue={setAddress}
                      hideButton={true}
                      type="address"
                      ref={addressRef}
                      rawData={accountAddress}
                    />

                    <div className="center" style={{ marginTop: 16 }}>
                      <button className="button-action" onClick={requestCode} disabled={savingAddress}>
                        {t('referrals.request-code', { ns: 'admin' })}{' '}
                        {savingAddress && <span className="waiting inline"></span>}
                      </button>
                    </div>
                  </div>
                )}

                <br />

                {issuedChecksCount > 0 && referral?.address ? (
                  <div className="box center" style={{ maxWidth: 900, margin: '0 auto 16px' }}>
                    <span className="orange bold">
                      {t('referrals.unredeemed', { ns: 'admin', count: issuedChecksCount })}
                    </span>{' '}
                    {t('referrals.redeem', { ns: 'admin', count: issuedChecksCount })}:{' '}
                    <LinkAccount address={referral.address} />
                  </div>
                ) : null}

                {/* Payments */}
                <div>
                  <h4 className="center">{t('referrals.payments', { ns: 'admin' })}</h4>

                  <p>
                    {t('referrals.payments-note', { ns: 'admin' })}
                  </p>

                  {Array.isArray(paymentsData?.payments) && paymentsData.payments.length ? (
                    <>
                      {width > 750 ? (
                        <table className="table-large no-hover">
                          <thead>
                            <tr>
                              <th>{t('table.date-time', { ns: 'admin' })}</th>
                              <th>{t('table.service', { ns: 'admin' })}</th>
                              <th>{t('referrals.reward-amount', { ns: 'admin' })}</th>
                              <th>{t('table.check', { ns: 'admin' })}</th>
                              <th>{t('referrals.check-expires', { ns: 'admin' })}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {paymentsData.payments.map((p, i) => (
                              <tr key={i}>
                                <td>{fullDateAndTime(p.paidAt)}</td>
                                <td>{bidFullServiceName(p)}</td>
                                <td className="right">{p.reward?.amount ? amountFormat(p.reward.amount) : ''}</td>
                                <td>{checkCell(p.reward, (key) => t(key, { ns: 'admin' }))}</td>
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
                                  <p>
                                    {t('table.date-time', { ns: 'admin' })}: {fullDateAndTime(p.paidAt)}
                                  </p>
                                  <p>
                                    {t('table.service', { ns: 'admin' })}: {bidFullServiceName(p)}
                                  </p>
                                  {p.reward?.amount ? (
                                    <p>
                                      {t('referrals.reward-amount', { ns: 'admin' })}: {amountFormat(p.reward.amount)}
                                    </p>
                                  ) : null}
                                  <p>
                                    {t('table.check', { ns: 'admin' })}: {checkCell(p.reward, (key) => t(key, { ns: 'admin' }))}
                                  </p>
                                  {getRewardStatus(p.reward) === 'issued' ? (
                                    <p>
                                      {t('referrals.check-expires', { ns: 'admin' })}: {timeFromNow(p.reward.expirationAt, i18n)}
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
                    <p>{t('referrals.no-payments', { ns: 'admin' })}</p>
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
                {t('button.register-sign-in', { ns: 'admin' })}
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

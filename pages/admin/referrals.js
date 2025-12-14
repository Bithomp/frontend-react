import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { i18n, useTranslation } from 'next-i18next'
import { useEffect, useMemo, useRef, useState } from 'react'

import { axiosAdmin } from '../../utils/axios'
import { getIsSsrMobile } from '../../utils/mobile'
import { isAddressValid, ledgerName, siteName, useWidth, webSiteName } from '../../utils'
import { fullDateAndTime, shortNiceNumber } from '../../utils/format'
import { LinkTx } from '../../utils/links'

import SEO from '../../components/SEO'
import AdminTabs from '../../components/Tabs/AdminTabs'
import CopyButton from '../../components/UI/CopyButton'
import AddressInput from '../../components/UI/AddressInput'
import { IoMdClose, IoMdCheckmark, IoMdCreate } from 'react-icons/io'

export const getServerSideProps = async (context) => {
  const { locale } = context
  return {
    props: {
      isSsrMobile: getIsSsrMobile(context),
      ...(await serverSideTranslations(locale, ['common', 'admin']))
    }
  }
}

const statusBadge = (status) => {
  const s = (status || '').toLowerCase()
  if (s === 'paid' || s === 'completed') return <b className="green">{status}</b>
  if (s === 'pending') return <b className="orange">{status}</b>
  if (s === 'expired' || s === 'canceled' || s === 'failed') return <b className="red">{status}</b>
  return <b>{status || '-'}</b>
}

export default function Referrals({ account, sessionToken, openEmailLogin }) {
  const { t } = useTranslation(['common', 'admin'])
  const width = useWidth()

  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const [codesData, setCodesData] = useState(null)
  const [rewardsData, setRewardsData] = useState(null)

  const [address, setAddress] = useState('')
  const [editingAddress, setEditingAddress] = useState(false)
  const [savingAddress, setSavingAddress] = useState(false)

  const addressRef = useRef(null)

  const referral = codesData?.referrals?.[0] || null // currently only one allowed

  const referralLinks = useMemo(() => {
    if (!referral?.referralCode) return null

    const ref = referral.referralCode
    const base = `https://${webSiteName}`

    return {
      api: `${base}/${i18n.language}/admin/subscriptions?tab=api&ref=${ref}`,
      pro: `${base}/${i18n.language}/admin/subscriptions?ref=${ref}`,
      username: `${base}/${i18n.language}/username?ref=${ref}`,
      landing: `${base}/${i18n.language}/?ref=${ref}`
    }
  }, [referral?.referralCode])

  useEffect(() => {
    if (sessionToken) {
      loadAll()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionToken])

  useEffect(() => {
    // Prefer saved referral payout address; fallback to logged-in account address
    if (referral?.address) {
      setAddress(referral.address)
      return
    }

    if (account?.address) {
      setAddress(account.address)
    }
  }, [referral?.address, account?.address])

  const loadAll = async () => {
    await Promise.all([getCodes(), getRewards()])
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

  const getRewards = async () => {
    const resp = await axiosAdmin.get('partner/referrals/rewards').catch((error) => {
      if (error && error.message !== 'canceled') {
        if (error.response?.data?.error === 'errors.token.required') {
          openEmailLogin()
        } else {
          setErrorMessage(t(error.response?.data?.error || 'error.' + error.message))
        }
      }
    })

    if (resp?.data) {
      setRewardsData(resp.data)
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
      // Refresh to ensure consistency (and to follow your "only one allowed" rule)
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

  return (
    <>
      <SEO title="Referrals" />

      <div className="page-admin content-center">
        <h1 className="center">{t('header', { ns: 'admin' })}</h1>

        <AdminTabs name="mainTabs" tab="referrals" />

        {sessionToken ? (
          <div>
            <h4 className="center">Earn with referrals</h4>

            <p>
              Share your referral link. When someone purchases a username or subscription using your link, you{' '}
              <b>earn rewards</b> that are paid instantly to your destination address via an {ledgerName} Check, which
              you can cash out right away.
            </p>

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
                        <div className="bold">{referralLinks.landing}</div>
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
                            <td className="right">Destination address</td>
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
                    </>
                  ) : (
                    <>
                      <p>
                        You don’t have a referral code yet. Enter a destination address for rewards and request one.
                      </p>

                      <div style={{ width: 520, maxWidth: '100%', margin: '20px auto 0' }}>
                        <AddressInput
                          placeholder={'Enter ' + ledgerName + ' address'}
                          setInnerValue={setAddress}
                          hideButton={true}
                          type="address"
                          ref={addressRef}
                          rawData={
                            account?.address
                              ? { address: account.address, addressDetails: { username: account.username } }
                              : null
                          }
                        />

                        <div className="center" style={{ marginTop: 16 }}>
                          <button className="button-action" onClick={requestCode} disabled={savingAddress}>
                            Request referral code {savingAddress && <span className="waiting inline"></span>}
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>

                <br />

                {/* Stats / details */}
                <div>
                  <h4 className="center">Rewards</h4>

                  {rewardsData?.rewards?.length ? (
                    <>
                      {width > 750 ? (
                        <table className="table-large no-hover">
                          <thead>
                            <tr>
                              <th>Date</th>
                              <th>Status</th>
                              <th className="right">Amount</th>
                              <th className="right">EUR</th>
                              <th>Check</th>
                              <th className="center">Create</th>
                              <th className="center">Cashed</th>
                              <th className="center">Canceled</th>
                            </tr>
                          </thead>
                          <tbody>
                            {rewardsData.rewards.map((r) => (
                              <tr key={r.id}>
                                <td>{fullDateAndTime(r.createdAt)}</td>
                                <td>{statusBadge(r.status)}</td>
                                <td className="right">
                                  {shortNiceNumber(r.amount, 6, 6)} {r.currency}
                                </td>
                                <td className="right">{shortNiceNumber(r.amountInEUR, 2, 2)}</td>
                                <td className="left">
                                  <span className="mono">{r.checkID}</span> <CopyButton text={r.checkID} />
                                  {r.expirationAt ? (
                                    <>
                                      <br />
                                      Expires: {fullDateAndTime(r.expirationAt)}
                                    </>
                                  ) : null}
                                </td>
                                <td className="center">
                                  {r.checkCreateTxHash ? <LinkTx tx={r.checkCreateTxHash} icon={true} /> : '-'}
                                </td>
                                <td className="center">
                                  {r.checkCashedTxHash ? <LinkTx tx={r.checkCashedTxHash} icon={true} /> : '-'}
                                </td>
                                <td className="center">
                                  {r.checkCanceledTxHash ? <LinkTx tx={r.checkCanceledTxHash} icon={true} /> : '-'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      ) : (
                        <table className="table-mobile">
                          <tbody>
                            {rewardsData.rewards.map((r, i) => (
                              <tr key={r.id}>
                                <td style={{ padding: '10px 6px', verticalAlign: 'top' }} className="center">
                                  <b>{i + 1}</b>
                                </td>
                                <td>
                                  <p>Date: {fullDateAndTime(r.createdAt)}</p>
                                  <p>Status: {statusBadge(r.status)}</p>
                                  <p>
                                    Amount: <b>{shortNiceNumber(r.amount, 6, 6)}</b> {r.currency} (
                                    {shortNiceNumber(r.amountInEUR, 2, 2)} EUR)
                                  </p>
                                  <p>
                                    Check: <span className="mono">{r.checkID}</span> <CopyButton text={r.checkID} />
                                  </p>
                                  <p>Expires: {r.expirationAt ? fullDateAndTime(r.expirationAt) : '-'}</p>
                                  <p>
                                    Create:{' '}
                                    {r.checkCreateTxHash ? <LinkTx tx={r.checkCreateTxHash} icon={true} /> : '-'}
                                  </p>
                                  <p>
                                    Cashed:{' '}
                                    {r.checkCashedTxHash ? <LinkTx tx={r.checkCashedTxHash} icon={true} /> : '-'}
                                  </p>
                                  <p>
                                    Canceled:{' '}
                                    {r.checkCanceledTxHash ? <LinkTx tx={r.checkCanceledTxHash} icon={true} /> : '-'}
                                  </p>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </>
                  ) : (
                    <p>No rewards yet.</p>
                  )}
                </div>
              </>
            )}

            <div className="center orange bold" style={{ marginTop: 20 }}>
              {errorMessage || <br />}
            </div>

            <style jsx>{`
              .box {
                border: 1px solid var(--border-main);
                border-radius: 10px;
                padding: 16px;
                background: var(--bg-main);
              }
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
            <div style={{ maxWidth: '440px', margin: 'auto', textAlign: 'left' }}>
              <p>- Create and manage your referral code.</p>
              <p>- Track your referral rewards and payout status.</p>
            </div>
            <br />
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

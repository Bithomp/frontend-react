import { useState, useEffect } from 'react'
import { useTranslation } from 'next-i18next'
import axios from 'axios'
import Link from 'next/link'
import { explorerName, isAddressValid } from '../../utils'
import SEO from '../../components/SEO'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { getIsSsrMobile } from '../../utils/mobile'
import AddressInput from '../../components/UI/AddressInput'
import CopyButton from '../../components/UI/CopyButton'
import CheckBox from '../../components/UI/CheckBox'
import { IoTrashOutline } from 'react-icons/io5'
import { IoIosRocket } from 'react-icons/io'
import { FaWallet } from 'react-icons/fa6'
import { accountSettings } from '../../styles/pages/account-settings.module.scss'
import AccountServiceTabs from '../../components/Tabs/AccountServiceTabs'

export const getServerSideProps = async (context) => {
  const { locale } = context
  return {
    props: {
      isSsrMobile: getIsSsrMobile(context),
      ...(await serverSideTranslations(locale, ['common']))
    }
  }
}

// Well-known blackhole address (all-zeros hash – no private key exists)
const BLACKHOLE_ADDRESS = 'rrrrrrrrrrrrrrrrrrrrBZbvji'

export default function AccountControl({ account, setSignRequest, sessionToken, subscriptionExpired, openEmailLogin }) {
  const { t } = useTranslation(['common'])
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  const [multiSigErrorMessage, setMultiSigErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [accountData, setAccountData] = useState(null)

  // Regular key
  const [regularKeyInput, setRegularKeyInput] = useState('')

  // Multi-sig
  const [signerQuorum, setSignerQuorum] = useState('1')
  const [signerEntries, setSignerEntries] = useState([{ account: '', weight: '1' }])

  // Blackhole
  const [confirmBlackhole, setConfirmBlackhole] = useState(false)

  const isPro = sessionToken && !subscriptionExpired
  const isProLocked = !isPro
  const proOnlyTooltip = !sessionToken
    ? 'Log in to Bithomp Pro to enable this function.'
    : 'Subscribe to Bithomp Pro to enable this function.'
  const signInTooltip = 'Sign in to your account to enable this function.'
  const withActionTooltip = (node, tooltipText) => {
    if (!tooltipText) return node
    return (
      <span className="tooltip" style={{ display: 'inline-flex' }}>
        {node}
        <span className="tooltiptext left">{tooltipText}</span>
      </span>
    )
  }

  const ledgerInfo = accountData?.ledgerInfo
  const regularKey = ledgerInfo?.regularKey || null
  const masterKeyDisabled = !!ledgerInfo?.flags?.disableMaster
  const signerList = ledgerInfo?.signerList || null
  const isBlackholed = !!ledgerInfo?.blackholed

  useEffect(() => {
    const fetchAccountData = async () => {
      if (!account?.address) {
        setLoading(false)
        return
      }
      try {
        const response = await axios(`/v2/address/${account.address}?ledgerInfo=true`)
        setAccountData(response.data)
        setLoading(false)
      } catch (error) {
        setErrorMessage('Error fetching account data.')
        setLoading(false)
      }
    }
    setLoading(true)
    fetchAccountData()
  }, [account])

  // ── Regular Key ──────────────────────────────────────────────────────────────

  const handleSetRegularKey = () => {
    const addr = regularKeyInput.trim()
    if (!isAddressValid(addr)) {
      setErrorMessage('Please enter a valid address.')
      return
    }
    if (addr === account.address) {
      setErrorMessage('Regular key cannot be the same as the account address.')
      return
    }
    setSignRequest({
      request: {
        TransactionType: 'SetRegularKey',
        Account: account.address,
        RegularKey: addr
      },
      callback: () => {
        setSuccessMessage('Regular key set successfully.')
        setErrorMessage('')
        setRegularKeyInput('')
        setAccountData((prev) => (prev ? { ...prev, ledgerInfo: { ...prev.ledgerInfo, regularKey: addr } } : prev))
      }
    })
  }

  const handleRemoveRegularKey = () => {
    if (masterKeyDisabled && !signerList) {
      setErrorMessage(
        'Cannot remove the regular key when the master key is disabled and there is no signer list — you would lose access to your account.'
      )
      return
    }
    setSignRequest({
      request: {
        TransactionType: 'SetRegularKey',
        Account: account.address
      },
      callback: () => {
        setSuccessMessage('Regular key removed successfully.')
        setErrorMessage('')
        setAccountData((prev) => {
          if (!prev?.ledgerInfo) return prev
          const li = { ...prev.ledgerInfo }
          delete li.regularKey
          return { ...prev, ledgerInfo: li }
        })
      }
    })
  }

  // ── Multi-signature ──────────────────────────────────────────────────────────

  const addSignerRow = () => setSignerEntries((prev) => [...prev, { account: '', weight: '1' }])

  const removeSignerRow = (idx) => setSignerEntries((prev) => prev.filter((_, i) => i !== idx))

  const updateSignerRow = (idx, field, val) =>
    setSignerEntries((prev) => prev.map((row, i) => (i === idx ? { ...row, [field]: val } : row)))

  const handleSetSignerList = async () => {
    setMultiSigErrorMessage('')

    const resolvedSigners = []
    for (let i = 0; i < signerEntries.length; i++) {
      const row = signerEntries[i]
      const rawAccount = row.account.trim()

      if (!rawAccount) {
        setMultiSigErrorMessage(`Signer #${i + 1} is empty.`)
        return
      }

      let resolvedAccount = rawAccount
      if (!isAddressValid(rawAccount)) {
        const response = await axios(`/v2/username/${encodeURIComponent(rawAccount)}`).catch(() => null)
        const foundAddress = response?.data?.address
        if (!foundAddress || !isAddressValid(foundAddress)) {
          setMultiSigErrorMessage(`Signer "${rawAccount}" is not a valid address or username.`)
          return
        }
        resolvedAccount = foundAddress
      }

      if (resolvedAccount === account.address) {
        setMultiSigErrorMessage('A signer cannot be the account itself.')
        return
      }

      const w = Number(row.weight)
      if (!Number.isInteger(w) || w < 1 || w > 99) {
        setMultiSigErrorMessage('Each signer weight must be a whole number between 1 and 99.')
        return
      }

      resolvedSigners.push({ account: resolvedAccount, signerWeight: w })
    }

    const quorum = Number(signerQuorum)
    if (!Number.isInteger(quorum) || quorum < 1) {
      setMultiSigErrorMessage('Quorum must be a whole number ≥ 1.')
      return
    }
    const totalWeight = resolvedSigners.reduce((sum, r) => sum + r.signerWeight, 0)
    if (quorum > totalWeight) {
      setMultiSigErrorMessage(`Quorum (${quorum}) cannot exceed total signer weight (${totalWeight}).`)
      return
    }

    const tx = {
      TransactionType: 'SignerListSet',
      Account: account.address,
      SignerQuorum: quorum,
      SignerEntries: resolvedSigners.map((row) => ({
        SignerEntry: {
          Account: row.account,
          SignerWeight: row.signerWeight
        }
      }))
    }

    setSignRequest({
      request: tx,
      callback: () => {
        setSuccessMessage('Signer list set successfully.')
        setMultiSigErrorMessage('')
        setAccountData((prev) => {
          if (!prev?.ledgerInfo) return prev
          return {
            ...prev,
            ledgerInfo: {
              ...prev.ledgerInfo,
              signerList: {
                signerQuorum: quorum,
                signerEntries: resolvedSigners.map((r) => ({ account: r.account, signerWeight: r.signerWeight }))
              }
            }
          }
        })
      }
    })
  }

  const handleRemoveSignerList = () => {
    if (masterKeyDisabled && !regularKey) {
      setMultiSigErrorMessage(
        'Cannot remove the signer list when the master key is disabled and there is no regular key — you would lose access to your account.'
      )
      return
    }
    setSignRequest({
      request: {
        TransactionType: 'SignerListSet',
        Account: account.address,
        SignerQuorum: 0
      },
      callback: () => {
        setSuccessMessage('Signer list removed successfully.')
        setMultiSigErrorMessage('')
        setAccountData((prev) => {
          if (!prev?.ledgerInfo) return prev
          const li = { ...prev.ledgerInfo }
          delete li.signerList
          return { ...prev, ledgerInfo: li }
        })
      }
    })
  }

  // ── Master Key ───────────────────────────────────────────────────────────────

  const handleDisableMasterKey = () => {
    if (!regularKey && !signerList) {
      setErrorMessage(
        'You must set a Regular Key or a Signer List before disabling the Master Key, otherwise you will permanently lose access to your account.'
      )
      return
    }
    setSignRequest({
      request: {
        TransactionType: 'AccountSet',
        Account: account.address,
        SetFlag: 4 // asfDisableMaster
      },
      callback: () => {
        setSuccessMessage('Master key disabled.')
        setErrorMessage('')
        setAccountData((prev) =>
          prev
            ? { ...prev, ledgerInfo: { ...prev.ledgerInfo, flags: { ...prev.ledgerInfo?.flags, disableMaster: true } } }
            : prev
        )
      }
    })
  }

  const handleEnableMasterKey = () => {
    setSignRequest({
      request: {
        TransactionType: 'AccountSet',
        Account: account.address,
        ClearFlag: 4
      },
      callback: () => {
        setSuccessMessage('Master key re-enabled.')
        setErrorMessage('')
        setAccountData((prev) =>
          prev
            ? {
                ...prev,
                ledgerInfo: { ...prev.ledgerInfo, flags: { ...prev.ledgerInfo?.flags, disableMaster: false } }
              }
            : prev
        )
      }
    })
  }

  // ── Blackhole ────────────────────────────────────────────────────────────────

  const handleBlackhole = () => {
    if (!confirmBlackhole) {
      setErrorMessage('Please confirm that you understand the consequences of blackholing your account.')
      return
    }
    setSignRequest({
      request: {
        TransactionType: 'SetRegularKey',
        Account: account.address,
        RegularKey: BLACKHOLE_ADDRESS
      },
      callback: () => {
        setSignRequest({
          request: {
            TransactionType: 'AccountSet',
            Account: account.address,
            SetFlag: 4
          },
          callback: () => {
            setSuccessMessage(
              'Account has been blackholed. No one, including you, can ever sign transactions for it again.'
            )
            setErrorMessage('')
            setConfirmBlackhole(false)
            setAccountData((prev) => {
              if (!prev?.ledgerInfo) return prev
              return {
                ...prev,
                ledgerInfo: {
                  ...prev.ledgerInfo,
                  regularKey: BLACKHOLE_ADDRESS,
                  blackholed: true,
                  flags: { ...prev.ledgerInfo.flags, disableMaster: true }
                }
              }
            })
          }
        })
      }
    })
  }

  // ── Loading ──────────────────────────────────────────────────────────────────

  if (account?.address && loading) {
    return (
      <>
        <SEO title="Account Control" description="Manage account control settings" />
        <div className="content-center">
          <h1 className="center">Account Control</h1>
          <AccountServiceTabs tab="account-control" />
          <div className="center">
            <span className="waiting"></span>
            <br />
            {t('general.loading')}
          </div>
        </div>
      </>
    )
  }

  const isSignedIn = !!account?.address
  const actionLockReason = !isSignedIn ? signInTooltip : isProLocked ? proOnlyTooltip : ''
  const isActionLocked = !!actionLockReason
  const hasRegularKeyConfigured = !!regularKey
  const hasSignerListConfigured = !!signerList

  let masterKeyUnsupportedReason = ''
  if (masterKeyDisabled) {
    if (!hasRegularKeyConfigured && !hasSignerListConfigured) {
      masterKeyUnsupportedReason = 'Regular Key and Signer List signing are not supported yet.'
    } else if (hasRegularKeyConfigured && !hasSignerListConfigured) {
      masterKeyUnsupportedReason = 'Regular Key signing is not supported yet.'
    } else if (!hasRegularKeyConfigured && hasSignerListConfigured) {
      masterKeyUnsupportedReason = 'Signer List signing is not supported yet.'
    } else {
      masterKeyUnsupportedReason = 'Regular Key and Signer List signing are not supported yet.'
    }
  }

  const regularKeyActionLockReason = actionLockReason || masterKeyUnsupportedReason
  const signerListActionLockReason = actionLockReason || masterKeyUnsupportedReason
  const isRegularKeyActionLocked = !!regularKeyActionLockReason
  const isSignerListActionLocked = !!signerListActionLockReason
  const hasAtLeastOneSigner = signerEntries.some((row) => row.account.trim())

  const regularKeyDisabledReason =
    regularKeyActionLockReason || (!regularKeyInput.trim() ? 'Enter a Regular Key first.' : '')
  const signerListDisabledReason =
    signerListActionLockReason || (!hasAtLeastOneSigner ? 'Add at least one signer first.' : '')
  const disableMasterDisabledReason =
    actionLockReason || (!regularKey && !signerList ? 'Set a Regular Key or Signer List first.' : '')
  const blackholeDisabledReason =
    actionLockReason || (!confirmBlackhole ? 'Click the confirmation checkbox first.' : '')

  return (
    <div className={accountSettings}>
      <SEO title="Account Control" description="Manage regular key, master key, and account access on the ledger." />
      <div className="content-center">
        <h1 className="center">Account Control</h1>
        <AccountServiceTabs tab="account-control" />
        <p className="center">
          {isSignedIn
            ? `Manage signing authority for your account on ${explorerName}.`
            : 'Sign in to your account to manage account control settings.'}
        </p>

        {!isSignedIn && (
          <div className="center" style={{ marginTop: '0.6rem' }}>
            <button className="button-action" onClick={() => setSignRequest({})}>
              <FaWallet style={{ fontSize: 14, marginRight: 6 }} />
              Connect wallet
            </button>
          </div>
        )}

        {!isPro && isSignedIn && (
          <div className="center orange" style={{ marginTop: '0.5rem' }}>
            {!sessionToken ? (
              <>
                <p style={{ marginBottom: '0.45rem' }}>
                  Account Control is available to logged-in Bithomp Pro subscribers.
                </p>
                <button className="button-action" onClick={() => openEmailLogin?.()}>
                  <IoIosRocket style={{ fontSize: 16, marginRight: 6, marginBottom: 1 }} />
                  Log in to Bithomp Pro
                </button>
              </>
            ) : (
              <>
                Your Bithomp Pro subscription has expired.{' '}
                <Link href="/admin/subscriptions">Renew your subscription</Link>.
              </>
            )}
          </div>
        )}

        {errorMessage && <p className="red center">{errorMessage}</p>}
        {successMessage && <p className="green center">{successMessage}</p>}

        {/* ── Status Table ── */}
        {isSignedIn && accountData && (
          <>
            <h4>Current Account Control Status</h4>
            <table className="table-details">
              <tbody>
                <tr>
                  <td>Master Key</td>
                  <td className={masterKeyDisabled ? 'orange bold' : 'green'}>
                    {masterKeyDisabled ? 'Disabled' : 'Enabled'}
                  </td>
                </tr>
                <tr>
                  <td>Regular Key</td>
                  <td>
                    {regularKey ? (
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                          fontFamily: 'monospace',
                          fontSize: 13
                        }}
                      >
                        {regularKey}
                        <CopyButton text={regularKey} />
                      </span>
                    ) : (
                      <span className="grey">Not set</span>
                    )}
                  </td>
                </tr>
                <tr>
                  <td>Multi-signature</td>
                  <td>
                    {signerList ? (
                      <span className="green">
                        Enabled — quorum: {signerList.signerQuorum}, {signerList.signerEntries?.length || 0} signer
                        {signerList.signerEntries?.length !== 1 ? 's' : ''}
                      </span>
                    ) : (
                      <span className="grey">Not set</span>
                    )}
                  </td>
                </tr>
                {signerList?.signerEntries?.map((signer, i) => (
                  <tr key={i} className="signer-entry-row">
                    <td style={{ paddingLeft: '1.5rem', color: 'var(--text-secondary)', fontSize: 13 }}>
                      Signer #{i + 1} (weight {signer.signerWeight})
                    </td>
                    <td style={{ fontFamily: 'monospace', fontSize: 13 }}>
                      {signer.account}
                      <CopyButton text={signer.account} />
                    </td>
                  </tr>
                ))}
                {isBlackholed && (
                  <tr>
                    <td>Account</td>
                    <td className="orange bold">Blackholed — no one can sign transactions</td>
                  </tr>
                )}
              </tbody>
            </table>

            {signerList?.signerEntries?.length > 0 && (
              <div className="signer-mobile-list">
                {signerList.signerEntries.map((signer, i) => (
                  <div key={i} className="signer-mobile-item">
                    <div className="signer-mobile-head">
                      <span>Signer #{i + 1}</span>
                      <span>Weight {signer.signerWeight}</span>
                    </div>
                    <div className="signer-mobile-address">
                      {signer.account}
                      <CopyButton text={signer.account} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        <>
          {/* ── Regular Key ── */}
          <h4>Regular Key</h4>
          <div className="flag-item">
            <div className="flag-header">
              <div className="flag-info">
                <span className="flag-name">Regular Key</span>
                <span className="flag-status">{regularKey ? 'Set' : 'Not Set'}</span>
              </div>
              {regularKey &&
                withActionTooltip(
                  <button
                    className="button-action thin"
                    onClick={handleRemoveRegularKey}
                    disabled={isRegularKeyActionLocked}
                  >
                    Remove
                  </button>,
                  regularKeyActionLockReason
                )}
            </div>
            <div className="flag-description">
              A Regular Key is an alternative address whose private key can sign transactions for your account. Unlike
              the master key, you can replace or remove it at any time. Use it to keep your master key in cold storage
              while signing day-to-day transactions with a hot wallet.
            </div>
            <div className="disabled-reason warning" style={{ marginTop: '0.5rem' }}>
              Bithomp currently does not support signing transactions with a Regular Key.
            </div>
            <div className="nft-minter-input" style={{ marginTop: '0.75rem' }}>
              <AddressInput
                title="Set Regular Key"
                placeholder="Enter address to use as Regular Key"
                setInnerValue={setRegularKeyInput}
                hideButton={true}
                type="address"
              />
              <small>Enter the address whose private key you want to use to sign transactions.</small>
              <br />
              {withActionTooltip(
                <button
                  className="button-action thin"
                  onClick={handleSetRegularKey}
                  disabled={isRegularKeyActionLocked || !regularKeyInput.trim()}
                  style={{ marginTop: '0.5rem' }}
                >
                  Set Regular Key
                </button>,
                regularKeyDisabledReason
              )}
            </div>
          </div>

          {/* ── Multi-signature ── */}
          <h4>Multi-signature (Signer List)</h4>
          <div className="flag-item">
            <div className="flag-header">
              <div className="flag-info">
                <span className="flag-name">Signer List</span>
                <span className="flag-status">{signerList ? 'Set' : 'Not Set'}</span>
              </div>
              {signerList &&
                withActionTooltip(
                  <button
                    className="button-action thin"
                    onClick={handleRemoveSignerList}
                    disabled={isSignerListActionLocked}
                  >
                    Remove
                  </button>,
                  signerListActionLockReason
                )}
            </div>
            <div className="flag-description">
              Multi-signing lets a group of accounts collectively authorize transactions. Each signer has a weight; a
              transaction is valid when the combined weight of signers reaches the quorum. Useful for shared treasury
              accounts or extra security.
            </div>
            <div className="disabled-reason warning" style={{ marginTop: '0.5rem' }}>
              Bithomp currently does not support signing transactions with Multi-signature.
            </div>

            <div style={{ marginTop: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
                <label style={{ fontWeight: 500, minWidth: 80 }}>Quorum</label>
                <input
                  className="input-text"
                  type="number"
                  min="1"
                  value={signerQuorum}
                  onChange={(e) => setSignerQuorum(e.target.value)}
                  style={{ width: 80 }}
                />
                <small>Minimum total weight required to sign a transaction.</small>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginBottom: '0.5rem' }}>
                <div className="signer-grid-header">
                  <span style={{ width: 24, flexShrink: 0, textAlign: 'center' }}>#</span>
                  <span style={{ flex: 1 }}>Address</span>
                  <span style={{ width: 56, textAlign: 'center' }}>Weight</span>
                  <span style={{ width: 32 }}></span>
                </div>
                {signerEntries.map((row, idx) => (
                  <div key={idx} className="signer-grid-row">
                    <span className="signer-index-cell">{idx + 1}</span>
                    <div className="signer-address-cell">
                      <AddressInput
                        placeholder="Username or address"
                        setInnerValue={(val) => updateSignerRow(idx, 'account', val)}
                        hideButton={true}
                        type="address"
                      />
                    </div>
                    <input
                      className="input-text signer-weight-input"
                      type="number"
                      name={`signer-weight-${idx}`}
                      autoComplete="off"
                      inputMode="numeric"
                      data-lpignore="true"
                      data-1p-ignore="true"
                      data-bwignore="true"
                      min="1"
                      max="99"
                      value={row.weight}
                      onChange={(e) => updateSignerRow(idx, 'weight', e.target.value)}
                    />
                    <div className="signer-remove-cell">
                      {signerEntries.length > 1 && (
                        <button
                          onClick={() => removeSignerRow(idx)}
                          title="Remove signer"
                          aria-label={`Remove signer ${idx + 1}`}
                          style={{
                            width: 28,
                            height: 28,
                            padding: 0,
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            border: 'none',
                            background: 'transparent',
                            color: 'var(--red, #d64949)',
                            cursor: 'pointer'
                          }}
                        >
                          <IoTrashOutline size={16} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  gap: '0.5rem'
                }}
              >
                <button
                  type="button"
                  className="link"
                  onClick={addSignerRow}
                  style={{
                    border: 'none',
                    background: 'transparent',
                    padding: 0,
                    marginLeft: '0.35rem',
                    fontWeight: 600,
                    textDecorationThickness: '2px'
                  }}
                >
                  + Add signer
                </button>

                {multiSigErrorMessage && (
                  <p className="red" style={{ marginTop: '0.2rem', marginBottom: 0 }}>
                    {multiSigErrorMessage}
                  </p>
                )}

                {withActionTooltip(
                  <button
                    className="button-action thin"
                    onClick={handleSetSignerList}
                    disabled={isSignerListActionLocked || !hasAtLeastOneSigner}
                    style={{ marginTop: '0.6rem' }}
                  >
                    {signerList ? 'Update Signer List' : 'Set Signer List'}
                  </button>,
                  signerListDisabledReason
                )}
              </div>
            </div>
          </div>

          {/* ── Master Key ── */}
          <h4>Master Key</h4>
          <div className="flag-item">
            <div className="flag-header">
              <div className="flag-info">
                <span className="flag-name">Master Key</span>
                <span className={`flag-status ${masterKeyDisabled ? 'orange' : ''}`}>
                  {masterKeyDisabled ? 'Disabled' : 'Enabled'}
                </span>
              </div>
              <div className="flag-info-buttons">
                {masterKeyDisabled
                  ? withActionTooltip(
                      <button className="button-action thin" onClick={handleEnableMasterKey} disabled={isActionLocked}>
                        Enable Master Key
                      </button>,
                      actionLockReason
                    )
                  : null}
              </div>
            </div>
            <div className="flag-description warning">
              {masterKeyDisabled
                ? `The master key is disabled. You must sign with the regular key or multi-sig. To re-enable it, sign this transaction with the regular key or a signer — not the master key.`
                : `Disabling the master key means the original account private key can no longer sign transactions. Ensure you have a working Regular Key or Signer List first. Due to the decentralized nature of ${explorerName}, no one can restore access if you lose all other signing methods.`}
            </div>
            <div className="disabled-reason warning" style={{ marginTop: '0.5rem' }}>
              Bithomp does not yet support signing with a Regular Key or a Signer List.
            </div>
            {!masterKeyDisabled && !regularKey && !signerList && (
              <div className="disabled-reason warning">
                You must set a Regular Key or a Signer List before disabling the Master Key.
              </div>
            )}

            {!masterKeyDisabled &&
              withActionTooltip(
                <button
                  className="button-action thin"
                  onClick={handleDisableMasterKey}
                  disabled={isActionLocked || (!regularKey && !signerList)}
                  style={{ marginTop: '0.75rem' }}
                >
                  Disable Master Key
                </button>,
                disableMasterDisabledReason
              )}
          </div>

          {/* ── Blackhole Account ── */}
          <h4>Blackhole Account</h4>
          <div className="flag-item">
            <div className="flag-description warning" style={{ marginBottom: '0.75rem' }}>
              <strong>⚠ This is irreversible.</strong> Blackholing permanently removes the ability for anyone —
              including you — to sign transactions from this account. The account can still <em>receive</em> funds, but
              they can never be moved out. Used to create provably unspendable accounts (e.g. to lock tokens forever or
              prove an issuer has surrendered control).
            </div>

            <div className="flag-description" style={{ marginBottom: '0.75rem' }}>
              <strong>How it works:</strong>
              <ol style={{ marginTop: '0.4rem', paddingLeft: '1.2rem', lineHeight: 1.7 }}>
                <li>
                  Set the Regular Key to <code>{BLACKHOLE_ADDRESS}</code> — the all-zeros address for which no private
                  key exists.
                </li>
                <li>Disable the Master Key.</li>
              </ol>
              After both steps no one can ever sign for this account again.
            </div>

            {isBlackholed ? (
              <p className="orange bold">This account is already blackholed.</p>
            ) : (
              <>
                <CheckBox
                  checked={confirmBlackhole}
                  setChecked={setConfirmBlackhole}
                  style={{ marginBottom: '0.75rem', fontSize: 14 }}
                >
                  <span style={{ marginRight: '0.5rem' }}>
                    I understand blackholing is <strong>permanent and irreversible</strong>. No one will ever be able to
                    sign transactions from this account again.
                  </span>
                </CheckBox>

                {withActionTooltip(
                  <button
                    className="button-action thin"
                    onClick={handleBlackhole}
                    disabled={isActionLocked || !confirmBlackhole}
                    style={
                      isActionLocked
                        ? {
                            background: 'var(--unaccented, #e3e7ee)',
                            color: 'var(--text-secondary)',
                            borderColor: 'var(--unaccented, #e3e7ee)',
                            cursor: 'not-allowed',
                            opacity: 0.75
                          }
                        : { background: 'var(--red, #dc3545)', color: '#fff', borderColor: 'var(--red, #dc3545)' }
                    }
                  >
                    Blackhole Account
                  </button>,
                  blackholeDisabledReason
                )}
              </>
            )}
          </div>
        </>
      </div>
    </div>
  )
}

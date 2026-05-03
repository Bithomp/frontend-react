import { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'next-i18next'
import axios from 'axios'
import Link from 'next/link'
import { explorerName, isAddressValid } from '../../utils'
import SEO from '../../components/SEO'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { getIsSsrMobile } from '../../utils/mobile'
import { setupServicesTxSuccessFlashListener } from '../../utils/servicesTxFlash'
import AddressInput from '../../components/UI/AddressInput'
import CopyButton from '../../components/UI/CopyButton'
import CheckBox from '../../components/UI/CheckBox'
import {
  IoTrashOutline,
  IoKeyOutline,
  IoPeopleOutline,
  IoShieldOutline,
  IoSkullOutline,
  IoInformationCircleOutline,
  IoPersonOutline
} from 'react-icons/io5'
import { IoIosRocket } from 'react-icons/io'
import { FaWallet } from 'react-icons/fa6'
import { accountSettings } from '../../styles/pages/account-settings.module.scss'
import ServicesTabs from '../../components/Tabs/ServicesTabs'

export const getServerSideProps = async (context) => {
  const { locale } = context
  return {
    props: {
      isSsrMobile: getIsSsrMobile(context),
      ...(await serverSideTranslations(locale, ['common', 'services']))
    }
  }
}

// Well-known blackhole address (all-zeros hash – no private key exists)
const BLACKHOLE_ADDRESS = 'rrrrrrrrrrrrrrrrrrrrBZbvji'

export default function AccountControl({ account, setSignRequest, sessionToken, subscriptionExpired, openEmailLogin }) {
  const { t } = useTranslation(['common', 'services'])
  const ts = (key, options) => t(key, { ns: 'services', ...options })
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  const [multiSigErrorMessage, setMultiSigErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [accountData, setAccountData] = useState(null)

  // Regular key
  const [regularKeyInput, setRegularKeyInput] = useState('')

  // Multi-sig
  const [signerQuorum, setSignerQuorum] = useState('1')
  const signerUidRef = useRef(1)
  const [signerEntries, setSignerEntries] = useState([{ uid: 0, account: '', weight: '1' }])

  // Blackhole
  const [confirmBlackhole, setConfirmBlackhole] = useState(false)

  const isPro = sessionToken && !subscriptionExpired
  const isProLocked = !isPro
  const proOnlyTooltip = !sessionToken
    ? ts('account-control.errors.proLoginTooltip')
    : ts('account-control.errors.proSubscribeTooltip')
  const signInTooltip = ts('account-control.errors.signInTooltip')
  const withActionTooltip = (node, tooltipText, direction = 'right') => {
    if (!tooltipText) return node
    return (
      <span className="tooltip" style={{ display: 'inline-flex' }}>
        {node}
        <span className={`tooltiptext ${direction}`}>{tooltipText}</span>
      </span>
    )
  }

  const ledgerInfo = accountData?.ledgerInfo
  const regularKey = ledgerInfo?.regularKey || null
  const masterKeyDisabled = !!ledgerInfo?.flags?.disableMaster
  const signerList = ledgerInfo?.signerList || null
  const isBlackholed = !!ledgerInfo?.blackholed

  useEffect(() => {
    return setupServicesTxSuccessFlashListener({
      setSuccessMessage,
      setErrorMessage
    })
  }, [])

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
        setErrorMessage(ts('account-control.errors.fetch'))
        setLoading(false)
      }
    }
    setLoading(true)
    fetchAccountData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [account])

  // ── Regular Key ──────────────────────────────────────────────────────────────

  const handleSetRegularKey = () => {
    const addr = regularKeyInput.trim()
    if (!isAddressValid(addr)) {
      setErrorMessage(ts('account-control.errors.validAddress'))
      return
    }
    if (addr === account.address) {
      setErrorMessage(ts('account-control.errors.regularSame'))
      return
    }
    setSignRequest({
      request: {
        TransactionType: 'SetRegularKey',
        Account: account.address,
        RegularKey: addr
      },
      callback: () => {
        setSuccessMessage(ts('account-control.success.regularSet'))
        setErrorMessage('')
        setRegularKeyInput('')
        setAccountData((prev) => (prev ? { ...prev, ledgerInfo: { ...prev.ledgerInfo, regularKey: addr } } : prev))
      }
    })
  }

  const handleRemoveRegularKey = () => {
    if (masterKeyDisabled && !signerList) {
      setErrorMessage(
        ts('account-control.errors.removeRegularUnsafe')
      )
      return
    }
    setSignRequest({
      request: {
        TransactionType: 'SetRegularKey',
        Account: account.address
      },
      callback: () => {
        setSuccessMessage(ts('account-control.success.regularRemoved'))
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

  const addSignerRow = () =>
    setSignerEntries((prev) => [...prev, { uid: signerUidRef.current++, account: '', weight: '1' }])

  const removeSignerRow = (uid) => setSignerEntries((prev) => prev.filter((r) => r.uid !== uid))

  const updateSignerRow = (uid, field, val) =>
    setSignerEntries((prev) => prev.map((row) => (row.uid === uid ? { ...row, [field]: val } : row)))

  const handleSetSignerList = async () => {
    setMultiSigErrorMessage('')

    const resolvedSigners = []
    for (let i = 0; i < signerEntries.length; i++) {
      const row = signerEntries[i]
      const rawAccount = row.account.trim()

      if (!rawAccount) {
        setMultiSigErrorMessage(ts('account-control.errors.signerEmpty', { number: i + 1 }))
        return
      }

      let resolvedAccount = rawAccount
      if (!isAddressValid(rawAccount)) {
        const response = await axios(`/v2/username/${encodeURIComponent(rawAccount)}`).catch(() => null)
        const foundAddress = response?.data?.address
        if (!foundAddress || !isAddressValid(foundAddress)) {
          setMultiSigErrorMessage(ts('account-control.errors.signerInvalid', { account: rawAccount }))
          return
        }
        resolvedAccount = foundAddress
      }

      if (resolvedAccount === account.address) {
        setMultiSigErrorMessage(ts('account-control.errors.signerSelf'))
        return
      }

      const w = Number(row.weight)
      if (!Number.isInteger(w) || w < 1 || w > 99) {
        setMultiSigErrorMessage(ts('account-control.errors.signerWeight'))
        return
      }

      resolvedSigners.push({ account: resolvedAccount, signerWeight: w })
    }

    const quorum = Number(signerQuorum)
    if (!Number.isInteger(quorum) || quorum < 1) {
      setMultiSigErrorMessage(ts('account-control.errors.quorum'))
      return
    }
    const totalWeight = resolvedSigners.reduce((sum, r) => sum + r.signerWeight, 0)
    if (quorum > totalWeight) {
      setMultiSigErrorMessage(ts('account-control.errors.quorumTooHigh', { quorum, totalWeight }))
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
        setSuccessMessage(ts('account-control.success.signerSet'))
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
        ts('account-control.errors.removeSignerUnsafe')
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
        setSuccessMessage(ts('account-control.success.signerRemoved'))
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
        ts('account-control.errors.disableMasterUnsafe')
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
        setSuccessMessage(ts('account-control.success.masterDisabled'))
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
        setSuccessMessage(ts('account-control.success.masterEnabled'))
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

  const handleSetBlackholeKey = () => {
    setSignRequest({
      request: {
        TransactionType: 'SetRegularKey',
        Account: account.address,
        RegularKey: BLACKHOLE_ADDRESS
      },
      callback: () => {
        setSuccessMessage(ts('account-control.success.blackholeKeySet'))
        setErrorMessage('')
        setAccountData((prev) =>
          prev ? { ...prev, ledgerInfo: { ...prev.ledgerInfo, regularKey: BLACKHOLE_ADDRESS } } : prev
        )
      }
    })
  }

  const handleBlackholeDisableMaster = () => {
    setSignRequest({
      request: {
        TransactionType: 'AccountSet',
        Account: account.address,
        SetFlag: 4
      },
      callback: () => {
        setSuccessMessage(ts('account-control.success.blackholed'))
        setErrorMessage('')
        setAccountData((prev) =>
          prev
            ? {
                ...prev,
                ledgerInfo: {
                  ...prev.ledgerInfo,
                  blackholed: true,
                  flags: { ...prev.ledgerInfo.flags, disableMaster: true }
                }
              }
            : prev
        )
      }
    })
  }

  // ── Loading ──────────────────────────────────────────────────────────────────

  if (account?.address && loading) {
    return (
      <>
        <SEO title={ts('account-control.title')} description={ts('account-control.loadingDescription')} />
        <div className="content-center">
          <ServicesTabs category="account" tab="account-control" />
          <h1 className="center">{ts('account-control.title')}</h1>
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
      masterKeyUnsupportedReason = ts('account-control.errors.bothUnsupported')
    } else if (hasRegularKeyConfigured && !hasSignerListConfigured) {
      masterKeyUnsupportedReason = ts('account-control.errors.regularUnsupported')
    } else if (!hasRegularKeyConfigured && hasSignerListConfigured) {
      masterKeyUnsupportedReason = ts('account-control.errors.signerUnsupported')
    } else {
      masterKeyUnsupportedReason = ts('account-control.errors.bothUnsupported')
    }
  }

  const regularKeyActionLockReason = actionLockReason || masterKeyUnsupportedReason
  const signerListActionLockReason = actionLockReason || masterKeyUnsupportedReason
  const enableMasterKeyLockReason = actionLockReason || masterKeyUnsupportedReason
  const isRegularKeyActionLocked = !!regularKeyActionLockReason
  const isSignerListActionLocked = !!signerListActionLockReason
  const hasAtLeastOneSigner = signerEntries.some((row) => row.account.trim())

  const regularKeyDisabledReason =
    regularKeyActionLockReason || (!regularKeyInput.trim() ? ts('account-control.errors.enterRegular') : '')
  const signerListDisabledReason =
    signerListActionLockReason || (!hasAtLeastOneSigner ? ts('account-control.errors.addSignerFirst') : '')
  const disableMasterDisabledReason =
    actionLockReason || (!regularKey && !signerList ? ts('account-control.errors.setRegularOrSigner') : '')
  const blackholeStep1Done = regularKey === BLACKHOLE_ADDRESS
  const blackholeStep1DisabledReason =
    actionLockReason ||
    masterKeyUnsupportedReason ||
    (!confirmBlackhole ? ts('account-control.errors.confirmCheckbox') : '') ||
    (blackholeStep1Done ? ts('account-control.errors.regularAlreadyBlackhole') : '')
  const blackholeStep2DisabledReason =
    actionLockReason ||
    (!blackholeStep1Done ? ts('account-control.errors.completeStep1') : '') ||
    (!confirmBlackhole ? ts('account-control.errors.confirmCheckbox') : '')

  return (
    <div className={accountSettings}>
      <SEO title={ts('account-control.title')} description={ts('account-control.description')} />
      <div className="content-center">
        <ServicesTabs category="account" tab="account-control" />
        <h1 className="center">{ts('account-control.title')}</h1>
        <p className="center">
          {isSignedIn
            ? ts('account-control.introSignedIn', { explorerName })
            : ts('account-control.introSignedOut')}
        </p>

        {!isSignedIn && (
          <div className="center" style={{ marginTop: '0.6rem' }}>
            <button className="button-action" onClick={() => setSignRequest({})}>
              <FaWallet style={{ fontSize: 14, marginRight: 6 }} />
              {ts('account-control.connectWallet')}
            </button>
          </div>
        )}

        {!isPro && isSignedIn && (
          <div className="center orange" style={{ marginTop: '0.5rem' }}>
            {!sessionToken ? (
              <>
                <p style={{ marginBottom: '0.45rem' }}>
                  {ts('account-control.proLoginNotice')}
                </p>
                <div style={{ marginTop: '1rem', marginBottom: '1rem' }}>
                  <button className="button-action" onClick={() => openEmailLogin?.()} style={{ padding: '10px 16px' }}>
                    <IoIosRocket style={{ fontSize: 16, marginRight: 6, marginBottom: 1 }} />
                    {ts('account-control.proLoginButton')}
                  </button>
                </div>
              </>
            ) : (
              <>
                  {ts('account-control.proExpired')}{' '}
                <Link href="/admin/subscriptions">{ts('account-control.renew')}</Link>.
              </>
            )}
          </div>
        )}

        {errorMessage && <p className="red center">{errorMessage}</p>}
        {successMessage && <p className="green center">{successMessage}</p>}

        {/* ── Status Card ── */}
        {isSignedIn && accountData && (
          <div className="status-card">
            <div className="status-card-header">{ts('account-control.currentStatus')}</div>

            <div className="status-row">
              <span className="status-label">{ts('account-control.masterKey')}</span>
              <span className="status-value">
                <span className={`section-badge ${masterKeyDisabled ? 'badge-warn' : 'badge-ok'}`}>
                  {masterKeyDisabled ? ts('account-control.disabled') : ts('account-control.enabled')}
                </span>
              </span>
            </div>

            <div className="status-row">
              <span className="status-label">{ts('account-control.regularKey')}</span>
              <span className={`status-value${regularKey ? ' mono' : ''}`}>
                {regularKey ? (
                  <>
                    {regularKey}
                    <CopyButton text={regularKey} />
                  </>
                ) : (
                  <span className="section-badge badge-off">{ts('account-control.notSet')}</span>
                )}
              </span>
            </div>

            <div className="status-row">
              <span className="status-label">{ts('account-control.multisignature')}</span>
              <span className="status-value">
                {signerList ? (
                  <span className="section-badge badge-ok">
                    {ts('account-control.quorum')} {signerList.signerQuorum} &middot;{' '}
                    {signerList.signerEntries?.length || 0}{' '}
                    {signerList.signerEntries?.length === 1
                      ? ts('account-control.signer')
                      : ts('account-control.signers')}
                  </span>
                ) : (
                  <span className="section-badge badge-off">{ts('account-control.notSet')}</span>
                )}
              </span>
            </div>

            {signerList?.signerEntries?.map((signer, i) => (
              <div key={i} className="status-row status-row-sub">
                <span className="status-label">
                  {ts('account-control.signerLabel', { number: i + 1, weight: signer.signerWeight })}
                </span>
                <span className="status-value mono">
                  {signer.account}
                  <CopyButton text={signer.account} />
                </span>
              </div>
            ))}

            {isBlackholed && (
              <div className="status-row">
                <span className="status-label">{ts('account-control.account')}</span>
                <span className="status-value">
                  <span className="section-badge badge-danger">{ts('account-control.blackholed')}</span>
                </span>
              </div>
            )}
          </div>
        )}

        <>
          {/* ── Regular Key ── */}
          <div className="section-header">
            <span className="section-icon">
              <IoKeyOutline size={15} />
            </span>
            <span className="section-title">{ts('account-control.regularKey')}</span>
            <span className={`section-badge ${regularKey ? 'badge-ok' : 'badge-off'}`}>
              {regularKey ? ts('account-control.set') : ts('account-control.notSet')}
            </span>
          </div>
          <div className="flag-item">
            <div className="flag-description">
              {ts('account-control.regularKeyDescription')}
            </div>
            <div className="note-info">
              <IoInformationCircleOutline size={14} className="note-icon" />
              {ts('account-control.regularKeyNote')}
            </div>
            <div className="nft-minter-input" style={{ marginTop: '0.75rem' }}>
              <AddressInput
                title={ts('account-control.setRegularKey')}
                placeholder={ts('account-control.regularKeyPlaceholder')}
                setInnerValue={setRegularKeyInput}
                hideButton={true}
                type="address"
              />
              <small>{ts('account-control.regularKeyHelp')}</small>
              <br />
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
                {withActionTooltip(
                  <button
                    className="button-action thin"
                    onClick={handleSetRegularKey}
                    disabled={isRegularKeyActionLocked || !regularKeyInput.trim()}
                  >
                    {ts('account-control.setRegularKey')}
                  </button>,
                  regularKeyDisabledReason
                )}
                {regularKey &&
                  withActionTooltip(
                    <button
                      className="button-action thin"
                      onClick={handleRemoveRegularKey}
                      disabled={isRegularKeyActionLocked}
                    >
                      {ts('account-control.remove')}
                    </button>,
                    regularKeyActionLockReason,
                    'left'
                  )}
              </div>
            </div>
          </div>

          {/* ── Multi-signature ── */}
          <div className="section-header">
            <span className="section-icon">
              <IoPeopleOutline size={15} />
            </span>
            <span className="section-title">{ts('account-control.multisignature')}</span>
            <span className={`section-badge ${signerList ? 'badge-ok' : 'badge-off'}`}>
              {signerList
                ? `${ts('account-control.quorum')} ${signerList.signerQuorum} · ${signerList.signerEntries?.length || 0} ${
                    signerList.signerEntries?.length === 1
                      ? ts('account-control.signer')
                      : ts('account-control.signers')
                  }`
                : ts('account-control.notSet')}
            </span>
          </div>
          <div className="flag-item">
            <div className="flag-description">
              {ts('account-control.multiSigDescription')}
            </div>
            <div className="note-info">
              <IoInformationCircleOutline size={14} className="note-icon" />
              {ts('account-control.multiSigNote')}
            </div>

            <div style={{ marginTop: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                <label style={{ fontWeight: 500, fontSize: 14 }}>{ts('account-control.quorum')}</label>
                <input
                  className="input-text"
                  type="number"
                  min="1"
                  value={signerQuorum}
                  onChange={(e) => setSignerQuorum(e.target.value)}
                  style={{ width: 52, textAlign: 'center', paddingLeft: 6, paddingRight: 6 }}
                />
                <small style={{ color: 'var(--text-secondary)' }}>
                  {ts('account-control.quorumHelp')}
                </small>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginBottom: '0.5rem' }}>
                <div className="signer-grid-header">
                  <span style={{ width: 24, flexShrink: 0, textAlign: 'center' }}>#</span>
                  <span style={{ flex: 1 }}>{ts('account-control.address')}</span>
                  <span style={{ textAlign: 'center' }}>{ts('account-control.weight')}</span>
                  <span style={{ width: 28 }}></span>
                </div>
                {signerEntries.map((row, idx) => (
                  <div key={row.uid} className="signer-grid-row">
                    <span className="signer-index-cell">{idx + 1}</span>
                    <div className="signer-address-cell">
                      <AddressInput
                        placeholder={ts('account-control.usernameOrAddress')}
                        setInnerValue={(val) => updateSignerRow(row.uid, 'account', val)}
                        hideButton={true}
                        type="address"
                      />
                    </div>
                    <span className="signer-weight-label">{ts('account-control.weight')}</span>
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
                      onChange={(e) => updateSignerRow(row.uid, 'weight', e.target.value)}
                    />
                    <div
                      className="signer-remove-cell"
                      style={signerEntries.length <= 1 ? { visibility: 'hidden' } : {}}
                    >
                      <button
                        className="signer-remove-btn"
                        onClick={() => removeSignerRow(row.uid)}
                        title={ts('account-control.removeSigner')}
                        aria-label={ts('account-control.removeSignerAria', { number: idx + 1 })}
                      >
                        <IoTrashOutline size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ marginTop: '0.5rem' }}>
                <button
                  type="button"
                  className="link"
                  onClick={addSignerRow}
                  style={{
                    border: 'none',
                    background: 'transparent',
                    padding: 0,
                    fontWeight: 600,
                    textDecorationThickness: '2px'
                  }}
                >
                  {ts('account-control.addSigner')}
                </button>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.75rem' }}>
                {withActionTooltip(
                  <button
                    className="button-action thin"
                    onClick={handleSetSignerList}
                    disabled={isSignerListActionLocked || !hasAtLeastOneSigner}
                  >
                    {signerList ? ts('account-control.updateSignerList') : ts('account-control.setSignerList')}
                  </button>,
                  signerListDisabledReason,
                  'right'
                )}

                {signerList &&
                  withActionTooltip(
                    <button
                      className="button-action thin"
                      onClick={handleRemoveSignerList}
                      disabled={isSignerListActionLocked}
                    >
                      {ts('account-control.remove')}
                    </button>,
                    signerListActionLockReason,
                    'left'
                  )}
              </div>

              {multiSigErrorMessage && (
                <p className="red" style={{ marginTop: '0.5rem', marginBottom: 0 }}>
                  {multiSigErrorMessage}
                </p>
              )}
            </div>
          </div>

          {/* ── Master Key ── */}
          <div className="section-header">
            <span className="section-icon">
              <IoShieldOutline size={15} />
            </span>
            <span className="section-title">{ts('account-control.masterKey')}</span>
            <span className={`section-badge ${masterKeyDisabled ? 'badge-warn' : 'badge-ok'}`}>
              {masterKeyDisabled ? ts('account-control.disabled') : ts('account-control.enabled')}
            </span>
          </div>
          <div className="flag-item">
            <div className="flag-description warning">
              {masterKeyDisabled
                ? ts('account-control.masterKeyDisabledText')
                : ts('account-control.masterKeyEnabledText', { explorerName })}
            </div>
            <div className="note-info" style={{ marginTop: '0.5rem' }}>
              <IoInformationCircleOutline size={14} className="note-icon" />
              {ts('account-control.masterKeyNote')}
            </div>
            {!masterKeyDisabled && !regularKey && !signerList && (
              <div className="disabled-reason warning" style={{ marginTop: '0.5rem' }}>
                {ts('account-control.masterKeyMustSet')}
              </div>
            )}

            <div style={{ marginTop: '0.75rem' }}>
              {masterKeyDisabled
                ? withActionTooltip(
                    <button
                      className="button-action thin"
                      onClick={handleEnableMasterKey}
                      disabled={!!enableMasterKeyLockReason}
                    >
                      {ts('account-control.enableMasterKey')}
                    </button>,
                    enableMasterKeyLockReason,
                    'left'
                  )
                : withActionTooltip(
                    <button
                      className="button-action thin"
                      onClick={handleDisableMasterKey}
                      disabled={isActionLocked || (!regularKey && !signerList)}
                    >
                      {ts('account-control.disableMasterKey')}
                    </button>,
                    disableMasterDisabledReason,
                    'right'
                  )}
            </div>
          </div>

          {/* ── Blackhole Account ── */}
          <div className="section-header">
            <span className="section-icon">
              <IoSkullOutline size={15} />
            </span>
            <span className="section-title">{ts('account-control.blackholeTitle')}</span>
            {isBlackholed && <span className="section-badge badge-danger">{ts('account-control.blackholed')}</span>}
          </div>
          <div className="flag-item">
            <div className="flag-description warning">
              <strong>⚠</strong> {ts('account-control.blackholeWarning')}
            </div>

            <div className="flag-description" style={{ marginBottom: '0.25rem', marginTop: '0.75rem' }}>
              <strong>{ts('account-control.howItWorks')}</strong>
              <ol style={{ marginTop: '0.4rem', paddingLeft: '1.2rem', lineHeight: 1.7 }}>
                <li>
                  {ts('account-control.blackholeStep1Help', { address: BLACKHOLE_ADDRESS })}
                </li>
                <li>{ts('account-control.blackholeStep2Help')}</li>
              </ol>
            </div>

            {isBlackholed ? (
              <p className="orange bold" style={{ marginTop: '0.5rem' }}>
                {ts('account-control.alreadyBlackholed')}
              </p>
            ) : (
              <>
                <CheckBox
                  checked={confirmBlackhole}
                  setChecked={setConfirmBlackhole}
                  style={{ marginTop: '0.75rem', marginBottom: '0.75rem', fontSize: 14 }}
                >
                  <span>
                    {ts('account-control.blackholeConfirm')}
                  </span>
                </CheckBox>

                <div className="blackhole-steps">
                  <div className={`step-row${blackholeStep1Done ? ' step-done' : ''}`}>
                    <span className={`step-number${blackholeStep1Done ? ' done' : ''}`}>1</span>
                    <span className="step-label">{ts('account-control.blackholeStep1')}</span>
                    <span className={`step-status ${blackholeStep1Done ? 'done' : 'pending'}`}>
                      {blackholeStep1Done ? ts('account-control.done') : ts('account-control.pending')}
                    </span>
                    {!blackholeStep1Done &&
                      withActionTooltip(
                        <button
                          className="button-action thin"
                          onClick={handleSetBlackholeKey}
                          disabled={!!blackholeStep1DisabledReason}
                          style={{
                            background: 'var(--red, #dc3545)',
                            color: '#fff',
                            borderColor: 'var(--red, #dc3545)',
                            marginLeft: '0.5rem',
                            flexShrink: 0
                          }}
                        >
                          {ts('account-control.setKey')}
                        </button>,
                        blackholeStep1DisabledReason,
                        'left'
                      )}
                  </div>
                  <div className={`step-row${masterKeyDisabled ? ' step-done' : ''}`}>
                    <span className={`step-number${masterKeyDisabled ? ' done' : ''}`}>2</span>
                    <span className="step-label">{ts('account-control.blackholeStep2')}</span>
                    <span className={`step-status ${masterKeyDisabled ? 'done' : 'pending'}`}>
                      {masterKeyDisabled ? ts('account-control.done') : ts('account-control.pending')}
                    </span>
                    {!masterKeyDisabled &&
                      withActionTooltip(
                        <button
                          className="button-action thin"
                          onClick={handleBlackholeDisableMaster}
                          disabled={!!blackholeStep2DisabledReason}
                          style={{
                            background: 'var(--red, #dc3545)',
                            color: '#fff',
                            borderColor: 'var(--red, #dc3545)',
                            marginLeft: '0.5rem',
                            flexShrink: 0
                          }}
                          >
                            {ts('account-control.disable')}
                          </button>,
                          blackholeStep2DisabledReason,
                          'left'
                        )}
                  </div>
                </div>
              </>
            )}
          </div>
        </>

        <div className="center" style={{ marginTop: '1.5rem', marginBottom: '0.5rem' }}>
          {account?.address ? (
            <Link href={`/account/${account.address}`} className="button-action">
              <IoPersonOutline style={{ fontSize: 15, marginRight: 6 }} />
              {ts('account-control.viewAccount')}
            </Link>
          ) : (
            <button className="button-action" onClick={() => setSignRequest({})}>
              <IoPersonOutline style={{ fontSize: 15, marginRight: 6 }} />
              {ts('account-control.signInAccount')}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

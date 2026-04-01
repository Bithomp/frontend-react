import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useTranslation } from 'next-i18next'
import axios from 'axios'
import { xahauNetwork, explorerName, encode } from '../../utils'
import { multiply, subtract } from '../../utils/calc'
import SEO from '../../components/SEO'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { getIsSsrMobile } from '../../utils/mobile'
import CheckBox from '../../components/UI/CheckBox'
import { IoLayersOutline, IoDocumentTextOutline, IoSkullOutline, IoPersonOutline } from 'react-icons/io5'
import { IoIosRocket } from 'react-icons/io'
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

const ASF_FLAGS = {
  requireAuth: 2,
  allowTrustLineClawback: 16,
  allowTrustLineLocking: 17,
  defaultRipple: 8,
  globalFreeze: 7,
  noFreeze: 6
}

// Well-known blackhole address (all-zeros hash – no private key exists)
const BLACKHOLE_ADDRESS = 'rrrrrrrrrrrrrrrrrrrrBZbvji'

export default function TokenIssuerSettings({
  account,
  setSignRequest,
  sessionToken,
  subscriptionExpired,
  openEmailLogin
}) {
  const { t } = useTranslation(['common'])
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [accountData, setAccountData] = useState(null)
  const [flags, setFlags] = useState(null)

  // Issuer fields
  const [transferRateInput, setTransferRateInput] = useState('')
  const [currentTransferRate, setCurrentTransferRate] = useState(null)
  const [domainInput, setDomainInput] = useState('')
  const [currentDomain, setCurrentDomain] = useState('')

  // Blackhole
  const [confirmBlackhole, setConfirmBlackhole] = useState(false)

  // Expanded flag descriptions
  const [expandedFlags, setExpandedFlags] = useState({})

  const isPro = sessionToken && !subscriptionExpired

  const ledgerInfo = accountData?.ledgerInfo
  const masterKeyDisabled = !!ledgerInfo?.flags?.disableMaster
  const regularKey = ledgerInfo?.regularKey || null
  const isBlackholed = !!ledgerInfo?.blackholed

  const getAvailableFlags = () => {
    const common = ['defaultRipple', 'requireAuth', 'globalFreeze', 'noFreeze']
    if (!xahauNetwork) {
      return [
        'defaultRipple',
        'allowTrustLineLocking',
        'requireAuth',
        'allowTrustLineClawback',
        'globalFreeze',
        'noFreeze'
      ]
    }
    return common
  }

  const flagList = getAvailableFlags()

  const flagDetails = {
    requireAuth: {
      name: 'Authorization',
      status: (value) => (value ? 'Required' : 'Not Required'),
      actionText: (value) => (value ? "Don't Require" : 'Require'),
      description:
        'If enabled, trustlines to this account require authorization before they can hold tokens. Can only be enabled if the account has no trustlines, offers, escrows, payment channels, checks, or signer lists.',
      isDefault: (value) => !value
    },
    allowTrustLineClawback: {
      name: 'Trustline Clawback',
      status: (value) => (value ? 'Enabled' : 'Disabled'),
      actionText: (value) => (value ? '' : 'Enable'),
      description:
        'Allow account to claw back tokens it has issued. Can only be set if the account has an empty owner directory (no trustlines, offers, escrows, payment channels, checks, or signer lists). After you set this flag, it cannot be reverted. The account permanently gains the ability to claw back issued assets on trustlines.',
      isDefault: (value) => !value,
      isPermanent: true
    },
    allowTrustLineLocking: {
      name: 'Trustline Locking',
      status: (value) => (value ? 'Enabled' : 'Disabled'),
      actionText: (value) => (value ? '' : 'Enable'),
      description:
        "Allow Trustline tokens issued by this account to be held in escrow. If not enabled, tokens issued by this account can't be escrowed. After you enable this flag, it cannot be disabled.",
      isDefault: (value) => !value,
      isPermanent: true
    },
    defaultRipple: {
      name: 'Default Rippling',
      status: (value) => (value ? 'Enabled' : 'Disabled'),
      actionText: (value) => (value ? 'Disable' : 'Enable'),
      description:
        'This a setting that Token issuers need to enable. If enabled, allows rippling on all trustlines by default. This affects how payments flow through your account.',
      isDefault: (value) => !value,
      isHighRisk: true
    },
    globalFreeze: {
      name: 'Global Freeze',
      status: (value) => (value ? 'Enabled' : 'Disabled'),
      actionText: (value) => (value ? 'Disable' : 'Enable'),
      description:
        'If enabled, freezes all tokens issued by this account, preventing them from being transferred. This affects all trustlines for tokens you have issued. Cannot be enabled if No Freeze is active. Use with caution as it impacts all token holders.',
      isDefault: (value) => !value,
      isHighRisk: true
    },
    noFreeze: {
      name: 'No Freeze',
      status: (value) => (value ? 'Enabled' : 'Disabled'),
      actionText: (value) => (value ? '' : 'Enable'),
      description:
        'If enabled, permanently gives up the ability to freeze tokens issued by this account. This setting cannot be reversed.',
      isDefault: (value) => !value,
      isPermanent: true
    }
  }

  useEffect(() => {
    const fetchAccountData = async () => {
      if (!account?.address) {
        setLoading(false)
        return
      }
      try {
        const response = await axios(`/v2/address/${account.address}?ledgerInfo=true`)
        setAccountData(response.data)

        setCurrentDomain(response.data?.ledgerInfo?.domain || '')
        setDomainInput(response.data?.ledgerInfo?.domain || '')

        setCurrentTransferRate(
          typeof response.data?.ledgerInfo?.transferRate === 'number'
            ? multiply(response.data.ledgerInfo.transferRate, 1000000000)
            : null
        )
        setTransferRateInput(() => {
          const tr = response.data?.ledgerInfo?.transferRate
          if (typeof tr === 'number' && tr > 0) {
            const percent = multiply(subtract(tr, 1), 100)
            return String(percent)
          }
          return ''
        })

        const ledgerFlags = response.data?.ledgerInfo?.flags || {}
        const newFlags = {}
        flagList.forEach((k) => {
          newFlags[k] = !!ledgerFlags[k]
        })
        setFlags(newFlags)
        setLoading(false)
      } catch (error) {
        setErrorMessage('Error fetching account data')
        setLoading(false)
      }
    }
    fetchAccountData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [account])

  // ── Flag Toggle ──────────────────────────────────────────────────────────────

  const handleFlagToggle = (flag) => {
    if (!account?.address) {
      setErrorMessage('Please sign in to your account.')
      return
    }
    if (!accountData?.ledgerInfo) {
      setErrorMessage('Error fetching account data')
      return
    }
    if (!isPro) {
      setErrorMessage('Token Issuer Settings are available only to logged-in Bithomp Pro subscribers.')
      return
    }

    const currentValue = !!flags?.[flag]
    const newValue = !currentValue
    const flagNum = ASF_FLAGS[flag]

    if (typeof flagNum !== 'number') {
      setErrorMessage(`Unknown flag: ${flag}`)
      return
    }

    if (
      (flag === 'requireAuth' || flag === 'allowTrustLineClawback') &&
      accountData?.ledgerInfo?.ownerCount &&
      !currentValue
    ) {
      setErrorMessage(
        'Can only be enabled if account has no trustlines, offers, escrows, payment channels, checks, or signer lists'
      )
      return
    }

    if (flag === 'globalFreeze' && flags?.noFreeze) {
      setErrorMessage('Cannot change Global Freeze when No Freeze is enabled')
      return
    }

    const tx = {
      TransactionType: 'AccountSet',
      Account: account.address,
      ...(newValue ? { SetFlag: flagNum } : { ClearFlag: flagNum })
    }

    setSignRequest({
      request: tx,
      callback: () => {
        setSuccessMessage('Settings updated successfully.')
        setErrorMessage('')
        setFlags((prev) => ({ ...(prev || {}), [flag]: newValue }))
        setAccountData((prev) => {
          if (!prev?.ledgerInfo) return prev
          return {
            ...prev,
            ledgerInfo: {
              ...prev.ledgerInfo,
              flags: { ...(prev.ledgerInfo.flags || {}), [flag]: newValue }
            }
          }
        })
      }
    })
  }

  // ── Domain ───────────────────────────────────────────────────────────────────

  const handleSetDomain = () => {
    const tx = {
      TransactionType: 'AccountSet',
      Account: account.address,
      Domain: encode(domainInput.trim())
    }
    setSignRequest({
      request: tx,
      callback: () => {
        setSuccessMessage('Domain set successfully.')
        setErrorMessage('')
        setCurrentDomain(domainInput.trim())
        setAccountData((prev) => {
          if (prev && prev.ledgerInfo) {
            return { ...prev, ledgerInfo: { ...prev.ledgerInfo, domain: domainInput.trim() } }
          }
          return prev
        })
      }
    })
  }

  const handleClearDomain = () => {
    const tx = {
      TransactionType: 'AccountSet',
      Account: account.address,
      Domain: ''
    }
    setSignRequest({
      request: tx,
      callback: () => {
        setSuccessMessage('Domain cleared successfully.')
        setErrorMessage('')
        setCurrentDomain('')
        setDomainInput('')
        setAccountData((prev) => {
          if (prev && prev.ledgerInfo) {
            const updatedLedgerInfo = { ...prev.ledgerInfo }
            delete updatedLedgerInfo.domain
            return { ...prev, ledgerInfo: updatedLedgerInfo }
          }
          return prev
        })
      }
    })
  }

  // ── Transfer Rate ────────────────────────────────────────────────────────────

  const handleSetTransferRate = () => {
    const percent = Number(transferRateInput)
    if (isNaN(percent) || percent < 0 || percent > 100) {
      setErrorMessage('Please enter a valid TransferRate percentage between 0 and 100.')
      return
    }
    const rate = Math.round(1000000000 + percent * 10000000)
    const tx = {
      TransactionType: 'AccountSet',
      Account: account.address,
      TransferRate: rate
    }
    setSignRequest({
      request: tx,
      callback: () => {
        setSuccessMessage('TransferRate set successfully.')
        setErrorMessage('')
        setCurrentTransferRate(rate)
        setAccountData((prev) => {
          if (prev && prev.ledgerInfo) {
            return { ...prev, ledgerInfo: { ...prev.ledgerInfo, transferRate: rate } }
          }
          return prev
        })
      }
    })
  }

  const handleClearTransferRate = () => {
    const tx = {
      TransactionType: 'AccountSet',
      Account: account.address,
      TransferRate: 0
    }
    setSignRequest({
      request: tx,
      callback: () => {
        setSuccessMessage('TransferRate cleared successfully.')
        setErrorMessage('')
        setCurrentTransferRate(null)
        setTransferRateInput('')
        setAccountData((prev) => {
          if (prev && prev.ledgerInfo) {
            const updatedLedgerInfo = { ...prev.ledgerInfo }
            delete updatedLedgerInfo.transferRate
            return { ...prev, ledgerInfo: updatedLedgerInfo }
          }
          return prev
        })
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
        setSuccessMessage('Blackhole regular key set. Proceed to Step 2 to disable the master key.')
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
        setSuccessMessage(
          'Account has been blackholed. No one, including you, can ever sign transactions for it again.'
        )
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

  // ── Helpers ──────────────────────────────────────────────────────────────────

  const withTooltip = (tooltipText, child, direction = 'right') => {
    if (!tooltipText) return child
    return (
      <span className="tooltip">
        {child}
        <span className={`tooltiptext ${direction}`}>{tooltipText}</span>
      </span>
    )
  }

  const withActionTooltip = (node, tooltipText, direction = 'right') => {
    if (!tooltipText) return node
    return (
      <span className="tooltip" style={{ display: 'inline-flex' }}>
        {node}
        <span className={`tooltiptext ${direction}`}>{tooltipText}</span>
      </span>
    )
  }

  // ── Render Flag Item ─────────────────────────────────────────────────────────

  const renderFlagItem = (flag) => {
    const flagData = flagDetails[flag]
    const currentValue = !!flags?.[flag]
    const isNonDefault = flagData && !flagData.isDefault(currentValue)
    const isHighRisk = !!flagData?.isHighRisk

    const isExpanded = expandedFlags[flag] || false
    const descriptionText = flagData?.description || ''
    const shouldTruncate = descriptionText.length > 200
    const displayedDescription = isExpanded || !shouldTruncate ? descriptionText : `${descriptionText.slice(0, 200)}...`

    let buttonDisabled = false
    let disabledReason = ''

    if (!isPro) {
      buttonDisabled = true
      disabledReason = !sessionToken
        ? 'Available only to logged-in Bithomp Pro subscribers.'
        : 'Your Bithomp Pro subscription has expired.'
    }

    if (
      (flag === 'requireAuth' || flag === 'allowTrustLineClawback') &&
      accountData?.ledgerInfo?.ownerCount &&
      !currentValue
    ) {
      buttonDisabled = true
      if (!disabledReason)
        disabledReason =
          'Can only be enabled if account has no trustlines, offers, escrows, payment channels, checks, or signer lists'
    }

    if (flag === 'globalFreeze' && flags?.noFreeze) {
      buttonDisabled = true
      if (!disabledReason) disabledReason = 'Cannot change Global Freeze when No Freeze is enabled'
    }

    const showButton = !(flagData?.isPermanent && currentValue)

    const buttonTooltip = !account?.address
      ? 'Sign in to manage settings'
      : buttonDisabled && disabledReason
        ? disabledReason
        : ''

    return (
      <div key={flag} className="flag-item">
        <div className="flag-header">
          <div className="flag-info">
            <span className="flag-name">{flagData.name}</span>
            <span
              className={`section-badge ${
                isHighRisk && isNonDefault ? 'badge-danger' : isNonDefault ? 'badge-warn' : 'badge-off'
              }`}
            >
              {flagData.status(currentValue)}
            </span>
          </div>

          {showButton &&
            withTooltip(
              buttonTooltip,
              <button
                className="button-action thin"
                onClick={() => handleFlagToggle(flag)}
                disabled={buttonDisabled || !account?.address}
                style={{ minWidth: '120px' }}
              >
                {flagData.actionText(currentValue)}
              </button>
            )}

          {flagData?.isPermanent && currentValue && <span className="permanent-flag">Permanent</span>}
        </div>

        <div className={`flag-description ${isHighRisk || flagData?.isPermanent ? 'warning' : ''}`}>
          {displayedDescription}
          {shouldTruncate && (
            <span
              role="button"
              className="inline-read-more"
              onClick={() => setExpandedFlags((prev) => ({ ...prev, [flag]: !isExpanded }))}
              style={{
                marginLeft: '6px',
                cursor: 'pointer',
                textDecoration: 'underline',
                background: 'none',
                border: 'none',
                padding: 0,
                fontSize: 'inherit',
                color: 'inherit'
              }}
            >
              {isExpanded ? 'Read less' : 'Read more'}
            </span>
          )}
        </div>

        {buttonDisabled && disabledReason && <div className="disabled-reason warning">{disabledReason}</div>}
      </div>
    )
  }

  // ── Derived values for blackhole ─────────────────────────────────────────────

  const actionLockReason = !account?.address
    ? 'Sign in to your account to enable this function.'
    : !isPro
      ? !sessionToken
        ? 'Log in to Bithomp Pro to enable this function.'
        : 'Subscribe to Bithomp Pro to enable this function.'
      : ''

  const blackholeStep1Done = regularKey === BLACKHOLE_ADDRESS
  const blackholeStep1DisabledReason =
    actionLockReason ||
    (!confirmBlackhole ? 'Confirm the checkbox first.' : '') ||
    (blackholeStep1Done ? 'Regular Key is already set to the blackhole address.' : '')
  const blackholeStep2DisabledReason =
    actionLockReason ||
    (!blackholeStep1Done ? 'Complete Step 1 first.' : '') ||
    (!confirmBlackhole ? 'Confirm the checkbox first.' : '')

  // ── Loading ──────────────────────────────────────────────────────────────────

  if (account?.address && loading) {
    return (
      <>
        <SEO title="Token Issuer Settings" description="Manage token issuer settings" />
        <div className="content-center">
          <h1 className="center">Token Issuer Settings</h1>
          <AccountServiceTabs tab="token-issuer-settings" />
          <div className="center">
            <span className="waiting"></span>
            <br />
            {t('general.loading')}
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <div className={accountSettings}>
        <SEO
          title="Token Issuer Settings"
          description="Manage required authorization, rippling, freeze and other token issuer settings."
        />
        <div className="content-center">
          <h1 className="center">Token Issuer Settings</h1>
          <AccountServiceTabs tab="token-issuer-settings" />
          <p className="center">
            {account?.address ? (
              `Configure your token issuance settings on the ${explorerName}.`
            ) : (
              <>
                Please{' '}
                <span className="link" onClick={() => setSignRequest({})}>
                  sign in to your account
                </span>{' '}
                to manage Token Issuer Settings.
              </>
            )}
          </p>

          {errorMessage && <p className="red center">{errorMessage}</p>}
          {successMessage && <p className="green center">{successMessage}</p>}

          {/* Pro subscriber notice */}
          {!isPro && (
            <div className="center orange" style={{ marginBottom: '1rem', fontSize: 14 }}>
              {!sessionToken ? (
                <>
                  <p style={{ marginBottom: '0.45rem' }}>
                    Token Issuer Settings are available to logged-in Bithomp Pro subscribers.
                  </p>
                  <div style={{ marginTop: '0.75rem', marginBottom: '0.35rem' }}>
                    <button className="button-action" onClick={() => openEmailLogin?.()} style={{ padding: '10px 16px' }}>
                      <IoIosRocket style={{ fontSize: 16, marginRight: 6, marginBottom: 1 }} />
                      Log in to Bithomp Pro
                    </button>
                  </div>
                </>
              ) : (
                <>
                  Your Bithomp Pro subscription has expired.{' '}
                  <Link href="/admin/subscriptions">Renew your subscription</Link>
                </>
              )}
            </div>
          )}

          <div>
            {/* Token Issuer Flags */}
            <div className="section-header">
              <span className="section-icon">
                <IoLayersOutline size={15} />
              </span>
              <span className="section-title">Token Issuer Flags</span>
              <span className="section-badge badge-warn" style={{ fontSize: 10 }}>
                Pro only
              </span>
            </div>

            {flagList.map((flag) => renderFlagItem(flag))}

            {/* Token Issuer Fields */}
            <div className="section-header" style={{ marginTop: '1.25rem' }}>
              <span className="section-icon">
                <IoDocumentTextOutline size={15} />
              </span>
              <span className="section-title">Token Issuer Fields</span>
            </div>

            <div>
              {/* TransferRate */}
              <div className="flag-item">
                <div className="flag-header">
                  <div className="flag-info">
                    <span className="flag-name">TransferRate</span>
                    {account?.address && (
                      <span className="flag-status">
                        {currentTransferRate && currentTransferRate > 0
                          ? `${Math.round(((currentTransferRate - 1000000000) / 10000000) * 100) / 100}%`
                          : 'Not Set'}
                      </span>
                    )}
                  </div>
                  <div className="flag-info-buttons">
                    {currentTransferRate &&
                      currentTransferRate > 0 &&
                      withTooltip(
                        !account?.address ? 'Sign in to manage settings' : !isPro ? actionLockReason : '',
                        <button
                          className="button-action thin"
                          onClick={handleClearTransferRate}
                          disabled={!account?.address || !isPro}
                        >
                          Clear
                        </button>
                      )}
                    {withTooltip(
                      !account?.address ? 'Sign in to manage settings' : !isPro ? actionLockReason : '',
                      <button
                        className="button-action thin"
                        onClick={handleSetTransferRate}
                        disabled={!account?.address || !isPro}
                      >
                        Set
                      </button>,
                      'left'
                    )}
                  </div>
                </div>
                <div className="nft-minter-input">
                  <input
                    className="input-text"
                    placeholder="Percentage 0-100"
                    value={transferRateInput}
                    onChange={(e) => setTransferRateInput(e.target.value)}
                    type="text"
                    inputMode="decimal"
                    disabled={!account?.address || !isPro}
                  />
                  <small>Percentage fee issuer charges on transfers of issued tokens.</small>
                </div>
              </div>

              {/* Domain (copied from Account Settings) */}
              <div className="flag-item">
                <div className="flag-header">
                  <div className="flag-info">
                    <span className="flag-name">Domain</span>
                    {account?.address && (
                      <span className="flag-status">{currentDomain ? currentDomain : 'Not Set'}</span>
                    )}
                  </div>
                  <div className="flag-info-buttons">
                    {currentDomain &&
                      withTooltip(
                        !account?.address ? 'Sign in to manage settings' : !isPro ? actionLockReason : '',
                        <button
                          className="button-action thin"
                          onClick={handleClearDomain}
                          disabled={!account?.address || !isPro}
                        >
                          Clear
                        </button>
                      )}
                    {withTooltip(
                      !account?.address ? 'Sign in to manage settings' : !isPro ? actionLockReason : '',
                      <button
                        className="button-action thin"
                        onClick={handleSetDomain}
                        disabled={!account?.address || !isPro}
                      >
                        Set
                      </button>,
                      'left'
                    )}
                  </div>
                </div>
                <div className="nft-minter-input">
                  <input
                    className="input-text"
                    placeholder="example.com"
                    value={domainInput}
                    onChange={(e) => setDomainInput(e.target.value)}
                    type="text"
                    disabled={!account?.address || !isPro}
                  />
                  <small>Enter your domain. It will be stored on-ledger.</small>
                </div>
              </div>
            </div>

            {/* Blackhole Account (copied from Account Control) */}
            <div className="section-header" style={{ marginTop: '1.25rem' }}>
              <span className="section-icon">
                <IoSkullOutline size={15} />
              </span>
              <span className="section-title">Blackhole Account</span>
              {isBlackholed && <span className="section-badge badge-danger">Blackholed</span>}
            </div>
            <div className="flag-item">
              <div className="flag-description warning">
                <strong>⚠ This is irreversible.</strong> Blackholing permanently removes the ability for anyone —
                including you — to sign transactions from this account. The account can still <em>receive</em> funds,
                but they can never be moved out. Used to create provably unspendable accounts (e.g. to lock tokens
                forever or prove an issuer has surrendered control).
              </div>

              <div className="flag-description" style={{ marginBottom: '0.25rem', marginTop: '0.75rem' }}>
                <strong>How it works:</strong>
                <ol style={{ marginTop: '0.4rem', paddingLeft: '1.2rem', lineHeight: 1.7 }}>
                  <li>
                    Set the Regular Key to <code>{BLACKHOLE_ADDRESS}</code> — the all-zeros address for which no private
                    key exists.
                  </li>
                  <li>Disable the Master Key.</li>
                </ol>
              </div>

              {isBlackholed ? (
                <p className="orange bold" style={{ marginTop: '0.5rem' }}>
                  This account is already blackholed.
                </p>
              ) : (
                <>
                  <CheckBox
                    checked={confirmBlackhole}
                    setChecked={setConfirmBlackhole}
                    style={{ marginTop: '0.75rem', marginBottom: '0.75rem', fontSize: 14 }}
                  >
                    <span>
                      I understand blackholing is <strong>permanent and irreversible</strong>. No one will ever be able
                      to sign transactions from this account again, and any funds sent here will be locked forever with
                      no way for anyone to access or recover them.
                    </span>
                  </CheckBox>

                  <div className="blackhole-steps">
                    <div className={`step-row${blackholeStep1Done ? ' step-done' : ''}`}>
                      <span className={`step-number${blackholeStep1Done ? ' done' : ''}`}>1</span>
                      <span className="step-label">Set Regular Key to blackhole address</span>
                      <span className={`step-status ${blackholeStep1Done ? 'done' : 'pending'}`}>
                        {blackholeStep1Done ? 'Done' : 'Pending'}
                      </span>
                      {withActionTooltip(
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
                          {blackholeStep1Done ? 'Re-set' : 'Set key'}
                        </button>,
                        blackholeStep1DisabledReason,
                        'left'
                      )}
                    </div>
                    <div className={`step-row${masterKeyDisabled ? ' step-done' : ''}`}>
                      <span className={`step-number${masterKeyDisabled ? ' done' : ''}`}>2</span>
                      <span className="step-label">Disable Master Key</span>
                      <span className={`step-status ${masterKeyDisabled ? 'done' : 'pending'}`}>
                        {masterKeyDisabled ? 'Done' : 'Pending'}
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
                            Disable
                          </button>,
                          blackholeStep2DisabledReason,
                          'left'
                        )}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="center" style={{ marginTop: '1.5rem', marginBottom: '0.5rem' }}>
            {account?.address ? (
              <Link href={`/account/${account.address}`} className="button-action">
                <IoPersonOutline style={{ fontSize: 15, marginRight: 6 }} />
                View my account page
              </Link>
            ) : (
              <button className="button-action" onClick={() => setSignRequest({})}>
                <IoPersonOutline style={{ fontSize: 15, marginRight: 6 }} />
                Sign in to your account
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

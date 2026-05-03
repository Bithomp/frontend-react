import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useTranslation } from 'next-i18next'
import axios from 'axios'
import { xahauNetwork, explorerName, encode } from '../../utils'
import { multiply, subtract } from '../../utils/calc'
import SEO from '../../components/SEO'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { getIsSsrMobile } from '../../utils/mobile'
import { setupServicesTxSuccessFlashListener } from '../../utils/servicesTxFlash'
import CheckBox from '../../components/UI/CheckBox'
import { IoLayersOutline, IoDocumentTextOutline, IoSkullOutline, IoPersonOutline } from 'react-icons/io5'
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
  const { t } = useTranslation(['common', 'services'])
  const ts = (key, options) => t(key, { ns: 'services', ...options })
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

  useEffect(() => {
    return setupServicesTxSuccessFlashListener({
      setSuccessMessage,
      setErrorMessage,
      customMessages: {
        SetRegularKey: ts('token-issuer-settings-page.success.regularKey')
      }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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
      name: ts('account-settings.flagsObj.requireAuth.name'),
      status: (value) => (value ? ts('account-settings.required') : ts('account-settings.notRequired')),
      actionText: (value) => (value ? ts('account-settings.dontRequire') : ts('account-settings.require')),
      description: ts('account-settings.flagsObj.requireAuth.description'),
      isDefault: (value) => !value
    },
    allowTrustLineClawback: {
      name: ts('account-settings.flagsObj.allowTrustLineClawback.name'),
      status: (value) => (value ? ts('account-settings.enabled') : ts('account-settings.disabled')),
      actionText: (value) => (value ? '' : ts('account-settings.enable')),
      description: ts('account-settings.flagsObj.allowTrustLineClawback.description'),
      isDefault: (value) => !value,
      isPermanent: true
    },
    allowTrustLineLocking: {
      name: ts('account-settings.flagsObj.allowTrustLineLocking.name'),
      status: (value) => (value ? ts('account-settings.enabled') : ts('account-settings.disabled')),
      actionText: (value) => (value ? '' : ts('account-settings.enable')),
      description: ts('account-settings.flagsObj.allowTrustLineLocking.description'),
      isDefault: (value) => !value,
      isPermanent: true
    },
    defaultRipple: {
      name: ts('account-settings.flagsObj.defaultRipple.name'),
      status: (value) => (value ? ts('account-settings.enabled') : ts('account-settings.disabled')),
      actionText: (value) => (value ? ts('account-settings.disable') : ts('account-settings.enable')),
      description: ts('account-settings.flagsObj.defaultRipple.description'),
      isDefault: (value) => !value,
      isHighRisk: true
    },
    globalFreeze: {
      name: ts('account-settings.flagsObj.globalFreeze.name'),
      status: (value) => (value ? ts('account-settings.enabled') : ts('account-settings.disabled')),
      actionText: (value) => (value ? ts('account-settings.disable') : ts('account-settings.enable')),
      description: ts('account-settings.flagsObj.globalFreeze.description'),
      isDefault: (value) => !value,
      isHighRisk: true
    },
    noFreeze: {
      name: ts('account-settings.flagsObj.noFreeze.name'),
      status: (value) => (value ? ts('account-settings.enabled') : ts('account-settings.disabled')),
      actionText: (value) => (value ? '' : ts('account-settings.enable')),
      description: ts('account-settings.flagsObj.noFreeze.description'),
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
        setErrorMessage(ts('token-issuer-settings-page.errors.fetch'))
        setLoading(false)
      }
    }
    fetchAccountData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [account])

  // ── Flag Toggle ──────────────────────────────────────────────────────────────

  const handleFlagToggle = (flag) => {
    if (!account?.address) {
      setErrorMessage(ts('token-issuer-settings-page.errors.signIn'))
      return
    }
    if (!accountData?.ledgerInfo) {
      setErrorMessage(ts('token-issuer-settings-page.errors.fetch'))
      return
    }
    if (!isPro) {
      setErrorMessage(ts('token-issuer-settings-page.errors.proOnly'))
      return
    }

    const currentValue = !!flags?.[flag]
    const newValue = !currentValue
    const flagNum = ASF_FLAGS[flag]

    if (typeof flagNum !== 'number') {
      setErrorMessage(ts('token-issuer-settings-page.errors.unknownFlag', { flag }))
      return
    }

    if (
      (flag === 'requireAuth' || flag === 'allowTrustLineClawback') &&
      accountData?.ledgerInfo?.ownerCount &&
      !currentValue
    ) {
      setErrorMessage(
        ts('account-settings.errOwnerDir')
      )
      return
    }

    if (flag === 'globalFreeze' && flags?.noFreeze) {
      setErrorMessage(ts('account-settings.errGlobalFreeze'))
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
        setSuccessMessage(ts('token-issuer-settings-page.success.settings'))
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
        setSuccessMessage(ts('token-issuer-settings-page.success.domainSet'))
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
        setSuccessMessage(ts('token-issuer-settings-page.success.domainClear'))
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
      setErrorMessage(ts('token-issuer-settings-page.errors.transferRate'))
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
        setSuccessMessage(ts('token-issuer-settings-page.success.transferRateSet'))
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
        setSuccessMessage(ts('token-issuer-settings-page.success.transferRateClear'))
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
        ? ts('token-issuer-settings-page.availablePro')
        : ts('account-control.proExpired')
    }

    if (
      (flag === 'requireAuth' || flag === 'allowTrustLineClawback') &&
      accountData?.ledgerInfo?.ownerCount &&
      !currentValue
    ) {
      buttonDisabled = true
      if (!disabledReason)
        disabledReason = ts('account-settings.errOwnerDir')
    }

    if (flag === 'globalFreeze' && flags?.noFreeze) {
      buttonDisabled = true
      if (!disabledReason) disabledReason = ts('account-settings.errGlobalFreeze')
    }

    const showButton = !(flagData?.isPermanent && currentValue)

    const buttonTooltip = !account?.address
      ? ts('token-issuer-settings-page.signInManage')
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

          {flagData?.isPermanent && currentValue && (
            <span className="permanent-flag">{ts('token-issuer-settings-page.permanent')}</span>
          )}
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
              {isExpanded ? ts('token-issuer-settings-page.readLess') : ts('token-issuer-settings-page.readMore')}
            </span>
          )}
        </div>

        {buttonDisabled && disabledReason && <div className="disabled-reason warning">{disabledReason}</div>}
      </div>
    )
  }

  // ── Derived values for blackhole ─────────────────────────────────────────────

  const actionLockReason = !account?.address
    ? ts('account-control.errors.signInTooltip')
    : !isPro
      ? !sessionToken
        ? ts('account-control.errors.proLoginTooltip')
        : ts('account-control.errors.proSubscribeTooltip')
      : ''

  const blackholeStep1Done = regularKey === BLACKHOLE_ADDRESS
  const blackholeStep1DisabledReason =
    actionLockReason ||
    (!confirmBlackhole ? ts('account-control.errors.confirmCheckbox') : '') ||
    (blackholeStep1Done ? ts('account-control.errors.regularAlreadyBlackhole') : '')
  const blackholeStep2DisabledReason =
    actionLockReason ||
    (!blackholeStep1Done ? ts('account-control.errors.completeStep1') : '') ||
    (!confirmBlackhole ? ts('account-control.errors.confirmCheckbox') : '')

  // ── Loading ──────────────────────────────────────────────────────────────────

  if (account?.address && loading) {
    return (
      <>
        <SEO title={ts('token-issuer-settings-page.title')} description={ts('token-issuer-settings-page.description')} />
        <div className="content-center">
          <ServicesTabs category="account" tab="token-issuer-settings" />
          <h1 className="center">{ts('token-issuer-settings-page.title')}</h1>
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
          title={ts('token-issuer-settings-page.title')}
          description={ts('token-issuer-settings-page.description')}
        />
        <div className="content-center">
          <ServicesTabs category="account" tab="token-issuer-settings" />
          <h1 className="center">{ts('token-issuer-settings-page.title')}</h1>
          <p className="center">
            {account?.address ? (
              ts('token-issuer-settings-page.introSignedIn', { explorerName })
            ) : (
              ts('token-issuer-settings-page.introSignedOut')
            )}
          </p>

          {!account?.address && (
            <div className="center" style={{ marginTop: '0.6rem' }}>
              <button className="button-action" onClick={() => setSignRequest({})}>
                <FaWallet style={{ fontSize: 14, marginRight: 6 }} />
                {ts('account-control.connectWallet')}
              </button>
            </div>
          )}

          {errorMessage && <p className="red center">{errorMessage}</p>}
          {successMessage && <p className="green center">{successMessage}</p>}

          {/* Pro subscriber notice */}
          {!isPro && account?.address && (
            <div className="center orange" style={{ marginBottom: '1rem', fontSize: 14 }}>
              {!sessionToken ? (
                <>
                  <p style={{ marginBottom: '0.45rem' }}>
                    {ts('token-issuer-settings-page.proNotice')}
                  </p>
                  <div style={{ marginTop: '0.75rem', marginBottom: '0.35rem' }}>
                    <button className="button-action" onClick={() => openEmailLogin?.()} style={{ padding: '10px 16px' }}>
                      <IoIosRocket style={{ fontSize: 16, marginRight: 6, marginBottom: 1 }} />
                      {ts('account-control.proLoginButton')}
                    </button>
                  </div>
                </>
              ) : (
                <>
                  {ts('account-control.proExpired')}{' '}
                  <Link href="/admin/subscriptions">{ts('account-control.renew')}</Link>
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
              <span className="section-title">{ts('token-issuer-settings-page.flagsTitle')}</span>
              <span className="section-badge badge-warn" style={{ fontSize: 10 }}>
                {ts('token-issuer-settings-page.proOnly')}
              </span>
            </div>

            {flagList.map((flag) => renderFlagItem(flag))}

            {/* Token Issuer Fields */}
            <div className="section-header" style={{ marginTop: '1.25rem' }}>
              <span className="section-icon">
                <IoDocumentTextOutline size={15} />
              </span>
              <span className="section-title">{ts('token-issuer-settings-page.fieldsTitle')}</span>
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
                          : ts('account-control.notSet')}
                      </span>
                    )}
                  </div>
                  <div className="flag-info-buttons">
                    {currentTransferRate &&
                      currentTransferRate > 0 &&
                      withTooltip(
                        !account?.address ? ts('token-issuer-settings-page.signInManage') : !isPro ? actionLockReason : '',
                        <button
                          className="button-action thin"
                          onClick={handleClearTransferRate}
                          disabled={!account?.address || !isPro}
                        >
                          {ts('account-settings.clear')}
                        </button>
                      )}
                    {withTooltip(
                      !account?.address ? ts('token-issuer-settings-page.signInManage') : !isPro ? actionLockReason : '',
                      <button
                        className="button-action thin"
                        onClick={handleSetTransferRate}
                        disabled={!account?.address || !isPro}
                      >
                        {ts('account-settings.set')}
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
                  <small>{ts('token-issuer-settings-page.transferRateHelp')}</small>
                </div>
              </div>

              {/* Domain (copied from Account Settings) */}
              <div className="flag-item">
                <div className="flag-header">
                  <div className="flag-info">
                    <span className="flag-name">Domain</span>
                    {account?.address && (
                      <span className="flag-status">{currentDomain ? currentDomain : ts('account-control.notSet')}</span>
                    )}
                  </div>
                  <div className="flag-info-buttons">
                    {currentDomain &&
                      withTooltip(
                        !account?.address ? ts('token-issuer-settings-page.signInManage') : !isPro ? actionLockReason : '',
                        <button
                          className="button-action thin"
                          onClick={handleClearDomain}
                          disabled={!account?.address || !isPro}
                        >
                          {ts('account-settings.clear')}
                        </button>
                      )}
                    {withTooltip(
                      !account?.address ? ts('token-issuer-settings-page.signInManage') : !isPro ? actionLockReason : '',
                      <button
                        className="button-action thin"
                        onClick={handleSetDomain}
                        disabled={!account?.address || !isPro}
                      >
                        {ts('account-settings.set')}
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
                  <small>{ts('token-issuer-settings-page.domainHelp')}</small>
                </div>
              </div>
            </div>

            {/* Blackhole Account (copied from Account Control) */}
            <div className="section-header" style={{ marginTop: '1.25rem' }}>
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
          </div>

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
    </>
  )
}

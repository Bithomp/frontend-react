import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useTranslation } from 'next-i18next'
import axios from 'axios'
import { xahauNetwork, explorerName, nativeCurrency, isAddressValid } from '../../utils'
import SEO from '../../components/SEO'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { getIsSsrMobile } from '../../utils/mobile'
import CheckBox from '../../components/UI/CheckBox'
import AddressInput from '../../components/UI/AddressInput'
import { accountSettings } from '../../styles/pages/account-settings.module.scss'

export const getServerSideProps = async (context) => {
  const { locale } = context
  return {
    props: {
      isSsrMobile: getIsSsrMobile(context),
      ...(await serverSideTranslations(locale, ['common']))
    }
  }
}

// ASF flags (require individual transactions)
const ASF_FLAGS = {
  disallowIncomingCheck: 13,
  disallowIncomingPayChan: 14,
  disallowIncomingTrustline: 15,
  globalFreeze: 7,
  noFreeze: 6,
  authorizedNFTokenMinter: 10,
  disallowIncomingNFTokenOffer: 12,
  disallowIncomingRemit: 16,
  tshCollect: 11,
  allowTrustLineClawback: 16,
  asfDefaultRipple: 8,
  asfDepositAuth: 9,
  asfDisableMaster: 4
}

// TF flags (can be combined in one transaction)
const TF_FLAGS = {
  requireDestTag: { set: 0x00010000, clear: 0x00020000 }, // tfRequireDestTag / tfOptionalDestTag
  requireAuth: { set: 0x00040000, clear: 0x00080000 }, // tfRequireAuth / tfOptionalAuth
  disallowXRP: { set: 0x00100000, clear: 0x00200000 } // tfDisallowXRP / tfAllowXRP
}

export default function AccountSettings({ account, setSignRequest }) {
  const { t } = useTranslation(['common'])
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [accountData, setAccountData] = useState(null)
  const [flags, setFlags] = useState(null)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [nftTokenMinter, setNftTokenMinter] = useState('')
  const [currentNftTokenMinter, setCurrentNftTokenMinter] = useState('')

  // TF flags state
  const [tfFlags, setTfFlags] = useState(null)

  // Track which flag descriptions are expanded (for Read more functionality)
  const [expandedFlags, setExpandedFlags] = useState({})

  // Determine which ASF flags to use based on network
  const getAvailableAsfFlags = () => {
    const commonAsfFlags = [
      'disallowIncomingCheck',
      'disallowIncomingPayChan',
      'disallowIncomingTrustline',
      'asfDepositAuth'
    ]

    const advancedFlags = ['asfDefaultRipple', 'asfDisableMaster', 'globalFreeze', 'noFreeze']

    if (xahauNetwork) {
      return {
        basic: [...commonAsfFlags, 'disallowIncomingRemit', 'tshCollect'],
        advanced: advancedFlags
      }
    } else {
      return {
        basic: [...commonAsfFlags, 'disallowIncomingNFTokenOffer', 'allowTrustLineClawback'],
        advanced: advancedFlags
      }
    }
  }

  const flagGroups = getAvailableAsfFlags()
  const tfFlagKeys = Object.keys(TF_FLAGS)

  // Map UI ASF flag keys to their corresponding keys returned by the ledger API
  const asfLedgerFlagMapping = {
    asfDefaultRipple: 'defaultRipple',
    asfDepositAuth: 'depositAuth'
  }

  // Flag display names and descriptions
  const flagDetails = {
    // TF Flags
    requireDestTag: {
      name: 'Destination Tag',
      displayName: 'Destination Tag',
      status: (value) => (value ? 'Required' : 'Not Required'),
      actionText: (value) => (value ? "Don't Require" : 'Require'),
      type: 'tf',
      description: 'If enabled, incoming transactions must include a Destination Tag.',
      isDefault: (value) => !value
    },
    requireAuth: {
      name: 'Authorization',
      displayName: 'Authorization',
      status: (value) => (value ? 'Required' : 'Not Required'),
      actionText: (value) => (value ? "Don't Require" : 'Require'),
      type: 'tf',
      description:
        'If enabled, trustlines to this account require authorization before they can hold tokens. Can only be enabled if the account has no trustlines, offers, escrows, payment channels, checks, or signer lists.',
      isDefault: (value) => !value
    },
    disallowXRP: {
      name: 'Incoming ' + nativeCurrency,
      displayName: 'Incoming ' + nativeCurrency,
      status: (value) => (value ? 'Disallowed' : 'Allowed'),
      actionText: (value) => (value ? 'Allow' : 'Disallow'),
      type: 'tf',
      description: `If enabled, this means the account does not accept ${nativeCurrency} payments. \nNote: This setting is not enforced by the protocol, so ${nativeCurrency} can still be sent to the account.`,
      isDefault: (value) => !value
    },
    // ASF Flags - Basic
    disallowIncomingCheck: {
      name: 'Incoming Checks',
      displayName: 'Incoming Checks',
      status: (value) => (value ? 'Disallowed' : 'Allowed'),
      actionText: (value) => (value ? 'Allow' : 'Disallow'),
      type: 'asf',
      description: 'If enabled, other accounts cannot create Checks with this account as the destination.',
      isDefault: (value) => !value
    },
    disallowIncomingPayChan: {
      name: 'Incoming Payment Channels',
      displayName: 'Incoming Payment Channels',
      status: (value) => (value ? 'Disallowed' : 'Allowed'),
      actionText: (value) => (value ? 'Allow' : 'Disallow'),
      type: 'asf',
      description: 'If enabled, other accounts cannot create Payment Channels with this account as the destination.',
      isDefault: (value) => !value
    },
    disallowIncomingTrustline: {
      name: 'Incoming Trustlines',
      displayName: 'Incoming Trustlines',
      status: (value) => (value ? 'Disallowed' : 'Allowed'),
      actionText: (value) => (value ? 'Allow' : 'Disallow'),
      type: 'asf',
      description: 'If enabled, other accounts cannot create trustlines to this account.',
      isDefault: (value) => !value
    },
    asfDepositAuth: {
      name: 'Deposit Authorization',
      displayName: 'Deposit Authorization',
      status: (value) => (value ? 'Enabled' : 'Disabled'),
      actionText: (value) => (value ? 'Disable' : 'Enable'),
      type: 'asf',
      description: 'If enabled, this account can only receive funds from accounts it has pre-authorized.',
      isDefault: (value) => !value
    },
    disallowIncomingNFTokenOffer: {
      name: 'Incoming NFT Offers',
      displayName: 'Incoming NFT Offers',
      status: (value) => (value ? 'Disallowed' : 'Allowed'),
      actionText: (value) => (value ? 'Allow' : 'Disallow'),
      type: 'asf',
      description: 'If enabled, other accounts cannot create NFT offers with this account as the destination.',
      isDefault: (value) => !value
    },
    disallowIncomingRemit: {
      name: 'Incoming Remit',
      displayName: 'Incoming Remit',
      status: (value) => (value ? 'Disallowed' : 'Allowed'),
      actionText: (value) => (value ? 'Allow' : 'Disallow'),
      type: 'asf',
      description: 'If enabled, other accounts cannot send Remit transactions to this account.',
      isDefault: (value) => !value
    },
    tshCollect: {
      name: 'Transactional Stakeholder (TSH) Collect',
      displayName: 'Transactional Stakeholder (TSH) Collect',
      status: (value) => (value ? 'Enabled' : 'Disabled'),
      actionText: (value) => (value ? 'Disable' : 'Enable'),
      type: 'asf',
      description: 'If enabled, this account can collect TSH rewards from transactions.',
      isDefault: (value) => !value
    },
    allowTrustLineClawback: {
      name: 'Trustline Clawback',
      displayName: 'Trustline Clawback',
      status: (value) => (value ? 'Enabled' : 'Disabled'),
      actionText: (value) => (value ? '' : 'Enable'),
      type: 'asf',
      description:
        'Allow account to claw back tokens it has issued. Can only be set if the account has an empty owner directory (no trustlines, offers, escrows, payment channels, checks, or signer lists). After you set this flag, it cannot be reverted. The account permanently gains the ability to claw back issued assets on trust lines.',
      isDefault: (value) => !value,
      isPermanent: true
    },

    // ASF Flags - Advanced
    asfDefaultRipple: {
      name: 'Rippling (default ripple)',
      displayName: 'Rippling (default ripple)',
      status: (value) => (value ? 'Enabled' : 'Disabled'),
      actionText: (value) => (value ? 'Disable' : 'Enable'),
      type: 'asf',
      description:
        'If enabled, allows rippling on all trustlines by default. This can affect how payments flow through your account.',
      isDefault: (value) => !value, // Rippling DISABLED is the default state (orange highlight when enabled)
      isAdvanced: true
    },
    asfDisableMaster: {
      name: 'Master Key',
      displayName: 'Master Key',
      status: (value) => (value ? 'Disabled' : 'Enabled'),
      actionText: (value) => (value ? 'Enable' : 'Disable'),
      type: 'asf',
      description: `Disabling the master key pair removes one method of authorizing transactions. You should be sure you can use one of the other ways of authorizing transactions, such as with a regular key or by multi-signing, before you disable the master key pair. (For example, if you assigned a regular key pair, make sure that you can successfully submit transactions with that regular key.) Due to the decentralized nature of the ${explorerName}, no one can restore access to your account if you cannot use the remaining ways of authorizing transactions.\nYou should do this if your account\'s master key pair may have been compromised, or if you want to make multi-signing the only way to submit transactions from your account.\nTo disable the master key pair, you must use the master key pair. However, you can re-enable the master key pair using any other method of authorizing transactions.`,
      isDefault: (value) => !value,
      isAdvanced: true,
      isHighRisk: true
    },
    globalFreeze: {
      name: 'Global Freeze',
      displayName: 'Global Freeze',
      status: (value) => (value ? 'Enabled' : 'Disabled'),
      actionText: (value) => (value ? 'Disable' : 'Enable'),
      type: 'asf',
      description:
        'If enabled, freezes all tokens issued by this account, preventing them from being transferred. This affects all trustlines for tokens you have issued. Cannot be enabled if No Freeze is active. Use with caution as it impacts all token holders.',
      isDefault: (value) => !value,
      isAdvanced: true
    },
    noFreeze: {
      name: 'No Freeze',
      displayName: 'No Freeze',
      status: (value) => (value ? 'Enabled' : 'Disabled'),
      actionText: (value) => (value ? '' : 'Enable'),
      type: 'asf',
      description:
        'If enabled, permanently gives up the ability to freeze tokens issued by this account. This setting cannot be reversed.',
      isDefault: (value) => !value,
      isAdvanced: true,
      isPermanent: true
    }
  }

  useEffect(() => {
    const fetchAccountData = async () => {
      try {
        const response = await axios(`/v2/address/${account.address}?ledgerInfo=true`)
        setAccountData(response.data)
        // Set current NFTokenMinter if it exists
        setCurrentNftTokenMinter(response.data?.ledgerInfo?.nftokenMinter || '')

        if (response.data?.ledgerInfo?.flags) {
          const ledgerFlags = response.data.ledgerInfo.flags || {}

          // Initialize ASF flags with safe defaults
          const newAsfFlags = {}
          const allAsfFlags = [...flagGroups.basic, ...flagGroups.advanced]
          allAsfFlags.forEach((flag) => {
            const ledgerKey = asfLedgerFlagMapping[flag] || flag
            newAsfFlags[flag] = !!ledgerFlags[ledgerKey]
          })
          setFlags(newAsfFlags)

          // Initialize TF flags with safe defaults
          const newTfFlags = {}
          tfFlagKeys.forEach((flag) => {
            const asfMapping = {
              requireDestTag: 'requireDestTag',
              requireAuth: 'requireAuth',
              disallowXRP: 'disallowXRP'
            }
            newTfFlags[flag] = !!ledgerFlags[asfMapping[flag]]
          })
          setTfFlags(newTfFlags)
        } else {
          // Initialize with default false values if no flags data
          const defaultAsfFlags = {}
          const allAsfFlags = [...flagGroups.basic, ...flagGroups.advanced]
          allAsfFlags.forEach((flag) => {
            defaultAsfFlags[flag] = false
          })
          setFlags(defaultAsfFlags)

          const defaultTfFlags = {}
          tfFlagKeys.forEach((flag) => {
            defaultTfFlags[flag] = false
          })
          setTfFlags(defaultTfFlags)
        }
        setLoading(false)
      } catch (error) {
        setErrorMessage('Error fetching account data')
        setLoading(false)
      }
    }

    if (account?.address) {
      fetchAccountData()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [account])

  const canEnableTrustLineClawback = () => {
    return !accountData?.ledgerInfo?.ownerCount
  }

  const canEnableRequireAuth = () => {
    // Can only be enabled if the account has no owner objects (trustlines, offers, escrows, etc.)
    return !accountData?.ledgerInfo?.ownerCount
  }

  const canChangeGlobalFreeze = () => {
    return !flags?.noFreeze
  }

  const handleSetNftTokenMinter = () => {
    if (!isAddressValid(nftTokenMinter.trim())) {
      setErrorMessage('Please enter a valid NFTokenMinter address.')
      return
    }

    const tx = {
      TransactionType: 'AccountSet',
      Account: account.address,
      NFTokenMinter: nftTokenMinter.trim(),
      SetFlag: 10 // asfAuthorizedNFTokenMinter - required to enable the feature
    }

    setSignRequest({
      request: tx,
      callback: () => {
        setSuccessMessage('NFTokenMinter set successfully.')
        setErrorMessage('')
        setCurrentNftTokenMinter(nftTokenMinter.trim())
        setNftTokenMinter('')
        setAccountData((prev) => {
          if (prev && prev.ledgerInfo) {
            const updatedLedgerInfo = {
              ...prev.ledgerInfo,
              nftokenMinter: nftTokenMinter.trim()
            }
            return {
              ...prev,
              ledgerInfo: updatedLedgerInfo
            }
          }
          return prev
        })
      }
    })
  }

  const handleClearNftTokenMinter = () => {
    const tx = {
      TransactionType: 'AccountSet',
      Account: account.address,
      ClearFlag: 10 // asfAuthorizedNFTokenMinter
    }

    setSignRequest({
      request: tx,
      callback: () => {
        setSuccessMessage('NFTokenMinter cleared successfully.')
        setErrorMessage('')
        setCurrentNftTokenMinter('')
        setNftTokenMinter('')
        setAccountData((prev) => {
          if (prev && prev.ledgerInfo) {
            const updatedLedgerInfo = { ...prev.ledgerInfo }
            delete updatedLedgerInfo.nftokenMinter
            delete updatedLedgerInfo.nftokenMinterDetails
            return {
              ...prev,
              ledgerInfo: updatedLedgerInfo
            }
          }
          return prev
        })
      }
    })
  }

  const handleAsfFlagToggle = (flag) => {
    if (!account?.address) {
      setErrorMessage('Please sign in to your account.')
      return
    }

    if (!accountData?.ledgerInfo) {
      setErrorMessage('Error fetching account data')
      return
    }

    const currentValue = flags[flag]
    const newValue = !currentValue

    const tx = {
      TransactionType: 'AccountSet',
      Account: account.address
    }

    // Regular flag handling
    if (newValue) {
      tx.SetFlag = ASF_FLAGS[flag]
    } else {
      tx.ClearFlag = ASF_FLAGS[flag]
    }

    setSignRequest({
      request: tx,
      callback: () => {
        setSuccessMessage('Settings updated successfully.')
        setErrorMessage('')
        setFlags((prev) => ({
          ...prev,
          [flag]: newValue
        }))

        setAccountData((prev) => {
          if (prev && prev.ledgerInfo) {
            return {
              ...prev,
              ledgerInfo: {
                ...prev.ledgerInfo,
                flags: {
                  ...prev.ledgerInfo.flags,
                  [asfLedgerFlagMapping[flag] || flag]: newValue
                }
              }
            }
          }
          return prev
        })
      }
    })
  }

  const handleTfFlagToggle = (flag) => {
    if (!account?.address) {
      setErrorMessage('Please sign in to your account.')
      return
    }

    const currentValue = tfFlags[flag]
    const newValue = !currentValue

    const tx = {
      TransactionType: 'AccountSet',
      Account: account.address,
      Flags: 0
    }

    if (newValue) {
      tx.Flags = TF_FLAGS[flag].set
    } else {
      tx.Flags = TF_FLAGS[flag].clear
    }

    setSignRequest({
      request: tx,
      callback: () => {
        setSuccessMessage('Settings updated successfully.')
        setTfFlags((prev) => ({
          ...prev,
          [flag]: newValue
        }))
        setAccountData((prev) => {
          if (prev && prev.ledgerInfo) {
            const asfMapping = {
              requireDestTag: 'requireDestTag',
              requireAuth: 'requireAuth',
              disallowXRP: 'disallowXRP'
            }
            return {
              ...prev,
              ledgerInfo: {
                ...prev.ledgerInfo,
                flags: {
                  ...prev.ledgerInfo.flags,
                  [asfMapping[flag]]: newValue
                }
              }
            }
          }
          return prev
        })
      }
    })
  }

  const renderFlagItem = (flag, flagType) => {
    const flagData = flagDetails[flag]
    // Add null checks and safe access
    const currentValue = flagType === 'tf' ? tfFlags?.[flag] || false : flags?.[flag] || false
    const isNonDefault = flagData && !flagData.isDefault(currentValue)
    const isHighRisk = flagData?.isHighRisk || false

    // Read more handling
    const isExpanded = expandedFlags[flag] || false
    const descriptionText = flagData.description
    const shouldTruncate = descriptionText.length > 200 // arbitrary threshold
    const displayedDescription = isExpanded || !shouldTruncate ? descriptionText : `${descriptionText.slice(0, 200)}...`

    let buttonDisabled = false
    let disabledReason = ''

    // Check specific conditions for disabling buttons
    if (flag === 'allowTrustLineClawback' && !canEnableTrustLineClawback() && !currentValue) {
      buttonDisabled = true
      disabledReason =
        'Can only be enabled if account has no trustlines, offers, escrows, payment channels, checks, or signer lists'
    }

    if (flag === 'requireAuth' && !canEnableRequireAuth() && !currentValue) {
      buttonDisabled = true
      disabledReason =
        'Can only be enabled if the account has no trustlines, offers, escrows, payment channels, checks, or signer lists'
    }

    if (flag === 'globalFreeze' && !canChangeGlobalFreeze()) {
      buttonDisabled = true
      disabledReason = 'Cannot change Global Freeze when No Freeze is enabled'
    }

    // For permanent flags that are already enabled, don't show button
    const showButton = !(flagData.isPermanent && currentValue)

    return (
      <div key={flag} className="flag-item">
        <div className="flag-header">
          <div className="flag-info">
            <span className="flag-name">{flagData.displayName}</span>
            <span className={`flag-status ${isNonDefault ? 'orange' : ''}`}>{flagData.status(currentValue)}</span>
          </div>
          {showButton && (
            <button
              className="button-action thin"
              onClick={() => (flagType === 'tf' ? handleTfFlagToggle(flag) : handleAsfFlagToggle(flag))}
              disabled={buttonDisabled || !account?.address}
              style={{ minWidth: '120px' }}
            >
              {flagData.actionText(currentValue)}
            </button>
          )}
          {flagData.isPermanent && currentValue && <span className="permanent-flag">Permanent</span>}
        </div>
        <div className={`flag-description ${isHighRisk ? 'warning' : flagData.isPermanent ? 'warning' : ''}`}>
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

  if (account?.address && loading) {
    return (
      <>
        <SEO title="Account Settings" description={`Manage your account settings on the ${explorerName}.`} />
        <div className="content-center">
          <h1 className="center">Account Settings</h1>
          <div className="center">
            <span className="waiting"></span>
            <br />
            {t('general.loading')}
          </div>
        </div>
      </>
    )
  }

  if (!account?.address) {
    // Initialize default states for display when not logged in
    const defaultFlags = {}
    const defaultTfFlags = {}
    const allAsfFlags = [...flagGroups.basic, ...flagGroups.advanced]
    allAsfFlags.forEach((flag) => {
      defaultFlags[flag] = false
    })
    tfFlagKeys.forEach((flag) => {
      defaultTfFlags[flag] = false
    })
  }

  return (
    <>
      <div className={accountSettings}>
        <SEO title="Account Settings" description={`Manage your account settings on the ${explorerName}.`} />
        <div className="content-center">
          <h1 className="center">Account Settings</h1>
          <p className="center">
            {account?.address ? (
              `Manage your account settings on the ${explorerName}.`
            ) : (
              <>
                Please{' '}
                <span className="link" onClick={() => setSignRequest({})}>
                  sign in to your account
                </span>{' '}
                to manage your account settings.
              </>
            )}
          </p>

          {/* Feedback messages (placed high for mobile visibility) */}
          {errorMessage && <p className="red center">{errorMessage}</p>}
          {successMessage && <p className="green center">{successMessage}</p>}

          {/* Account Flags Section */}
          <div>
            <h4>Account Flags</h4>

            {/* TF Flags */}
            {tfFlagKeys.map((flag) => renderFlagItem(flag, 'tf'))}

            {/* Basic ASF Flags */}
            {flagGroups.basic.map((flag) => renderFlagItem(flag, 'asf'))}

            {/* NFTokenMinter Section */}
            {!xahauNetwork && (
              <div className="flag-item">
                <div className="flag-header">
                  <div className="flag-info">
                    <span className="flag-name">Authorized NFToken Minter</span>
                    {account?.address && (
                      <span className="flag-status">{currentNftTokenMinter ? currentNftTokenMinter : 'Not Set'}</span>
                    )}
                  </div>
                  {currentNftTokenMinter ? (
                    <button
                      className="button-action thin"
                      onClick={handleClearNftTokenMinter}
                      disabled={!account?.address}
                      style={{ minWidth: '120px' }}
                    >
                      Clear NFTokenMinter
                    </button>
                  ) : (
                    <button
                      className="button-action thin"
                      onClick={handleSetNftTokenMinter}
                      disabled={!account?.address || !nftTokenMinter.trim()}
                      style={{ minWidth: '120px' }}
                    >
                      Set NFTokenMinter
                    </button>
                  )}
                </div>
                <div className="flag-description">
                  Allows another account to mint NFTokens on behalf of this account. Requires setting the
                  asfAuthorizedNFTokenMinter flag and specifying the minter address.
                </div>
                {!currentNftTokenMinter && (
                  <div className="nft-minter-input">
                    <AddressInput
                      title="NFTokenMinter Address"
                      placeholder="Enter NFTokenMinter address"
                      setInnerValue={setNftTokenMinter}
                      disabled={!account?.address}
                      hideButton={true}
                      type="address"
                    />
                    <small>Enter the address that will be authorized to mint NFTokens for this account</small>
                  </div>
                )}
                {currentNftTokenMinter && (
                  <small>To change the authorized minter, first clear the current one, then set a new one.</small>
                )}
              </div>
            )}

            {/* Advanced options */}
            <div className="advanced-options">
              <CheckBox checked={showAdvanced} setChecked={() => setShowAdvanced(!showAdvanced)} name="advanced-flags">
                Advanced options (Use with caution)
              </CheckBox>

              {showAdvanced && (
                <div className="advanced-flags">{flagGroups.advanced.map((flag) => renderFlagItem(flag, 'asf'))}</div>
              )}
            </div>
          </div>

          <br />
          <div className="center">
            {account?.address ? (
              <Link href={`/account/${account.address}`}>View my account page</Link>
            ) : (
              <span className="link" onClick={() => setSignRequest({})}>
                Sign in to your account
              </span>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

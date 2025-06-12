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
      description: `If enabled, this account cannot receive ${nativeCurrency} payments. Note: This is not enforced by the protocol, so it's still possible to send ${nativeCurrency} to this account.`,
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
      status: (value) => (value ? 'Required' : 'Not Required'),
      actionText: (value) => (value ? "Don't Require" : 'Require'),
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
      isDefault: (value) => value, // Rippling enabled is non-default (should be orange when enabled)
      isAdvanced: true
    },
    asfDisableMaster: {
      name: 'Master Key',
      displayName: 'Master Key',
      status: (value) => (value ? 'Disabled' : 'Enabled'),
      actionText: (value) => (value ? 'Enable' : 'Disable'),
      type: 'asf',
      description:
        'WARNING: If disabled, the master key pair cannot be used to sign transactions. Only disable this if you have configured alternative signing methods (like regular keys or multi-signing). Disabling without alternative access will lock you out of your account.',
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
        // const response = await axios(`/v2/address/${account.address}?ledgerInfo=true&obligations=true`)
        setAccountData(response.data)
        console.log('response.data', response.data)
        // Set current NFTokenMinter if it exists
        setCurrentNftTokenMinter(response.data?.ledgerInfo?.nftokenMinter || '')

        if (response.data?.ledgerInfo?.flags) {
          const ledgerFlags = response.data.ledgerInfo.flags

          // Initialize ASF flags
          const newAsfFlags = {}
          const allAsfFlags = [...flagGroups.basic, ...flagGroups.advanced]
          allAsfFlags.forEach((flag) => {
            newAsfFlags[flag] = !!ledgerFlags[flag]
          })
          setFlags(newAsfFlags)

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
    return accountData?.ledgerInfo?.ownerReserve === 0 || !accountData?.ledgerInfo?.ownerReserve
  }

  const canEnableRequireAuth = () => {
    // Can only be enabled if the account has no trustlines, offers, escrows, payment channels, checks, or signer lists
    return accountData?.ledgerInfo?.ownerReserve === 0 || !accountData?.ledgerInfo?.ownerReserve
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
                  [flag]: newValue
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
    const currentValue = flagType === 'tf' ? tfFlags[flag] : flags[flag]
    const isNonDefault = !flagData.isDefault(currentValue)
    const isHighRisk = flagData.isHighRisk
    
    let buttonDisabled = false
    let disabledReason = ''
    
    // Check specific conditions for disabling buttons
    if (flag === 'allowTrustLineClawback' && !canEnableTrustLineClawback() && !currentValue) {
      buttonDisabled = true
      disabledReason =
        'Can only be enabled if account has no trustlines, offers, escrows, payment channels, checks, or signer lists (ownerReserve must be 0)'
    }
    
    if (flag === 'requireAuth' && !canEnableRequireAuth() && !currentValue) {
      buttonDisabled = true
      disabledReason =
        'Can only be enabled if account has no trustlines, offers, escrows, payment channels, checks, or signer lists (ownerReserve must be 0)'
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
        <div className={`flag-description ${isHighRisk ? 'red' : ''}`}>{flagData.description}</div>
        {buttonDisabled && disabledReason && <div className="disabled-reason red">{disabledReason}</div>}
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

    return (
      <>
        <SEO title="Account Settings" description={`Manage your account settings on the ${explorerName}.`} />
        <div className="content-center account-settings">
          <h1 className="center">Account Settings</h1>
          <p className="center">
            Please <Link href="/explorer">sign in to your account</Link> to manage your account settings.
          </p>

          {/* Show form preview when not logged in */}
          <div>
            <h4>Account Flags</h4>

            {/* TF Flags */}
            {tfFlagKeys.map((flag) => {
              const flagData = flagDetails[flag]
              return (
                <div key={flag} className="flag-item">
                  <div className="flag-header">
                    <div className="flag-info">
                      <span className="flag-name">{flagData.displayName}</span>
                    </div>
                    <button className="button-action thin" disabled={true} style={{ minWidth: '120px' }}>
                      {flagData.actionText(false)}
                    </button>
                  </div>
                  <div className="flag-description">{flagData.description}</div>
                </div>
              )
            })}

            {/* Basic ASF Flags */}
            {flagGroups.basic.map((flag) => {
              const flagData = flagDetails[flag]
              return (
                <div key={flag} className="flag-item">
                  <div className="flag-header">
                    <div className="flag-info">
                      <span className="flag-name">{flagData.displayName}</span>
                    </div>
                    <button className="button-action thin" disabled={true} style={{ minWidth: '120px' }}>
                      {flagData.actionText(false)}
                    </button>
                  </div>
                  <div className="flag-description">{flagData.description}</div>
                </div>
              )
            })}

            {/* NFTokenMinter Section */}
            {!xahauNetwork && (
              <div className="flag-item">
                <div className="flag-header">
                  <div className="flag-info">
                    <span className="flag-name">Authorized NFToken Minter</span>
                  </div>
                </div>
                <div className="flag-description">
                  Allows another account to mint NFTokens on behalf of this account. Requires setting the
                  asfAuthorizedNFTokenMinter flag and specifying the minter address.
                </div>
                <div className="nft-minter-input">
                  <div className="set-minter">
                    <AddressInput
                      title="NFTokenMinter Address"
                      placeholder="Enter NFTokenMinter address"
                      disabled={true}
                      hideButton={true}
                      setInnerValue={() => {}}
                      type="address"
                    />
                    <br />
                    <div className="center">
                      <button className="button-action thin" disabled={true} style={{ minWidth: '120px' }}>
                        Set NFTokenMinter
                      </button>
                    </div>
                    <small>Enter the address that will be authorized to mint NFTokens for this account</small>
                  </div>
                </div>
              </div>
            )}

            {/* Advanced Options */}
            <div className="advanced-options">
              <CheckBox checked={false} setChecked={() => {}} name="advanced-flags" disabled={true}>
                Advanced Options (Use with caution)
              </CheckBox>
            </div>
          </div>

          <br />
          <div className="center">
            <Link href="/explorer">Sign in to your account</Link>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <SEO title="Account Settings" description={`Manage your account settings on the ${explorerName}.`} />
      <div className="content-center account-settings">
        <h1 className="center">Account Settings</h1>
        <p className="center">Manage your account settings on the {explorerName}.</p>

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
                    <span className="flag-status">
                      {currentNftTokenMinter ? currentNftTokenMinter : 'Not Set'}
                    </span>
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

          {/* Advanced Options */}
          <div className="advanced-options">
            <CheckBox checked={showAdvanced} setChecked={() => setShowAdvanced(!showAdvanced)} name="advanced-flags">
              Advanced Options (Use with caution)
            </CheckBox>

            {showAdvanced && (
              <div className="advanced-flags">{flagGroups.advanced.map((flag) => renderFlagItem(flag, 'asf'))}</div>
            )}
          </div>
        </div>

        {errorMessage && <p className="red center">{errorMessage}</p>}
        {successMessage && <p className="green center">{successMessage}</p>}

        <br />
        <div className="center">
          {account?.address ? (
            <Link href={`/account/${account.address}`}>View my account page</Link>
          ) : (
            <Link href="/explorer">Sign in to your account</Link>
          )}
        </div>
      </div>
    </>
  )
}

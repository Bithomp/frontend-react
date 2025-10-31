import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useTranslation } from 'next-i18next'
import axios from 'axios'
import {
  xahauNetwork,
  explorerName,
  nativeCurrency,
  isAddressValid,
  encode,
  isEmailValid,
  md5,
  isHexString
} from '../../utils'
import { multiply, subtract } from '../../utils/calc'
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

export default function AccountSettings({
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
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [nftTokenMinter, setNftTokenMinter] = useState('')
  const [currentNftTokenMinter, setCurrentNftTokenMinter] = useState('')
  const [domainInput, setDomainInput] = useState('')
  const [currentDomain, setCurrentDomain] = useState('')
  const [emailHashInput, setEmailHashInput] = useState('')
  const [currentEmailHash, setCurrentEmailHash] = useState('')
  const [messageKeyInput, setMessageKeyInput] = useState('')
  const [currentMessageKey, setCurrentMessageKey] = useState('')
  const [regularKeyInput, setRegularKeyInput] = useState('')
  const [currentRegularKey, setCurrentRegularKey] = useState('')
  const [transferRateInput, setTransferRateInput] = useState('')
  const [currentTransferRate, setCurrentTransferRate] = useState(null)
  const [tickSizeInput, setTickSizeInput] = useState('')
  const [currentTickSize, setCurrentTickSize] = useState(null)
  const [walletLocatorInput, setWalletLocatorInput] = useState('')
  const [currentWalletLocator, setCurrentWalletLocator] = useState('')

  // Validation states
  const [messageKeyValidation, setMessageKeyValidation] = useState({ isValid: true, message: '' })
  const [walletLocatorValidation, setWalletLocatorValidation] = useState({ isValid: true, message: '' })
  const [tickSizeValidation, setTickSizeValidation] = useState({ isValid: true, message: '' })

  const validateInput = (value, options = {}) => {
    const { allowEmpty = true, evenLength = true, minChars, exactChars, successMessage = 'Valid input' } = options

    const trimmed = value.trim()

    if (!trimmed) {
      return { isValid: allowEmpty, message: '' }
    }

    if (!isHexString(trimmed.toUpperCase())) {
      return {
        isValid: false,
        message: 'Must contain only hexadecimal characters (0-9, a-f, A-F)'
      }
    }

    if (evenLength && trimmed.length % 2 !== 0) {
      return {
        isValid: false,
        message: 'Must have an even number of characters (pairs of hex digits)'
      }
    }

    if (typeof exactChars === 'number') {
      if (trimmed.length !== exactChars) {
        return {
          isValid: false,
          message: `Must be exactly ${exactChars} characters (current: ${trimmed.length})`
        }
      }
    } else if (typeof minChars === 'number') {
      if (trimmed.length < minChars) {
        return {
          isValid: false,
          message: `Must be at least ${minChars} characters (${minChars / 2} bytes)`
        }
      }
    }

    return { isValid: true, message: successMessage }
  }

  // Validation functions
  const validateMessageKey = (value) => {
    const trimmed = value.trim()
    // Check the first byte for valid key type prefixes
    const firstByte = trimmed.substring(0, 2).toUpperCase()
    const validPrefixes = ['02', '03', 'ED']

    if (!validPrefixes.includes(firstByte)) {
      return {
        isValid: false,
        message: `First byte must be 02 or 03 for secp256k1 keys, or ED for Ed25519 keys. Current: 0x${firstByte}`
      }
    }
    return validateInput(value, {
      allowEmpty: true,
      evenLength: true,
      exactChars: 66,
      successMessage: 'Valid 66-character hex string'
    })
  }

  const validateWalletLocator = (value) => {
    return validateInput(value, {
      allowEmpty: true,
      evenLength: true,
      exactChars: 64,
      successMessage: 'Valid 64-character hex string'
    })
  }

  const validateTickSize = (value) => {
    const trimmed = value.trim()

    if (!trimmed) {
      return { isValid: true, message: '' } // Empty is valid (will be cleared)
    }

    const numValue = Number(trimmed)

    if (isNaN(numValue)) {
      return {
        isValid: false,
        message: 'Must be a valid number'
      }
    }

    if (!Number.isInteger(numValue)) {
      return {
        isValid: false,
        message: 'Must be a whole number (integer)'
      }
    }

    if (numValue < 0) {
      return {
        isValid: false,
        message: 'Must be 0 or positive'
      }
    }

    if (numValue === 0) {
      return { isValid: true, message: 'Valid (will clear tick size)' }
    }

    if (numValue < 3 || numValue > 15) {
      return {
        isValid: false,
        message: 'Must be between 3 and 15 (or 0 to clear)'
      }
    }

    return { isValid: true, message: 'Valid tick size' }
  }

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
  const isPro = sessionToken && !subscriptionExpired

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
      name: 'Default rippling',
      displayName: 'Default rippling',
      status: (value) => (value ? 'Enabled' : 'Disabled'),
      actionText: (value) => (value ? 'Disable' : 'Enable'),
      type: 'asf',
      description:
        'This a setting that Token issuers need to enable. If enabled, allows rippling on all trustlines by default. This affect how payments flow through your account.',
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
        setCurrentDomain(response.data?.ledgerInfo?.domain || '')
        setDomainInput(response.data?.ledgerInfo?.domain || '')
        setCurrentEmailHash(response.data?.ledgerInfo?.emailHash || '')
        setEmailHashInput(response.data?.ledgerInfo?.emailHash || '')
        setCurrentMessageKey(response.data?.ledgerInfo?.messageKey || '')
        setMessageKeyInput(response.data?.ledgerInfo?.messageKey || '')
        setCurrentRegularKey(response.data?.ledgerInfo?.regularKey || '')
        setRegularKeyInput(response.data?.ledgerInfo?.regularKey || '')
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
        setCurrentTickSize(
          typeof response.data?.ledgerInfo?.tickSize === 'number' ? response.data.ledgerInfo.tickSize : null
        )
        setTickSizeInput(
          typeof response.data?.ledgerInfo?.tickSize === 'number' && response.data.ledgerInfo.tickSize > 0
            ? String(response.data.ledgerInfo.tickSize)
            : ''
        )
        setCurrentWalletLocator(response.data?.ledgerInfo?.walletLocator || '')
        setWalletLocatorInput(response.data?.ledgerInfo?.walletLocator || '')

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
            return {
              ...prev,
              ledgerInfo: { ...prev.ledgerInfo, domain: domainInput.trim() }
            }
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

  const handleSetEmailHash = () => {
    const input = emailHashInput.trim()
    let valueHex = ''
    if (!input) {
      setErrorMessage('Please enter an email or a 32-character hex MD5 hash.')
      return
    }
    if (/^[0-9a-fA-F]{32}$/.test(input)) {
      valueHex = input
    } else if (isEmailValid(input)) {
      valueHex = md5(input)
    } else {
      setErrorMessage('Enter a valid email or a 32-character hex MD5 hash.')
      return
    }
    const tx = {
      TransactionType: 'AccountSet',
      Account: account.address,
      EmailHash: valueHex
    }
    setSignRequest({
      request: tx,
      callback: () => {
        setSuccessMessage('EmailHash set successfully.')
        setErrorMessage('')
        setCurrentEmailHash(valueHex)
        setAccountData((prev) => {
          if (prev && prev.ledgerInfo) {
            return {
              ...prev,
              ledgerInfo: { ...prev.ledgerInfo, emailHash: valueHex }
            }
          }
          return prev
        })
      }
    })
  }

  const handleClearEmailHash = () => {
    const tx = {
      TransactionType: 'AccountSet',
      Account: account.address,
      EmailHash: ''
    }
    setSignRequest({
      request: tx,
      callback: () => {
        setSuccessMessage('EmailHash cleared successfully.')
        setErrorMessage('')
        setCurrentEmailHash('')
        setEmailHashInput('')
        setAccountData((prev) => {
          if (prev && prev.ledgerInfo) {
            const updatedLedgerInfo = { ...prev.ledgerInfo }
            delete updatedLedgerInfo.emailHash
            return { ...prev, ledgerInfo: updatedLedgerInfo }
          }
          return prev
        })
      }
    })
  }

  const handleSetMessageKey = () => {
    const value = messageKeyInput.trim()
    if (!value) {
      setErrorMessage('MessageKey cannot be empty. Please enter a hex-encoded public key.')
      return
    }

    const validation = validateMessageKey(value)
    if (!validation.isValid) {
      setErrorMessage(`MessageKey ${validation.message}`)
      return
    }
    const tx = {
      TransactionType: 'AccountSet',
      Account: account.address,
      MessageKey: value.toUpperCase()
    }
    setSignRequest({
      request: tx,
      callback: () => {
        setSuccessMessage('MessageKey set successfully.')
        setErrorMessage('')
        setCurrentMessageKey(value.toUpperCase())
        setAccountData((prev) => {
          if (prev && prev.ledgerInfo) {
            return {
              ...prev,
              ledgerInfo: { ...prev.ledgerInfo, messageKey: value.toUpperCase() }
            }
          }
          return prev
        })
      }
    })
  }

  const handleClearMessageKey = () => {
    const tx = {
      TransactionType: 'AccountSet',
      Account: account.address,
      MessageKey: ''
    }
    setSignRequest({
      request: tx,
      callback: () => {
        setSuccessMessage('MessageKey cleared successfully.')
        setErrorMessage('')
        setCurrentMessageKey('')
        setMessageKeyInput('')
        setAccountData((prev) => {
          if (prev && prev.ledgerInfo) {
            const updatedLedgerInfo = { ...prev.ledgerInfo }
            delete updatedLedgerInfo.messageKey
            return { ...prev, ledgerInfo: updatedLedgerInfo }
          }
          return prev
        })
      }
    })
  }

  const handleSetRegularKey = () => {
    const value = regularKeyInput.trim()
    if (!isAddressValid(value)) {
      setErrorMessage('Please enter a valid RegularKey address.')
      return
    }
    if (account?.address && value === account.address) {
      setErrorMessage('RegularKey must not be the same as your account address (master key).')
      return
    }

    const tx = {
      TransactionType: 'SetRegularKey',
      Account: account.address,
      RegularKey: value
    }

    setSignRequest({
      request: tx,
      callback: () => {
        setSuccessMessage('RegularKey set successfully.')
        setErrorMessage('')
        setCurrentRegularKey(value)
        setRegularKeyInput('')
        setAccountData((prev) => {
          if (prev && prev.ledgerInfo) {
            return {
              ...prev,
              ledgerInfo: { ...prev.ledgerInfo, regularKey: value }
            }
          }
          return prev
        })
      }
    })
  }

  const handleClearRegularKey = () => {
    const tx = {
      TransactionType: 'SetRegularKey',
      Account: account.address
    }

    setSignRequest({
      request: tx,
      callback: () => {
        setSuccessMessage('RegularKey cleared successfully.')
        setErrorMessage('')
        setCurrentRegularKey('')
        setRegularKeyInput('')
        setAccountData((prev) => {
          if (prev && prev.ledgerInfo) {
            const updatedLedgerInfo = { ...prev.ledgerInfo }
            delete updatedLedgerInfo.regularKey
            return { ...prev, ledgerInfo: updatedLedgerInfo }
          }
          return prev
        })
      }
    })
  }

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
            return {
              ...prev,
              ledgerInfo: { ...prev.ledgerInfo, transferRate: rate }
            }
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

  const handleSetTickSize = () => {
    const value = Number(tickSizeInput)
    if (isNaN(value) || !(value === 0 || (value >= 3 && value <= 15))) {
      setErrorMessage('TickSize must be 0 to clear or an integer between 3 and 15.')
      return
    }
    const tx = {
      TransactionType: 'AccountSet',
      Account: account.address,
      TickSize: value
    }
    setSignRequest({
      request: tx,
      callback: () => {
        setSuccessMessage('TickSize updated successfully.')
        setErrorMessage('')
        setCurrentTickSize(value === 0 ? null : value)
        if (value === 0) setTickSizeInput('')
        setAccountData((prev) => {
          if (prev && prev.ledgerInfo) {
            const li = { ...prev.ledgerInfo }
            if (value === 0) {
              delete li.tickSize
            } else {
              li.tickSize = value
            }
            return { ...prev, ledgerInfo: li }
          }
          return prev
        })
      }
    })
  }

  const handleSetWalletLocator = () => {
    const value = walletLocatorInput.trim()
    if (!value) {
      setErrorMessage('WalletLocator cannot be empty. Please enter a 64-character hexadecimal string.')
      return
    }

    const validation = validateWalletLocator(value)
    if (!validation.isValid) {
      setErrorMessage(`WalletLocator ${validation.message}`)
      return
    }
    const tx = {
      TransactionType: 'AccountSet',
      Account: account.address,
      WalletLocator: value.toUpperCase()
    }
    setSignRequest({
      request: tx,
      callback: () => {
        setSuccessMessage('WalletLocator set successfully.')
        setErrorMessage('')
        setCurrentWalletLocator(value.toUpperCase())
        setAccountData((prev) => {
          if (prev && prev.ledgerInfo) {
            return {
              ...prev,
              ledgerInfo: { ...prev.ledgerInfo, walletLocator: value.toUpperCase() }
            }
          }
          return prev
        })
      }
    })
  }

  const handleClearWalletLocator = () => {
    const tx = {
      TransactionType: 'AccountSet',
      Account: account.address,
      WalletLocator: '0000000000000000000000000000000000000000000000000000000000000000'
    }
    setSignRequest({
      request: tx,
      callback: () => {
        setSuccessMessage('WalletLocator cleared successfully.')
        setErrorMessage('')
        setCurrentWalletLocator('')
        setWalletLocatorInput('')
        setAccountData((prev) => {
          if (prev && prev.ledgerInfo) {
            const updatedLedgerInfo = { ...prev.ledgerInfo }
            delete updatedLedgerInfo.walletLocator
            return { ...prev, ledgerInfo: updatedLedgerInfo }
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

    // Gate advanced flags behind Pro subscription
    if (flagDetails?.[flag]?.isAdvanced && !isPro) {
      setErrorMessage('Advanced options are available only to logged-in Bithomp Pro subscribers.')
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

    // Disable advanced flags for non-Pro users
    if (flagData?.isAdvanced && !isPro) {
      buttonDisabled = true
      if (!disabledReason) {
        disabledReason = 'Advanced options are available only to logged-in Bithomp Pro subscribers.'
      }
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
        <SEO title="Account Settings" description="Manage your account settings" />
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
        <SEO title="Account Settings" description="Manage your account settings." />
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

            {/* Account Fields */}
            <br />
            <h4>Account Fields</h4>
            <div>
              <div className="flag-item">
                <div className="flag-header">
                  <div className="flag-info">
                    <span className="flag-name">Domain</span>
                    {account?.address && (
                      <span className="flag-status">{currentDomain ? currentDomain : 'Not Set'}</span>
                    )}
                  </div>
                  <div className="flag-info-buttons">
                    {currentDomain && (
                      <button className="button-action thin" onClick={handleClearDomain} disabled={!account?.address}>
                        Clear
                      </button>
                    )}
                    <button className="button-action thin" onClick={handleSetDomain} disabled={!account?.address}>
                      Set
                    </button>
                  </div>
                </div>
                <div className="nft-minter-input">
                  <input
                    className="input-text"
                    placeholder="example.com"
                    value={domainInput}
                    onChange={(e) => setDomainInput(e.target.value)}
                    type="text"
                    disabled={!account?.address}
                  />
                  <small>Enter your domain. It will be stored on-ledger.</small>
                </div>
              </div>

              <div className="flag-item">
                <div className="flag-header">
                  <div className="flag-info">
                    <span className="flag-name">EmailHash</span>
                    {account?.address && (
                      <span className="flag-status">{currentEmailHash ? currentEmailHash : 'Not Set'}</span>
                    )}
                  </div>
                  <div className="flag-info-buttons">
                    {currentEmailHash && (
                      <button
                        className="button-action thin"
                        onClick={handleClearEmailHash}
                        disabled={!account?.address}
                      >
                        Clear
                      </button>
                    )}
                    <button className="button-action thin" onClick={handleSetEmailHash} disabled={!account?.address}>
                      Set
                    </button>
                  </div>
                </div>
                <div className="nft-minter-input">
                  <input
                    className="input-text"
                    placeholder="Email or 32 hex characters (MD5)"
                    value={emailHashInput}
                    onChange={(e) => setEmailHashInput(e.target.value)}
                    type="text"
                    disabled={!account?.address}
                  />
                  <small>Enter an email or a 32-character hex MD5. Leave empty and press Clear to remove.</small>
                </div>
              </div>

              <div className="flag-item">
                <div className="flag-header">
                  <div className="flag-info">
                    <span className="flag-name">MessageKey</span>
                    {account?.address && <span className="flag-status">{currentMessageKey ? 'Set' : 'Not Set'}</span>}
                  </div>
                  <div className="flag-info-buttons">
                    {currentMessageKey && (
                      <button
                        className="button-action thin"
                        onClick={handleClearMessageKey}
                        disabled={!account?.address}
                      >
                        Clear
                      </button>
                    )}
                    <button
                      className="button-action thin"
                      onClick={handleSetMessageKey}
                      disabled={!account?.address || (messageKeyInput && !messageKeyValidation.isValid)}
                    >
                      Set
                    </button>
                  </div>
                </div>
                <div className="nft-minter-input">
                  <input
                    className={`input-text ${
                      messageKeyInput && !messageKeyValidation.isValid
                        ? 'input-error'
                        : messageKeyInput && messageKeyValidation.isValid
                        ? 'input-valid'
                        : ''
                    }`}
                    placeholder="e.g., 020000000000000000000000000000000000000000000000000000000000000000"
                    value={messageKeyInput}
                    onChange={(e) => {
                      const value = e.target.value
                      setMessageKeyInput(value)
                      setMessageKeyValidation(validateMessageKey(value))
                    }}
                    type="text"
                    disabled={!account?.address}
                    maxLength={66}
                  />
                  <small>
                    Provide a hex-encoded public key (exactly 66 characters/33 bytes). First byte must be 0x02 or 0x03
                    for secp256k1 keys, or 0xED for Ed25519 keys. Used for encrypted messaging.
                  </small>
                  {messageKeyInput && messageKeyValidation.message && (
                    <div
                      className={`validation-message ${
                        messageKeyValidation.isValid ? 'validation-success' : 'validation-error'
                      }`}
                    >
                      {messageKeyValidation.message}
                    </div>
                  )}
                </div>
              </div>

              <div className="flag-item">
                <div className="flag-header" style={{marginBottom: '-20px'}}>
                  <div className="flag-info">
                    <span className="flag-name">RegularKey</span>
                    {account?.address && (
                      <span className="flag-status">{currentRegularKey ? currentRegularKey : 'Not Set'}</span>
                    )}
                  </div>
                  <div className="flag-info-buttons">
                    {currentRegularKey && (
                      <button
                        className="button-action thin"
                        onClick={handleClearRegularKey}
                        disabled={!account?.address}
                      >
                        Clear
                      </button>
                    )}
                    <button
                      className="button-action thin"
                      onClick={handleSetRegularKey}
                      disabled={!account?.address}
                    >
                      Set
                    </button>
                  </div>
                </div>
                <div className="nft-minter-input">
                  <AddressInput
                    title=''
                    placeholder="Enter RegularKey address"
                    setInnerValue={setRegularKeyInput}
                    rawData={currentRegularKey}
                    disabled={!account?.address}
                    hideButton={true}
                  />
                  <small>
                    Assign a regular key pair for signing. Must not equal your account address.
                  </small>
                </div>
                {errorMessage && <small className="error-text red">{errorMessage}</small>}
              </div>

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
                    {currentTransferRate && currentTransferRate > 0 && (
                      <button
                        className="button-action thin"
                        onClick={handleClearTransferRate}
                        disabled={!account?.address}
                      >
                        Clear
                      </button>
                    )}
                    <button className="button-action thin" onClick={handleSetTransferRate} disabled={!account?.address}>
                      Set
                    </button>
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
                    disabled={!account?.address}
                  />
                  <small>Percentage fee issuer charges on transfers of issued tokens.</small>
                </div>
              </div>

              <div className="flag-item">
                <div className="flag-header">
                  <div className="flag-info">
                    <span className="flag-name">TickSize</span>
                    {account?.address && (
                      <span className="flag-status">{currentTickSize ? currentTickSize : 'Not Set'}</span>
                    )}
                  </div>
                  <div className="flag-info-buttons">
                    <button
                      className="button-action thin"
                      onClick={handleSetTickSize}
                      disabled={!account?.address || (tickSizeInput && !tickSizeValidation.isValid)}
                    >
                      Set
                    </button>
                  </div>
                </div>
                <div className="nft-minter-input">
                  <input
                    className={`input-text ${
                      tickSizeInput && !tickSizeValidation.isValid
                        ? 'input-error'
                        : tickSizeInput && tickSizeValidation.isValid
                        ? 'input-valid'
                        : ''
                    }`}
                    placeholder="0 to clear, or 3-15"
                    value={tickSizeInput}
                    onChange={(e) => {
                      const value = e.target.value
                      setTickSizeInput(value)
                      setTickSizeValidation(validateTickSize(value))
                    }}
                    type="text"
                    inputMode="numeric"
                    disabled={!account?.address}
                  />
                  <small>Controls significant digits for order book prices. 0 clears.</small>
                  {tickSizeInput && tickSizeValidation.message && (
                    <div
                      className={`validation-message ${
                        tickSizeValidation.isValid ? 'validation-success' : 'validation-error'
                      }`}
                    >
                      {tickSizeValidation.message}
                    </div>
                  )}
                </div>
              </div>

              <div className="flag-item">
                <div className="flag-header">
                  <div className="flag-info">
                    <span className="flag-name">WalletLocator</span>
                    {account?.address && (
                      <span className="flag-status">{currentWalletLocator ? 'Set' : 'Not Set'}</span>
                    )}
                  </div>
                  <div className="flag-info-buttons">
                    {currentWalletLocator && (
                      <button
                        className="button-action thin"
                        onClick={handleClearWalletLocator}
                        disabled={!account?.address}
                      >
                        Clear
                      </button>
                    )}
                    <button
                      className="button-action thin"
                      onClick={handleSetWalletLocator}
                      disabled={!account?.address || (walletLocatorInput && !walletLocatorValidation.isValid)}
                    >
                      Set
                    </button>
                  </div>
                </div>
                <div className="nft-minter-input">
                  <input
                    className={`input-text ${
                      walletLocatorInput && !walletLocatorValidation.isValid
                        ? 'input-error'
                        : walletLocatorInput && walletLocatorValidation.isValid
                        ? 'input-valid'
                        : ''
                    }`}
                    placeholder="e.g., 0000000000000000000000000000000000000000000000000000000000000000"
                    value={walletLocatorInput}
                    onChange={(e) => {
                      const value = e.target.value
                      setWalletLocatorInput(value)
                      setWalletLocatorValidation(validateWalletLocator(value))
                    }}
                    type="text"
                    disabled={!account?.address}
                    maxLength={64}
                  />
                  <small>Optional 64-character hexadecimal hash locator for your wallet application.</small>
                  {walletLocatorInput && walletLocatorValidation.message && (
                    <div
                      className={`validation-message ${
                        walletLocatorValidation.isValid ? 'validation-success' : 'validation-error'
                      }`}
                    >
                      {walletLocatorValidation.message}
                    </div>
                  )}
                </div>
              </div>

              {/* NFTokenMinter Field */}
              {!xahauNetwork && (
                <div className="flag-item">
                  <div className="flag-header">
                    <div className="flag-info">
                      <span className="flag-name">NFTokenMinter</span>
                      {account?.address && (
                        <span className="flag-status">{currentNftTokenMinter ? currentNftTokenMinter : 'Not Set'}</span>
                      )}
                    </div>
                    <div className="flag-info-buttons">
                      {currentNftTokenMinter && (
                        <button
                          className="button-action thin"
                          onClick={handleClearNftTokenMinter}
                          disabled={!account?.address}
                        >
                          Clear
                        </button>
                      )}
                      <button
                        className="button-action thin"
                        onClick={handleSetNftTokenMinter}
                        disabled={!account?.address || !nftTokenMinter.trim()}
                      >
                        Set
                      </button>
                    </div>
                  </div>
                  <div className="nft-minter-input">
                    <AddressInput
                      title="Update to a new NFTokenMinter"
                      placeholder="Enter NFTokenMinter address"
                      setInnerValue={setNftTokenMinter}
                      disabled={!account?.address}
                      hideButton={true}
                      type="address"
                    />
                    <small>Enter the address that will be authorized to mint NFTokens for this account</small>
                  </div>
                  {currentNftTokenMinter && (
                    <small>To change the authorized minter, first clear the current one, then set a new one.</small>
                  )}
                </div>
              )}
            </div>

            {/* Advanced options */}
            <div className="advanced-options">
              <CheckBox checked={showAdvanced} setChecked={() => setShowAdvanced(!showAdvanced)} name="advanced-flags">
                Advanced options (Use with caution)
                {!sessionToken ? (
                  <>
                    {' '}
                    <span className="orange">
                      (available to{' '}
                      <span className="link" onClick={() => openEmailLogin()}>
                        logged-in
                      </span>{' '}
                      Bithomp Pro subscribers)
                    </span>
                  </>
                ) : (
                  subscriptionExpired && (
                    <>
                      {' '}
                      <span className="orange">
                        Your Bithomp Pro subscription has expired.{' '}
                        <Link href="/admin/subscriptions">Renew your subscription</Link>
                      </span>
                    </>
                  )
                )}
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

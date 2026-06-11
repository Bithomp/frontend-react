import { useState, useEffect, useRef } from 'react'
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
import SEO from '../../components/SEO'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { getIsSsrMobile } from '../../utils/mobile'
import { setupServicesTxSuccessFlashListener } from '../../utils/servicesTxFlash'
import AddressInput from '../../components/UI/AddressInput'
import { IoToggleOutline, IoDocumentTextOutline, IoPersonOutline } from 'react-icons/io5'
import { FaWallet } from 'react-icons/fa6'
import { accountSettings } from '../../styles/pages/account-settings.module.scss'
import ServicesTabs from '../../components/Tabs/ServicesTabs'
import AccountContextChip from '../../components/Services/AccountContextChip'

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
  requireDestTag: 1,
  requireAuth: 2,
  disallowXRP: 3,
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
  defaultRipple: 8,
  depositAuth: 9,
  disableMaster: 4,
  allowTrustLineLocking: 17
}

export default function AccountSettings({ account, setSignRequest, sessionToken, subscriptionExpired }) {
  const { t } = useTranslation(['common', 'services'])
  const ts = (key, options) => t(key, { ns: 'services', ...options })
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [accountData, setAccountData] = useState(null)
  const [flags, setFlags] = useState(null)
  const [nftTokenMinter, setNftTokenMinter] = useState('')
  const [currentNftTokenMinter, setCurrentNftTokenMinter] = useState('')
  const [domainInput, setDomainInput] = useState('')
  const [currentDomain, setCurrentDomain] = useState('')
  const [emailHashInput, setEmailHashInput] = useState('')
  const [currentEmailHash, setCurrentEmailHash] = useState('')
  const [messageKeyInput, setMessageKeyInput] = useState('')
  const [currentMessageKey, setCurrentMessageKey] = useState('')
  const [tickSizeInput, setTickSizeInput] = useState('')
  const [currentTickSize, setCurrentTickSize] = useState(null)
  const [walletLocatorInput, setWalletLocatorInput] = useState('')
  const [currentWalletLocator, setCurrentWalletLocator] = useState('')
  const previousAccountAddressRef = useRef(account?.address || '')

  useEffect(() => {
    return setupServicesTxSuccessFlashListener({
      setSuccessMessage,
      setErrorMessage
    })
  }, [])

  useEffect(() => {
    const currentAddress = account?.address || ''

    if (previousAccountAddressRef.current !== currentAddress) {
      setErrorMessage('')
      setSuccessMessage('')
    }

    previousAccountAddressRef.current = currentAddress
  }, [account?.address])

  // Validation states
  const [messageKeyValidation, setMessageKeyValidation] = useState({ isValid: true, message: '' })
  const [walletLocatorValidation, setWalletLocatorValidation] = useState({ isValid: true, message: '' })
  const [tickSizeValidation, setTickSizeValidation] = useState({ isValid: true, message: '' })

  const validateInput = (value, options = {}) => {
    const { allowEmpty = true, evenLength = true, minChars, exactChars, successMessage = ts('account-settings.validInput') } = options

    const trimmed = value.trim()

    if (!trimmed) {
      return { isValid: allowEmpty, message: '' }
    }

    if (!isHexString(trimmed.toUpperCase())) {
      return {
        isValid: false,
        message: ts('account-settings.hexOnly')
      }
    }

    if (evenLength && trimmed.length % 2 !== 0) {
      return {
        isValid: false,
        message: ts('account-settings.evenHex')
      }
    }

    if (typeof exactChars === 'number') {
      if (trimmed.length !== exactChars) {
        return {
          isValid: false,
          message: ts('account-settings.exactChars', { count: exactChars, current: trimmed.length })
        }
      }
    } else if (typeof minChars === 'number') {
      if (trimmed.length < minChars) {
        return {
          isValid: false,
          message: ts('account-settings.minChars', { count: minChars, bytes: minChars / 2 })
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
        message: ts('account-settings.firstByte', { byte: firstByte })
      }
    }
    return validateInput(value, {
      allowEmpty: true,
      evenLength: true,
      exactChars: 66,
      successMessage: ts('account-settings.valid66')
    })
  }

  const validateWalletLocator = (value) => {
    return validateInput(value, {
      allowEmpty: true,
      evenLength: true,
      exactChars: 64,
      successMessage: ts('account-settings.valid64')
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
        message: ts('account-settings.validNumber')
      }
    }

    if (!Number.isInteger(numValue)) {
      return {
        isValid: false,
        message: ts('account-settings.wholeNumber')
      }
    }

    if (numValue < 0) {
      return {
        isValid: false,
        message: ts('account-settings.positive')
      }
    }

    if (numValue === 0) {
      return { isValid: true, message: ts('account-settings.clearTick') }
    }

    if (numValue < 3 || numValue > 15) {
      return {
        isValid: false,
        message: ts('account-settings.tickRange')
      }
    }

    return { isValid: true, message: ts('account-settings.validTick') }
  }

  // Track which flag descriptions are expanded (for Read more functionality)
  const [expandedFlags, setExpandedFlags] = useState({})

  // Determine which ASF flags to use based on network
  const getAvailableAsfFlags = () => {
    const commonFlags = [
      'requireDestTag',
      'disallowXRP',
      'disallowIncomingCheck',
      'disallowIncomingPayChan',
      'disallowIncomingTrustline',
      'depositAuth'
    ]

    if (xahauNetwork) {
      return {
        basic: [...commonFlags, 'disallowIncomingRemit', 'tshCollect']
      }
    } else {
      return {
        basic: [...commonFlags, 'disallowIncomingNFTokenOffer']
      }
    }
  }

  const flagGroups = getAvailableAsfFlags()
  const isPro = sessionToken && !subscriptionExpired

  // Flag display names and descriptions
  const flagDetails = {
    // TF Flags
    requireDestTag: {
      name: ts('account-settings.flagsObj.requireDestTag.name'),
      status: (value) => (value ? ts('account-settings.required') : ts('account-settings.notRequired')),
      actionText: (value) => (value ? ts('account-settings.dontRequire') : ts('account-settings.require')),
      description: ts('account-settings.flagsObj.requireDestTag.description'),
      isDefault: (value) => !value
    },
    requireAuth: {
      name: ts('account-settings.flagsObj.requireAuth.name'),
      status: (value) => (value ? ts('account-settings.required') : ts('account-settings.notRequired')),
      actionText: (value) => (value ? ts('account-settings.dontRequire') : ts('account-settings.require')),
      description: ts('account-settings.flagsObj.requireAuth.description'),
      isDefault: (value) => !value
    },
    disallowXRP: {
      name: ts('account-settings.flagsObj.disallowXRP.name', { nativeCurrency }),
      status: (value) =>
        value
          ? ts('account-settings.flagsObj.disallowXRP.statusBlocked')
          : ts('account-settings.flagsObj.disallowXRP.statusAllowed'),
      actionText: (value) => (value ? ts('account-settings.allow') : ts('account-settings.disallow')),
      description: ts('account-settings.flagsObj.disallowXRP.description', { nativeCurrency }),
      isDefault: (value) => !value
    },
    // ASF Flags - Basic
    disallowIncomingCheck: {
      name: ts('account-settings.flagsObj.disallowIncomingCheck.name'),
      status: (value) => (value ? ts('account-settings.disallowed') : ts('account-settings.allowed')),
      actionText: (value) => (value ? ts('account-settings.allow') : ts('account-settings.disallow')),
      description: ts('account-settings.flagsObj.disallowIncomingCheck.description'),
      isDefault: (value) => !value
    },
    disallowIncomingPayChan: {
      name: ts('account-settings.flagsObj.disallowIncomingPayChan.name'),
      status: (value) => (value ? ts('account-settings.disallowed') : ts('account-settings.allowed')),
      actionText: (value) => (value ? ts('account-settings.allow') : ts('account-settings.disallow')),
      description: ts('account-settings.flagsObj.disallowIncomingPayChan.description'),
      isDefault: (value) => !value
    },
    disallowIncomingTrustline: {
      name: ts('account-settings.flagsObj.disallowIncomingTrustline.name'),
      status: (value) => (value ? ts('account-settings.disallowed') : ts('account-settings.allowed')),
      actionText: (value) => (value ? ts('account-settings.allow') : ts('account-settings.disallow')),
      description: ts('account-settings.flagsObj.disallowIncomingTrustline.description'),
      isDefault: (value) => !value
    },
    depositAuth: {
      name: ts('account-settings.flagsObj.depositAuth.name'),
      status: (value) => (value ? ts('account-settings.enabled') : ts('account-settings.disabled')),
      actionText: (value) => (value ? ts('account-settings.disable') : ts('account-settings.enable')),
      description: ts('account-settings.flagsObj.depositAuth.description'),
      isDefault: (value) => !value
    },
    disallowIncomingNFTokenOffer: {
      name: ts('account-settings.flagsObj.disallowIncomingNFTokenOffer.name'),
      status: (value) => (value ? ts('account-settings.disallowed') : ts('account-settings.allowed')),
      actionText: (value) => (value ? ts('account-settings.allow') : ts('account-settings.disallow')),
      description: ts('account-settings.flagsObj.disallowIncomingNFTokenOffer.description'),
      isDefault: (value) => !value
    },
    disallowIncomingRemit: {
      name: ts('account-settings.flagsObj.disallowIncomingRemit.name'),
      status: (value) => (value ? ts('account-settings.disallowed') : ts('account-settings.allowed')),
      actionText: (value) => (value ? ts('account-settings.allow') : ts('account-settings.disallow')),
      description: ts('account-settings.flagsObj.disallowIncomingRemit.description'),
      isDefault: (value) => !value
    },
    tshCollect: {
      name: ts('account-settings.flagsObj.tshCollect.name'),
      status: (value) => (value ? ts('account-settings.enabled') : ts('account-settings.disabled')),
      actionText: (value) => (value ? ts('account-settings.disable') : ts('account-settings.enable')),
      description: ts('account-settings.flagsObj.tshCollect.description'),
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
      //isAdvanced: true,
      isPermanent: true
    },

    //Advanced
    defaultRipple: {
      name: ts('account-settings.flagsObj.defaultRipple.name'),
      status: (value) => (value ? ts('account-settings.enabled') : ts('account-settings.disabled')),
      actionText: (value) => (value ? ts('account-settings.disable') : ts('account-settings.enable')),
      description: ts('account-settings.flagsObj.defaultRipple.description'),
      isDefault: (value) => !value, // Rippling DISABLED is the default state (orange highlight when enabled)
      isAdvanced: true
    },
    disableMaster: {
      name: ts('account-settings.flagsObj.disableMaster.name'),
      status: (value) => (value ? ts('account-settings.disabled') : ts('account-settings.enabled')),
      actionText: (value) => (value ? ts('account-settings.enable') : ts('account-settings.disable')),
      description: ts('account-settings.flagsObj.disableMaster.description', { explorerName }),
      isDefault: (value) => !value,
      isAdvanced: true,
      isHighRisk: true
    },
    globalFreeze: {
      name: ts('account-settings.flagsObj.globalFreeze.name'),
      status: (value) => (value ? ts('account-settings.enabled') : ts('account-settings.disabled')),
      actionText: (value) => (value ? ts('account-settings.disable') : ts('account-settings.enable')),
      description: ts('account-settings.flagsObj.globalFreeze.description'),
      isDefault: (value) => !value,
      isAdvanced: true
    },
    noFreeze: {
      name: ts('account-settings.flagsObj.noFreeze.name'),
      status: (value) => (value ? ts('account-settings.enabled') : ts('account-settings.disabled')),
      actionText: (value) => (value ? '' : ts('account-settings.enable')),
      description: ts('account-settings.flagsObj.noFreeze.description'),
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

        const allFlags = [...flagGroups.basic]
        const ledgerFlags = response.data?.ledgerInfo?.flags || {}

        const newFlags = {}
        allFlags.forEach((k) => {
          newFlags[k] = !!ledgerFlags[k]
        })
        setFlags(newFlags)
        setLoading(false)
      } catch (error) {
        setErrorMessage(ts('account-settings.errFetch'))
        setLoading(false)
      }
    }

    if (account?.address) {
      fetchAccountData()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [account])

  const handleSetNftTokenMinter = () => {
    if (!isAddressValid(nftTokenMinter.trim())) {
      setErrorMessage(ts('account-settings.errNft'))
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
        setSuccessMessage(ts('account-settings.successNftSet'))
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
        setSuccessMessage(ts('account-settings.successNftClear'))
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
        setSuccessMessage(ts('account-settings.successDomainSet'))
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
        setSuccessMessage(ts('account-settings.successDomainClear'))
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
      setErrorMessage(ts('account-settings.errEmailEmpty'))
      return
    }
    if (/^[0-9a-fA-F]{32}$/.test(input)) {
      valueHex = input
    } else if (isEmailValid(input)) {
      valueHex = md5(input)
    } else {
      setErrorMessage(ts('account-settings.errEmail'))
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
        setSuccessMessage(ts('account-settings.successEmailSet'))
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
        setSuccessMessage(ts('account-settings.successEmailClear'))
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
      setErrorMessage(ts('account-settings.errMessageKeyEmpty'))
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
        setSuccessMessage(ts('account-settings.successMessageKeySet'))
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
        setSuccessMessage(ts('account-settings.successMessageKeyClear'))
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

  const handleSetTickSize = () => {
    const value = Number(tickSizeInput)
    if (isNaN(value) || !(value === 0 || (value >= 3 && value <= 15))) {
      setErrorMessage(ts('account-settings.errTick'))
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
        setSuccessMessage(ts('account-settings.successTick'))
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
      setErrorMessage(ts('account-settings.errWalletEmpty'))
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
        setSuccessMessage(ts('account-settings.successWalletSet'))
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
        setSuccessMessage(ts('account-settings.successWalletClear'))
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

  const handleFlagToggle = (flag) => {
    if (!account?.address) {
      setErrorMessage(ts('account-settings.errSignIn'))
      return
    }

    if (!accountData?.ledgerInfo) {
      setErrorMessage(ts('account-settings.errFetch'))
      return
    }

    if (flagDetails?.[flag]?.isAdvanced && !isPro) {
      setErrorMessage(ts('account-settings.errPro'))
      return
    }

    const currentValue = !!flags?.[flag]
    const newValue = !currentValue

    const flagNum = ASF_FLAGS[flag]
    if (typeof flagNum !== 'number') {
      setErrorMessage(ts('account-settings.errUnknownFlag', { flag }))
      return
    }

    // Guardrails (keep your existing rules)
    if (
      (flag === 'allowTrustLineClawback' || flag === 'requireAuth') &&
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
        setSuccessMessage(ts('account-settings.successSettings'))
        setErrorMessage('')

        setFlags((prev) => ({ ...(prev || {}), [flag]: newValue }))

        setAccountData((prev) => {
          if (!prev?.ledgerInfo) return prev
          return {
            ...prev,
            ledgerInfo: {
              ...prev.ledgerInfo,
              flags: {
                ...(prev.ledgerInfo.flags || {}),
                [flag]: newValue
              }
            }
          }
        })
      }
    })
  }

  const withTooltip = (tooltipText, child) => {
    if (!tooltipText) return child
    return (
      <span className="tooltip">
        {child}
        <span className="tooltiptext left">{tooltipText}</span>
      </span>
    )
  }

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

    if (
      (flag === 'allowTrustLineClawback' || flag === 'requireAuth') &&
      accountData?.ledgerInfo?.ownerCount &&
      !currentValue
    ) {
      buttonDisabled = true
      disabledReason = ts('account-settings.errOwnerDir')
    }

    if (flag === 'globalFreeze' && flags?.noFreeze) {
      buttonDisabled = true
      disabledReason = ts('account-settings.errGlobalFreeze')
    }

    if (flagData?.isAdvanced && !isPro) {
      buttonDisabled = true
      if (!disabledReason) disabledReason = ts('account-settings.errPro')
    }

    const showButton = !(flagData?.isPermanent && currentValue)

    const buttonTooltip = !account?.address
      ? ts('account-settings.signInManage')
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
              <span className={`flag-status-text ${isNonDefault ? 'non-default' : ''}`}>
                {flagData.status(currentValue)}
              </span>
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
            <span className="permanent-flag">{ts('account-settings.permanent')}</span>
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
              {isExpanded ? ts('account-settings.readLess') : ts('account-settings.readMore')}
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
        <SEO title={ts('account-settings.title')} description={ts('account-settings.description')} />
        <div className="content-center">
          <ServicesTabs category="account" tab="account-settings" />
          <h1 className="center">{ts('account-settings.title')}</h1>
          <AccountContextChip account={account} />
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
        <SEO title={ts('account-settings.title')} description={ts('account-settings.description')} />
        <div className="content-center">
          <ServicesTabs category="account" tab="account-settings" />
          <h1 className="center">{ts('account-settings.title')}</h1>
          <AccountContextChip account={account} />
          <p className="center">
            {account?.address ? (
              ts('account-settings.signedIn', { explorerName })
            ) : (
              ts('account-settings.signedOut')
            )}
          </p>

          {!account?.address && (
            <div className="center" style={{ marginTop: '0.6rem' }}>
              <button className="button-action" onClick={() => setSignRequest({})}>
                <FaWallet style={{ fontSize: 14, marginRight: 6 }} />
                {ts('account-settings.connect')}
              </button>
            </div>
          )}

          {/* Feedback messages (placed high for mobile visibility) */}
          {errorMessage && <p className="red center">{errorMessage}</p>}
          {successMessage && <p className="green center">{successMessage}</p>}

          {/* Account Flags Section */}
          <div>
            <div className="section-header">
              <span className="section-icon">
                <IoToggleOutline size={15} />
              </span>
              <span className="section-title">{ts('account-settings.flags')}</span>
            </div>

            {flagGroups.basic.map((flag) => renderFlagItem(flag))}

            {/* Account Fields */}
            <div className="section-header" style={{ marginTop: '1.25rem' }}>
              <span className="section-icon">
                <IoDocumentTextOutline size={15} />
              </span>
              <span className="section-title">{ts('account-settings.fields')}</span>
            </div>
            <div>
              <div className="flag-item">
                <div className="flag-header">
                  <div className="flag-info">
                    <span className="flag-name">Domain</span>
                    {account?.address && (
                      <span className="flag-status">{currentDomain ? currentDomain : ts('account-settings.notSet')}</span>
                    )}
                  </div>
                  <div className="flag-info-buttons">
                    {currentDomain &&
                      withTooltip(
                        !account?.address ? ts('account-settings.signInManage') : '',
                        <button className="button-action thin" onClick={handleClearDomain} disabled={!account?.address}>
                          {ts('account-settings.clear')}
                        </button>
                      )}
                    {withTooltip(
                      !account?.address ? ts('account-settings.signInManage') : '',
                      <button className="button-action thin" onClick={handleSetDomain} disabled={!account?.address}>
                        {ts('account-settings.set')}
                      </button>
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
                    disabled={!account?.address}
                  />
                  <small>{ts('account-settings.domainHelp')}</small>
                </div>
              </div>

              <div className="flag-item">
                <div className="flag-header">
                  <div className="flag-info">
                    <span className="flag-name">EmailHash</span>
                    {account?.address && (
                      <span className="flag-status">
                        {currentEmailHash ? currentEmailHash : ts('account-settings.notSet')}
                      </span>
                    )}
                  </div>
                  <div className="flag-info-buttons">
                    {currentEmailHash &&
                      withTooltip(
                        !account?.address ? ts('account-settings.signInManage') : '',
                        <button
                          className="button-action thin"
                          onClick={handleClearEmailHash}
                          disabled={!account?.address}
                        >
                          {ts('account-settings.clear')}
                        </button>
                      )}
                    {withTooltip(
                      !account?.address ? ts('account-settings.signInManage') : '',
                      <button className="button-action thin" onClick={handleSetEmailHash} disabled={!account?.address}>
                        {ts('account-settings.set')}
                      </button>
                    )}
                  </div>
                </div>
                <div className="nft-minter-input">
                  <input
                    className="input-text"
                    placeholder={ts('account-settings.emailPlaceholder')}
                    value={emailHashInput}
                    onChange={(e) => setEmailHashInput(e.target.value)}
                    type="text"
                    disabled={!account?.address}
                  />
                  <small>{ts('account-settings.emailHelp')}</small>
                </div>
              </div>

              <div className="flag-item">
                <div className="flag-header">
                  <div className="flag-info">
                    <span className="flag-name">MessageKey</span>
                    {account?.address && (
                      <span className="flag-status">
                        {currentMessageKey ? ts('account-settings.setStatus') : ts('account-settings.notSet')}
                      </span>
                    )}
                  </div>
                  <div className="flag-info-buttons">
                    {currentMessageKey &&
                      withTooltip(
                        !account?.address ? ts('account-settings.signInManage') : '',
                        <button
                          className="button-action thin"
                          onClick={handleClearMessageKey}
                          disabled={!account?.address}
                        >
                          {ts('account-settings.clear')}
                        </button>
                      )}
                    {withTooltip(
                      !account?.address
                        ? ts('account-settings.signInManage')
                        : messageKeyInput && !messageKeyValidation.isValid
                          ? messageKeyValidation.message
                          : '',
                      <button
                        className="button-action thin"
                        onClick={handleSetMessageKey}
                        disabled={!account?.address || (messageKeyInput && !messageKeyValidation.isValid)}
                      >
                        {ts('account-settings.set')}
                      </button>
                    )}
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
                  <small>{ts('account-settings.messageKeyHelp')}</small>
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
                <div className="flag-header">
                  <div className="flag-info">
                    <span className="flag-name">TickSize</span>
                    {account?.address && (
                      <span className="flag-status">{currentTickSize ? currentTickSize : ts('account-settings.notSet')}</span>
                    )}
                  </div>
                  <div className="flag-info-buttons">
                    {withTooltip(
                      !account?.address
                        ? ts('account-settings.signInManage')
                        : tickSizeInput && !tickSizeValidation.isValid
                          ? tickSizeValidation.message
                          : '',
                      <button
                        className="button-action thin"
                        onClick={handleSetTickSize}
                        disabled={!account?.address || (tickSizeInput && !tickSizeValidation.isValid)}
                      >
                        {ts('account-settings.set')}
                      </button>
                    )}
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
                    placeholder={ts('account-settings.tickPlaceholder')}
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
                  <small>{ts('account-settings.tickHelp')}</small>
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
                      <span className="flag-status">
                        {currentWalletLocator ? ts('account-settings.setStatus') : ts('account-settings.notSet')}
                      </span>
                    )}
                  </div>
                  <div className="flag-info-buttons">
                    {currentWalletLocator &&
                      withTooltip(
                        !account?.address ? ts('account-settings.signInManage') : '',
                        <button
                          className="button-action thin"
                          onClick={handleClearWalletLocator}
                          disabled={!account?.address}
                        >
                          {ts('account-settings.clear')}
                        </button>
                      )}
                    {withTooltip(
                      !account?.address
                        ? ts('account-settings.signInManage')
                        : walletLocatorInput && !walletLocatorValidation.isValid
                          ? walletLocatorValidation.message
                          : '',
                      <button
                        className="button-action thin"
                        onClick={handleSetWalletLocator}
                        disabled={!account?.address || (walletLocatorInput && !walletLocatorValidation.isValid)}
                      >
                        {ts('account-settings.set')}
                      </button>
                    )}
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
                  <small>{ts('account-settings.walletHelp')}</small>
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
                        <span className="flag-status">
                          {currentNftTokenMinter ? currentNftTokenMinter : ts('account-settings.notSet')}
                        </span>
                      )}
                    </div>
                    <div className="flag-info-buttons">
                      {currentNftTokenMinter &&
                        withTooltip(
                          !account?.address ? ts('account-settings.signInManage') : '',
                          <button
                            className="button-action thin"
                            onClick={handleClearNftTokenMinter}
                            disabled={!account?.address}
                          >
                            {ts('account-settings.clear')}
                          </button>
                        )}
                      {withTooltip(
                        !account?.address
                          ? ts('account-settings.signInManage')
                          : !nftTokenMinter.trim()
                            ? ts('account-settings.enterNftFirst')
                            : '',
                        <button
                          className="button-action thin"
                          onClick={handleSetNftTokenMinter}
                          disabled={!account?.address || !nftTokenMinter.trim()}
                        >
                          {ts('account-settings.set')}
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="nft-minter-input">
                    <AddressInput
                      title={ts('account-settings.nftTitle')}
                      placeholder={ts('account-settings.nftPlaceholder')}
                      setInnerValue={setNftTokenMinter}
                      disabled={!account?.address}
                      hideButton={true}
                      type="address"
                    />
                    <small>{ts('account-settings.nftHelp')}</small>
                  </div>
                  {currentNftTokenMinter && (
                    <small>{ts('account-settings.nftChangeHelp')}</small>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="center" style={{ marginTop: '1.5rem', marginBottom: '0.5rem' }}>
            {account?.address ? (
              <Link href={`/account/${account.address}`} className="button-action">
                <IoPersonOutline style={{ fontSize: 15, marginRight: 6 }} />
                {ts('account-settings.view')}
              </Link>
            ) : (
              <button className="button-action" onClick={() => setSignRequest({})}>
                <IoPersonOutline style={{ fontSize: 15, marginRight: 6 }} />
                {ts('account-settings.signIn')}
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useTranslation } from 'next-i18next'
import axios from 'axios'
import { xahauNetwork } from '../utils'
import CheckBox from '../components/UI/CheckBox'
import SEO from '../components/SEO'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { getIsSsrMobile } from '../utils/mobile'
import { IoChevronForward, IoArrowBack } from 'react-icons/io5'

export const getServerSideProps = async (context) => {
  const { locale } = context
  return {
    props: {
      isSsrMobile: getIsSsrMobile(context),
      ...(await serverSideTranslations(locale, ['common', 'account-settings']))
    }
  }
}

// XRPL AccountSet flag values mapping
const ACCOUNT_FLAGS = {
  requireDestTag: 1,
  disallowXRP: 3,
  disallowIncomingCheck: 13,
  disallowIncomingNFTokenOffer: 12,
  disallowIncomingPayChan: 14,
  disallowIncomingTrustline: 15,
  xahauSpecificFlag: 99 // <-- placeholder value, replace with real one if known
}

export default function AccountSettings({ account, setSignRequest }) {
  const { t } = useTranslation(['account-settings', 'common'])
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [accountData, setAccountData] = useState(null)
  const [flags, setFlags] = useState({
    requireDestTag: false,
    disallowXRP: false,
    disallowIncomingCheck: false,
    disallowIncomingNFTokenOffer: false,
    disallowIncomingPayChan: false,
    disallowIncomingTrustline: false,
    xahauSpecificFlag: false
  })
  const [selectedFlag, setSelectedFlag] = useState(null)
  const [editedFlag, setEditedFlag] = useState(null)

  // Determine which flags to use based on network
  const flagKeys = xahauNetwork
    ? [
        'requireDestTag',
        'disallowXRP',
        'disallowIncomingCheck',
        'disallowIncomingPayChan',
        'disallowIncomingTrustline',
        'xahauSpecificFlag'
      ]
    : [
        'requireDestTag',
        'disallowXRP',
        'disallowIncomingCheck',
        'disallowIncomingNFTokenOffer',
        'disallowIncomingPayChan',
        'disallowIncomingTrustline'
      ]

  // Flag display names and descriptions
  const flagDetails = {
    requireDestTag: {
      name: 'Require Destination Tag',
      displayName: 'Require Destination Tag',
      status: (value) => (value ? 'Yes' : 'No')
    },
    disallowXRP: {
      name: 'Disallow XRP',
      displayName: 'Allow Incoming XRP',
      status: (value) => (value ? 'Blocked' : 'Allowed')
    },
    disallowIncomingCheck: {
      name: 'Disallow Incoming Checks',
      displayName: 'Allow Incoming Checks',
      status: (value) => (value ? 'Blocked' : 'Allowed')
    },
    disallowIncomingNFTokenOffer: {
      name: 'Disallow Incoming NFT Offers',
      displayName: 'Allow Incoming NFT Offers',
      status: (value) => (value ? 'Blocked' : 'Allowed')
    },
    disallowIncomingPayChan: {
      name: 'Disallow Incoming Payment Channels',
      displayName: 'Allow Incoming PayChan',
      status: (value) => (value ? 'Blocked' : 'Allowed')
    },
    disallowIncomingTrustline: {
      name: 'Disallow Incoming Trust Lines',
      displayName: 'Allow Incoming Trustline',
      status: (value) => (value ? 'Blocked' : 'Allowed')
    },
    xahauSpecificFlag: {
      name: 'Xahau Specific Permission',
      displayName: 'Xahau Specific Permission',
      status: (value) => (value ? 'Enabled' : 'Disabled')
    }
  }

  useEffect(() => {
    if (!account?.address) {
      setLoading(false)
      return
    }
    const fetchAccountData = async () => {
      try {
        const response = await axios(`/v2/address/${account.address}?ledgerInfo=true`)
        setAccountData(response.data)
        if (response.data?.ledgerInfo?.flags) {
          const ledgerFlags = response.data.ledgerInfo.flags
          const newFlags = {}
          flagKeys.forEach((flag) => {
            newFlags[flag] = !!ledgerFlags[flag]
          })
          setFlags(newFlags)
        }
        setLoading(false)
      } catch (error) {
        setErrorMessage(t('error.fetch'))
        setLoading(false)
      }
    }
    fetchAccountData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [account, xahauNetwork])

  const handleFlagChange = (flag) => {
    if (selectedFlag === flag) {
      setSelectedFlag(null)
    } else {
      setSelectedFlag(flag)
      setEditedFlag(flags[flag])
      setErrorMessage('')
      setSuccessMessage('')
    }
  }

  const toggleFlag = () => {
    if (selectedFlag) {
      setEditedFlag(!editedFlag)
    }
  }

  const saveFlag = () => {
    if (!account?.address) {
      setErrorMessage(t('error.not-signed-in'))
      return
    }

    if (!accountData?.ledgerInfo?.flags) {
      setErrorMessage(t('error.fetch'))
      return
    }

    const currentFlags = accountData.ledgerInfo.flags

    // Check if the flag value has actually changed
    if (currentFlags[selectedFlag] === editedFlag) {
      setErrorMessage('No changes to save.')
      return
    }

    const tx = {
      TransactionType: 'AccountSet',
      Account: account.address
    }

    if (editedFlag) {
      tx.SetFlag = ACCOUNT_FLAGS[selectedFlag]
    } else {
      tx.ClearFlag = ACCOUNT_FLAGS[selectedFlag]
    }

    // Create a transactions array with just one transaction
    const transactions = [tx]

    // Use the exact format as specified
    setSignRequest({
      request: transactions[0],
      callback: () => {
        setSuccessMessage('Settings updated successfully.')
      }
    })

    // Update the flags state with the new value
    setFlags((prev) => ({
      ...prev,
      [selectedFlag]: editedFlag
    }))

    // Update accountData to reflect the new flag state
    setAccountData((prev) => {
      if (prev && prev.ledgerInfo && prev.ledgerInfo.flags) {
        return {
          ...prev,
          ledgerInfo: {
            ...prev.ledgerInfo,
            flags: {
              ...prev.ledgerInfo.flags,
              [selectedFlag]: editedFlag
            }
          }
        }
      }
      return prev
    })

    // Close the detail view
    setSelectedFlag(null)
  }

  const cancelEdit = () => {
    setSelectedFlag(null)
    setErrorMessage('')
    setSuccessMessage('')
  }

  if (loading) {
    return (
      <>
        <SEO title={t('title')} />
        <div className="content-center">
          <h1 className="center">{t('title')}</h1>
          <div className="center" style={{ marginTop: '80px' }}>
            <span className="waiting"></span>
            <br />
            {t('loading')}
          </div>
        </div>
      </>
    )
  }

  if (!account?.address) {
    return (
      <>
        <SEO title={t('title')} />
        <div className="content-center">
          <h1 className="center">{t('title')}</h1>
          <p className="center">{t('error.not-signed-in')}</p>
        </div>
      </>
    )
  }

  // Render flag detail view when a flag is selected
  if (selectedFlag) {
    const flag = selectedFlag
    const detail = flagDetails[flag]

    return (
      <>
        <SEO title={detail.name} />
        <div className="content-center account-settings">
          <div className="back-button-container">
            <button
              className="back-button"
              onClick={cancelEdit}              
            >
              <IoArrowBack size={20} className="icon-color"/>
              <span style={{ marginLeft: '5px' }}>Back</span>
            </button>
          </div>

          <h1 className="center">{detail.name}</h1>
          <div className="flag-toggle-container">
            <div className="flag-toggle-item">
              <label className="flag-toggle-label">
                {flag === 'requireDestTag' ? 'Enforce destination tag' : detail.displayName}
              </label>
              <CheckBox
                checked={editedFlag}
                setChecked={toggleFlag}
                name={`toggle-${flag}`}
                style={{
                  marginTop: '-16px'
                }}
              />
            </div>

            <button
              className="button-action"
              onClick={saveFlag}              
            >
              Save
            </button>
          </div>

          {errorMessage && (
            <p className="red center">
              {errorMessage}
            </p>
          )}
          {successMessage && (            
            <p className="green center">
              {successMessage}
            </p>
          )}
        </div>
      </>
    )
  }

  return (
    <>
      <SEO title={t('title')} />
      <div className="content-center account-settings">
        <h1 className="center">Account Settings</h1>
        <p className="center">Manage your account settings on the XRP Ledger.</p>
        <div>
          {flagKeys.map((flag) => (
            <div
              key={flag}
              className="permission-item"
              onClick={() => handleFlagChange(flag)}      
            >
              <div>
                <div className="permission-item-title">{flagDetails[flag].displayName}</div>
                <div className="permission-item-status">
                  {flagDetails[flag].status(flags[flag])}
                </div>
              </div>
              <IoChevronForward size={20} className="icon-color" />
            </div>
          ))}
          {errorMessage && (
            <p className="red center">
              {errorMessage}
            </p>
          )}
          {successMessage && (
            <p className="green center">
              {successMessage}
            </p>
          )}
          <br />
          <div className="center">
            <Link href={`/account/${account.address}`}>Back to my account</Link>
          </div>
        </div>
      </div>
    </>
  )
}

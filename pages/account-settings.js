import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useTranslation } from 'next-i18next'
import axios from 'axios'
import { xahauNetwork, explorerName } from '../utils'
import SEO from '../components/SEO'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { getIsSsrMobile } from '../utils/mobile'

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
  asfDisableMaster: 4,
}

// TF flags (can be combined in one transaction)
const TF_FLAGS = {
  requireDestTag: { set: 0x00010000, clear: 0x00020000 }, // tfRequireDestTag / tfOptionalDestTag
  requireAuth: { set: 0x00040000, clear: 0x00080000 }, // tfRequireAuth / tfOptionalAuth
  disallowXRP: { set: 0x00100000, clear: 0x00200000 }, // tfDisallowXRP / tfAllowXRP
}

export default function AccountSettings({ account, setSignRequest }) {
  const { t } = useTranslation(['common'])
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [accountData, setAccountData] = useState(null)
  const [flags, setFlags] = useState(null)

  // TF flags state
  const [tfFlags, setTfFlags] = useState(null)

  // Determine which ASF flags to use based on network
  const getAvailableAsfFlags = () => {
    const commonAsfFlags = [
      'disallowIncomingCheck',
      'disallowIncomingPayChan',
      'disallowIncomingTrustline',
      'asfDefaultRipple',
      'asfDepositAuth',
      'asfDisableMaster',
      'globalFreeze',
      'noFreeze',
    ]

    if (xahauNetwork) {
      return [...commonAsfFlags, 'disallowIncomingRemit', 'tshCollect']
    } else {
      return [...commonAsfFlags, 'authorizedNFTokenMinter', 'disallowIncomingNFTokenOffer', 'allowTrustLineClawback']
    }
  }

  const asfFlagKeys = getAvailableAsfFlags()
  const tfFlagKeys = Object.keys(TF_FLAGS)

  // Flag display names and descriptions
  const flagDetails = {
    // ASF Flags
    disallowIncomingCheck: {
      name: 'Incoming Checks',
      displayName: 'Incoming Checks',
      status: (value) => (value ? 'Disallowed' : 'Allowed'),
      actionText: (value) => (value ? 'Allow' : 'Disallow'),
      type: 'asf',
    },
    disallowIncomingPayChan: {
      name: 'Incoming Payment Channels',
      displayName: 'Incoming Payment Channels',
      status: (value) => (value ? 'Disallowed' : 'Allowed'),
      actionText: (value) => (value ? 'Allow' : 'Disallow'),
      type: 'asf',
    },
    disallowIncomingTrustline: {
      name: 'Incoming Trust Lines',
      displayName: 'Incoming Trust Lines',
      status: (value) => (value ? 'Disallowed' : 'Allowed'),
      actionText: (value) => (value ? 'Allow' : 'Disallow'),
      type: 'asf',
    },
    globalFreeze: {
      name: 'Global Freeze',
      displayName: 'Global Freeze',
      status: (value) => (value ? 'Enabled' : 'Disabled'),
      actionText: (value) => (value ? 'Disable' : 'Enable'),
      type: 'asf',
    },
    noFreeze: {
      name: 'No Freeze',
      displayName: 'No Freeze',
      status: (value) => (value ? 'Enabled' : 'Disabled'),
      actionText: (value) => (value ? 'Disable' : 'Enable'),
      type: 'asf',
    },
    authorizedNFTokenMinter: {
      name: 'Authorized NFToken Minter',
      displayName: 'Authorized NFToken Minter',
      status: (value) => (value ? 'Enabled' : 'Disabled'),
      actionText: (value) => (value ? 'Disable' : 'Enable'),
      type: 'asf',
    },
    disallowIncomingNFTokenOffer: {
      name: 'Incoming NFT Offers',
      displayName: 'Incoming NFT Offers',
      status: (value) => (value ? 'Disallowed' : 'Allowed'),
      actionText: (value) => (value ? 'Allow' : 'Disallow'),
      type: 'asf',
    },
    disallowIncomingRemit: {
      name: 'Incoming Remit',
      displayName: 'Incoming Remit',
      status: (value) => (value ? 'Disallowed' : 'Allowed'),
      actionText: (value) => (value ? 'Allow' : 'Disallow'),
      type: 'asf',
    },
    tshCollect: {
      name: 'TSH Collect',
      displayName: 'TSH Collect',
      status: (value) => (value ? 'Enabled' : 'Disabled'),
      actionText: (value) => (value ? 'Disable' : 'Enable'),
      type: 'asf',
    },
    allowTrustLineClawback: {
      name: 'TrustLine Clawback',
      displayName: 'TrustLine Clawback',
      status: (value) => (value ? 'Enabled' : 'Disabled'),
      actionText: (value) => (value ? 'Disable' : 'Enable'),
      type: 'asf',
    },
    asfDefaultRipple: {
      name: 'Default Ripple',
      displayName: 'Default Ripple',
      status: (value) => (value ? 'Enabled' : 'Disabled'),
      actionText: (value) => (value ? 'Disable' : 'Enable'),
      type: 'asf',
    },
    asfDepositAuth: {
      name: 'Deposit Authorization',
      displayName: 'Deposit Authorization',
      status: (value) => (value ? 'Required' : 'Not Required'),
      actionText: (value) => (value ? 'Make Optional' : 'Require'),
      type: 'asf',
    },
    asfDisableMaster: {
      name: 'Master Key',
      displayName: 'Master Key',
      status: (value) => (value ? 'Disabled' : 'Enabled'),
      actionText: (value) => (value ? 'Enable' : 'Disable'),
      type: 'asf',
    },
    // TF Flags
    requireDestTag: {
      name: 'Destination Tag',
      displayName: 'Destination Tag',
      status: (value) => (value ? 'Required' : 'Optional'),
      actionText: (value) => (value ? 'Make Optional' : 'Require'),
      type: 'tf',
    },
    requireAuth: {
      name: 'Authorization',
      displayName: 'Authorization',
      status: (value) => (value ? 'Required' : 'Optional'),
      actionText: (value) => (value ? 'Make Optional' : 'Require'),
      type: 'tf',
    },
    disallowXRP: {
      name: 'Incoming XRP',
      displayName: 'Incoming XRP',
      status: (value) => (value ? 'Disallowed' : 'Allowed'),
      actionText: (value) => (value ? 'Allow' : 'Disallow'),
      type: 'tf',
    },
  }

  useEffect(() => {
    const fetchAccountData = async () => {
      try {
        const response = await axios(`/v2/address/${account.address}?ledgerInfo=true`)
        setAccountData(response.data)
        console.log(response.data)
        if (response.data?.ledgerInfo?.flags) {
          const ledgerFlags = response.data.ledgerInfo.flags

          // Initialize ASF flags
          const newAsfFlags = {}
          asfFlagKeys.forEach((flag) => {
            newAsfFlags[flag] = !!ledgerFlags[flag]
          })
          setFlags(newAsfFlags)

          // Initialize TF flags (these map to ASF flags in the ledger)
          const newTfFlags = {}
          tfFlagKeys.forEach((flag) => {
            // Map TF flag names to their corresponding ASF flag names in ledger
            const asfMapping = {
              requireDestTag: 'requireDestTag',
              requireAuth: 'requireAuth',
              disallowXRP: 'disallowXRP',
            }
            newTfFlags[flag] = !!ledgerFlags[asfMapping[flag]]
          })
          setTfFlags(newTfFlags)
        } else {
          // Initialize with default false values if no flags data
          const defaultAsfFlags = {}
          asfFlagKeys.forEach((flag) => {
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
      Account: account.address,
    }

    if (newValue) {
      tx.SetFlag = ASF_FLAGS[flag]
    } else {
      tx.ClearFlag = ASF_FLAGS[flag]
    }

    setSignRequest({
      request: tx,
      callback: () => {
        setSuccessMessage('Settings updated successfully.')
        setFlags((prev) => ({
          ...prev,
          [flag]: newValue,
        }))
        setAccountData((prev) => {
          if (prev && prev.ledgerInfo) {
            return {
              ...prev,
              ledgerInfo: {
                ...prev.ledgerInfo,
                flags: {
                  ...prev.ledgerInfo.flags,
                  [flag]: newValue,
                },
              },
            }
          }
          return prev
        })
      },
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
      Flags: 0,
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
          [flag]: newValue,
        }))
        setAccountData((prev) => {
          if (prev && prev.ledgerInfo) {
            const asfMapping = {
              requireDestTag: 'requireDestTag',
              requireAuth: 'requireAuth',
              disallowXRP: 'disallowXRP',
            }
            return {
              ...prev,
              ledgerInfo: {
                ...prev.ledgerInfo,
                flags: {
                  ...prev.ledgerInfo.flags,
                  [asfMapping[flag]]: newValue,
                },
              },
            }
          }
          return prev
        })
      },
    })
  }

  if (account?.address && loading) {
    return (
      <>
        <SEO title='Account Settings' description={`Manage your account settings on the ${explorerName}.`} />
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
    return (
      <>
        <SEO title='Account Settings' description={`Manage your account settings on the ${explorerName}.`} />
        <div className="content-center">
          <h1 className="center">Account Settings</h1>
          <p className="center">Please sign in to your account.</p>
        </div>
      </>
    )
  }

  return (
    <>
      <SEO title='Account Settings' description={`Manage your account settings on the ${explorerName}.`} />
      <div className="content-center account-settings">
        <h1 className="center">Account Settings</h1>
        <p className="center">Manage your account settings on the {explorerName}.</p>

        {/* TF Flags Section */}
        <div>
          <h4>Transaction Flags</h4>
          {tfFlagKeys.map((flag) => (
            <div key={flag} className="permission-item">
              <div>
                <div className="permission-item-title">{flagDetails[flag].displayName}</div>
                <div className="permission-item-status">{flagDetails[flag].status(tfFlags[flag])}</div>
              </div>
              <button 
                className="button-action" 
                onClick={() => handleTfFlagToggle(flag)}
                style={{ minWidth: '120px' }}
              >
                {flagDetails[flag].actionText(tfFlags[flag])}
              </button>
            </div>
          ))}
        </div>

        {/* ASF Flags Section */}
        <br />
        <div>
          <h4>Account Flags</h4>
          {asfFlagKeys.map((flag) => (
            <div key={flag} className="permission-item">
              <div>
                <div className="permission-item-title">{flagDetails[flag].displayName}</div>
                <div className="permission-item-status">{flagDetails[flag].status(flags[flag])}</div>
              </div>
              <button 
                className="button-action" 
                onClick={() => handleAsfFlagToggle(flag)}
                style={{ minWidth: '120px' }}
              >
                {flagDetails[flag].actionText(flags[flag])}
              </button>
            </div>
          ))}
        </div>

        {errorMessage && <p className="red center">{errorMessage}</p>}
        {successMessage && <p className="green center">{successMessage}</p>}

        <br />
        <div className="center">
          <Link href={`/account/${account.address}`}>Back to my account</Link>
        </div>
      </div>
    </>
  )
}

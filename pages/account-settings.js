import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useTranslation } from 'next-i18next'
import axios from 'axios'
import { xahauNetwork, explorerName } from '../utils'
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
  const [selectedFlag, setSelectedFlag] = useState(null)
  const [editedFlag, setEditedFlag] = useState(null)

  // TF flags state (for grouped editing)
  const [tfFlags, setTfFlags] = useState(null)
  const [editedTfFlags, setEditedTfFlags] = useState(null)
  const [showTfFlagsEditor, setShowTfFlagsEditor] = useState(false)

  // Determine which ASF flags to use based on network
  const getAvailableAsfFlags = () => {
    const commonAsfFlags = [
      'disallowIncomingCheck',
      'disallowIncomingPayChan',
      'disallowIncomingTrustline',
      'asfDefaultRipple',
      'asfDepositAuth',
      'asfDisableMaster'
    ]

    if (xahauNetwork) {
      return [...commonAsfFlags, 'disallowIncomingRemit', 'tshCollect']
    } else {
      return [...commonAsfFlags, 'globalFreeze', 'noFreeze', 'authorizedNFTokenMinter', 'disallowIncomingNFTokenOffer', 'allowTrustLineClawback']
    }
  }

  const asfFlagKeys = getAvailableAsfFlags()
  const tfFlagKeys = Object.keys(TF_FLAGS)

  // Flag display names and descriptions
  const flagDetails = {
    // ASF Flags
    disallowIncomingCheck: {
      name: 'Disallow Incoming Checks',
      displayName: 'Disallow Incoming Checks',
      status: (value) => (value ? 'Blocked' : 'Allowed'),
      type: 'asf',
    },
    disallowIncomingPayChan: {
      name: 'Disallow Incoming Payment Channels',
      displayName: 'Disallow Incoming PayChan',
      status: (value) => (value ? 'Blocked' : 'Allowed'),
      type: 'asf',
    },
    disallowIncomingTrustline: {
      name: 'Disallow Incoming Trust Lines',
      displayName: 'Disallow Incoming Trustline',
      status: (value) => (value ? 'Blocked' : 'Allowed'),
      type: 'asf',
    },
    globalFreeze: {
      name: 'Global Freeze',
      displayName: 'Global Freeze',
      status: (value) => (value ? 'Enabled' : 'Disabled'),
      type: 'asf',
    },
    noFreeze: {
      name: 'No Freeze',
      displayName: 'No Freeze',
      status: (value) => (value ? 'Enabled' : 'Disabled'),
      type: 'asf',
    },
    authorizedNFTokenMinter: {
      name: 'Authorized NFToken Minter',
      displayName: 'Authorized NFToken Minter',
      status: (value) => (value ? 'Enabled' : 'Disabled'),
      type: 'asf',
    },
    disallowIncomingNFTokenOffer: {
      name: 'Disallow Incoming NFT Offers',
      displayName: 'Disallow Incoming NFT Offers',
      status: (value) => (value ? 'Blocked' : 'Allowed'),
      type: 'asf',
    },
    disallowIncomingRemit: {
      name: 'Disallow Incoming Remit',
      displayName: 'Disallow Incoming Remit',
      status: (value) => (value ? 'Blocked' : 'Allowed'),
      type: 'asf',
    },
    tshCollect: {
      name: 'TSH Collect',
      displayName: 'TSH Collect',
      status: (value) => (value ? 'Enabled' : 'Disabled'),
      type: 'asf',
    },
    allowTrustLineClawback: {
      name: 'Allow TrustLine Clawback',
      displayName: 'Allow TrustLine Clawback',
      status: (value) => (value ? 'Enabled' : 'Disabled'),
      type: 'asf',
    },
    asfDefaultRipple: {
      name: 'Default Ripple',
      displayName: 'Default Ripple',
      status: (value) => (value ? 'Enabled' : 'Disabled'),
      type: 'asf',
    },
    asfDepositAuth: {
      name: 'Deposit Authorization',
      displayName: 'Deposit Authorization',
      status: (value) => (value ? 'Required' : 'Not Required'),
      type: 'asf',
    },
    asfDisableMaster: {
      name: 'Disable Master Key',
      displayName: 'Master Key',
      status: (value) => (value ? 'Disabled' : 'Enabled'),
      type: 'asf',
    },
    // TF Flags
    requireDestTag: {
      name: 'Require Destination Tag',
      displayName: 'Require Destination Tag',
      status: (value) => (value ? 'Required' : 'Optional'),
      type: 'tf',
    },
    requireAuth: {
      name: 'Require Authorization',
      displayName: 'Require Authorization',
      status: (value) => (value ? 'Required' : 'Optional'),
      type: 'tf',
    },
    disallowXRP: {
      name: 'Disallow XRP',
      displayName: 'Disallow Incoming XRP',
      status: (value) => (value ? 'Blocked' : 'Allowed'),
      type: 'tf',
    },
  }

  useEffect(() => {
    const fetchAccountData = async () => {
      try {
        const response = await axios(`/v2/address/${account.address}?ledgerInfo=true`)
        setAccountData(response.data)

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
  console.log(accountData)

  const handleAsfFlagChange = (flag) => {
    if (selectedFlag === flag) {
      setSelectedFlag(null)
    } else {
      setSelectedFlag(flag)
      setEditedFlag(flags[flag])
      setErrorMessage('')
      setSuccessMessage('')
    }
  }

  const handleTfFlagsEdit = () => {
    setShowTfFlagsEditor(true)
    setEditedTfFlags({ ...tfFlags })
    setErrorMessage('')
    setSuccessMessage('')
  }

  const toggleAsfFlag = () => {
    if (selectedFlag) {
      setEditedFlag(!editedFlag)
    }
  }

  const toggleTfFlag = (flag) => {
    setEditedTfFlags((prev) => ({
      ...prev,
      [flag]: !prev[flag],
    }))
  }

  const saveAsfFlag = () => {
    if (!account?.address) {
      setErrorMessage('Please sign in to your account.')
      return
    }

    if (!accountData?.ledgerInfo) {
      setErrorMessage('Error fetching account data')
      return
    }

    const currentFlags = accountData.ledgerInfo.flags || {}

    // Check if the flag value has actually changed
    if (currentFlags[selectedFlag] === editedFlag) {
      setErrorMessage('No changes to save.')
      return
    }

    const tx = {
      TransactionType: 'AccountSet',
      Account: account.address,
    }

    if (editedFlag) {
      tx.SetFlag = ASF_FLAGS[selectedFlag]
    } else {
      tx.ClearFlag = ASF_FLAGS[selectedFlag]
    }

    setSignRequest({
      request: tx,
      callback: () => {
        setSuccessMessage('Settings updated successfully.')
        setFlags((prev) => ({
          ...prev,
          [selectedFlag]: editedFlag,
        }))
        setAccountData((prev) => {
          if (prev && prev.ledgerInfo) {
            return {
              ...prev,
              ledgerInfo: {
                ...prev.ledgerInfo,
                flags: {
                  ...prev.ledgerInfo.flags,
                  [selectedFlag]: editedFlag,
                },
              },
            }
          }
          return prev
        })
        setSelectedFlag(null)
      },
    })
  }

  const saveTfFlags = () => {
    if (!account?.address) {
      setErrorMessage('Please sign in to your account.')
      return
    }

    // Check if any flags have changed
    const hasChanges = tfFlagKeys.some((flag) => tfFlags[flag] !== editedTfFlags[flag])
    if (!hasChanges) {
      setErrorMessage('No changes to save.')
      return
    }

    const tx = {
      TransactionType: 'AccountSet',
      Account: account.address,
      Flags: 0,
    }

    // Combine all TF flags into one transaction
    tfFlagKeys.forEach((flag) => {
      if (editedTfFlags[flag] !== tfFlags[flag]) {
        if (editedTfFlags[flag]) {
          tx.Flags |= TF_FLAGS[flag].set
        } else {
          tx.Flags |= TF_FLAGS[flag].clear
        }
      }
    })

    setSignRequest({
      request: tx,
      callback: () => {
        setSuccessMessage('Settings updated successfully.')
        setTfFlags(editedTfFlags)
        setAccountData((prev) => {
          if (prev && prev.ledgerInfo) {
            const updatedFlags = { ...prev.ledgerInfo.flags }
            tfFlagKeys.forEach((flag) => {
              const asfMapping = {
                requireDestTag: 'requireDestTag',
                requireAuth: 'requireAuth',
                disallowXRP: 'disallowXRP',
              }
              updatedFlags[asfMapping[flag]] = editedTfFlags[flag]
            })
            return {
              ...prev,
              ledgerInfo: {
                ...prev.ledgerInfo,
                flags: updatedFlags,
              },
            }
          }
          return prev
        })
        setShowTfFlagsEditor(false)
      },
    })
  }

  const cancelEdit = () => {
    setSelectedFlag(null)
    setShowTfFlagsEditor(false)
    setErrorMessage('')
    setSuccessMessage('')
  }

  if (loading || flags === null || tfFlags === null) {
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

  // Render ASF flag detail view
  if (selectedFlag) {
    const flag = selectedFlag
    const detail = flagDetails[flag]

    return (
      <>
        <SEO title='Account Settings' description={`Manage your account settings on the ${explorerName}.`} />
        <div className="content-center account-settings">
          <div className="back-button-container">
            <button
              className="back-button"
              onClick={cancelEdit}
            >
              <IoArrowBack size={20} className="icon-color" />
              <span style={{ marginLeft: '5px' }}>Back</span>
            </button>
          </div>

          <h1 className="center">{detail.name}</h1>

          <div className="flag-toggle-container">
            <div className="flag-toggle-item">
              <label className="flag-toggle-label">{detail.displayName}</label>
              <CheckBox
                checked={editedFlag}
                setChecked={toggleAsfFlag}
                name={`toggle-${flag}`}
                style={{ marginTop: "-22px" }}
              />
            </div>
            <button className="button-action" onClick={saveAsfFlag}>
              Save
            </button>
          </div>

          {errorMessage && <p className="red center">{errorMessage}</p>}
          {successMessage && <p className="green center">{successMessage}</p>}
        </div>
      </>
    )
  }

  // Render TF flags editor
  if (showTfFlagsEditor) {
    return (
      <>
        <SEO title="Transaction Flags" />
        <div className="content-center account-settings">
          <div className="back-button-container">
            <button className="back-button" onClick={cancelEdit}>
              <IoArrowBack size={20} className="icon-color" />
              <span style={{ marginLeft: "5px" }}>Back</span>
            </button>
          </div>

          <h1 className="center">Transaction Flags</h1>

          <br />
          <div className="center">
            <div className="flag-toggle-container">
              {tfFlagKeys.map((flag) => (
                <div key={flag} className="flag-toggle-item">
                  <label className="flag-toggle-label">{flagDetails[flag].displayName}</label>
                  <CheckBox
                    checked={editedTfFlags[flag]}
                    setChecked={() => toggleTfFlag(flag)}
                    name={`toggle-tf-${flag}`}
                    style={{ marginTop: "-22px" }}
                  />
                </div>
              ))}
            </div>
            <br />
            <button className="button-action" onClick={saveTfFlags}>
              Save All Changes
            </button>
          </div>

          {errorMessage && <p className="red center">{errorMessage}</p>}
          {successMessage && <p className="green center">{successMessage}</p>}
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
          <h4>Transaction Flags (Combined)</h4>
          <div className="permission-item" onClick={handleTfFlagsEdit}>
            <div>
              <div className="permission-item-title">Edit Transaction Flags</div>
            </div>
            <IoChevronForward size={20} className="icon-color" />
          </div>
        </div>

        {/* ASF Flags Section */}
        <br />
        <div>
          <h4>Account Flags (Individual)</h4>
          {asfFlagKeys.map((flag) => (
            <div key={flag} className="permission-item" onClick={() => handleAsfFlagChange(flag)}>
              <div>
                <div className="permission-item-title">{flagDetails[flag].displayName}</div>
                <div className="permission-item-status">{flagDetails[flag].status(flags[flag])}</div>
              </div>
              <IoChevronForward size={20} className="icon-color" />
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

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useTranslation } from 'next-i18next'
import axios from 'axios'
import CheckBox from '../components/UI/CheckBox'
import SEO from '../components/SEO'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { getIsSsrMobile } from '../utils/mobile'

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
  disallowIncomingTrustline: 15
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
    disallowIncomingTrustline: false
  })

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
          setFlags({
            requireDestTag: !!ledgerFlags.requireDestTag,
            disallowXRP: !!ledgerFlags.disallowXRP,
            disallowIncomingCheck: !!ledgerFlags.disallowIncomingCheck,
            disallowIncomingNFTokenOffer: !!ledgerFlags.disallowIncomingNFTokenOffer,
            disallowIncomingPayChan: !!ledgerFlags.disallowIncomingPayChan,
            disallowIncomingTrustline: !!ledgerFlags.disallowIncomingTrustline
          })
        }
        setLoading(false)
      } catch (error) {
        setErrorMessage(t('error.fetch'))
        setLoading(false)
      }
    }
    fetchAccountData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [account])

  const handleFlagChange = (flag) => {
    setFlags((prev) => ({ ...prev, [flag]: !prev[flag] }))
    setErrorMessage('')
    setSuccessMessage('')
  }

  const onSubmit = async () => {
    if (!account?.address) {
      setErrorMessage(t('error.not-signed-in'))
      return
    }

    if (!accountData?.ledgerInfo?.flags) {
      setErrorMessage(t('error.fetch'))
      return
    }

    const currentFlags = accountData.ledgerInfo.flags
    const transactions = []

    Object.keys(ACCOUNT_FLAGS).forEach((flag) => {
      if (currentFlags[flag] !== flags[flag]) {
        const tx = {
          TransactionType: 'AccountSet',
          Account: account.address
        }
        if (flags[flag]) {
          tx.SetFlag = ACCOUNT_FLAGS[flag]
        } else {
          tx.ClearFlag = ACCOUNT_FLAGS[flag]
        }
        transactions.push(tx)
      }
    })

    if (transactions.length === 0) {
      setErrorMessage('No changes to save.')
      return
    }

    setSignRequest({
      request: transactions[0],
      callback: () => {
        setSuccessMessage('Settings updated successfully.')  
      }
    })
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
          <p className="center"></p>
        </div>
      </>
    )
  }

  return (
    <>
      <SEO title={t('title')} />
      <div className="content-center">
        <h1 className="center">Account Settings</h1>
        <p className="center">
          Manage your account settings on the XRP Ledger.
        </p>
        <div className="page-services-nft-mint">
          <h2>Permissions</h2>
          <div>
            <CheckBox
              checked={flags.requireDestTag}
              setChecked={() => handleFlagChange('requireDestTag')}
              name="require-dest-tag"
            >
              Require Destination Tag
            </CheckBox>
            <p className="grey">
              Require a destination tag to send transactions to this account.
            </p>
          </div>
          <div>
            <CheckBox
              checked={flags.disallowXRP}
              setChecked={() => handleFlagChange('disallowXRP')}
              name="disallow-xrp"
            >
              Disallow XRP
            </CheckBox>
            <p className="grey">
              XRP should not be sent to this account (advisory; not enforced by the protocol).
            </p>
          </div>
          <div>
            <CheckBox
              checked={flags.disallowIncomingNFTokenOffer}
              setChecked={() => handleFlagChange('disallowIncomingNFTokenOffer')}
              name="disallow-nft-offers"
            >
              Disallow Incoming NFT Offers
            </CheckBox>
            <p className="grey">
              Block incoming NFT offers.
            </p>
          </div>
          <div>
            <CheckBox
              checked={flags.disallowIncomingCheck}
              setChecked={() => handleFlagChange('disallowIncomingCheck')}
              name="disallow-checks"
            >
              Disallow Incoming Checks
            </CheckBox>
            <p className="grey">
              Block incoming Checks.
            </p>
          </div>
          <div>
            <CheckBox
              checked={flags.disallowIncomingPayChan}
              setChecked={() => handleFlagChange('disallowIncomingPayChan')}
              name="disallow-paychan"
            >
              Disallow Incoming Payment Channels
            </CheckBox>
            <p className="grey">
              Block incoming Payment Channels.
            </p>
          </div>
          <div>
            <CheckBox
              checked={flags.disallowIncomingTrustline}
              setChecked={() => handleFlagChange('disallowIncomingTrustline')}
              name="disallow-trustline"
            >
              Disallow Incoming Trust Lines
            </CheckBox>
            <p className="grey">
              Block incoming trust lines.
            </p>
          </div>
          <div style={{ height: 32 }} />
          <p className="center">
            <button className="button-action" onClick={onSubmit} name="submit-button">
              Save Settings
            </button>
          </p>
          {errorMessage && <p className="red center">{errorMessage}</p>}
          {successMessage && <p className="green center">{successMessage}</p>}
          <div style={{ marginTop: '20px' }}>
            <p className="center">
              <Link href={`/account/${account.address}`}>
                Back to my account
              </Link>
            </p>
          </div>
        </div>
      </div>
    </>
  )
}

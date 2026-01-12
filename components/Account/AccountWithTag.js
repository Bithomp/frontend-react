import { useTranslation } from 'next-i18next'
import { useState, useEffect } from 'react'
import axios from 'axios'
import SEO from '../SEO'
import {
  FaFacebook,
  FaInstagram,
  FaLinkedin,
  FaMedium,
  FaReddit,
  FaTelegram,
  FaYoutube,
  FaXTwitter
} from 'react-icons/fa6'
import { accountWithTag } from '../../styles/components/Account/AccountWithTag.module.scss'

export default function AccountWithTag({ data }) {
  const { t } = useTranslation()
  const [accountData, setAccountData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState(null)
  const [address, setAddress] = useState(null)
  const [tag, setTag] = useState(null)

  useEffect(() => {
    const fetchData = async () => {
      if (!data) return
      const address = data.address
      setTag(data.tag)
      setAddress(data.address)
      setLoading(true)
      setErrorMessage(null)
      try {
        const response = await axios(
          '/v2/address/' + address + '?username=true&service=true&verifiedDomain=true&bithomp=true'
        )
        const accountData = response?.data
        if (accountData?.error) {
          setErrorMessage(accountData.error)
          setLoading(false)
          return
        }
        if (accountData?.address) {
          setAccountData(accountData)
        } else {
          setErrorMessage('Failed to resolve address')
        }
      } catch (error) {
        setErrorMessage(error?.message || 'Failed to load account data')
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [data])

  // Function to render social links dynamically based on account data
  const renderSocialLinks = (socialAccounts) => {
    if (!socialAccounts) return null

    return (
      <div className="social-icons">
        {socialAccounts.twitter && (
          <a href={'https://x.com/' + socialAccounts.twitter} aria-label="X" target="_blank" rel="noopener">
            <FaXTwitter />
          </a>
        )}
        {socialAccounts.youtube && (
          <a href={'https://youtube.com/' + socialAccounts.youtube} aria-label="Youtube" target="_blank" rel="noopener">
            <FaYoutube />
          </a>
        )}
        {socialAccounts.linkedin && (
          <a
            href={'https://linkedin.com/company/' + socialAccounts.linkedin + '/'}
            aria-label="Linkedin"
            target="_blank"
            rel="noopener"
          >
            <FaLinkedin />
          </a>
        )}
        {socialAccounts.instagram && (
          <a
            href={'https://www.instagram.com/' + socialAccounts.instagram + '/'}
            aria-label="Instagram"
            target="_blank"
            rel="noopener"
          >
            <FaInstagram />
          </a>
        )}
        {socialAccounts.telegram && (
          <a href={'https://t.me/' + socialAccounts.telegram} aria-label="Telegram" target="_blank" rel="noopener">
            <FaTelegram />
          </a>
        )}
        {socialAccounts.facebook && (
          <a
            href={'https://www.facebook.com/' + socialAccounts.facebook + '/'}
            aria-label="Facebook"
            target="_blank"
            rel="noopener"
          >
            <FaFacebook />
          </a>
        )}
        {socialAccounts.medium && (
          <a href={'https://medium.com/' + socialAccounts.medium} aria-label="Medium" target="_blank" rel="noopener">
            <FaMedium />
          </a>
        )}
        {socialAccounts.reddit && (
          <a
            href={'https://www.reddit.com/' + socialAccounts.reddit + '/'}
            aria-label="Reddit"
            target="_blank"
            rel="noopener"
          >
            <FaReddit />
          </a>
        )}
      </div>
    )
  }

  if (loading) {
    return (
      <>
        <SEO page="Account with tag" />
        <div className="content-center">
          <div className="center" style={{ marginTop: '50px' }}>
            <span className="waiting"></span>
            <br />
            {t('general.loading')}
          </div>
        </div>
      </>
    )
  }

  if (errorMessage) {
    return (
      <>
        <SEO page="Account with tag" />
        <div className="content-center">
          <div className="center orange bold" style={{ marginTop: '50px' }}>
            {errorMessage}
          </div>
        </div>
      </>
    )
  }

  if (!address || !accountData) {
    return (
      <>
        <SEO page="Account with tag" />
        <div className="content-center">
          <div className="center orange bold" style={{ marginTop: '50px' }}>
            Invalid address or missing data
          </div>
        </div>
      </>
    )
  }

  return (
    <div className={accountWithTag}>
      <SEO
        page="Account with tag information"
        title={`${t('explorer.header.account')} ${data?.payId || data?.xAddress || ''}`}
        description={`Details for ${data?.payId || data?.xAddress || ''}`}
      />
      {/* add tab="account" to show transactions link */}

      <div className="content-profile account">
        <div className="account-tag-container">
          <div className="account-tag-title">{data?.payId ? 'PAYSTRING ' : 'X-ADDRESS'} DETAILS</div>

          <div className="account-tag-xaddress">
            <b>{data.xAddress}</b>
          </div>

          <div className="account-tag-service-description">
            This address belongs to{' '}
            <a
              href={`https://${accountData?.service?.domain}`}
              target="_blank"
              rel="noopener noreferrer"
              className="account-tag-service-link"
            >
              {accountData?.service?.domain}
            </a>{' '}
            <b>({accountData?.service?.name}).</b>
          </div>

          {accountData?.bithomp?.avatar && (
            <div className="account-tag-logo-container">
              <img src={accountData.bithomp.avatar} alt={accountData.bithomp.name} className="account-tag-logo" />
            </div>
          )}

          {renderSocialLinks(accountData?.service?.socialAccounts)}

          {data?.payId && (
            <div className="account-tag-details">
              <div className="account-tag-detail-label">
                <span>PayString:</span>
              </div>
              <div className="account-tag-detail-value bold">{data.payId}</div>
            </div>
          )}

          <div className="account-tag-details">
            <div className="account-tag-detail-label">
              <span>Service address:</span>
            </div>
            <div className="account-tag-detail-value">
              <a href={`/account/${address}`} className="account-tag-address-link">
                {address}
              </a>
            </div>
          </div>
          {tag && (
            <div className="account-tag-details">
              <div className="account-tag-detail-label">
                <span>User destination tag:</span>
              </div>
              <div className="account-tag-detail-value bold">{tag}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

import { useTranslation } from 'next-i18next'
import { useEffect } from 'react'
import { useRouter } from 'next/router'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { axiosServer, passHeaders } from '../../../utils/axios'
import { xAddressToClassicAddress } from 'ripple-address-codec'

import SEO from '../../../components/SEO'
import SearchBlock from '../../../components/Layout/SearchBlock'
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

export async function getServerSideProps(context) {
  const { locale, query, req } = context
  let resolvedData = null
  let errorMessage = null
  
  const { id } = query
  const searchInput = id ? (Array.isArray(id) ? id[0] : id) : ''

  if (searchInput) {
    try {
      let address = null
      let destinationTag = null

      try {
        const decoded = xAddressToClassicAddress(searchInput)
        address = decoded.classicAddress
        destinationTag = decoded.tag
      } catch (error) {
        errorMessage = 'Invalid xAddress format'
      }

      if (address) {
        // Fetch account data for the resolved address
        const accountResponse = await axiosServer({
          method: 'get',
          url: `v2/address/${address}?username=true&service=true&verifiedDomain=true&parent=true&nickname=true&inception=true&flare=true&blacklist=true&payString=true&ledgerInfo=true&xamanMeta=true&bithomp=true&obligations=true`,
          headers: passHeaders(req)
        })

        resolvedData = {
          originalInput: searchInput,
          address,
          destinationTag,
          accountData: accountResponse?.data
        }
      }
    } catch (error) {
      errorMessage = 'Error processing request'
    }
  }

  return {
    props: {
      resolvedData: resolvedData || {},
      errorMessage: errorMessage || null,
      ...(await serverSideTranslations(locale, ['common', 'account']))
    }
  }
}

export default function AccountTag({ resolvedData, errorMessage }) {
  const { t } = useTranslation()
  const router = useRouter()

  // Function to render social links dynamically based on account data
  const renderSocialLinks = (socialAccounts) => {
    if (!socialAccounts) return null

    return (
      <div className="account-tag-social-icons">
        {socialAccounts.twitter && (
          <a href={'https://x.com/' + socialAccounts.twitter} aria-label="X" target="_blank" rel="noopener">
            <FaXTwitter />
          </a>
        )}
        {socialAccounts.youtube && (
          <a
            href={'https://youtube.com/' + socialAccounts.youtube}
            aria-label="Youtube"
            target="_blank"
            rel="noopener"
          >
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
          <a
            href={'https://t.me/' + socialAccounts.telegram}
            aria-label="Telegram"
            target="_blank"
            rel="noopener"
          >
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
          <a
            href={'https://medium.com/' + socialAccounts.medium}
            aria-label="Medium"
            target="_blank"
            rel="noopener"
          >
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

  useEffect(() => {
    // If no destination tag found, redirect to regular account page
    if (resolvedData?.address && (!resolvedData?.destinationTag || resolvedData?.destinationTag === false)) {
      router.replace(`/account/${resolvedData.address}`)
      return
    }
  }, [resolvedData, router])

  if (errorMessage) {
    return (
      <>
        <SEO page="Account with Tag" title="Error - Account with Destination Tag" />
        <SearchBlock searchPlaceholderText={t('explorer.enter-address')} tab="account" />
         <div className="content-center">
           <div className="center orange bold" style={{ marginTop: '50px' }}>
             {errorMessage}
           </div>
         </div>
      </>
    )
  }

  if (!resolvedData?.address || !resolvedData?.destinationTag) {
    return (
      <>
        <SEO page="Account with Tag" title="Account with Destination Tag" />
        <SearchBlock searchPlaceholderText={t('explorer.enter-address')} tab="account" />
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

  const { originalInput, address, destinationTag, accountData } = resolvedData

  const userData = {
    username: accountData?.username,
    service: accountData?.service?.name,
    address: accountData?.address || address
  }

  return (
    <>
      <SEO
        page="Account with Tag"
        title={`${t('explorer.header.account')} ${userData.service || userData.username || userData.address} - Tag: ${destinationTag}`}
        description={`Account details for ${userData.service || userData.username || ''} ${userData.address} with destination tag ${destinationTag}`}
      />
      <SearchBlock searchPlaceholderText={t('explorer.enter-address')} tab="account" userData={userData} />
      
        <div className="content-profile account">
          <div className="account-tag-container">
            <div className="account-tag-title">
              X-ADDRESS DETAILS
            </div>

            <div className="account-tag-xaddress">
              <b>{originalInput}</b>
            </div>

            <div className="account-tag-service-description">
                This address belongs to{' '}
                <a href={`https://${accountData?.service?.domain || 'crypto.com'}`} target="_blank" rel="noopener noreferrer" className="account-tag-service-link">
                  {accountData?.service?.domain || 'crypto.com'}
                </a>{' '}
                <b>({accountData?.service?.name || 'Crypto.com exchange'}).</b>
            </div>

            {accountData?.bithomp?.avatar && (
              <div className="account-tag-logo-container">
                <img 
                  src={accountData.bithomp.avatar} 
                  alt={accountData.bithomp.name} 
                  className="account-tag-logo"
                />
              </div>
            )}

            {renderSocialLinks(accountData?.service?.socialAccounts)}

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
            <div className="account-tag-details">
              <div className="account-tag-detail-label">
                <span>User destination tag:</span>
              </div>
              <div className="account-tag-detail-value">
                <b>{destinationTag}</b>
              </div>
            </div>
          </div>
        </div>
    </>
  )
}

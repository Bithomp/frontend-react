import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import Image from 'next/image'
import Mailto from 'react-protected-mailto'

import SEO from '../components/SEO'

import { getIsSsrMobile } from '../utils/mobile'
import { ledgerName } from '../utils'
import Link from 'next/link'

export async function getServerSideProps(context) {
  const { locale } = context
  return {
    props: {
      isSsrMobile: getIsSsrMobile(context),
      ...(await serverSideTranslations(locale, ['common']))
    }
  }
}

export default function Advertise() {
  return (
    <>
      <SEO
        title={'Advertise on ' + ledgerName + ' Explorer'}
        description={'Reach thousands of ' + ledgerName + ' users'}
        image={{ height: 1500, width: 791, file: 'advertise/home-page-banner.png', allNetworks: true }}
      />
      <div className="content-text content-center">
        <h1 className="center">Advertise on {ledgerName} Explorer</h1>
        <p>
          Our website is the most popular {ledgerName} Explorer that focuses on the community. Through sponsored content
          on our website, we offer a platform for projects and businesses to connect with the {ledgerName} users and
          larger blockchain community.
        </p>
        <p className="bold">
          Contact us to advertise <Mailto email="partner@bithomp.com" headers={{ subject: 'Advertise' }} />.
        </p>
        <h2 className="center">Advertisement Types</h2>
        <p>
          Bring your message to the attention of thousands of blockchain enthusiasts. Sponsored material on our website
          is intended to be consistent with the overall user experience.
        </p>
        <h3>Home Page Banner Ad</h3>
        <p>Banner ads on the {ledgerName} Explorer site can raise brand recognition and user retention.</p>
        <Image
          src="/images/advertise/home-page-banner.png"
          alt="Home Page Banner Ad"
          width="0"
          height="0"
          sizes="100vw"
          style={{ width: '100%', height: 'auto' }}
        />
        <p>
          The banner is also displayed on the <Link href="/faucet">Faucet</Link> and{' '}
          <Link href="/explorer">Explorer</Link> pages.
        </p>
        <br />
        <br />
        <h3>Header Link Placement</h3>
        <p>
          Get maximum visibility with a header link displayed across almost every page of the website, including
          high-traffic sections like account and transaction pages, NFT Explorer, tokens, services, and more.
        </p>
        <Image
          src="/images/advertise/header-account-page.png"
          alt="Account Page Text Ad"
          width="0"
          height="0"
          sizes="100vw"
          style={{ width: '100%', height: 'auto' }}
        />
        <br />
        <br />
        <Image
          src="/images/advertise/header-nft-explorer.png"
          alt="NFT Explorer Text Ad"
          width="0"
          height="0"
          sizes="100vw"
          style={{ width: '100%', height: 'auto' }}
        />
        <br />
        <br />
        <Image
          src="/images/advertise/header-token-page.png"
          alt="Tokens Page Text Ad"
          width="0"
          height="0"
          sizes="100vw"
          style={{ width: '100%', height: 'auto' }}
        />
        <br />
        <br />
        <h3>Footer Menu Placement</h3>
        <p>
          Place your advertisement in the footer menu, ensuring constant visibility across all pages of the website.
        </p>
        <Image
          src="/images/advertise/footer-menu.png"
          alt="NFT Explorer Header Text Ad"
          width="0"
          height="0"
          sizes="100vw"
          style={{ width: '100%', height: 'auto' }}
        />
        <br />
        <br />
        <br />
        <p className="center bold">
          Contact us to advertise <Mailto email="partner@bithomp.com" headers={{ subject: 'Advertise' }} />.
        </p>
      </div>
    </>
  )
}

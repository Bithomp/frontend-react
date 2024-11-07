import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import Image from 'next/image'
import Mailto from 'react-protected-mailto'

import SEO from '../components/SEO'

import { getIsSsrMobile } from '../utils/mobile'
import { ledgerName } from '../utils'

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
        <br />
        <br />
        <h3>Account and Transaction Explorer Text Ad</h3>
        <p>
          Each XRPL account and transaction explorer page features a clean, unobtrusive display of your sponsored ad
          text.
        </p>
        <Image
          src="/images/advertise/old-pages-footer.png"
          alt="Transaction Explorer Text Ad"
          width="0"
          height="0"
          sizes="100vw"
          style={{ width: '100%', height: 'auto' }}
        />
        <br />
        <br />
        <h3>NFT Explorer Header Text Ad</h3>
        <p>
          Place your advertisement on the top of all our NFT Explorer pages to connect with the NFT community's users.
        </p>
        <Image
          src="/images/advertise/new-pages-header.png"
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

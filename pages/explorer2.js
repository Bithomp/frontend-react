import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { useTranslation } from 'next-i18next'
import Head from 'next/head'
import Link from 'next/link'

import { server, explorerName, nativeCurrency } from '../utils'
import { getIsSsrMobile } from '../utils/mobile'

import SEO from '../components/SEO'
import SearchBlock from '../components/Layout/SearchBlock'
import Ads from '../components/Layout/Ads'

export async function getServerSideProps(context) {
  const { locale } = context
  return {
    props: {
      isSsrMobile: getIsSsrMobile(context),
      ...(await serverSideTranslations(locale, ['common']))
    }
  }
}

const ldJsonWebsite = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: nativeCurrency + ' Explorer',
  alternateName: [nativeCurrency + ' Explorer', explorerName + ' Explorer', 'Scan ' + nativeCurrency + ' Ledger'],
  url: server,
  potentialAction: {
    '@type': 'SearchAction',
    target: {
      '@type': 'EntryPoint',
      urlTemplate: server + '/explorer2/?r={search_term_string}'
    },
    'query-input': 'required name=search_term_string'
  }
}

export default function Explorer2({ isSsrMobile, showAds }) {
  const { t } = useTranslation()

  return (
    <>
      <SEO
        title={t('explorer.header.main', { explorerName })}
        titleWithNetwork="true"
        description={t('explorer.header.sub', { nativeCurrency })}
      />
      <Head>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ldJsonWebsite) }} />
      </Head>

      <section className="home-section">
        <h1 className="center">{t('explorer.header.main', { explorerName })}</h1>
        <p className="center">{t('explorer.header.sub', { nativeCurrency })}</p>
        <SearchBlock tab="explorer" isSsrMobile={isSsrMobile} />
      </section>

      <section className="home-section">
        <div className="content-text content-center">
          <h2 className="center">Examples</h2>
          <p className="center">Try these to see what you can find:</p>
          <ul>
            <li>
              NFT:{' '}
              <Link href={'/nft/' + '0000000000000000000000000000000000000000000000000000000000000000'}>
                /nft/000000...0000
              </Link>
            </li>
            <li>
              AMM:{' '}
              <Link href={'/amm/' + '0000000000000000000000000000000000000000'}>/amm/000000...0000</Link>
            </li>
            <li>
              Transaction:{' '}
              <Link href={'/tx/' + '0000000000000000000000000000000000000000000000000000000000000000'}>
                /tx/000000...0000
              </Link>
            </li>
            <li>
              Account:{' '}
              <Link href={'/account/' + 'rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh'}>
                /account/rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh
              </Link>
            </li>
            <li>
              X-address:{' '}
              <Link href={'/account/' + 'X7u8pEExampleXAddress0000000000000000000'}>
                /account/X7u8pEExampleXAddress...
              </Link>
            </li>
            <li>
              PayString:{' '}
              <Link href={'/account/' + 'ihomp$bithomp.com'}>/account/ihomp$bithomp.com</Link>
            </li>
            <li>
              Username:{' '}
              <Link href={'/account/' + 'ihomp'}>/account/ihomp</Link>
            </li>
            <li>
              Object ID:{' '}
              <Link href={'/object/' + '0000000000000000000000000000000000000000000000000000000000000000'}>
                /object/000000...0000
              </Link>
            </li>
          </ul>
        </div>
      </section>

      {showAds && <Ads />}
      <br />
    </>
  )
}



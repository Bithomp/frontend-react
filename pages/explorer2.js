import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { useTranslation } from 'next-i18next'
import Head from 'next/head'
import Link from 'next/link'

import { server, explorerName, nativeCurrency, network } from '../utils'
import { getIsSsrMobile } from '../utils/mobile'

import SEO from '../components/SEO'
import SearchBlock from '../components/Layout/SearchBlock'
import Ads from '../components/Layout/Ads'
import CopyButton from '../components/UI/CopyButton'
import { shortHash } from '../utils/format'

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
      urlTemplate: server + '/explorer/{search_term_string}'
    },
    'query-input': 'required name=search_term_string'
  }
}

const examples = {
  mainnet: {
    nft: '000A13884B50699E253C5098DEFE3A0872A79D129172F496F5F7E0EA00000532',
    amm: '160C6649399D6AF625ED94A66812944BDA1D8993445A503F6B5730DECC7D3767',
    txHash: '29C56EB4A9E6C6F16A54968EC7DC8DAE92A95348EC583F2B82A028C3EAE627C0',
    txCTID: 'C5DB956000090000',
    account: 'rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh',
    payString: ['username$paystring.crypto.com', 'vbuterin$bithomp.com'],
    xAddress: 'XVVFXHFdehYhofb7XRWeJYV6kjTEwbq2mLScCiYyDTHKu9E',
    username: ['bitstamp', 'vbuterin', 'JoelKatz'],
    object: '0802E4E7EACC17414747174474487E9DF24CFDB61DD12C58B09D9EFB42C7F8C8'
  },
  testnet: {}
}

export default function Explorer({ isSsrMobile, showAds }) {
  const { t } = useTranslation()

  const shortingHash = (hash) => {
    let length = 24
    if (isSsrMobile) {
      length = 7
    }
    return shortHash(hash, length)
  }

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
          <h2>Account</h2>
          <p>
            start typing an account address, X-address, PayString, username, service name or web domain in the search
            box above.
          </p>
          <b>Address</b> examples: "rHb9CJ" - start typing it, and we will find the full address for you, or enter a
          full address like {examples[network]?.account} <CopyButton text={examples[network]?.account} />
          <br />
          <br />
          <b>Username</b> examples: {examples[network]?.username[0]}, {examples[network]?.username[1]},{' '}
          {examples[network]?.username[2]} (start typing and we will find the full usernames){' '}
          <Link href="/username">Register your username.</Link>
          <br />
          <br />
          <b>Domain</b> examples: "binance.com", "coinbase.com", "ripple.com" (start typing and we will find accounts
          with such domains) <Link href="/domains">Verify your domain.</Link>
          <br />
          <br />
          <b>X-Address</b> example: {shortingHash(examples[network]?.xAddress)}{' '}
          <CopyButton text={examples[network]?.xAddress} />
          <br />
          <br />
          <b>PayString</b> example: {examples[network]?.payString[0]}{' '}
          <CopyButton text={examples[network]?.payString[0]} />, {examples[network]?.payString[1]}{' '}
          <CopyButton text={examples[network]?.payString[1]} /> <Link href="/username">Get your PayString.</Link>
          <br />
          <br />
          <h2>Transaction</h2>
          <b>CTID</b> (compact transaction ID) example: {examples[network]?.txCTID}{' '}
          <CopyButton text={examples[network]?.txCTID} />
          <br />
          <br />
          <b>Transaction Hash</b> example: {shortingHash(examples[network]?.txHash)}{' '}
          <CopyButton text={examples[network]?.txHash} />
          <br />
          <br />
          <h2>NFT, AMM, Object</h2>
          <b>NFT</b> example: {shortingHash(examples[network]?.nft)} <CopyButton text={examples[network]?.nft} />
          <br />
          <br />
          <b>AMM</b> example: {shortingHash(examples[network]?.amm)} <CopyButton text={examples[network]?.amm} />
          <br />
          <br />
          <b>Object</b> example: {shortingHash(examples[network]?.object)}{' '}
          <CopyButton text={examples[network]?.object} />
          <br />
          <br />
        </div>
      </section>

      {showAds && <Ads />}
      <br />
    </>
  )
}

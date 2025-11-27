import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { useTranslation } from 'next-i18next'
import Head from 'next/head'
import Link from 'next/link'

import { server, explorerName, nativeCurrency, network } from '../../utils'
import { getIsSsrMobile } from '../../utils/mobile'

import SEO from '../../components/SEO'
import SearchBlock from '../../components/Layout/SearchBlock'
import Ads from '../../components/Layout/Ads'
import CopyButton from '../../components/UI/CopyButton'
import { shortHash } from '../../utils/format'

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
    //payString: ['username$paystring.crypto.com', 'vbuterin$bithomp.com'],
    //xAddress: 'XVVFXHFdehYhofb7XRWeJYV6kjTEwbq2mLScCiYyDTHKu9E',
    username: ['bitstamp', 'vbuterin', 'JoelKatz'],
    object: '0802E4E7EACC17414747174474487E9DF24CFDB61DD12C58B09D9EFB42C7F8C8'
  },

  staging: {
    nft: '000900007CDA3D523C8D4CA25F55439D447FBF4D4F26AC3B99AFB57D005429E2',
    amm: '0B19CBEC8ECC26F23056E981390F3210F3D2B0C598B3729B7618D2CF55B5EBC6',
    txHash: '3EA3434D60F7B78BBACE9074858202FB5CDDA003FC3F98622CEE8797D32EF0C4',
    txCTID: 'C0547DD100070002',
    account: 'rwxuXYidJrbqWCEzvTipswauoKTiDfoatK',
    //payString: ['gemtesting2$staging.bithomp.com'],
    //xAddress: null,
    username: ['GemTesting2'],
    object: null
  },

  testnet: {
    nft: '000800005D2E32254DA5D6AD397B084B990EAD2D4CD35EA0A1DE0B58006CF41B',
    amm: 'F7332F4AAD5FEE202A4B7C877D19DA0C694BC2DE6FF23461C12D68316F70BB22',
    txHash: '5A8F7913DDB7C8B7DA3A9329C397599C89978437445AE5D748DDC9A8FA016A4A',
    txCTID: 'C097E2D200010001',
    account: 'rMA8uFhm1hRRu2e9huxjR62gMw4PY2uQAP',
    //payString: ['mainfortesting$test.bithomp.com', 'gemtesting$test.bithomp.com'],
    //xAddress: 'TVE26TYGhfLC7tQDno7G8dGtxSkYQnTMgJJYfAbsiPsc6Zg',
    username: ['xrpdomains', 'faucet'],
    object: null
  },

  devnet: {
    nft: '000900007CDA3D523C8D4CA25F55439D447FBF4D4F26AC3B82C9E47C005429E1',
    amm: '33072CA199E75633CD9C174D9DC731C773303A834AF4B3FF8EB28BE30EAA0AE1',
    txHash: '100D2346C65FF4C681B5AD805EC54419FF38ECDD824006D0E050D2A68808475B',
    txCTID: 'C0546A8800120002',
    account: 'rh1HPuRVsYYvThxG2Bs1MfjmrVC73S16Fb',
    //payString: ['gemtesting$dev.bithomp.com', 'mainfortesting$dev.bithomp.com'],
    //xAddress: null,
    username: ['xrpdomains'],
    object: null
  },

  alphanet: {
    nft: '000900007CDA3D523C8D4CA25F55439D447FBF4D4F26AC3B82C9E47C005429E1',
    amm: '33072CA199E75633CD9C174D9DC731C773303A834AF4B3FF8EB28BE30EAA0AE1',
    txHash: '100D2346C65FF4C681B5AD805EC54419FF38ECDD824006D0E050D2A68808475B',
    txCTID: 'C0546A8800120002',
    account: 'rh1HPuRVsYYvThxG2Bs1MfjmrVC73S16Fb',
    //payString: ['gemtesting$dev.bithomp.com', 'mainfortesting$dev.bithomp.com'],
    //xAddress: null,
    username: ['xrpdomains'],
    object: null
  },

  xahau: {
    nft: 'CE67EA90A55AACD603B5B44C56B44A56D9FA792EB8E872638FF570B31F0ED143',
    amm: null, // not enabled on xahau
    txHash: '658D0ADF47AAF039EB5AAD516AA7C77105E5BC1FC7D42C0F89E15C9DFD65EDA7',
    txCTID: 'C0FBEE5600435359',
    account: 'rPNFrWbZG7mPenXAEBjAkPezE5N6NKy4W',
    //payString: ['xrpmoon$xahauexplorer.com', 'joelkatz$xahauexplorer.com'],
    xAddress: null,
    username: ['JoelKatz', 'XRPMOON'],
    object: null
  },

  'xahau-testnet': {
    nft: '87B493C9E60E0A20A2C070B98DFF81EF421C7D2894483DC967DADB9DA433DBCF',
    amm: null, // not enabled on xahau
    txHash: '542DE886216DBC774E018D33D6B4CD188DFE2171521A7EC0EB4AADD1BAE0DD04',
    txCTID: 'C00A0DC50000535A',
    account: 'rh9ebhNHB4s7tJ7y66B5gmZ6aEnnhNDsgT',
    //payString: ['gemtesting$test.xahauexplorer.com'],
    xAddress: null,
    username: ['MainForTesting'],
    object: null
  },

  'xahau-jshooks': {
    nft: null,
    amm: null, // not enabled on xahau
    txHash: '9189121BF648B984D7E63C4E737E0269DC9AA45CBECB79D5D0F3B9F0C2C963B0',
    txCTID: 'C077168800007A6A',
    account: 'rp52uvJuR8PzTG1RRDvCxwXW7o56bPSwbG',
    //payString: ['mainfortesting$jshooks.xahauexplorer.com'],
    xAddress: null,
    username: ['faucet'],
    object: null
  }
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

      {showAds && <Ads />}

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
          <b>Username</b> examples: {examples[network]?.username?.[0]}, {examples[network]?.username?.[1]},{' '}
          {examples[network]?.username?.[2]} (start typing and we will find the full usernames){' '}
          <Link href="/username">Register your username.</Link>
          <br />
          <br />
          <b>Domain</b> examples: "binance.com", "coinbase.com", "ripple.com" (start typing and we will find accounts
          with such domains) <Link href="/domains">Verify your domain.</Link>
          <br />
          <br />
          {examples[network]?.xAddress && (
            <>
              <b>X-Address</b> example: <span className="brake">{shortingHash(examples[network]?.xAddress)} </span>
              <CopyButton text={examples[network]?.xAddress} />
              <br />
              <br />
            </>
          )}
          {examples[network]?.payString?.[0] && (
            <>
              <b>PayString</b> example: {examples[network]?.payString?.[0]}{' '}
              <CopyButton text={examples[network]?.payString?.[0]} />, {examples[network]?.payString?.[1]}{' '}
              <CopyButton text={examples[network]?.payString?.[1]} /> <Link href="/username">Get your PayString.</Link>
              <br />
              <br />
            </>
          )}
          <h2>Transaction</h2>
          <b>CTID</b> (compact transaction ID) example: {examples[network]?.txCTID}{' '}
          <CopyButton text={examples[network]?.txCTID} />
          <br />
          <br />
          <b>Transaction Hash</b> example: <span className="brake">{shortingHash(examples[network]?.txHash)} </span>
          <CopyButton text={examples[network]?.txHash} />
          <br />
          <br />
          <h2>NFT, {examples[network]?.amm && 'AMM, '}Object</h2>
          <b>NFT</b> example: <span className="brake">{shortingHash(examples[network]?.nft)} </span>
          <CopyButton text={examples[network]?.nft} />
          <br />
          <br />
          {examples[network]?.amm && (
            <>
              <b>AMM</b> example: <span className="brake">{shortingHash(examples[network]?.amm)} </span>
              <CopyButton text={examples[network]?.amm} />
              <br />
              <br />
            </>
          )}
          <b>Object</b> example: <span className="brake">{shortingHash(examples[network]?.object)} </span>
          <CopyButton text={examples[network]?.object} />
          <br />
          <br />
        </div>
      </section>
      <br />
    </>
  )
}

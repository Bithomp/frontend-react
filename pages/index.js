import Head from 'next/head'

import { serverSideTranslations } from 'next-i18next/serverSideTranslations'

export async function getStaticProps({ locale }) {
  return {
    props: {
      ...(await serverSideTranslations(locale, ['common'])),
    }
  }
}

export default function Home() {
  return (
    <>
      <Head>
        <title>XRP Explorer | Scan the XRPL network.</title>
        <meta name="description" content="Explore XRP Ledger, check transactions for statuses, addresses for balances, NFTs, offers, tokens, escrows and checks." />
      </Head>
    </>
  )
}
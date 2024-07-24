import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import Mailto from 'react-protected-mailto'

import SEO from '../components/SEO'

import { getIsSsrMobile } from '../utils/mobile'

export async function getServerSideProps(context) {
  const { locale } = context
  return {
    props: {
      isSsrMobile: getIsSsrMobile(context),
      ...(await serverSideTranslations(locale, ['common'])),
    }
  }
}

export default function Eaas() {
  return (
    <>
      <SEO
        title="Explorer-as-a-Service (EaaS)"
        description="Spin up an Explorer for your XRPL sidechain"
      />
      <div className="content-text content-center">
        <h1 className='center'>Explorer-as-a-Service (EaaS)</h1>
        <p>
          By utilizing our unmatched expertise in creating a cutting-edge XRPL explorer, Bithomp is able to provide you with a whole, fully hosted, and fully-managed block explorer solution for your XRPL-compatible sidechain via EaaS.
        </p>
        <h2 className='center'>Key Features</h2>
        <ul>
          <li><b>Ledger Explorer</b> - a search engine that gives users quick, straightforward access to a variety of blockchain data.</li>
          <li><b>NFT Explorer</b> - an NFT Market Place experience to search and interact with NFTs.</li>
          <li><b>API Service</b> - a reach data API for various analytics and statistics.</li>
          <li><b>Admin panel</b> - manage human readable metadata for services, view statistics and more.</li>
        </ul>
        <br />
        <p className='bold'>Contact us <Mailto email='support@bithomp.com' headers={{ subject: 'Advertise' }} />.</p>
      </div>
    </>
  )
}

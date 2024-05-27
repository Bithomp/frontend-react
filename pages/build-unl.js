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

export default function Unl() {
  return (
    <>
      <SEO
        title="Unique Node List (UNL)"
        description="Create, Sign and Publish a UNL for your XRPL sidechain"
      />
      <div className="content-text content-center">
        <h1 className='center'>Unique Node List (UNL)</h1>
        <p>
          UNL is a Unique Node List of trustworthy validators, it is necessary for running rippled.
          Performance and operator identity make up the two main determinants of validator credibility.</p>
        <p>
          We can help you to Create, Sign and Publish a Unique Node List (UNL) for your XRPL sidechain.
        </p>
        <br />
        <p className='bold'>Contact us <Mailto email='support@bithomp.com' headers={{ subject: 'Advertise' }} />.</p>
      </div>
    </>
  )
}

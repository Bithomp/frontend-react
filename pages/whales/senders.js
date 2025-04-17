import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { getIsSsrMobile, useIsMobile } from '../../utils/mobile'

import SEO from '../../components/SEO'
import { axiosServer, passHeaders } from '../../utils/axios'
import { ledgerName } from '../../utils'
import { WhalesTable } from '../../components/WhalesTable'
import WhaleTabs from '../../components/Tabs/WhaleTabs'

export async function getServerSideProps(context) {
  const { locale, req } = context
  let data = []
  try {
    const res = await axiosServer({
      method: 'get',
      url: 'v2/address/whale/senders?limit=100',
      headers: passHeaders(req)
    })
    data = res?.data
  } catch (r) {
    data = r?.response?.data
  }

  return {
    props: {
      data,
      isSsrMobile: getIsSsrMobile(context),
      ...(await serverSideTranslations(locale, ['common']))
    }
  }
}

export default function Whales({ data }) {
  const isMobile = useIsMobile()

  return (
    <>
      <SEO title="Whale Senders" description="Addresses that are sending the most in the last 24 hours." />
      <div className="content-text">
        <WhaleTabs tab="senders" />
        <h1 className="center">{ledgerName + ' addresses that are sending the most in the last 24 hours'}</h1>

        <WhalesTable isMobile={isMobile} data={data} />
      </div>
    </>
  )
}

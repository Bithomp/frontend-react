import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { useState } from 'react'

import SEO from '../../components/SEO'
import Tabs from '../../components/Tabs'
import AMMCreateForm from '../../components/Services/Amm/AMMCreate'
import AMMVoteForm from '../../components/Services/Amm/AMMVote'
import { getIsSsrMobile } from '../../utils/mobile'

export const getServerSideProps = async (context) => {
  const { locale } = context
  return {
    props: {
      isSsrMobile: getIsSsrMobile(context),
      ...(await serverSideTranslations(locale, ['common']))
    }
  }
}

export default function AMMService({ setSignRequest }) {
  const [tab, setTab] = useState('create')

  const tabList = [
    { value: 'create', label: 'AMM Create' },
    { value: 'vote', label: 'AMM Vote' }
  ]

  return (
    <>
      <SEO title="AMM Services" description="Create or vote on Automated Market Makers on XRPL" />
      <div className="page-services-amm content-center">
        <h1 className="center">
            { tab === 'create' ? 'AMM Create' : 'AMM Vote' }
        </h1>
        <div className="center" >
          <Tabs tabList={tabList} tab={tab} setTab={setTab} name="ammTabs" />
        </div>
        {tab === 'create' && <AMMCreateForm setSignRequest={setSignRequest} />}
        {tab === 'vote' && <AMMVoteForm setSignRequest={setSignRequest} />}
      </div>
    </>
  )
} 
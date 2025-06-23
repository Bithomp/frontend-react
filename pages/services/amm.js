import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'

import SEO from '../../components/SEO'
import Tabs from '../../components/Tabs'
import AMMCreateForm from '../../components/Services/Amm/AMMCreate'
import AMMVoteForm from '../../components/Services/Amm/AMMVote'
import { getIsSsrMobile } from '../../utils/mobile'

export const getServerSideProps = async (context) => {
  const { locale, query } = context

  const initialTab = query?.tab === 'vote' ? 'vote' : 'create'

  return {
    props: {
      isSsrMobile: getIsSsrMobile(context),
      initialTab,
      ...(await serverSideTranslations(locale, ['common']))
    }
  }
}

export default function AMMService({ setSignRequest, initialTab }) {
  const [tab, setTab] = useState(initialTab)
  const router = useRouter()

  useEffect(() => {
    setTab(initialTab)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialTab])

  const handleTabChange = (newTab) => {
    setTab(newTab)
    router.push(
      {
        pathname: router.pathname,
        query: { ...router.query, tab: newTab }
      },
      undefined,
      { shallow: true }
    )
  }

  const tabList = [
    { value: 'create', label: 'AMM Create' },
    { value: 'vote', label: 'AMM Vote' }
  ]

  return (
    <>
      <SEO title="AMM Services" description="Create or vote on Automated Market Makers on XRPL" />
      <div className="page-services-amm content-center">
        <h1 className="center">{tab === 'create' ? 'AMM Create' : 'AMM Vote'}</h1>
        <div className="center">
          <Tabs tabList={tabList} tab={tab} setTab={handleTabChange} name="ammTabs" />
        </div>
        {tab === 'create' && <AMMCreateForm setSignRequest={setSignRequest} />}
        {tab === 'vote' && <AMMVoteForm setSignRequest={setSignRequest} />}
      </div>
    </>
  )
}

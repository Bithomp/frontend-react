import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'

import SEO from '../../components/SEO'
import Tabs from '../../components/Tabs'
import AMMCreateForm from '../../components/Services/Amm/AMMCreate'
import AMMVoteForm from '../../components/Services/Amm/AMMVote'
import { getIsSsrMobile } from '../../utils/mobile'
import AMMWithdrawForm from '../../components/Services/Amm/AMMWithdraw'
import AMMDepositForm from '../../components/Services/Amm/AMMDeposit'

const tabList = [
  { value: 'deposit', label: 'AMM Deposit' },
  { value: 'withdraw', label: 'AMM Withdraw' },
  { value: 'vote', label: 'AMM Vote' },
  { value: 'create', label: 'AMM Create' }
]

export const getServerSideProps = async (context) => {
  const { locale, query } = context
  const { tab, currency, currencyIssuer, currency2, currency2Issuer } = query

  const queryTab = tab.toLowerCase()

  return {
    props: {
      queryCurrency: currency || null,
      queryCurrencyIssuer: currencyIssuer || null,
      queryCurrency2: currency2 || null,
      queryCurrency2Issuer: currency2Issuer || null,
      isSsrMobile: getIsSsrMobile(context),
      initialTab: tabList.some((t) => t.value === queryTab) ? queryTab : 'create',
      ...(await serverSideTranslations(locale, ['common']))
    }
  }
}

export default function AMMService({
  setSignRequest,
  initialTab,
  queryCurrency,
  queryCurrencyIssuer,
  queryCurrency2,
  queryCurrency2Issuer
}) {
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

  return (
    <>
      <SEO title="AMM Services" description="Create or vote on Automated Market Makers" />
      <div className="page-services-amm content-center">
        <h1 className="center">{tabList.find((t) => t.value === tab)?.label || ''}</h1>
        <div className="center">
          <Tabs tabList={tabList} tab={tab} setTab={handleTabChange} name="ammTabs" />
        </div>
        {tab === 'create' && (
          <AMMCreateForm
            setSignRequest={setSignRequest}
            queryCurrency={queryCurrency}
            queryCurrencyIssuer={queryCurrencyIssuer}
            queryCurrency2={queryCurrency2}
            queryCurrency2Issuer={queryCurrency2Issuer}
          />
        )}
        {tab === 'vote' && (
          <AMMVoteForm
            setSignRequest={setSignRequest}
            queryCurrency={queryCurrency}
            queryCurrencyIssuer={queryCurrencyIssuer}
            queryCurrency2={queryCurrency2}
            queryCurrency2Issuer={queryCurrency2Issuer}
          />
        )}
        {tab === 'withdraw' && (
          <AMMWithdrawForm
            setSignRequest={setSignRequest}
            queryCurrency={queryCurrency}
            queryCurrencyIssuer={queryCurrencyIssuer}
            queryCurrency2={queryCurrency2}
            queryCurrency2Issuer={queryCurrency2Issuer}
          />
        )}
        {tab === 'deposit' && (
          <AMMDepositForm
            setSignRequest={setSignRequest}
            queryCurrency={queryCurrency}
            queryCurrencyIssuer={queryCurrencyIssuer}
            queryCurrency2={queryCurrency2}
            queryCurrency2Issuer={queryCurrency2Issuer}
          />
        )}
      </div>
    </>
  )
}

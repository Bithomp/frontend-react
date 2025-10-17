import { useRouter } from 'next/router'
import Tabs from '.'

export default function AmmTabs({ tab, params }) {
  const router = useRouter()

  let tabList = [
    { value: 'amms', label: 'AMM Pools' },
    { value: 'deposit', label: 'AMM Deposit' },
    { value: 'withdraw', label: 'AMM Withdraw' },
    { value: 'vote', label: 'AMM Vote' }
  ]

  if (tab !== 'amm') {
    tabList.push({ value: 'create', label: 'AMM Create' })
  }

  const tabChange = (newTab) => {
    if (newTab === 'amms') {
      router.push('/amms')
      return
    }

    router.push({
      pathname: '/services/amm/' + newTab,
      query: { ...params }
    })
  }

  return <Tabs tabList={tabList} tab={tab} setTab={tabChange} name="ammTabs" />
}

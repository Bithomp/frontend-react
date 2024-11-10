import { useRouter } from 'next/router'
import Tabs from '.'

export default function ProTabs({ tab }) {
  const router = useRouter()

  const tabList = [
    { value: 'addresses', label: 'Addresses' },
    { value: 'balance-changes', label: 'Balance changes' }
  ]

  const changePage = (tab) => {
    if (tab === 'addresses') {
      router.push('/admin/pro')
    } else if (tab === 'balance-changes') {
      router.push('/admin/pro/history')
    }
  }

  return <Tabs tabList={tabList} tab={tab} setTab={changePage} name="ProTabs" />
}

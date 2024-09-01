import { useRouter } from 'next/router'
import Tabs from '../Tabs'

export default function AdminTabs({ name, tab }) {
  const router = useRouter()

  const mainTabs = [
    { value: 'profile', label: 'Profile' },
    { value: 'subscriptions', label: 'Subscriptions' },
    //{ value: 'pro', label: 'Pro addresses' },
    { value: 'api', label: 'API' }
    //{ value: "bots", label: "Bots" },
  ]

  const apiTabs = [
    { value: 'api-info', label: 'Information' },
    { value: 'api-payments', label: 'Payments' },
    { value: 'api-statistics', label: 'Statistics' },
    { value: 'api-requests', label: 'Requests' },
    { value: 'api-charts', label: 'Charts' }
  ]

  const changePage = (tab) => {
    if (tab === 'api') {
      router.push('/admin/api')
    } else if (tab === 'bots') {
      router.push('/admin/bots')
    } else if (tab === 'subscriptions') {
      router.push('/admin/subscriptions')
    } else if (tab === 'profile') {
      router.push('/admin')
    } else if (tab === 'api-info') {
      router.push('/admin/api')
    } else if (tab === 'api-payments') {
      router.push('/admin/api/payments')
    } else if (tab === 'api-requests') {
      router.push('/admin/api/requests')
    } else if (tab === 'api-statistics') {
      router.push('/admin/api/statistics')
    } else if (tab === 'api-charts') {
      router.push('/admin/api/charts')
    } else if (tab === 'pro') {
      router.push('/admin/pro')
    }
  }

  if (name === 'apiTabs') return <Tabs tabList={apiTabs} tab={tab} setTab={changePage} name="apiTabs" />

  return <Tabs tabList={mainTabs} tab={tab} setTab={changePage} name="mainTabs" />
}

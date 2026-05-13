import { useRouter } from 'next/router'
import { useTranslation } from 'next-i18next'
import Tabs from '.'
import { devNet } from '../../utils'

export default function AdminTabs({ name, tab }) {
  const router = useRouter()
  const { t } = useTranslation('admin')

  const mainTabs = [
    { value: 'profile', label: t('tabs.profile') },
    { value: 'watchlist', label: t('tabs.watchlist') },
    { value: 'pro', label: t('tabs.my-addresses') },
    { value: 'api', label: 'API' },
    { value: 'notifications', label: t('tabs.alerts') }
  ]

  if (!devNet) {
    mainTabs.splice(2, 0, { value: 'subscriptions', label: t('tabs.subscriptions') })
    mainTabs.splice(4, 0, { value: 'referrals', label: t('tabs.referrals') })
  }

  const apiTabs = [
    { value: 'api-info', label: t('tabs.api.information') },
    { value: 'api-statistics', label: t('tabs.api.statistics') },
    { value: 'api-requests', label: t('tabs.api.requests') },
    { value: 'api-charts', label: t('tabs.api.charts') }
  ]

  const changePage = (tab) => {
    if (tab === 'api') {
      router.push('/admin/api')
    } else if (tab === 'subscriptions') {
      router.push('/admin/subscriptions')
    } else if (tab === 'profile') {
      router.push('/admin')
    } else if (tab === 'api-info') {
      router.push('/admin/api')
    } else if (tab === 'api-requests') {
      router.push('/admin/api/requests')
    } else if (tab === 'api-statistics') {
      router.push('/admin/api/statistics')
    } else if (tab === 'api-charts') {
      router.push('/admin/api/charts')
    } else if (tab === 'pro') {
      router.push('/admin/pro')
    } else if (tab === 'watchlist') {
      router.push('/admin/watchlist')
    } else if (tab === 'notifications') {
      router.push('/admin/notifications')
    } else if (tab === 'referrals') {
      router.push('/admin/referrals')
    }
  }

  if (name === 'apiTabs') return <Tabs tabList={apiTabs} tab={tab} setTab={changePage} name="apiTabs" />

  return <Tabs tabList={mainTabs} tab={tab} setTab={changePage} name="mainTabs" />
}

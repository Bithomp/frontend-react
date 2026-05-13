import { useRouter } from 'next/router'
import { useTranslation } from 'next-i18next'
import Tabs from '.'

export default function ProTabs({ tab }) {
  const router = useRouter()
  const { t } = useTranslation('admin')

  const tabList = [
    { value: 'addresses', label: t('tabs.pro.addresses') },
    { value: 'balance-changes', label: t('tabs.pro.balance-changes') }
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

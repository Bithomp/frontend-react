import { useRouter } from 'next/router'
import { useTranslation } from 'next-i18next'
import Tabs from '.'

export default function AmmTabs({ tab, params }) {
  const router = useRouter()
  const { t } = useTranslation(['common', 'services'])
  const ts = (key) => t(key, { ns: 'services' })

  let tabList = [
    { value: 'amms', label: ts('amm.tabs.pools') },
    { value: 'deposit', label: ts('amm.tabs.deposit') },
    { value: 'withdraw', label: ts('amm.tabs.withdraw') },
    { value: 'vote', label: ts('amm.tabs.vote') }
  ]

  if (tab !== 'amm') {
    tabList.push({ value: 'create', label: ts('amm.tabs.create') })
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

import { useRouter } from 'next/router'
import Tabs from '.'
import { useTranslation } from 'next-i18next'

export default function NetworkPagesTab({ tab }) {
  const router = useRouter()
  const { t } = useTranslation()

  const mainTabs = [
    { value: 'validators', label: t('menu.network.validators') },
    { value: 'amendments', label: t('menu.network.amendments') },
    { value: 'nodes', label: t('menu.network.nodes') }
  ]

  const changePage = (tab) => {
    router.push('/' + tab)
  }

  return <Tabs tabList={mainTabs} tab={tab} setTab={changePage} name="networkPagesTab" />
}

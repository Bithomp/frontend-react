import { useRouter } from 'next/router'
import { useTranslation } from 'next-i18next'
import Tabs from '.'

export default function TokenTabs({ tab }) {
  const router = useRouter()
  const { t } = useTranslation()

  const mainTabs = [
    { value: 'tokens', label: t('token-tabs.tokens') },
    { value: 'amms', label: t('token-tabs.amms') },
    { value: 'mpts', label: t('token-tabs.mpts') }
  ]

  const changePage = (tab) => {
    router.push('/' + tab)
  }

  return (
    <div className="center">
      <Tabs tabList={mainTabs} tab={tab} setTab={changePage} name="tokenTabs" />
    </div>
  )
}

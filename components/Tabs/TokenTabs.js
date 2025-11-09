import { useRouter } from 'next/router'
import Tabs from '.'

export default function TokenTabs({ tab }) {
  const router = useRouter()

  const mainTabs = [
    { value: 'tokens', label: 'Tokens' },
    { value: 'amms', label: 'Liqudity Provider Tokens' },
    { value: 'mpts', label: 'Multi-Purpose Tokens' }
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

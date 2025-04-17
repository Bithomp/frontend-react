import { useRouter } from 'next/router'
import Tabs from '.'

export default function WhaleTabs({ tab }) {
  const router = useRouter()

  const tabList = [
    { value: 'transactions', label: 'The largest transactions' },
    { value: 'receivers', label: 'Received the most' },
    { value: 'senders', label: 'Sent the most' }
  ]

  const changePage = (tab) => {
    if (tab === 'transactions') {
      router.push('/whales')
    } else if (tab === 'receivers') {
      router.push('/whales/receivers')
    } else if (tab === 'senders') {
      router.push('/whales/senders')
    }
  }

  return <Tabs tabList={tabList} tab={tab} setTab={changePage} name="ProTabs" />
}

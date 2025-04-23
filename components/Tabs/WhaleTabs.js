import { useRouter } from 'next/router'
import Tabs from '.'

export default function WhaleTabs({ tab }) {
  const router = useRouter()

  const tabList = [
    { value: 'transactions', label: 'The largest transactions' },
    { value: 'receivers', label: 'Received the most' },
    { value: 'senders', label: 'Sent the most' },
    { value: 'submitters', label: 'Submitted the most' }
  ]

  const changePage = (tab) => {
    if (tab === 'transactions') {
      router.push('/whales')
    } else if (tab === 'receivers') {
      router.push('/whales/receivers')
    } else if (tab === 'senders') {
      router.push('/whales/senders')
    } else if (tab === 'submitters') {
      router.push('/whales/submitters')
    }
  }

  return <Tabs tabList={tabList} tab={tab} setTab={changePage} name="ProTabs" />
}

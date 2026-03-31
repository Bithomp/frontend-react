import { useRouter } from 'next/router'
import Tabs from '.'

export default function AccountServiceTabs({ tab }) {
  const router = useRouter()

  const tabList = [
    { value: 'account-settings', label: 'Account Settings' },
    { value: 'account-control', label: 'Account Control' },
    { value: 'token-issuer-settings', label: 'Token Issuer Settings' }
  ]

  const tabChange = (newTab) => {
    router.push('/services/' + newTab)
  }

  return <Tabs tabList={tabList} tab={tab} setTab={tabChange} name="accountServiceTabs" />
}

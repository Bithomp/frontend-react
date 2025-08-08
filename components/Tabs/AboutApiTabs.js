import { useRouter } from 'next/router'
import Tabs from '.'

export default function AboutApiTabs({ tab }) {
  const router = useRouter()

  const mainTabs = [
    { value: 'about', label: 'About API' },
    { value: 'docs', label: 'API Documentation' },
    { value: 'panel', label: 'API keys and statistics' }
  ]

  const changePage = (tab) => {
    if (tab === 'panel') {
      router.push('/admin/api')
      return
    }
    if (tab === 'docs') {
      location.href = 'https://docs.bithomp.com'
      return
    }
    if (tab === 'about') {
      router.push('/learn/the-bithomp-api')
      return
    }
  }

  return <Tabs tabList={mainTabs} tab={tab} setTab={changePage} name="aboutApiTabs" />
}

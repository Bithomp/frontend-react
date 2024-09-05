import { useRouter } from 'next/router'
import Tabs from '.'
import { useTranslation } from 'next-i18next'
import { useEffect, useState } from 'react'

export default function NftTabs({ tab, url }) {
  const router = useRouter()
  const { t } = useTranslation()

  const [rendered, setRendered] = useState(false)

  useEffect(() => {
    setRendered(true)
  }, [])

  const mainTabs = [
    { value: 'nft-explorer', label: t('nft-explorer.header') },
    { value: 'nft-sales', label: t('nft-sales.header') }
  ]

  const changePage = () => {
    router.push(url)
  }

  if (!rendered) return <div style={{ height: '51px' }}></div>

  return (
    <div className="center">
      <Tabs tabList={mainTabs} tab={tab} setTab={changePage} name="nftTabs" />
    </div>
  )
}

import Tabs from '.'

import { networks, network } from '../../utils'
import { useRouter } from 'next/router'

export default function NetworkTabs() {
  const router = useRouter()

  let apiTabs = [
    { value: 'mainnet', label: networks['mainnet'].explorerName },
    { value: 'testnet', label: networks['testnet'].explorerName },
    { value: 'devnet', label: networks['devnet'].explorerName },
    { value: 'xahau', label: networks['xahau'].explorerName },
    { value: 'xahau-testnet', label: networks['xahau-testnet'].explorerName },
    { value: 'xahau-jshooks', label: networks['xahau-jshooks'].explorerName }
  ]

  const changePage = (tab) => {
    const server = networks[tab].server
    location.href = server + router.asPath
  }

  return <Tabs tabList={apiTabs} tab={network} setTab={changePage} name="apiTabs" />
}

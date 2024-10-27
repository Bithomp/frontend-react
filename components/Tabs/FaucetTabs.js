import Tabs from '.'

import { networks, network } from '../../utils'
import { useRouter } from 'next/router'

export default function FaucetTabs() {
  const router = useRouter()

  let apiTabs = [
    { value: 'testnet', label: networks['testnet'].explorerName },
    { value: 'devnet', label: networks['devnet'].explorerName },
    { value: 'xahau-testnet', label: networks['xahau-testnet'].explorerName }
  ]

  const changePage = (tab) => {
    const server = networks[tab].server
    location.href = server + router.asPath
  }

  return <Tabs tabList={apiTabs} tab={network} setTab={changePage} name="apiTabs" />
}

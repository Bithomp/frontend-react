import Tabs from '.'

import { networks, network } from '../../utils'

export default function FaucetTabs() {
  let apiTabs = [
    { value: 'testnet', label: networks['testnet'].explorerName },
    { value: 'devnet', label: networks['devnet'].explorerName },
    { value: 'xahau-testnet', label: networks['xahau-testnet'].explorerName }
  ]

  const changePage = (tab) => {
    const server = networks[tab].server
    location.href = server + '/faucet'
  }

  return <Tabs tabList={apiTabs} tab={network} setTab={changePage} name="apiTabs" />
}

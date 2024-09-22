import Tabs from '.'

import { networks, network, devNet } from '../../utils'

export default function FaucetTabs() {
  let apiTabs = [
    { value: 'testnet', label: networks['testnet'].explorerName },
    { value: 'devnet', label: networks['devnet'].explorerName },
    { value: 'xahau-testnet', label: networks['xahau-testnet'].explorerName }
  ]

  if (!devNet) {
    apiTabs = [
      { value: 'mainnet', label: networks['mainnet'].explorerName },
      { value: 'xahau', label: networks['xahau'].explorerName },
      ...apiTabs
    ]
  }

  const changePage = (tab) => {
    const server = networks[tab].server
    location.href = server + '/faucet'
  }

  return <Tabs tabList={apiTabs} tab={network} setTab={changePage} name="apiTabs" />
}

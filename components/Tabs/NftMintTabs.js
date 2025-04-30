import { networks, network } from '../../utils'
import { useRouter } from 'next/router'
import Tabs from '../Tabs'

export default function NftMintTabs() {
  const router = useRouter()

  // Only include XRPL (mainnet) and Xahau per the requirement
  const mintTabs = [
    { value: 'mainnet', label: networks['mainnet'].explorerName },
    { value: 'xahau', label: networks['xahau'].explorerName }
  ]

  const changePage = (tab) => {
    const server = networks[tab].server
    location.href = server + router.asPath
  }

  return <Tabs tabList={mintTabs} tab={network} setTab={changePage} name="mintTabs" />
}

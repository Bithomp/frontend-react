import { useRouter } from 'next/router'
import Tabs from '.'
import { useEffect, useState } from 'react'

export default function NftCollectionTabs({ tab, collectionPart }) {
  const router = useRouter()

  const [rendered, setRendered] = useState(false)

  useEffect(() => {
    setRendered(true)
  }, [])

  let mainTabs = [
    { value: 'collections', label: 'NFT collections' },
    { value: 'nfts', label: 'View All NFTs' },
    { value: 'sold', label: 'Last Sold NFTs' },
    { value: 'listed', label: 'Listed NFTs' },
    { value: 'holders', label: 'NFT Holders' }
  ]

  if (tab === 'holders' && collectionPart) {
    //mainTabs = mainTabs.filter((t) => t.value !== 'holders')
    mainTabs.unshift({ value: 'collection', label: 'NFT collection' })
  }

  const remapCollectionPart = (collectionPart) => {
    const params = new URLSearchParams(collectionPart)

    const issuer = params.get('issuer')
    const taxon = params.get('taxon')

    if (!issuer || !taxon) return collectionPart // fallback

    return `${issuer}:${taxon}`
  }

  const changePage = (tab) => {
    let url = '/nft-volumes?period=week'
    if (tab === 'nfts') url = `/nft-explorer?${collectionPart}&includeWithoutMediaData=true`
    else if (tab === 'sold')
      url = `/nft-sales?${collectionPart}&sale=primaryAndSecondary&includeWithoutMediaData=true&period=all&order=soldNew`
    else if (tab === 'listed')
      url = `/nft-explorer?${collectionPart}&list=onSale&includeWithoutMediaData=true&saleDestination=publicAndKnownBrokers`
    else if (tab === 'holders') url = `/nft-distribution?${collectionPart}`
    else if (tab === 'collection') url = `/nft-collection/${remapCollectionPart(collectionPart)}`
    router.push(url)
  }

  if (!rendered) return <div style={{ height: '51px' }}></div>

  return (
    <div className="center">
      <Tabs
        style={{ marginTop: 20, marginBottom: 20 }}
        tabList={mainTabs}
        tab={tab}
        setTab={changePage}
        name="nftTabs"
      />
    </div>
  )
}

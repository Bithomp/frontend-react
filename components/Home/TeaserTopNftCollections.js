import { useTranslation } from 'next-i18next'
import { useEffect, useState } from 'react'
import HomeTeaser, { HomeTeaseRow } from './HomeTeaser'
import { shortNiceNumber } from '../../utils/format'
import { collectionNameText, collectionThumbnail } from '../../utils/nft'
import { fetchTeaserNftCollectionsClient } from '../../utils/homeTeaserClientData'
import styles from '@/styles/components/home-teaser.module.scss'

export default function TeaserTopNftCollections({ data = [], isLoading = false, selectedCurrency }) {
  const { t } = useTranslation()
  const [items, setItems] = useState(data)
  const [isInitialLoading, setIsInitialLoading] = useState(!data?.length || isLoading)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const topCollections = items?.slice(0, 5) || []
  const loading = isInitialLoading && !topCollections.length
  const showRefresh = isInitialLoading || isRefreshing || !topCollections.length

  useEffect(() => {
    if (data?.length) {
      setItems(data)
      setIsInitialLoading(false)
    }
  }, [data])

  useEffect(() => {
    let cancelled = false

    const loadData = async () => {
      setIsInitialLoading(true)
      setItems([])
      try {
        const latest = await fetchTeaserNftCollectionsClient(selectedCurrency)
        if (!cancelled) {
          setItems(latest)
        }
      } finally {
        if (!cancelled) {
          setIsInitialLoading(false)
        }
      }
    }

    loadData()
    return () => {
      cancelled = true
    }
  }, [selectedCurrency])

  const refreshData = async () => {
    setIsRefreshing(true)
    try {
      setItems(await fetchTeaserNftCollectionsClient(selectedCurrency))
    } finally {
      setIsRefreshing(false)
    }
  }

  return (
    <HomeTeaser
      title="home.teaser.topNftCollections"
      titleNote={t('tabs.week')}
      href="/nft-volumes?period=week&sale=primaryAndSecondary"
      isLoading={loading}
      isRefreshing={isRefreshing || isInitialLoading}
      onRefresh={showRefresh ? refreshData : null}
      isEmpty={!topCollections.length}
    >
      {topCollections.map((collection, index) => {
        const collectionName =
          collectionNameText(collection.collectionDetails) || collection.collection || 'NFT Collection'
        const sales = collection.sales || 0
        const volumeCurrency = Object.keys(collection.volumesInConvertCurrencies || {})[0]
        const volume = volumeCurrency ? collection.volumesInConvertCurrencies?.[volumeCurrency] : null
        const collectionHref = collection.collection ? `/nft-collection/${collection.collection}` : null

        return (
          <HomeTeaseRow
            key={collection.issuer || collection.collection || index}
            href={collectionHref}
            className={styles.rowNftSlightTall}
          >
            <div className={styles.collectionNameCell}>
              {collection.collectionDetails ? collectionThumbnail(collection.collectionDetails) : null}
              <div className={styles.collectionNameText}>{collectionName}</div>
            </div>
            <div className={styles.metric}>
              {shortNiceNumber(sales, 0)} {t('common.sales')}
            </div>
            <div className={styles.metric} suppressHydrationWarning>
              {volumeCurrency ? shortNiceNumber(volume, 2, 1, volumeCurrency) : 'N/A'}
            </div>
          </HomeTeaseRow>
        )
      })}
    </HomeTeaser>
  )
}

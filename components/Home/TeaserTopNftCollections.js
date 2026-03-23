import { useTranslation } from 'next-i18next'
import HomeTeaser, { HomeTeaseRow } from './HomeTeaser'
import { shortNiceNumber } from '../../utils/format'
import { collectionNameText, collectionThumbnail } from '../../utils/nft'
import styles from '@/styles/components/home-teaser.module.scss'

export default function TeaserTopNftCollections({ data = [], isLoading = false }) {
  const { t } = useTranslation()
  const topCollections = data?.slice(0, 5) || []

  return (
    <HomeTeaser
      title="home.teaser.topNftCollections"
      titleNote={t('tabs.week')}
      href="/nft-volumes"
      isLoading={isLoading}
      isEmpty={!topCollections.length}
    >
      {topCollections.map((collection, index) => {
        const collectionName =
          collectionNameText(collection.collectionDetails) || collection.collection || 'NFT Collection'
        const sales = collection.sales || 0
        const volumeCurrency = Object.keys(collection.volumesInConvertCurrencies || {})[0]
        const volume = volumeCurrency ? collection.volumesInConvertCurrencies?.[volumeCurrency] : null

        return (
          <HomeTeaseRow key={collection.issuer || collection.collection || index} className={styles.rowNftSlightTall}>
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

import { useTranslation } from 'next-i18next'
import { useEffect, useState } from 'react'
import HomeTeaser, { HomeTeaseRow } from './HomeTeaser'
import { shortNiceNumber } from '../../utils/format'
import { dappBySourceTag } from '../../utils/transaction'
import DappLogo from '../Dapps/DappLogo'
import { DAPPS_META } from '../../utils/dapps'
import { fetchTeaserDappsClient } from '../../utils/homeTeaserClientData'
import Delta from '../UI/Delta'
import styles from '@/styles/components/home-teaser.module.scss'

export default function TeaserTopDapps({ data = [], isLoading = false, selectedCurrency }) {
  const { t } = useTranslation()
  const [items, setItems] = useState(data)
  const [isInitialLoading, setIsInitialLoading] = useState(!data?.length || isLoading)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const topDapps = items?.slice(0, 5) || []
  const loading = isInitialLoading && !topDapps.length
  const showRefresh = isInitialLoading || isRefreshing || !topDapps.length
  const dappsMeta = DAPPS_META?.[0] || {}

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
        const latest = await fetchTeaserDappsClient(selectedCurrency)
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
      setItems(await fetchTeaserDappsClient(selectedCurrency))
    } finally {
      setIsRefreshing(false)
    }
  }

  const getVolume = (dapp) => {
    if (dapp?.currentVolume == null) {
      return shortNiceNumber(dapp?.totalSent || 0, 2)
    }
    return shortNiceNumber(dapp.currentVolume, 2, 1, dapp.volumeCurrency)
  }

  return (
    <HomeTeaser
      title="home.teaser.topDapps"
      titleNote="24h"
      href="/dapps"
      isLoading={loading}
      isRefreshing={isRefreshing || isInitialLoading}
      onRefresh={showRefresh ? refreshData : null}
      isEmpty={!topDapps.length}
    >
      {topDapps.map((dapp, index) => (
        <HomeTeaseRow key={dapp.name || index} href={`/dapp/${encodeURIComponent(dapp.sourceTag)}`}>
          <div className={styles.dappNameCell}>
            {dappsMeta?.[String(dapp.sourceTag)]?.logo && (
              <DappLogo src={`/images/dapps/${dappsMeta[String(dapp.sourceTag)].logo}`} width={30} height={30} />
            )}
            <div className={styles.dappNameText}>{dappBySourceTag(dapp.sourceTag) || dapp.name || dapp.sourceTag}</div>
          </div>
          <div className={`${styles.metric} ${styles.metricWithDelta}`}>
            {shortNiceNumber(dapp.uniqueSourceAddresses, 0)} {t('common.addresses')}
            <Delta inline cur={dapp.uniqueSourceAddresses} prev={dapp.prevUniqueSourceAddresses} />
          </div>
          <div className={`${styles.metric} ${styles.metricWithDelta}`}>
            <span suppressHydrationWarning>{getVolume(dapp)}</span>
            <Delta inline cur={dapp.currentVolume} prev={dapp.prevVolume} />
          </div>
        </HomeTeaseRow>
      ))}
    </HomeTeaser>
  )
}

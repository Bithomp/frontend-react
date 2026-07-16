import { useState, useEffect, useMemo } from 'react'
import axios from 'axios'

import { AddressWithIconInline, shortNiceNumber } from '../../utils/format'
import HomeTeaser, { HomeTeaseRow } from './HomeTeaser'
import styles from '@/styles/components/home-teaser.module.scss'

const formatTxTime = (tx) => {
  const raw = tx?.time ?? tx?.timestamp
  const ts = Number(raw)
  if (!Number.isFinite(ts) || ts <= 0) return '--:--'
  return new Date(ts * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
}

const normalizeWhaleTransactions = (data) => {
  if (Array.isArray(data)) return data
  if (Array.isArray(data?.transactions)) return data.transactions
  if (Array.isArray(data?.data)) return data.data
  if (Array.isArray(data?.items)) return data.items
  return []
}

export default function Whales({ currency, data, setData }) {
  const [oldData, setOldData] = useState(null)
  const [difference, setDifference] = useState(null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const whaleTransactions = useMemo(() => normalizeWhaleTransactions(data), [data])
  const showRefresh = isRefreshing || !whaleTransactions.length
  const checkStatApi = async () => {
    setIsRefreshing(true)
    try {
      const response = await axios('v2/transactions/whale?limit=8')
      const nextData = normalizeWhaleTransactions(response.data)
      if (nextData) {
        setData(nextData)
      }
    } catch (error) {
      // Keep the current list visible if the refresh request fails.
    } finally {
      setIsRefreshing(false)
    }
  }

  useEffect(() => {
    if (oldData && whaleTransactions.length) {
      const change = whaleTransactions.filter(({ hash: id1 }) => !oldData.some(({ hash: id2 }) => id2 === id1))
      setDifference(change)
    }
    setOldData(whaleTransactions)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, whaleTransactions])

  useEffect(() => {
    checkStatApi()
    return () => {
      setDifference(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <HomeTeaser
      title="menu.network.top-transfers-24h"
      titleNote="24h"
      href="/whales"
      isLoading={!data}
      isRefreshing={isRefreshing || !data}
      onRefresh={showRefresh ? checkStatApi : null}
      isEmpty={!whaleTransactions.length}
      className={styles.whaleCard}
    >
      {whaleTransactions.slice(0, 8).map((tx) => (
        <HomeTeaseRow
          key={tx.hash}
          href={`/tx/${tx.hash}`}
          className={`${styles.whaleRow} ${difference?.includes(tx) ? 'just-added' : ''}`}
        >
          <div className={styles.timeAgo}>{formatTxTime(tx)}</div>
          <div className={`${styles.itemName} ${styles.whaleAddressCell}`}>
            <AddressWithIconInline data={tx} name="sourceAddress" options={{ short: 4, noLink: true }} />
          </div>
          <div className={styles.whaleArrow}>→</div>
          <div className={`${styles.itemName} ${styles.whaleAddressCell}`}>
            <AddressWithIconInline data={tx} name="destinationAddress" options={{ short: 4, noLink: true }} />
          </div>
          <div className={`${styles.metric} ${styles.whaleFiat}`}>
            {tx.amountFiats ? shortNiceNumber(tx.amountFiats[currency?.toLowerCase()], 2, 1, currency) : ''}
          </div>
        </HomeTeaseRow>
      ))}
    </HomeTeaser>
  )
}

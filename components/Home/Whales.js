import { useState, useEffect } from 'react'
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

export default function Whales({ currency, data, setData }) {
  const [oldData, setOldData] = useState(null)
  const [difference, setDifference] = useState(null)
  const checkStatApi = async () => {
    const response = await axios('v2/transactions/whale?limit=7')
    const data = response.data
    if (data) {
      setData(data)
    }
  }

  useEffect(() => {
    if (oldData && data) {
      const change = data.filter(({ hash: id1 }) => !oldData.some(({ hash: id2 }) => id2 === id1))
      setDifference(change)
    }
    setOldData(data)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data])

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
      isEmpty={!data?.length}
    >
      {data?.slice(0, 7).map((tx) => (
        <HomeTeaseRow
          key={tx.hash}
          href={`/transaction/${tx.hash}`}
          className={`${styles.whaleRow} ${difference?.includes(tx) ? 'just-added' : ''}`}
        >
          <div className={styles.timeAgo}>{formatTxTime(tx)}</div>
          <div className={`${styles.itemName} ${styles.whaleAddressCell}`}>
            <AddressWithIconInline data={tx} name="sourceAddress" options={{ short: 3, noLink: true }} />
          </div>
          <div className={styles.whaleArrow}>→</div>
          <div className={`${styles.itemName} ${styles.whaleAddressCell}`}>
            <AddressWithIconInline data={tx} name="destinationAddress" options={{ short: 3, noLink: true }} />
          </div>
          <div className={`${styles.metric} ${styles.whaleFiat}`}>
            {tx.amountFiats ? shortNiceNumber(tx.amountFiats[currency?.toLowerCase()], 2, 1, currency) : ''}
          </div>
        </HomeTeaseRow>
      ))}
    </HomeTeaser>
  )
}

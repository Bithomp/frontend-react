import { useState, useEffect, useLayoutEffect, useRef } from 'react'
import { useTranslation } from 'next-i18next'
import axios from 'axios'

import { AddressWithIconInline, shortNiceNumber, timeFromNow } from '../../utils/format'
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
  const [timeColWidth, setTimeColWidth] = useState(null)
  const [sourceColWidth, setSourceColWidth] = useState(null)
  const timeCellRefs = useRef([])
  const sourceCellRefs = useRef([])
  const { i18n } = useTranslation()

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

  useLayoutEffect(() => {
    const rowCount = data?.slice(0, 7)?.length || 0
    const width = timeCellRefs.current.slice(0, rowCount).reduce((max, el) => {
      if (!el) return max
      return Math.max(max, Math.ceil(el.scrollWidth))
    }, 0)
    setTimeColWidth(width || null)

    const sourceWidth = sourceCellRefs.current.slice(0, rowCount).reduce((max, el) => {
      if (!el) return max
      return Math.max(max, Math.ceil(el.scrollWidth))
    }, 0)
    setSourceColWidth(sourceWidth || null)
  }, [data, i18n.language])

  return (
    <HomeTeaser
      title="menu.network.top-transfers-24h"
      titleNote="24h"
      href="/whales"
      isLoading={false}
      isEmpty={!data?.length}
    >
      {data?.slice(0, 7).map((tx, index) => (
        <HomeTeaseRow
          key={tx.hash}
          href={`/transaction/${tx.hash}`}
          className={`${styles.whaleRow} ${difference?.includes(tx) ? 'just-added' : ''}`}
          style={{
            '--whale-time-col': timeColWidth ? `${timeColWidth}px` : undefined,
            '--whale-source-col': sourceColWidth ? `${sourceColWidth}px` : undefined
          }}
        >
          <div
            ref={(el) => {
              timeCellRefs.current[index] = el
            }}
            className={styles.timeAgo}
            style={timeColWidth ? { width: `${timeColWidth}px` } : undefined}
          >
            <span className={styles.whaleTimeAgo}>{timeFromNow(tx.time || tx.timestamp, i18n)}</span>
            <span className={styles.whaleTimeOnly}>{formatTxTime(tx)}</span>
          </div>
          <div
            ref={(el) => {
              sourceCellRefs.current[index] = el
            }}
            className={`${styles.itemName} ${styles.whaleAddressCell}`}
          >
            <AddressWithIconInline data={tx} name="sourceAddress" options={{ short: 3 }} />
          </div>
          <div className={styles.whaleArrow}>→</div>
          <div className={`${styles.itemName} ${styles.whaleAddressCell}`}>
            <AddressWithIconInline data={tx} name="destinationAddress" options={{ short: 3 }} />
          </div>
          <div className={`${styles.metric} ${styles.whaleFiat}`}>
            {tx.amountFiats ? shortNiceNumber(tx.amountFiats[currency?.toLowerCase()], 2, 1, currency) : ''}
          </div>
        </HomeTeaseRow>
      ))}
    </HomeTeaser>
  )
}

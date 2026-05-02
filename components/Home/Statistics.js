import { useEffect } from 'react'
import Link from 'next/link'
import { useTranslation } from 'next-i18next'
import axios from 'axios'

import { xahauNetwork } from '../../utils'
import { amountFormat, niceNumber } from '../../utils/format'
import { LedgerLink } from '../../utils/links'
import CopyButton from '../UI/CopyButton'
import styles from '@/styles/components/home-teaser.module.scss'

export default function Statistics({ data, setData, title, mode = 'activity', fetchOnMount = true }) {
  const { t } = useTranslation()

  const checkStatApi = async () => {
    const response = await axios('v2/statistics')
    const data = response.data
    if (data) {
      setData(data)
    }
  }

  useEffect(() => {
    if (!fetchOnMount) {
      return
    }
    checkStatApi()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchOnMount])

  const validatedLedger = data?.validatedLedger
  const transactions24h = data?.transactions?.last24h
  const accounts = data?.accounts

  const ledgerIndex = validatedLedger?.ledgerIndex
  const closedAt = validatedLedger?.ledgerTime
    ? new Date(validatedLedger.ledgerTime * 1000).toLocaleTimeString()
    : '--:--:--'
  const txCount = validatedLedger?.transactionsCount ? niceNumber(validatedLedger.transactionsCount) : '0'
  const quorum = data?.validationQuorum ?? '0'
  const proposers = data?.lastClose?.proposers ?? '0'

  const createdAccounts = accounts ? niceNumber((accounts.created || 0) - (accounts.deleted || 0)) : '0'
  const registeredUsernames = niceNumber(data?.usernames || 0)
  const escrowsCount = niceNumber(data?.escrows?.existing || 0)
  const ammsCount = niceNumber(data?.amms?.existing || 0)
  const nodesCount = niceNumber(data?.nodes?.total || 0)

  const activeAccounts24h = niceNumber(transactions24h?.accounts || 0)
  const transactionsCount24h = niceNumber(transactions24h?.success || 0)
  const payments24h = niceNumber(transactions24h?.successPayments || 0)
  const fees24h = transactions24h?.fee ? amountFormat(transactions24h.fee) : '0'

  const hooksTx24h = niceNumber(transactions24h?.hooksEmitted || 0)

  return (
    <div className={`home-statistics home-statistics--${mode}`}>
      {title && mode === 'activity' && (
        <div className={`${styles.cardHeader} statistics-header`}>
          <div className={styles.cardHeaderTitleWrap}>
            <div className={`${styles.cardHeaderTitle} statistics-section-title`}>{title}</div>
            <span className={styles.cardHeaderNote}>24h</span>
          </div>
        </div>
      )}

      {mode === 'activity' && (
        <div className="statistics-top-grid">
          <div className="statistics-top-item">
            <span className="label">{t('home.stat.accountsActiveLast24h')}</span>
            <span className="value">{activeAccounts24h}</span>
          </div>
          <div className="statistics-top-item">
            <span className="label">{t('home.stat.transactionsLast24h')}</span>
            <span className="value">{transactionsCount24h}</span>
          </div>
          <div className="statistics-top-item">
            <span className="label">{t('home.stat.paymentsLast24h')}</span>
            <span className="value">{payments24h}</span>
          </div>
          <div className="statistics-top-item">
            <span className="label">{t('home.stat.feesLast24h')}</span>
            <span className="value">{fees24h}</span>
          </div>
        </div>
      )}

      {mode === 'ledger' && (
        <div className="statistics-section">
          <div className={`${styles.cardHeader} statistics-header`}>
            <div className={styles.cardHeaderTitleWrap}>
              <div className={`${styles.cardHeaderTitle} statistics-section-title`}>The last ledger</div>
            </div>
            <Link href="/last-ledger-information" className={styles.cardHeaderLink} prefetch={false}>
              {t('common.viewAll')}
            </Link>
          </div>
          <div className="statistics-row">
            <span>{t('home.stat.ledger-index')}</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              {ledgerIndex ? <LedgerLink version={ledgerIndex} /> : '0'}
              {!!ledgerIndex && <CopyButton text={String(ledgerIndex)} size={16} tooltipClassName="small ledger-copy-tooltip" />}
            </span>
          </div>
          <div className="statistics-row">
            <span>{t('home.stat.close-time')}</span>
            <span>{closedAt}</span>
          </div>
          <div className="statistics-row">
            <span>{t('home.stat.transactions')}</span>
            <span>{ledgerIndex ? <LedgerLink version={ledgerIndex} text={txCount} /> : txCount}</span>
          </div>
          <div className="statistics-row">
            <span>{t('home.stat.quorum')}</span>
            <span>
              {quorum} (
              <Link href="/validators" prefetch={false}>
                {proposers} {t('home.stat.proposers')}
              </Link>
              )
            </span>
          </div>
        </div>
      )}

      {mode === 'network' && (
        <div className="statistics-section">
          <div className={`${styles.cardHeader} statistics-header`}>
            <div className={styles.cardHeaderTitleWrap}>
              <div className={`${styles.cardHeaderTitle} statistics-section-title`}>Network</div>
            </div>
          </div>
          <div className="statistics-row">
            <span>{t('home.stat.accounts')}</span>
            <span>
              <Link href="/activations?period=all" prefetch={false}>{createdAccounts}</Link>
            </span>
          </div>
          <div className="statistics-row">
            <span>{t('home.stat.usernames')}</span>
            <span>
              <Link href="/username" prefetch={false}>{registeredUsernames}</Link>
            </span>
          </div>
          <div className="statistics-row">
            <span>{t('home.stat.escrows')}</span>
            <span>
              <Link href="/distribution?escrow=locked" prefetch={false}>{escrowsCount}</Link>
            </span>
          </div>
          {!xahauNetwork && (
            <div className="statistics-row">
              <span>{t('home.stat.amms')}</span>
              <span>
                <Link href="/amms" prefetch={false}>{ammsCount}</Link>
              </span>
            </div>
          )}
          <div className="statistics-row">
            <span>{t('home.stat.nodes')}</span>
            <span>
              <Link href="/nodes" prefetch={false}>{nodesCount}</Link>
            </span>
          </div>
          {xahauNetwork && (
            <div className="statistics-row">
              <span>Hooks txs (24h)</span>
              <span>{hooksTx24h}</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

import axios from 'axios'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'next-i18next'
import { FaArrowsRotate } from 'react-icons/fa6'

import { useIsMobile } from '../../utils/mobile'
import { dappTransactionsApiUrl } from '../../utils/dapps'
import {
  TransactionRowDetails,
  TransactionRowAccountDelete,
  TransactionRowAccountSet,
  TransactionRowAMM,
  TransactionRowCheck,
  TransactionRowDID,
  TransactionRowEscrow,
  TransactionRowImport,
  TransactionRowNFToken,
  TransactionRowOffer,
  TransactionRowPayment,
  TransactionRowSetRegularKey,
  TransactionRowSignerListSet,
  TransactionRowTrustSet,
  TransactionRowURIToken,
  TransactionRowRemit,
  TransactionRowEnableAmendment,
  TransactionRowUNLModify,
  TransactionRowDelegateSet
} from '../Account/Transactions'
import styles from '../../styles/components/dappTransactions.module.scss'

const transactionRow = (type) => {
  if (type === 'AccountDelete') return TransactionRowAccountDelete
  if (type === 'AccountSet') return TransactionRowAccountSet
  if (type?.includes('AMM')) return TransactionRowAMM
  if (type?.includes('Check')) return TransactionRowCheck
  if (type?.includes('Escrow')) return TransactionRowEscrow
  if (type === 'Import') return TransactionRowImport
  if (type?.includes('NFToken')) return TransactionRowNFToken
  if (type === 'OfferCreate' || type === 'OfferCancel') return TransactionRowOffer
  if (type === 'Payment') return TransactionRowPayment
  if (type === 'SetRegularKey') return TransactionRowSetRegularKey
  if (type === 'SignerListSet') return TransactionRowSignerListSet
  if (type === 'DelegateSet') return TransactionRowDelegateSet
  if (type === 'TrustSet') return TransactionRowTrustSet
  if (type?.includes('DID')) return TransactionRowDID
  if (type?.includes('URIToken')) return TransactionRowURIToken
  if (type === 'Remit') return TransactionRowRemit
  if (type === 'EnableAmendment') return TransactionRowEnableAmendment
  if (type === 'UNLModify') return TransactionRowUNLModify
  return TransactionRowDetails
}

export default function DappTransactions({ sourceTag, currency, knownTypes = [], initialData, initialErrorMessage }) {
  const { t } = useTranslation('dapps')
  const { t: accountT } = useTranslation('account')
  const isMobile = useIsMobile(700)
  const firstRequestRef = useRef(true)
  const [type, setType] = useState('all')
  const [transactions, setTransactions] = useState(initialData?.transactions || [])
  const [marker, setMarker] = useState(initialData?.marker || null)
  const [loading, setLoading] = useState(!initialData)
  const [loadingMore, setLoadingMore] = useState(false)
  const [errorMessage, setErrorMessage] = useState(initialErrorMessage || '')
  const [refreshVersion, setRefreshVersion] = useState(0)

  const typeOptions = useMemo(() => {
    const types = new Set(knownTypes.filter(Boolean))
    transactions.forEach((transaction) => {
      if (transaction?.tx?.TransactionType) types.add(transaction.tx.TransactionType)
    })
    return [...types].sort()
  }, [knownTypes, transactions])

  useEffect(() => {
    if (firstRequestRef.current) {
      firstRequestRef.current = false
      const initialCurrency = String(initialData?.convertCurrencies?.[0] || '').toLowerCase()
      if (initialData && type === 'all' && (!initialCurrency || initialCurrency === currency)) return
    }

    const controller = new AbortController()
    let active = true
    setLoading(true)
    setTransactions([])
    setMarker(null)
    setErrorMessage('')
    axios
      .get(dappTransactionsApiUrl(sourceTag, currency, { type }), { signal: controller.signal })
      .then((response) => {
        if (!active) return
        setTransactions(response?.data?.transactions || [])
        setMarker(response?.data?.marker || null)
      })
      .catch((error) => {
        if (active && error?.message !== 'canceled') setErrorMessage(error?.message || t('detail.transactionsLoadError'))
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
      controller.abort()
    }
  }, [currency, initialData, refreshVersion, sourceTag, t, type])

  const loadMore = async () => {
    if (!marker || loadingMore) return
    setLoadingMore(true)
    setErrorMessage('')
    try {
      const response = await axios.get(dappTransactionsApiUrl(sourceTag, currency, { type, marker }))
      setTransactions((current) => [...current, ...(response?.data?.transactions || [])])
      setMarker(response?.data?.marker || null)
    } catch (error) {
      setErrorMessage(error?.message || t('detail.transactionsLoadError'))
    } finally {
      setLoadingMore(false)
    }
  }

  return (
    <>
      <section className={styles.section}>
        <div className={styles.header}>
          <div>
            <h2>{t('detail.recentTransactions')}</h2>
            <span>{t('detail.transactionsAvailability')}</span>
          </div>
          <div className={styles.headerActions}>
            <label className={styles.controls}>
              <span>{t('detail.transactionType')}</span>
              <select value={type} onChange={(event) => setType(event.target.value)}>
                <option value="all">{t('detail.allTransactionTypes')}</option>
                {typeOptions.map((option) => <option value={option} key={option}>{option}</option>)}
              </select>
            </label>
            <button
              className={styles.refreshButton}
              type="button"
              onClick={() => setRefreshVersion((value) => value + 1)}
              disabled={loading || loadingMore}
              aria-label={accountT('detail.aria.reload-transactions')}
              title={accountT('detail.actions.update')}
            >
              <FaArrowsRotate className={loading ? styles.spinning : ''} aria-hidden="true" />
            </button>
          </div>
        </div>

        {loading ? <div className={styles.status}><span className="waiting" /></div> : null}
        {!loading && transactions.length ? (
          <div className={styles.tableWrap}>
            <table className={isMobile ? 'table-mobile' : 'table-large expand no-hover'}>
              <tbody>
                {transactions.map((transaction, index) => {
                  const Row = transactionRow(transaction?.tx?.TransactionType)
                  const address = transaction?.specification?.source?.address || transaction?.tx?.Account
                  return <Row key={transaction.txHash || transaction?.tx?.hash || index} data={transaction} address={address} index={index} selectedCurrency={currency} />
                })}
              </tbody>
            </table>
          </div>
        ) : null}
        {!loading && !transactions.length && !errorMessage ? <div className={styles.status}>{t('detail.noTransactions')}</div> : null}
        {errorMessage ? <div className={styles.error}>{errorMessage}</div> : null}
      </section>
      {marker ? (
        <button className={styles.loadMore} type="button" onClick={loadMore} disabled={loadingMore}>
          {loadingMore ? t('detail.loadingTransactions') : t('detail.loadMoreTransactions')}
        </button>
      ) : null}
    </>
  )
}

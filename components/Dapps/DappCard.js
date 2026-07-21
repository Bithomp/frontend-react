import { useMemo } from 'react'
import { useTranslation } from 'next-i18next'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { shortNiceNumber, amountFormat } from '../../utils/format'
import { dappBySourceTag } from '../../utils/transaction'
import { generatedAgentNameBySourceTag } from '../../utils/dapps'
import DappLogo from './DappLogo'
import WalletsCell from './WalletsCell'
import TypeMixCell from './TypeMixCell'
import styles from '../../styles/components/dappCard.module.scss'
import Delta from '../UI/Delta'

// Build success-by-type map from transactionTypesResults
const getSuccessByType = (transactionTypesResults) => {
  const res = {}
  const src = transactionTypesResults && typeof transactionTypesResults === 'object' ? transactionTypesResults : {}
  for (const [txType, codes] of Object.entries(src)) {
    const ok = Number(codes?.tesSUCCESS || 0)
    if (ok > 0) res[txType] = ok
  }
  return res
}

export default function DappCard({
  dapp,
  prevDapp,
  index,
  convertCurrency,
  dappsMeta,
  expandedRowKey,
  setExpandedRowKey
}) {
  const { t } = useTranslation('dapps')
  const router = useRouter()
  const sourceTag = dapp?.sourceTag
  const rowKey = sourceTag ?? index
  const isOpen = expandedRowKey === rowKey

  const entry = dappsMeta && dappsMeta[String(sourceTag)]
  const logo = entry?.logo ? `/images/dapps/${entry.logo}` : null

  const successByType = useMemo(() => {
    const map = getSuccessByType(dapp?.transactionTypesResults)

    // Swaps are always successful and included in Payment.tesSUCCESS
    if (typeof dapp?.swaps === 'number' && dapp.swaps > 0) {
      const swaps = Number(dapp.swaps)
      const payOk = Number(map.Payment || 0)
      const swapsOk = Math.min(swaps, payOk)
      if (swapsOk > 0) {
        map.Payment = Math.max(0, payOk - swapsOk)
        map['Payment:swap'] = swapsOk
      }
    }

    return map
  }, [dapp?.transactionTypesResults, dapp?.swaps])

  const knownName = dappBySourceTag(sourceTag) || entry?.name
  const generatedName = knownName ? null : generatedAgentNameBySourceTag(sourceTag)
  const name = knownName || generatedName || sourceTag

  const wallets = entry?.wallets || []
  const walletconnect = entry?.walletconnect || []
  const hasExternalSigning =
    (Array.isArray(wallets) && wallets.length > 0) || (Array.isArray(walletconnect) && walletconnect.length > 0)
  const detailsHref = `/dapp/${encodeURIComponent(sourceTag)}`
  const openDetails = (event) => {
    if (event.target.closest('a, [data-dapp-details]')) return
    router.push(detailsHref)
  }

  return (
    <div
      className={styles.card}
      role="link"
      tabIndex={0}
      onClick={openDetails}
      onKeyDown={(event) => {
        if (event.target === event.currentTarget && (event.key === 'Enter' || event.key === ' ')) {
          event.preventDefault()
          router.push(detailsHref)
        }
      }}
    >
      <div className={styles.head}>
        <div className={styles.left}>
          <div className={styles.index}>{index + 1}</div>
          <div className={styles.identityContent}>
            <Link className={styles.identityLink} href={detailsHref}>
              {logo ? <DappLogo src={logo} /> : null}
              <span className={styles.titleWrap}>
                <span className={styles.title}>{name}</span>
                <span className={styles.sourceTag}>{sourceTag}</span>
              </span>
            </Link>
            <div className={styles.wallets}>
              {hasExternalSigning ? <WalletsCell wallets={wallets} walletconnect={walletconnect} /> : null}
            </div>
          </div>
        </div>
      </div>

      <div className={styles.grid}>
        <div className={styles.metric}>
          <div className={styles.k}>{t('metrics.performingAddresses')}</div>
          <div className={styles.v}>
            {shortNiceNumber(dapp?.uniqueSourceAddresses, 0)}
            <Delta cur={dapp?.uniqueSourceAddresses} prev={prevDapp?.uniqueSourceAddresses} />
          </div>
        </div>

        <div className={styles.metric}>
          <div className={styles.k}>{t('metrics.interactingAddresses')}</div>
          <div className={styles.v}>
            {shortNiceNumber(dapp?.uniqueInteractedAddresses, 0)}
            <Delta cur={dapp?.uniqueInteractedAddresses} prev={prevDapp?.uniqueInteractedAddresses} />
          </div>
        </div>

        <div className={styles.metric}>
          <div className={styles.k}>{t('metrics.transactions')}</div>
          <div className={styles.v}>
            {shortNiceNumber(dapp?.totalTransactions, 0)}
            <Delta cur={dapp?.totalTransactions} prev={prevDapp?.totalTransactions} />
          </div>
        </div>

        <div className={styles.metric}>
          <div className={styles.k}>{t('metrics.totalSent')}</div>
          <div className={styles.v} suppressHydrationWarning>
            {shortNiceNumber(dapp?.totalSentInFiats?.[convertCurrency], 2, 1, convertCurrency)}
            <div className={styles.sub}>
              {amountFormat(dapp?.totalSent, { short: true })}
              <Delta
                inline
                cur={dapp?.totalSentInFiats?.[convertCurrency]}
                prev={prevDapp?.totalSentInFiats?.[convertCurrency]}
              />
            </div>
          </div>
        </div>
      </div>

      <div className={styles.activity} data-dapp-details>
        <TypeMixCell
          successByType={successByType}
          totalTransactions={dapp?.totalTransactions}
          successTransactions={dapp?.successTransactions}
          transactionTypesResults={dapp?.transactionTypesResults}
          isOpen={isOpen}
          onToggle={() => setExpandedRowKey(isOpen ? null : rowKey)}
          breakpoint={720}
        />
      </div>
    </div>
  )
}

import styles from '../../styles/components/amountMeta.module.scss'

export default function AmountMeta({
  fiatEstimate,
  remainingLabel,
  remainingAmount,
  currencyLabel,
  negative,
  reserveFiatSpace = true
}) {
  const hasRemaining = remainingAmount !== '' && remainingAmount !== null && remainingAmount !== undefined
  const showFiat = !!fiatEstimate || reserveFiatSpace

  return (
    <span className={`${styles.meta}${showFiat ? '' : ` ${styles.onlyRemaining}`}`}>
      {showFiat ? (
        <span className={styles.fiat} suppressHydrationWarning>
          {fiatEstimate || '\u00A0'}
        </span>
      ) : null}
      <span
        className={`${styles.remaining}${negative ? ` ${styles.negative}` : ''}`}
        title={hasRemaining ? `${remainingLabel}: ${remainingAmount} ${currencyLabel}` : undefined}
      >
        {hasRemaining ? `${remainingLabel}: ${remainingAmount} ${currencyLabel}` : '\u00A0'}
      </span>
    </span>
  )
}

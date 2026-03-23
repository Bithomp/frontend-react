import { useTranslation } from 'next-i18next'
import HomeTeaser, { HomeTeaseRow } from './HomeTeaser'
import { shortNiceNumber, niceCurrency, CurrencyWithIcon } from '../../utils/format'
import { nativeCurrency } from '../../utils'
import styles from '@/styles/components/home-teaser.module.scss'

export default function TeaserTopAmms({ data = [], isLoading = false, fiatRate, selectedCurrency }) {
  const { t } = useTranslation()
  const topAmms = data?.slice(0, 5) || []

  return (
    <HomeTeaser title="home.teaser.topAmms" href="/amms" isLoading={isLoading} isEmpty={!topAmms.length}>
      {topAmms.map((amm, index) => {
        const asset1 = niceCurrency(amm?.amount?.currency || nativeCurrency)
        const asset2 = niceCurrency(amm?.amount2?.currency || nativeCurrency)
        const pairName = `${asset1}/${asset2}`
        const holders = Number(amm?.holders || 0)

        const lpToken = {
          ...amm?.lpTokenBalance,
          currencyDetails: {
            type: 'lp_token',
            ammID: amm?.ammID,
            asset: amm?.amount,
            asset2: amm?.amount2,
            currency: pairName
          }
        }

        // TVL: native XRP only (amount is raw drops string for XRP pools)
        const amt1 = amm?.amount
        const xrpDrops = typeof amt1 === 'string' || typeof amt1 === 'number' ? Number(amt1) : null
        const half1 = xrpDrops !== null && fiatRate ? (xrpDrops / 1000000) * fiatRate : null
        const tvl = Number.isFinite(half1) && half1 > 0 ? shortNiceNumber(half1 * 2, 2, 1, selectedCurrency) : 'N/A'

        return (
          <HomeTeaseRow key={amm.account || index}>
            <div className={styles.itemName}>
              <CurrencyWithIcon token={lpToken} hideIssuer options={{ disableTokenLink: true }} />
            </div>
            <div className={styles.metric}>
              {shortNiceNumber(holders, 0)} {t('common.holders')}
            </div>
            <div className={styles.metric} suppressHydrationWarning>
              {tvl}
            </div>
          </HomeTeaseRow>
        )
      })}
    </HomeTeaser>
  )
}

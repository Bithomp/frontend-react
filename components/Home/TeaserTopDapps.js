import { useTranslation } from 'next-i18next'
import HomeTeaser, { HomeTeaseRow } from './HomeTeaser'
import { shortNiceNumber } from '../../utils/format'
import { dappBySourceTag } from '../../utils/transaction'
import DappLogo from '../Dapps/DappLogo'
import { DAPPS_META } from '../../utils/dapps'
import Delta from '../UI/Delta'
import styles from '@/styles/components/home-teaser.module.scss'

export default function TeaserTopDapps({ data = [], isLoading = false }) {
  const { t } = useTranslation()
  const topDapps = data?.slice(0, 5) || []
  const dappsMeta = DAPPS_META?.[0] || {}

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
      isLoading={isLoading}
      isEmpty={!topDapps.length}
    >
      {topDapps.map((dapp, index) => (
        <HomeTeaseRow key={dapp.name || index}>
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

import { useTranslation } from 'next-i18next'

import styles from '../../styles/components/dappsDataNote.module.scss'

export default function DappsDataNote() {
  const { t } = useTranslation('dapps')

  return (
    <div className={styles.note}>
      <span>
        {t('footer.tracking')}{' '}
        <a href="https://discord.gg/ZahGJ29WEs" target="_blank" rel="noreferrer">
          {t('footer.discord')}
        </a>
        .
      </span>
      <span>
        {t('footer.api')} <a href="https://docs.bithomp.com/#dapps">API</a>.
      </span>
    </div>
  )
}

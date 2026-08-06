import { useTranslation } from 'react-i18next'
import Cookies from 'universal-cookie'

import styles from '../../styles/components/ageCheck.module.scss'
import { cookieParams } from '../../utils'

export default function AgeCheck({ setShowAgeCheck, onConfirm }) {
  const { t } = useTranslation()

  const confirmAgeClick = () => {
    new Cookies().set('isOver18', true, cookieParams)
    onConfirm?.()
    setShowAgeCheck(false)
  }

  return (
    <div className={styles.age_check}>
      <div className={styles.age_check__header}>
        <h3>18+</h3>
        <p className={styles.age_check__subtitle}>{t('age-check.subtitle', { ns: 'popups' })}</p>
      </div>
      <p className={styles.age_check__text}>{t('age-check.text', { ns: 'popups' })}</p>
      <br />
      <div className={styles.age_check__btns}>
        <button className={styles.age_check__btn} onClick={confirmAgeClick}>
          {t('age-check.button-true', { ns: 'popups' })}
        </button>
        <button className={styles.age_check__btn} onClick={() => setShowAgeCheck(false)}>
          {t('age-check.button-false', { ns: 'popups' })}
        </button>
      </div>
    </div>
  )
}

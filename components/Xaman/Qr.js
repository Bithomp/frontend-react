import { useState, useEffect } from 'react'
import { useTranslation } from 'next-i18next'

import ProgressBar from '../Layout/Header/ProgressBar'

export default function XamanQr({ expiredQr, xamanQrSrc, onReset, status }) {
  const { t } = useTranslation()

  const [expiresInSeconds, setExpiresInSeconds] = useState(180)
  const [overtime, setOvertime] = useState(false)

  const resetQr = () => {
    onReset()
    setExpiresInSeconds(180)
    setOvertime(false)
  }

  useEffect(() => {
    setOvertime(expiredQr)
  }, [expiredQr])

  useEffect(() => {
    let isSubscribed = true
    const timer = setTimeout(function () {
      if (isSubscribed) {
        setExpiresInSeconds(expiresInSeconds - 1)
      }
    }, 1000)
    if (expiresInSeconds <= 0) {
      clearTimeout(timer)
      setOvertime(true)
    }
    return () => {
      clearTimeout(timer)
      isSubscribed = false
    }
    //eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expiresInSeconds])

  return (
    <div className="xaman-qr-panel">
      {!overtime && (
        <div className="xaman-qr-code">
          <img width="220" height="220" src={xamanQrSrc} alt="qr-code" />
        </div>
      )}
      {overtime && (
        <div className="xaman-qr-expired">
          <button type="button" className="button-action secondary" onClick={resetQr}>
            {t('xaman.new-qr')}
          </button>
        </div>
      )}
      <div className="xaman-qr-status">
        {overtime ? t('signin.xaman.statuses.expired') : status}
      </div>
      {!overtime && <ProgressBar goneSeconds={expiresInSeconds} maxSeconds={180} className="xaman-progress" />}
    </div>
  )
}

import { useTranslation } from 'next-i18next'
import Link from 'next/link'

import { useCookie } from '../../utils'

export default function Footer() {
  const { t } = useTranslation()
  const [showCookie, setShowCokie] = useCookie('showCookie', true)

  return (
    <>
      {showCookie && showCookie !== 'false' && (
        <div className="footer-cookie center">
          {t('footer.cookie.we-use-cookie')}{' '}
          <Link href="/privacy-policy" className="hover-oposite">
            {t('menu.privacy-policy')}
          </Link>
          .
          <br />
          <input
            type="button"
            value={t('button.accept')}
            className="button-action thin"
            onClick={() => setShowCokie(false)}
            style={{ marginTop: '10px' }}
          />
        </div>
      )}
    </>
  )
}

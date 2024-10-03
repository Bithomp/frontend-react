import { encode, isDomainValid } from '../../utils'
import { useTranslation } from 'next-i18next'

export default function SetDomain({ setSignRequest, signRequest, setStatus, setAgreedToRisks }) {
  const { t } = useTranslation()

  const onDomainChange = (e) => {
    setStatus('')
    let newRequest = signRequest
    let domain = e.target.value
    domain = domain.trim()
    domain = String(domain).toLowerCase()
    if (isDomainValid(domain)) {
      newRequest.request.Domain = encode(domain)
      setSignRequest(newRequest)
      setAgreedToRisks(true)
    } else {
      setAgreedToRisks(false)
    }
  }

  return (
    <div className="center">
      <br />
      <span className="halv">
        <span className="input-title">{t('signin.set-account.domain')}</span>
        <input
          placeholder={t('signin.set-account.enter-domain')}
          onChange={onDomainChange}
          className="input-text"
          spellCheck="false"
        />
      </span>
    </div>
  )
}

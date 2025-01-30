import { encode, isUrlValid } from '../../utils'
import { useTranslation } from 'next-i18next'

export default function SetDid({ setSignRequest, signRequest, setStatus, setAgreedToRisks }) {
  const { t } = useTranslation()

  const onUriChange = (e) => {
    setStatus('')
    let newRequest = signRequest
    let uri = e.target.value
    uri = uri.trim()
    if (isUrlValid(uri)) {
      newRequest.request.URI = encode(uri)
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
        <span className="input-title">{t('table.uri')}</span>
        <input
          placeholder={t('form.placeholder.uri')}
          onChange={onUriChange}
          className="input-text"
          spellCheck="false"
        />
      </span>
    </div>
  )
}

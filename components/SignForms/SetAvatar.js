import { encode, isUrlValid } from '../../utils'
import { useTranslation } from 'next-i18next'

export default function SetAvatar({ setSignRequest, signRequest, setStatus, setAgreedToRisks }) {
  const { t } = useTranslation('common')

  const onAvatarChange = (e) => {
    let avatarUrl = e.target.value
    avatarUrl = avatarUrl.trim()

    if (isUrlValid(avatarUrl)) {
      setStatus('')
    } else {
      setStatus(t('signin.set-account.invalid-url'))
      return
    }

    let newRequest = signRequest

    const command = {
      action: 'setAvatar',
      url: avatarUrl,
      timestamp: new Date().toISOString()
    }

    const tx = {
      Account: newRequest?.request.Account,
      TransactionType: 'AccountSet',
      Memos: [
        {
          Memo: {
            MemoType: encode('json'),
            MemoData: encode(JSON.stringify(command))
          }
        }
      ]
    }

    newRequest.request = tx
    setSignRequest(newRequest)
    setAgreedToRisks(true)
  }

  return (
    <div className="center">
      <br />
      <span className="halv">
        <span className="input-title">{t('signin.set-account.avatar-url')}</span>
        <input
          placeholder={t('signin.set-account.enter-avatar-url')}
          onChange={onAvatarChange}
          className="input-text"
          spellCheck="false"
        />
      </span>
    </div>
  )
}

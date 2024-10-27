import { encode, isUrlValid } from '../../utils'

export default function SetAvatar({ setSignRequest, signRequest, setStatus, setAgreedToRisks }) {
  const onAvatarChange = (e) => {
    let avatarUrl = e.target.value
    avatarUrl = avatarUrl.trim()

    if (isUrlValid(avatarUrl)) {
      setStatus('')
    } else {
      setStatus('Invalid URL')
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
        <span className="input-title">Avatar's URL</span>
        <input placeholder="Enter Avatar's URL" onChange={onAvatarChange} className="input-text" spellCheck="false" />
      </span>
    </div>
  )
}

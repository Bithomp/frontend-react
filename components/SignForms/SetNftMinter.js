import { useTranslation } from 'next-i18next'

import { isAddressValid } from '../../utils'

export default function SetNftMinter({ setSignRequest, setStatus, setAgreedToRisks }) {
  const { t } = useTranslation('common')

  const onMinterChange = (event) => {
    const nftokenMinter = event.target.value.trim()
    setStatus('')

    if (!isAddressValid(nftokenMinter)) {
      setAgreedToRisks(false)
      return
    }

    setSignRequest((currentRequest) => ({
      ...currentRequest,
      request: {
        ...currentRequest?.request,
        TransactionType: 'AccountSet',
        NFTokenMinter: nftokenMinter,
        SetFlag: 10
      }
    }))
    setAgreedToRisks(true)
  }

  return (
    <div className="center">
      <br />
      <span className="halv">
        <span className="input-title">{t('signin.set-account.nft-minter')}</span>
        <input
          placeholder={t('signin.set-account.enter-nft-minter')}
          onChange={onMinterChange}
          className="input-text"
          spellCheck="false"
        />
      </span>
    </div>
  )
}

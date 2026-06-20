import { useEffect, useState } from 'react'
import { useTranslation } from 'next-i18next'

export default function AmmVoteFee({ setSignRequest, signRequest, setStatus, setAgreedToRisks }) {
  const { t } = useTranslation('amm')
  const initialFee = signRequest?.data?.tradingFeePercent ?? Number(signRequest?.request?.TradingFee || 0) / 1000
  const [fee, setFee] = useState(String(initialFee))
  const [touched, setTouched] = useState(false)
  const feeNumber = Number(fee)
  const isValidFee = fee !== '' && Number.isFinite(feeNumber) && feeNumber >= 0 && feeNumber <= 1

  useEffect(() => {
    const valid = touched && isValidFee

    const nextSignRequest = signRequest
    nextSignRequest.data = {
      ...nextSignRequest.data,
      feeConfirmed: valid
    }
    if (valid) {
      nextSignRequest.request = {
        ...nextSignRequest.request,
        TradingFee: Math.round(feeNumber * 1000)
      }
    }

    setSignRequest(nextSignRequest)
    setAgreedToRisks(valid)

    if (valid) setStatus('')
  }, [feeNumber, isValidFee, setAgreedToRisks, setSignRequest, setStatus, signRequest, touched])

  const onFeeChange = (e) => {
    const value = e.target.value
    setTouched(true)
    setFee(value)

    const number = Number(value)
    if (value !== '' && (!Number.isFinite(number) || number < 0 || number > 1)) {
      setStatus(t('sign.voteFee.invalidFee'))
    } else {
      setStatus('')
    }
  }

  return (
    <div className="ammVoteFeeForm">
      <div className="ammVoteFeePanel">
        <label className="ammVoteFeeField">
          <span className="ammVoteFeeLabelRow">
            <span>{t('sign.voteFee.tradingFee')}</span>
            <span className="ammVoteFeeRange">0-1%</span>
          </span>
          <span className="ammVoteFeeInputWrap">
            <input
              placeholder="0.25"
              onChange={onFeeChange}
              className="input-text"
              inputMode="decimal"
              spellCheck="false"
              value={fee}
            />
            <span>%</span>
          </span>
        </label>
        <p>{t('sign.voteFee.confirmText')}</p>
      </div>
      <div className={`ammVoteFeePreview${isValidFee ? '' : ' muted'}`}>
        <span>{t('sign.voteFee.voteValue')}</span>
        <strong>{isValidFee ? `${fee}%` : '-'}</strong>
      </div>
    </div>
  )
}

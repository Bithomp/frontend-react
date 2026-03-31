import { useEffect, useState } from 'react'
import axios from 'axios'

import TokenSelector from '../UI/TokenSelector'
import { amountFormat } from '../../utils/format'
import { encodeCurrencyCode } from '../../utils'

const normalizeTrustlineLimit = (rawSupply, fallbackValue = '1000000000') => {
  const numericSupply = Number(rawSupply)
  if (!Number.isFinite(numericSupply)) return fallbackValue
  return String(Math.round(numericSupply))
}

export default function SetTrustline({ setSignRequest, signRequest, setStatus, setFormError }) {
  const initialLimitAmount = signRequest?.request?.LimitAmount || {}
  const [selectedToken, setSelectedToken] = useState({
    currency: initialLimitAmount.currency || '',
    issuer: initialLimitAmount.issuer || ''
  })
  const [tokenSupply, setTokenSupply] = useState(initialLimitAmount.value || null)

  useEffect(() => {
    const isReady = !!selectedToken?.currency && !!selectedToken?.issuer && !!tokenSupply
    setFormError(!isReady)
  }, [selectedToken, setFormError, tokenSupply])

  useEffect(() => {
    let isActive = true

    const updateTrustlineRequest = async () => {
      if (!selectedToken?.currency || !selectedToken?.issuer) {
        setTokenSupply(null)
        setStatus('')
        return
      }

      setStatus('')

      try {
        const response = await axios(
          `v2/trustlines/tokens?currency=${selectedToken.currency}&issuer=${selectedToken.issuer}`
        )
        const token = response.data?.tokens?.[0]
        const nextTokenSupply = normalizeTrustlineLimit(token?.supply)

        if (!isActive) return

        setTokenSupply(nextTokenSupply)
        setSignRequest((prevSignRequest) => ({
          ...prevSignRequest,
          request: {
            ...prevSignRequest?.request,
            TransactionType: 'TrustSet',
            LimitAmount: {
              currency: encodeCurrencyCode(selectedToken.currency),
              issuer: selectedToken.issuer,
              value: nextTokenSupply
            },
            Flags: 0x00020000
          }
        }))
      } catch (error) {
        if (!isActive) return

        const fallbackTokenSupply = normalizeTrustlineLimit('1000000000')
        setTokenSupply(fallbackTokenSupply)
        setSignRequest((prevSignRequest) => ({
          ...prevSignRequest,
          request: {
            ...prevSignRequest?.request,
            TransactionType: 'TrustSet',
            LimitAmount: {
              currency: encodeCurrencyCode(selectedToken.currency),
              issuer: selectedToken.issuer,
              value: fallbackTokenSupply
            },
            Flags: 0x00020000
          }
        }))
      }
    }

    updateTrustlineRequest()

    return () => {
      isActive = false
    }
  }, [selectedToken, setSignRequest, setStatus])

  return (
    <div className="center">
      <br />
      <div style={{ margin: '0 auto', width: '360px', maxWidth: 'calc(100% - 80px)', textAlign: 'left' }}>
        <span className="input-title">
          Token
          {tokenSupply && selectedToken?.currency && (
            <span className="grey">
              {' '}
              · Limit: {amountFormat({ value: tokenSupply, currency: selectedToken.currency }, { short: true })}
            </span>
          )}
        </span>
        <div style={{ width: '100%' }}>
          <TokenSelector value={selectedToken} onChange={setSelectedToken} excludeNative={true} />
        </div>
        {selectedToken?.description && (
          <div style={{ marginTop: 10 }}>
            <span className="grey">
              <b>Description:</b> {selectedToken.description}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

import { useEffect, useMemo, useState } from 'react'
import axios from 'axios'

import AddressInput from '../UI/AddressInput'
import { encode, isAddressValid, isNativeCurrency, isTagValid, nativeCurrency } from '../../utils'
import { multiply, subtract } from '../../utils/calc'
import { niceCurrency } from '../../utils/format'

const toInitialAmount = (amountValue) => {
  if (!amountValue) return ''

  if (typeof amountValue === 'object') {
    const value = amountValue.value
    const numericValue = Number(value)
    if (!Number.isFinite(numericValue) || numericValue <= 0) return ''
    return String(value)
  }

  const numericAmount = Number(amountValue)
  if (!Number.isFinite(numericAmount) || numericAmount <= 0) return ''
  return String(numericAmount / 1000000)
}

export default function Payment({ setSignRequest, signRequest, setStatus, setFormError }) {
  const initialRequest = signRequest?.request || {}
  const currencyCode = useMemo(() => {
    if (signRequest?.data?.currencyCode) return signRequest.data.currencyCode
    if (typeof initialRequest.Amount === 'object' && initialRequest.Amount?.currency)
      return initialRequest.Amount.currency
    return nativeCurrency
  }, [initialRequest.Amount, signRequest?.data?.currencyCode])

  const issuer = useMemo(() => {
    if (signRequest?.data?.issuer) return signRequest.data.issuer
    if (typeof initialRequest.Amount === 'object' && initialRequest.Amount?.issuer) return initialRequest.Amount.issuer
    return ''
  }, [initialRequest.Amount, signRequest?.data?.issuer])

  const isTokenPayment = !isNativeCurrency({ currency: currencyCode })
  const currencyLabel = useMemo(
    () => (isTokenPayment ? niceCurrency(currencyCode) : currencyCode),
    [currencyCode, isTokenPayment]
  )
  const balance = useMemo(() => {
    if (signRequest?.data?.balance === undefined || signRequest?.data?.balance === null) return ''
    return String(signRequest.data.balance)
  }, [signRequest?.data?.balance])

  const [destination, setDestination] = useState(initialRequest.Destination || '')
  const [amount, setAmount] = useState(toInitialAmount(initialRequest.Amount))
  const [destinationTag, setDestinationTag] = useState(
    initialRequest.DestinationTag || initialRequest.DestinationTag === 0 ? String(initialRequest.DestinationTag) : ''
  )
  const [memo, setMemo] = useState(
    initialRequest?.Memos?.[0]?.Memo?.MemoData ? initialRequest.Memos[0].Memo.MemoData : ''
  )
  const [requireDestTag, setRequireDestTag] = useState(false)
  const [destinationTokenError, setDestinationTokenError] = useState('')

  const remainingAmount = useMemo(() => {
    const amountValue = String(amount).trim()
    if (!balance) return ''
    if (!amountValue) return ''

    const numericAmount = Number(amountValue)
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) return ''

    return subtract(balance, amountValue)
  }, [amount, balance])

  const isRemainingNegative = useMemo(() => Number(remainingAmount) < 0, [remainingAmount])

  useEffect(() => {
    const checkDestinationRequirements = async () => {
      const destinationValue = destination.trim()

      if (!destinationValue || !isAddressValid(destinationValue)) {
        setRequireDestTag(false)
        setDestinationTokenError('')
        return
      }

      try {
        const accountResponse = await axios(`/xrpl/accounts/${destinationValue}`)
        setRequireDestTag(!!accountResponse?.data?.account_data?.require_dest_tag)
      } catch (error) {
        setRequireDestTag(false)
      }

      if (!isTokenPayment) {
        setDestinationTokenError('')
        return
      }

      try {
        let url = `v2/address/${destinationValue}/acceptedTokens?limit=100`
        if (signRequest?.request?.Account) {
          url += `&sender=${signRequest.request.Account}`
        }

        const response = await axios(url)
        const acceptedTokens = response?.data?.tokens || []
        const canAcceptToken = acceptedTokens.some(
          (token) => token?.currency === currencyCode && token?.issuer === issuer
        )

        setDestinationTokenError(canAcceptToken ? '' : `Destination cannot accept ${currencyLabel}.`)
      } catch (error) {
        setDestinationTokenError('')
      }
    }

    checkDestinationRequirements()
  }, [currencyCode, currencyLabel, destination, isTokenPayment, issuer, signRequest?.request?.Account])

  const applyMaxAmount = (event) => {
    event.preventDefault()
    event.stopPropagation()
    if (!balance) return
    setAmount(balance)
  }

  useEffect(() => {
    const destinationValue = destination.trim()
    const destinationTagValue = destinationTag.trim()
    const memoValue = memo.trim()
    const amountValue = String(amount).trim()

    const isDestinationValid = isAddressValid(destinationValue)
    const numericAmount = Number(amountValue)
    const isAmountValid = Number.isFinite(numericAmount) && numericAmount > 0
    const isDestinationTagValid =
      (!destinationTagValue || isTagValid(destinationTagValue)) && (!requireDestTag || !!destinationTagValue)
    const canDestinationAcceptCurrency = !destinationTokenError

    const isValid = isDestinationValid && isAmountValid && isDestinationTagValid && canDestinationAcceptCurrency

    setStatus('')
    setFormError(!isValid)

    if (!isValid) return

    const nextAmount = isTokenPayment
      ? {
          currency: currencyCode,
          issuer,
          value: amountValue
        }
      : multiply(amountValue, 1000000)

    const nextSignRequest = signRequest
    nextSignRequest.request = {
      ...nextSignRequest?.request,
      TransactionType: 'Payment',
      Destination: destinationValue,
      Amount: nextAmount
    }

    if (isTokenPayment) {
      nextSignRequest.request.Flags = 131072 // tfPartialPayment
    } else {
      delete nextSignRequest.request.Flags
    }

    if (destinationTagValue) {
      nextSignRequest.request.DestinationTag = parseInt(destinationTagValue)
    } else {
      delete nextSignRequest.request.DestinationTag
    }

    if (memoValue) {
      nextSignRequest.request.Memos = [
        {
          Memo: {
            MemoData: encode(memoValue)
          }
        }
      ]
    } else {
      delete nextSignRequest.request.Memos
    }

    nextSignRequest.data = {
      ...nextSignRequest?.data,
      currencyCode,
      issuer
    }

    setSignRequest(nextSignRequest)
  }, [
    amount,
    currencyCode,
    destination,
    destinationTag,
    isTokenPayment,
    issuer,
    memo,
    requireDestTag,
    destinationTokenError,
    signRequest,
    setFormError,
    setSignRequest,
    setStatus
  ])

  return (
    <div className="center">
      <br />
      <span className="halv">
        <AddressInput
          title="Destination"
          placeholder="Destination address"
          hideButton={true}
          setValue={setDestination}
          setInnerValue={setDestination}
          rawData={isAddressValid(destination) ? { address: destination } : {}}
          type="address"
        />
      </span>

      <br />
      <span className="halv">
        <span className="input-title">
          Destination tag{' '}
          {requireDestTag ? (
            <>
              (<span className="orange bold">required</span>)
            </>
          ) : (
            '(optional)'
          )}
        </span>
        <input
          placeholder="12345"
          onChange={(event) => setDestinationTag(event.target.value)}
          className="input-text"
          spellCheck="false"
          value={destinationTag}
          inputMode="numeric"
        />
        {!!destinationTokenError && (
          <div style={{ marginTop: 6, textAlign: 'left' }}>
            <span className="red">{destinationTokenError}</span>
          </div>
        )}
      </span>

      <br />
      <span className="halv">
        <span className="input-title">
          Amount
          {balance ? (
            <>
              {' '}
              <span className="grey">
                (Max{' '}
                <span
                  role="button"
                  tabIndex={0}
                  onMouseDown={applyMaxAmount}
                  onClick={applyMaxAmount}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      applyMaxAmount(event)
                    }
                  }}
                  style={{
                    color: 'var(--accent-link)',
                    cursor: 'pointer',
                    fontSize: 'inherit',
                    fontWeight: 'inherit'
                  }}
                >
                  {balance} {currencyLabel}
                </span>
                )
              </span>
            </>
          ) : (
            <> ({currencyLabel})</>
          )}
        </span>
        <input
          placeholder="0"
          onChange={(event) => setAmount(event.target.value)}
          className="input-text"
          spellCheck="false"
          value={amount}
          inputMode="decimal"
        />
        <div style={{ marginTop: 6, textAlign: 'left', minHeight: 18, lineHeight: '18px' }}>
          <span
            className={isRemainingNegative ? 'red' : 'grey'}
            style={{ visibility: remainingAmount ? 'visible' : 'hidden' }}
          >
            Remaining: {remainingAmount || '0'} {currencyLabel}
          </span>
        </div>
      </span>

      <br />
      <span className="halv">
        <span className="input-title">
          Memo (<span className="orange">It will be public</span>)
        </span>
        <input
          placeholder="Memo"
          onChange={(event) => setMemo(event.target.value)}
          className="input-text"
          spellCheck="false"
          value={memo}
        />
      </span>
    </div>
  )
}

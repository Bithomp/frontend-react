import { useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import { useTranslation } from 'next-i18next'

import { nativeCurrency } from '../../utils'
import useOrderBook from '../Trade/useOrderBook'
import { estimateSwap, TF_PARTIAL_PAYMENT, transactionAmount } from '../Trade/swap'
import styles from '../../styles/components/ClearTokenBalance.module.scss'

const nativeAsset = { currency: nativeCurrency }

export default function ClearTokenBalance({ signRequest, setStatus, setAgreedToRisks }) {
  const { t } = useTranslation('common')
  const tokenAsset = signRequest?.data?.asset
  const balance = signRequest?.data?.balance
  const [issuerCheck, setIssuerCheck] = useState({ status: 'idle', flags: null })
  const { bids, asks, amm, status, error } = useOrderBook(tokenAsset, nativeAsset)
  const estimate = useMemo(
    () => estimateSwap({ bids, asks, amm, inputAmount: balance, side: 'sell' }),
    [bids, asks, amm, balance]
  )
  const canSwap = status === 'ready' && estimate?.complete && estimate.output.gte(0.000001)
  const amountTooSmall =
    status === 'ready' && estimate?.complete && estimate.output.gt(0) && estimate.output.lt(0.000001)
  const noLiquidity = status === 'ready' && !canSwap
  const issuerCannotReceive = issuerCheck.flags?.depositAuth || issuerCheck.flags?.requireDestTag

  useEffect(() => {
    if (!noLiquidity || !tokenAsset?.issuer) {
      setIssuerCheck({ status: 'idle', flags: null })
      return
    }

    let active = true
    setIssuerCheck({ status: 'loading', flags: null })
    axios(`/v2/address/${encodeURIComponent(tokenAsset.issuer)}?ledgerInfo=true`)
      .then(({ data }) => {
        if (active) setIssuerCheck({ status: 'ready', flags: data?.ledgerInfo?.flags || {} })
      })
      .catch(() => {
        if (active) setIssuerCheck({ status: 'error', flags: null })
      })

    return () => {
      active = false
    }
  }, [noLiquidity, tokenAsset?.issuer])

  useEffect(() => {
    setAgreedToRisks(false)
    setStatus('')

    if (!tokenAsset?.currency || !tokenAsset?.issuer || !balance) return

    if (canSwap) {
      const targetOutput = estimate.output.multipliedBy(1.02)
      signRequest.request = {
        TransactionType: 'Payment',
        Account: signRequest.request.Account,
        Destination: signRequest.request.Account,
        SendMax: transactionAmount(tokenAsset, balance),
        Amount: transactionAmount(nativeAsset, targetOutput),
        Flags: TF_PARTIAL_PAYMENT
      }
      setAgreedToRisks(true)
      return
    }

    if (noLiquidity && issuerCheck.status === 'ready' && !issuerCannotReceive) {
      signRequest.request = {
        TransactionType: 'Payment',
        Account: signRequest.request.Account,
        Destination: tokenAsset.issuer,
        Amount: transactionAmount(tokenAsset, balance)
      }
      setAgreedToRisks(true)
    }
  }, [
    balance,
    canSwap,
    estimate,
    issuerCannotReceive,
    issuerCheck.status,
    noLiquidity,
    setAgreedToRisks,
    setStatus,
    signRequest,
    tokenAsset
  ])

  if (status === 'error') {
    return <p className={`${styles.message} center red`}>{error || t('signin.clear-token.liquidity-error')}</p>
  }

  if (status !== 'ready') return <p className={`${styles.message} center`}>{t('signin.clear-token.checking-liquidity')}</p>

  if (noLiquidity && (issuerCheck.status === 'idle' || issuerCheck.status === 'loading')) {
    return <p className={`${styles.message} center`}>{t('signin.clear-token.checking-issuer')}</p>
  }

  if (noLiquidity && issuerCheck.status === 'error') {
    return <p className={`${styles.message} center red`}>{t('signin.clear-token.issuer-check-error')}</p>
  }

  if (noLiquidity && issuerCannotReceive) {
    return (
      <p className={`${styles.message} center orange`}>
        {issuerCheck.flags.depositAuth
          ? t('signin.clear-token.issuer-deposit-auth')
          : t('signin.clear-token.issuer-requires-tag')}
      </p>
    )
  }

  return (
    <p className={`${styles.message} center ${noLiquidity ? 'orange' : ''}`}>
      {noLiquidity
        ? amountTooSmall
          ? t('signin.clear-token.amount-too-small', { nativeCurrency })
          : t('signin.clear-token.send-to-issuer')
        : t('signin.clear-token.swap-to-native', { nativeCurrency })}
    </p>
  )
}

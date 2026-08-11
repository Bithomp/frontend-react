import { useEffect, useMemo, useState } from 'react'
import BigNumber from 'bignumber.js'

import { nativeCurrency, tradeSimulationRpcServer } from '../../utils'
import { TF_PARTIAL_PAYMENT, transactionAmount, validTradeNumber } from './swap'

const REQUEST_DELAY = 400
const REQUEST_TIMEOUT = 15000
const REFRESH_INTERVAL = 8000
const MAX_ISSUED_AMOUNT = '9999999999999999e80'
const MAX_XRP_DROPS = '100000000000000000'
const NATIVE_BALANCE_RESULTS = new Set([
  'tecINSUFF_FEE',
  'tecUNFUNDED',
  'tecUNFUNDED_PAYMENT',
  'telINSUF_FEE_P',
  'terINSUF_FEE_B'
])

const failedQuoteStatus = (engineResult) => {
  if (NATIVE_BALANCE_RESULTS.has(engineResult)) return 'nativeBalance'
  if (engineResult === 'tecPATH_PARTIAL') return 'partial'
  if (engineResult === 'tecPATH_DRY') return 'empty'
  return 'failed'
}

const swapPaths = (spendAsset, receiveAsset) => {
  if (nativeCurrency !== 'XRP' || !spendAsset?.issuer || !receiveAsset?.issuer) return []
  return [[{ currency: nativeCurrency }]]
}

const maximumAmount = (asset) =>
  asset?.issuer
    ? { currency: asset.currency, issuer: asset.issuer, value: MAX_ISSUED_AMOUNT }
    : MAX_XRP_DROPS

const amountValue = (amount, asset) => {
  if (typeof amount === 'string') {
    if (asset?.issuer) return null
    const value = new BigNumber(amount).dividedBy(1_000_000)
    return value.isFinite() && value.gt(0) ? value : null
  }
  if (
    !amount ||
    amount.currency !== asset?.currency ||
    (amount.issuer || '') !== (asset?.issuer || '')
  ) return null

  const value = new BigNumber(amount.value)
  return value.isFinite() && value.gt(0) ? value : null
}

const modifiedNode = (wrapper) => wrapper?.ModifiedNode

const simulatedXrpSpend = (result, account) => {
  const accountRoot = result?.meta?.AffectedNodes
    ?.map(modifiedNode)
    .find((node) =>
      node?.LedgerEntryType === 'AccountRoot' &&
      node.FinalFields?.Account === account &&
      node.PreviousFields?.Balance !== undefined
    )
  if (!accountRoot) return null

  const previous = new BigNumber(accountRoot.PreviousFields.Balance)
  const final = new BigNumber(accountRoot.FinalFields.Balance)
  const fee = new BigNumber(result.tx_json?.Fee || 0)
  const spend = previous.minus(final).minus(fee).dividedBy(1_000_000)
  return spend.isFinite() && spend.gt(0) ? spend : null
}

const simulatedIssuedSpend = (result, account, asset) => {
  const trustLine = result?.meta?.AffectedNodes
    ?.map(modifiedNode)
    .find((node) => {
      if (node?.LedgerEntryType !== 'RippleState') return false
      const fields = node.FinalFields
      const lowAccount = fields?.LowLimit?.issuer
      const highAccount = fields?.HighLimit?.issuer
      return fields?.Balance?.currency === asset.currency &&
        node.PreviousFields?.Balance?.value !== undefined &&
        [lowAccount, highAccount].includes(account) &&
        [lowAccount, highAccount].includes(asset.issuer)
    })
  if (!trustLine) return null

  const previous = new BigNumber(trustLine.PreviousFields.Balance.value)
  const final = new BigNumber(trustLine.FinalFields.Balance.value)
  const accountIsLow = trustLine.FinalFields.LowLimit.issuer === account
  const accountChange = accountIsLow ? final.minus(previous) : previous.minus(final)
  const spend = accountChange.negated()
  return spend.isFinite() && spend.gt(0) ? spend : null
}

const simulatedSpend = (result, account, asset) =>
  asset?.issuer
    ? simulatedIssuedSpend(result, account, asset)
    : simulatedXrpSpend(result, account)

const quoteFromResult = ({ result, account, spendAsset, receiveAsset, side, amount, paths }) => {
  if (result?.engine_result !== 'tesSUCCESS') return null

  const spend = simulatedSpend(result, account, spendAsset)
  const receive = side === 'buy'
    ? new BigNumber(amount)
    : amountValue(result.meta?.delivered_amount || result.meta?.DeliveredAmount, receiveAsset)
  if (!spend?.isFinite() || !spend.gt(0) || !receive?.isFinite() || !receive.gt(0)) return null

  return { spend, receive, paths }
}

export default function useSwapSimulationQuote({
  account,
  spendAsset,
  receiveAsset,
  spendBalance,
  side,
  amount,
  enabled
}) {
  const spendBalanceValue = spendBalance?.isFinite() && spendBalance.gt(0) ? spendBalance.toFixed() : ''
  const requestKey = `${account || ''}:${spendAsset?.issuer || ''}:${spendAsset?.currency || ''}:${
    receiveAsset?.issuer || ''}:${receiveAsset?.currency || ''}:${side}:${amount || ''}:${
    side === 'buy' ? spendBalanceValue : ''}`
  const [state, setState] = useState({ requestKey: '', status: 'idle', quote: null, error: '' })
  const isValidRequest = enabled && account && spendAsset?.currency && receiveAsset?.currency && validTradeNumber(amount)

  useEffect(() => {
    if (!isValidRequest || !tradeSimulationRpcServer) {
      setState({ requestKey, status: 'idle', quote: null, error: '' })
      return
    }

    let requestTimer
    let refreshTimer
    let requestController
    let disposed = false

    setState({ requestKey, status: 'loading', quote: null, error: '' })

    const scheduleRefresh = () => {
      if (!disposed) refreshTimer = window.setTimeout(loadQuote, REFRESH_INTERVAL)
    }
    const setQuoteError = (error, status = 'error') => {
      setState((previous) => previous.requestKey === requestKey && previous.quote
        ? { ...previous, error }
        : { requestKey, status, quote: null, error })
    }
    const loadQuote = async () => {
      const paths = swapPaths(spendAsset, receiveAsset)
      const deliverMax = side === 'buy'
        ? transactionAmount(receiveAsset, amount)
        : maximumAmount(receiveAsset)
      const sendMax = side === 'buy' && spendBalanceValue
        ? transactionAmount(spendAsset, spendBalanceValue)
        : side === 'buy'
          ? maximumAmount(spendAsset)
          : transactionAmount(spendAsset, amount)
      const transaction = {
        TransactionType: 'Payment',
        Account: account,
        Destination: account,
        Amount: deliverMax,
        SendMax: sendMax,
        Flags: side === 'sell' ? TF_PARTIAL_PAYMENT : 0
      }
      if (paths.length) transaction.Paths = paths

      requestController = new AbortController()
      const timeoutTimer = window.setTimeout(() => requestController.abort(), REQUEST_TIMEOUT)
      try {
        const response = await fetch(tradeSimulationRpcServer, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'omit',
          signal: requestController.signal,
          body: JSON.stringify({ method: 'simulate', params: [{ tx_json: transaction }] })
        })
        if (!response.ok) throw new Error(`http-${response.status}`)
        const responseData = await response.json()
        if (disposed) return

        const result = responseData?.result
        if (!result || result.status === 'error' || result.error) {
          setQuoteError(result?.error || 'simulation-error')
          scheduleRefresh()
          return
        }
        if (result.engine_result !== 'tesSUCCESS') {
          const status = failedQuoteStatus(result.engine_result)
          setQuoteError(result.engine_result || 'simulation-failed', status)
          scheduleRefresh()
          return
        }

        const quote = quoteFromResult({
          result,
          account,
          spendAsset,
          receiveAsset,
          side,
          amount,
          paths
        })
        if (!quote) {
          setQuoteError('invalid-simulation-result')
          scheduleRefresh()
          return
        }
        setState({ requestKey, status: 'ready', quote, error: '' })
        scheduleRefresh()
      } catch (error) {
        if (!disposed) {
          setQuoteError(error.name === 'AbortError' ? 'timeout' : error.message || 'connection-error')
          scheduleRefresh()
        }
      } finally {
        window.clearTimeout(timeoutTimer)
      }
    }
    requestTimer = window.setTimeout(loadQuote, REQUEST_DELAY)

    return () => {
      disposed = true
      window.clearTimeout(requestTimer)
      window.clearTimeout(refreshTimer)
      requestController?.abort()
    }
  }, [
    account,
    amount,
    isValidRequest,
    receiveAsset,
    requestKey,
    side,
    spendAsset,
    spendBalanceValue
  ])

  return useMemo(
    () => state.requestKey === requestKey
      ? state
      : { requestKey, status: isValidRequest ? 'loading' : 'idle', quote: null, error: '' },
    [isValidRequest, requestKey, state]
  )
}

import { useEffect, useState } from 'react'
import BigNumber from 'bignumber.js'

import { ledgerWebsocketServer, nativeCurrency } from '../../utils'

const REQUEST_LIMIT = 200
const SNAPSHOT_TIMEOUT = 6000
const TRANSIENT_LEDGER_ERRORS = new Set(['noNetwork', 'notSynced', 'tooBusy'])
const XRP_BRIDGE_CURRENCY = 'XRP'

const requestAsset = (asset) =>
  asset?.issuer ? { currency: asset.currency, issuer: asset.issuer } : { currency: nativeCurrency }

const snapshotBookRequests = (baseAsset, quoteAsset, includeXrpBridge) => {
  const base = requestAsset(baseAsset)
  const quote = requestAsset(quoteAsset)
  const requests = [
    { target: 'directAsks', side: 'ask', takerGets: base, takerPays: quote },
    { target: 'directBids', side: 'bid', takerGets: quote, takerPays: base }
  ]
  if (!includeXrpBridge) return requests

  const xrp = { currency: XRP_BRIDGE_CURRENCY }
  return [
    ...requests,
    { target: 'baseXrpAsks', side: 'ask', takerGets: base, takerPays: xrp, optional: true },
    { target: 'baseXrpBids', side: 'bid', takerGets: xrp, takerPays: base, optional: true },
    { target: 'xrpQuoteAsks', side: 'ask', takerGets: xrp, takerPays: quote, optional: true },
    { target: 'xrpQuoteBids', side: 'bid', takerGets: quote, takerPays: xrp, optional: true }
  ]
}

const amountValue = (amount) => {
  if (amount === null || amount === undefined) return null
  if (typeof amount === 'string' || typeof amount === 'number') return new BigNumber(amount).dividedBy(1_000_000)
  return new BigNumber(amount.value)
}

const amountAsset = (amount) => typeof amount === 'string'
  ? { currency: nativeCurrency }
  : { currency: amount?.currency, issuer: amount?.issuer }

const normalizeAmm = (amm, baseAsset) => {
  if (!amm?.amount || !amm?.amount2 || amm.asset_frozen || amm.asset2_frozen) return null
  const amountIsBase = sameAsset(amountAsset(amm.amount), baseAsset)
  const base = amountIsBase ? amm.amount : amm.amount2
  const quote = amountIsBase ? amm.amount2 : amm.amount
  const baseValue = amountValue(base)
  const quoteValue = amountValue(quote)
  if (!baseValue?.gt(0) || !quoteValue?.gt(0)) return null
  return { account: amm.account, base: baseValue, quote: quoteValue, tradingFee: Number(amm.trading_fee || 0) }
}

const normalizeOffers = (offers, side) =>
  (offers || [])
    .map((offer) => {
      const gets = amountValue(offer.taker_gets_funded ?? offer.TakerGets)
      const pays = amountValue(offer.taker_pays_funded ?? offer.TakerPays)
      if (!gets?.isFinite() || !pays?.isFinite() || !gets.gt(0) || !pays.gt(0)) return null

      const baseAmount = side === 'ask' ? gets : pays
      const quoteAmount = side === 'ask' ? pays : gets
      const price = quoteAmount.dividedBy(baseAmount)
      if (!price.isFinite() || !price.gt(0)) return null
      return {
        price,
        amount: baseAmount,
        total: quoteAmount,
        source: 'direct'
      }
    })
    .filter(Boolean)

const composeBridgeOffers = (firstLegOffers, secondLegOffers) => {
  // Match funded XRP output from the first leg to funded XRP input on the second.
  const firstLeg = firstLegOffers.map((offer) => ({
    price: offer.price,
    total: new BigNumber(offer.total)
  }))
  const secondLeg = secondLegOffers.map((offer) => ({
    price: offer.price,
    amount: new BigNumber(offer.amount)
  }))
  const bridged = []
  let firstIndex = 0
  let secondIndex = 0

  while (firstIndex < firstLeg.length && secondIndex < secondLeg.length) {
    const first = firstLeg[firstIndex]
    const second = secondLeg[secondIndex]
    const bridgeAmount = BigNumber.minimum(first.total, second.amount)
    if (!bridgeAmount.isFinite() || !bridgeAmount.gt(0)) break

    const baseAmount = bridgeAmount.dividedBy(first.price)
    const quoteTotal = bridgeAmount.multipliedBy(second.price)
    const price = quoteTotal.dividedBy(baseAmount)
    if (!baseAmount.isFinite() || !quoteTotal.isFinite() || !price.isFinite() || !price.gt(0)) break

    bridged.push({ price, amount: baseAmount, total: quoteTotal, source: 'xrp' })

    const firstExhausted = bridgeAmount.eq(first.total)
    const secondExhausted = bridgeAmount.eq(second.amount)
    first.total = first.total.minus(bridgeAmount)
    second.amount = second.amount.minus(bridgeAmount)
    if (firstExhausted) firstIndex += 1
    if (secondExhausted) secondIndex += 1
  }

  return bridged
}

const mergeOffers = (directOffers, bridgedOffers, side) =>
  [...directOffers, ...bridgedOffers].sort((left, right) => {
    const priceOrder = side === 'ask'
      ? left.price.comparedTo(right.price)
      : right.price.comparedTo(left.price)
    if (priceOrder !== 0) return priceOrder
    if (left.source === right.source) return 0
    return left.source === 'direct' ? -1 : 1
  })

const sameAsset = (left, right) =>
  left?.currency === right?.currency && (left?.issuer || '') === (right?.issuer || '')

export default function useOrderBook(baseAsset, quoteAsset) {
  const [state, setState] = useState({
    bids: [],
    asks: [],
    amm: null,
    status: 'idle',
    error: '',
    hasLoaded: false
  })

  useEffect(() => {
    if (!baseAsset?.currency || !quoteAsset?.currency || sameAsset(baseAsset, quoteAsset)) {
      setState({ bids: [], asks: [], amm: null, status: 'idle', error: '', hasLoaded: false })
      return
    }
    if (!ledgerWebsocketServer) {
      setState({
        bids: [],
        asks: [],
        amm: null,
        status: 'error',
        error: 'unsupported-network',
        hasLoaded: false
      })
      return
    }

    const includeXrpBridge = nativeCurrency === XRP_BRIDGE_CURRENCY && !!baseAsset.issuer && !!quoteAsset.issuer

    let socket
    let reconnectTimer
    let refreshTimer
    let retryTimer
    let snapshotTimer
    let disposed = false
    let requestId = 0
    let pendingState = {}
    const responses = new Map()

    const commitPendingState = () => {
      if (responses.size) return
      window.clearTimeout(snapshotTimer)
      const bridgedAsks = includeXrpBridge
        ? composeBridgeOffers(pendingState.baseXrpAsks || [], pendingState.xrpQuoteAsks || [])
        : []
      const bridgedBids = includeXrpBridge
        ? composeBridgeOffers(pendingState.baseXrpBids || [], pendingState.xrpQuoteBids || [])
        : []
      setState((previous) => ({
        ...previous,
        asks: mergeOffers(pendingState.directAsks || [], bridgedAsks, 'ask'),
        bids: mergeOffers(pendingState.directBids || [], bridgedBids, 'bid'),
        amm: pendingState.amm || null,
        status: 'ready',
        error: '',
        hasLoaded: true
      }))
    }

    const finishTimedOutSnapshot = () => {
      if (!responses.size) return
      const requiredRequestTimedOut = [...responses.values()].some((request) => !request.optional)
      responses.clear()
      if (requiredRequestTimedOut) {
        pendingState = {}
        setState((previous) => previous.hasLoaded
          ? { ...previous, status: 'ready', error: '' }
          : { ...previous, status: 'error', error: 'timeout' })
        return
      }
      commitPendingState()
    }

    const sendBookRequest = ({ target, side, takerGets, takerPays, ledgerHash, optional = false }) => {
      const id = `trade-${++requestId}-${target}`
      responses.set(id, { target, side, optional })
      socket.send(JSON.stringify({
        id,
        command: 'book_offers',
        ledger_hash: ledgerHash,
        limit: REQUEST_LIMIT,
        taker_gets: takerGets,
        taker_pays: takerPays
      }))
    }

    const loadSnapshot = (ledgerHash) => {
      window.clearTimeout(snapshotTimer)
      snapshotTimer = window.setTimeout(finishTimedOutSnapshot, SNAPSHOT_TIMEOUT)
      snapshotBookRequests(baseAsset, quoteAsset, includeXrpBridge)
        .forEach((request) => sendBookRequest({ ...request, ledgerHash }))
      const ammId = `trade-${++requestId}-amm`
      responses.set(ammId, { target: 'amm', optional: true })
      socket.send(JSON.stringify({
        id: ammId,
        command: 'amm_info',
        ledger_hash: ledgerHash,
        asset: requestAsset(baseAsset),
        asset2: requestAsset(quoteAsset)
      }))
    }

    const loadBook = () => {
      if (socket?.readyState !== WebSocket.OPEN || responses.size) return
      window.clearTimeout(snapshotTimer)
      responses.clear()
      pendingState = {}
      setState((previous) => ({
        ...previous,
        status: previous.hasLoaded ? 'ready' : 'loading',
        error: ''
      }))
      const ledgerId = `trade-${++requestId}-ledger`
      responses.set(ledgerId, { target: 'ledger' })
      socket.send(JSON.stringify({
        id: ledgerId,
        command: 'ledger',
        ledger_index: 'validated',
        transactions: false,
        expand: false
      }))
      snapshotTimer = window.setTimeout(finishTimedOutSnapshot, SNAPSHOT_TIMEOUT)
    }

    const retryBook = () => {
      window.clearTimeout(snapshotTimer)
      responses.clear()
      setState((previous) => ({
        ...previous,
        status: previous.hasLoaded ? 'ready' : 'connecting',
        error: ''
      }))
      window.clearTimeout(retryTimer)
      retryTimer = window.setTimeout(loadBook, 1000)
    }

    const connect = () => {
      if (disposed) return
      setState((previous) => ({ ...previous, status: 'connecting', error: '' }))
      socket = new WebSocket(ledgerWebsocketServer)
      socket.onopen = () => {
        loadBook()
        refreshTimer = window.setInterval(loadBook, 8000)
      }
      socket.onmessage = (event) => {
        if (disposed) return
        let message
        try {
          message = JSON.parse(event.data)
        } catch {
          return
        }
        const request = responses.get(String(message.id))
        if (!request) return
        responses.delete(String(message.id))
        const responseError = message.error || message.error_message
        if (TRANSIENT_LEDGER_ERRORS.has(responseError) && !request.optional) {
          retryBook()
          return
        }
        if (request.target === 'ledger') {
          const ledgerHash = message.result?.ledger_hash
          if (message.status === 'error' || message.error || !ledgerHash) {
            window.clearTimeout(snapshotTimer)
            setState((previous) => ({
              ...previous,
              status: 'error',
              error: message.error_message || message.error || 'validated-ledger-unavailable'
            }))
            return
          }
          window.clearTimeout(snapshotTimer)
          loadSnapshot(ledgerHash)
          return
        }
        if (request.target === 'amm') {
          pendingState.amm = message.status === 'error' || message.error
            ? null
            : normalizeAmm(message.result?.amm, baseAsset)
          commitPendingState()
          return
        }
        if (message.status === 'error' || message.error) {
          if (request.optional) {
            pendingState[request.target] = []
            commitPendingState()
            return
          }
          responses.clear()
          pendingState = {}
          window.clearTimeout(snapshotTimer)
          setState((previous) => ({ ...previous, status: 'error', error: message.error_message || message.error }))
          return
        }
        pendingState[request.target] = normalizeOffers(message.result?.offers, request.side)
        commitPendingState()
      }
      socket.onerror = () => {
        if (!disposed) setState((previous) => ({ ...previous, status: 'connecting', error: '' }))
      }
      socket.onclose = () => {
        window.clearInterval(refreshTimer)
        window.clearTimeout(retryTimer)
        window.clearTimeout(snapshotTimer)
        if (!disposed) {
          setState((previous) => ({ ...previous, status: 'connecting', error: '' }))
          reconnectTimer = window.setTimeout(connect, 3000)
        }
      }
    }

    connect()
    return () => {
      disposed = true
      window.clearTimeout(reconnectTimer)
      window.clearTimeout(retryTimer)
      window.clearTimeout(snapshotTimer)
      window.clearInterval(refreshTimer)
      socket?.close()
    }
    // Asset objects include display metadata; only their ledger identifiers should reconnect the socket.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baseAsset?.currency, baseAsset?.issuer, quoteAsset?.currency, quoteAsset?.issuer])

  return state
}

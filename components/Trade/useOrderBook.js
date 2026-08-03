import { useEffect, useState } from 'react'
import BigNumber from 'bignumber.js'

import { ledgerWebsocketServer, nativeCurrency } from '../../utils'

const REQUEST_LIMIT = 200

const requestAsset = (asset) =>
  asset?.issuer ? { currency: asset.currency, issuer: asset.issuer } : { currency: nativeCurrency }

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
        total: quoteAmount
      }
    })
    .filter(Boolean)

const sameAsset = (left, right) =>
  left?.currency === right?.currency && (left?.issuer || '') === (right?.issuer || '')

export default function useOrderBook(baseAsset, quoteAsset) {
  const [state, setState] = useState({ bids: [], asks: [], amm: null, status: 'idle', error: '' })

  useEffect(() => {
    if (!baseAsset?.currency || !quoteAsset?.currency || sameAsset(baseAsset, quoteAsset)) {
      setState({ bids: [], asks: [], amm: null, status: 'idle', error: '' })
      return
    }
    if (!ledgerWebsocketServer) {
      setState({ bids: [], asks: [], amm: null, status: 'error', error: 'unsupported-network' })
      return
    }

    let socket
    let reconnectTimer
    let refreshTimer
    let disposed = false
    let requestId = 0
    const responses = new Map()

    const loadBook = () => {
      if (socket?.readyState !== WebSocket.OPEN) return
      responses.clear()
      setState((previous) => ({ ...previous, status: 'loading', error: '' }))
      const requests = [
        { side: 'ask', taker_gets: requestAsset(baseAsset), taker_pays: requestAsset(quoteAsset) },
        { side: 'bid', taker_gets: requestAsset(quoteAsset), taker_pays: requestAsset(baseAsset) }
      ]
      requests.forEach(({ side, ...book }) => {
        const id = `trade-${++requestId}-${side}`
        responses.set(id, side)
        socket.send(JSON.stringify({ id, command: 'book_offers', ledger_index: 'validated', limit: REQUEST_LIMIT, ...book }))
      })
      const ammId = `trade-${++requestId}-amm`
      responses.set(ammId, 'amm')
      socket.send(JSON.stringify({ id: ammId, command: 'amm_info', ledger_index: 'validated', asset: requestAsset(baseAsset), asset2: requestAsset(quoteAsset) }))
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
        let message
        try {
          message = JSON.parse(event.data)
        } catch {
          return
        }
        const side = responses.get(String(message.id))
        if (!side) return
        responses.delete(String(message.id))
        if (side === 'amm') {
          setState((previous) => ({ ...previous, amm: message.status === 'error' || message.error ? null : normalizeAmm(message.result?.amm, baseAsset), status: responses.size ? 'loading' : 'ready' }))
          return
        }
        if (message.status === 'error' || message.error) {
          setState((previous) => ({ ...previous, status: 'error', error: message.error_message || message.error }))
          return
        }
        const offers = normalizeOffers(message.result?.offers, side)
        setState((previous) => ({
          ...previous,
          [side === 'ask' ? 'asks' : 'bids']: offers,
          status: responses.size ? 'loading' : 'ready',
          error: ''
        }))
      }
      socket.onerror = () => setState((previous) => ({ ...previous, status: 'error', error: 'connection-error' }))
      socket.onclose = () => {
        window.clearInterval(refreshTimer)
        if (!disposed) reconnectTimer = window.setTimeout(connect, 3000)
      }
    }

    connect()
    return () => {
      disposed = true
      window.clearTimeout(reconnectTimer)
      window.clearInterval(refreshTimer)
      socket?.close()
    }
    // Asset objects include display metadata; only their ledger identifiers should reconnect the socket.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baseAsset?.currency, baseAsset?.issuer, quoteAsset?.currency, quoteAsset?.issuer])

  return state
}

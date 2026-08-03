import { useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import BigNumber from 'bignumber.js'

import { nativeCurrency, xahauNetwork } from '../../utils'

const offerAsset = (amount) => typeof amount === 'string'
  ? { currency: nativeCurrency }
  : { currency: amount?.currency, issuer: amount?.issuer }
const sameAsset = (left, right) => left?.currency === right?.currency && (left?.issuer || '') === (right?.issuer || '')
const amountValue = (amount) => typeof amount === 'string'
  ? new BigNumber(amount).dividedBy(1_000_000)
  : new BigNumber(amount?.value || 0)
const cancelFields = (offer) => {
  if (Number(offer?.Sequence) > 0) return { OfferSequence: offer.Sequence }
  const offerId = offer?.OfferID || offer?.index
  return xahauNetwork && offerId ? { OfferID: offerId } : null
}

export default function UserOrders({ account, baseAsset, quoteAsset, baseName, quoteName, baseDecimals, priceDecimals, labels, className, setSignRequest, refreshPage }) {
  const [state, setState] = useState({ offers: [], loading: false })

  useEffect(() => {
    if (!account?.address) {
      setState({ offers: [], loading: false })
      return
    }
    let ignore = false
    setState({ offers: [], loading: true })
    axios(`v2/objects/${encodeURIComponent(account.address)}?type=offer&limit=1000`)
      .then(({ data }) => {
        if (!ignore) setState({ offers: data?.objects || [], loading: false })
      })
      .catch(() => {
        if (!ignore) setState({ offers: [], loading: false })
      })
    return () => {
      ignore = true
    }
  }, [account?.address, refreshPage])

  const pairOffers = useMemo(() => state.offers.map((offer) => {
    const getsAsset = offerAsset(offer.TakerGets)
    const paysAsset = offerAsset(offer.TakerPays)
    const sellsBase = sameAsset(getsAsset, baseAsset) && sameAsset(paysAsset, quoteAsset)
    const buysBase = sameAsset(getsAsset, quoteAsset) && sameAsset(paysAsset, baseAsset)
    if (!sellsBase && !buysBase) return null
    const baseAmount = amountValue(sellsBase ? offer.TakerGets : offer.TakerPays)
    const quoteAmount = amountValue(sellsBase ? offer.TakerPays : offer.TakerGets)
    const price = quoteAmount.dividedBy(baseAmount)
    if (!baseAmount.gt(0) || !price.isFinite() || !price.gt(0)) return null
    return { offer, side: sellsBase ? 'sell' : 'buy', amount: baseAmount, price, cancel: cancelFields(offer) }
  }).filter(Boolean), [state.offers, baseAsset, quoteAsset])

  return (
    <section className={className}>
      <h2>{labels.title} {pairOffers.length > 0 ? <span>{pairOffers.length}</span> : null}</h2>
      {!account?.address ? <p>{labels.signIn}</p> : state.loading ? <p>{labels.loading}</p> : !pairOffers.length ? <p>{labels.empty}</p> : <div role="table" aria-label={labels.title}>
        <div role="row">
          <span>{labels.side}</span><span>{labels.amount}</span><span>{labels.price}</span><span>{labels.action}</span>
        </div>
        {pairOffers.map(({ offer, side, amount, price, cancel }) => (
          <div role="row" key={offer.index || offer.Sequence}>
            <strong data-side={side}>{labels[side]}</strong>
            <span>{amount.toFormat(baseDecimals)} {baseName}</span>
            <span>{price.toFormat(priceDecimals)} {quoteName}</span>
            <button
              type="button"
              disabled={!cancel}
              onClick={() => setSignRequest({
                request: { Account: account.address, TransactionType: 'OfferCancel', ...cancel },
                callback: () => {}
              })}
            >
              {labels.cancel}
            </button>
          </div>
        ))}
      </div>}
    </section>
  )
}

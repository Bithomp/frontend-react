import BigNumber from 'bignumber.js'

export const MARKET_CUSHION = new BigNumber(0.02)
export const TF_PARTIAL_PAYMENT = 131072

export const validTradeNumber = (value) => {
  const number = new BigNumber(value || 0)
  return number.isFinite() && number.gt(0)
}

export const transactionAmount = (asset, value) =>
  asset.issuer
    ? { currency: asset.currency, issuer: asset.issuer, value: new BigNumber(value).precision(16).toFixed() }
    : new BigNumber(value).multipliedBy(1_000_000).integerValue(BigNumber.ROUND_DOWN).toFixed(0)

const bookSwapFill = (offers, inputAmount, side) => {
  if (!validTradeNumber(inputAmount)) return null
  let remainingInput = new BigNumber(inputAmount)
  let output = new BigNumber(0)

  for (const offer of offers) {
    if (!remainingInput.gt(0)) break
    if (side === 'buy') {
      const spent = BigNumber.minimum(remainingInput, offer.total)
      output = output.plus(spent.dividedBy(offer.price))
      remainingInput = remainingInput.minus(spent)
    } else {
      const spent = BigNumber.minimum(remainingInput, offer.amount)
      output = output.plus(spent.multipliedBy(offer.price))
      remainingInput = remainingInput.minus(spent)
    }
  }

  return { output, complete: !remainingInput.gt(0), source: 'book' }
}

const ammSwapFill = (amm, inputAmount, side) => {
  if (!amm || !validTradeNumber(inputAmount)) return null
  const reserveIn = side === 'buy' ? amm.quote : amm.base
  const reserveOut = side === 'buy' ? amm.base : amm.quote
  const feeMultiplier = new BigNumber(1).minus(new BigNumber(amm.tradingFee || 0).dividedBy(100000))
  const effectiveInput = new BigNumber(inputAmount).multipliedBy(feeMultiplier)
  const output = reserveOut.multipliedBy(effectiveInput).dividedBy(reserveIn.plus(effectiveInput))
  return output.gt(0) ? { output, complete: true, source: 'amm' } : null
}

const bookSwapCost = (offers, outputAmount, side) => {
  if (!validTradeNumber(outputAmount)) return null
  let remainingOutput = new BigNumber(outputAmount)
  let input = new BigNumber(0)

  for (const offer of offers) {
    if (!remainingOutput.gt(0)) break
    if (side === 'buy') {
      const received = BigNumber.minimum(remainingOutput, offer.amount)
      input = input.plus(received.multipliedBy(offer.price))
      remainingOutput = remainingOutput.minus(received)
    } else {
      const received = BigNumber.minimum(remainingOutput, offer.total)
      input = input.plus(received.dividedBy(offer.price))
      remainingOutput = remainingOutput.minus(received)
    }
  }

  return { input, complete: !remainingOutput.gt(0), source: 'book' }
}

const ammSwapCost = (amm, outputAmount, side) => {
  if (!amm || !validTradeNumber(outputAmount)) return null
  const reserveIn = side === 'buy' ? amm.quote : amm.base
  const reserveOut = side === 'buy' ? amm.base : amm.quote
  const output = new BigNumber(outputAmount)
  if (!output.lt(reserveOut)) return null
  const feeMultiplier = new BigNumber(1).minus(new BigNumber(amm.tradingFee || 0).dividedBy(100000))
  const input = reserveIn.multipliedBy(output).dividedBy(reserveOut.minus(output)).dividedBy(feeMultiplier)
  return input.gt(0) ? { input, complete: true, source: 'amm' } : null
}

export const estimateSwap = ({ asks = [], bids = [], amm, inputAmount, side }) => {
  const bookEstimate = bookSwapFill(side === 'buy' ? asks : bids, inputAmount, side)
  const ammEstimate = ammSwapFill(amm, inputAmount, side)
  if (!bookEstimate?.complete) return ammEstimate || bookEstimate
  if (!ammEstimate || bookEstimate.output.gte(ammEstimate.output)) return bookEstimate
  return ammEstimate
}

export const estimateSwapCost = ({ asks = [], bids = [], amm, outputAmount, side }) => {
  const bookEstimate = bookSwapCost(side === 'buy' ? asks : bids, outputAmount, side)
  const ammEstimate = ammSwapCost(amm, outputAmount, side)
  if (!bookEstimate?.complete) return ammEstimate || bookEstimate
  if (!ammEstimate || bookEstimate.input.lte(ammEstimate.input)) return bookEstimate
  return ammEstimate
}

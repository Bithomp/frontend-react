import { add, divide, multiply, subtract } from './calc'

export const PAYMENT_AMOUNT_MODE = {
  DELIVER: 'deliver',
  SPEND: 'spend'
}

const MPT_FEE_DENOMINATOR = 100000n

const mptFeeAmount = (amount, transferFee) => {
  const amountValue = BigInt(amount)
  const feeValue = BigInt(Math.floor(Number(transferFee)))
  return ((amountValue * feeValue + MPT_FEE_DENOMINATOR / 2n) / MPT_FEE_DENOMINATOR).toString()
}

export const transferFeeAmounts = ({ amount, transferFee, isMpt }) => {
  if (!amount || !transferFee) return { spend: amount, deliver: amount }

  if (isMpt) {
    const fee = mptFeeAmount(amount, transferFee)
    return {
      spend: add(amount, fee),
      deliver: subtract(amount, fee)
    }
  }

  return {
    spend: multiply(amount, transferFee),
    deliver: divide(amount, transferFee)
  }
}

export const amountWithValue = (amount, value) => ({ ...amount, value })


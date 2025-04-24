import BigNumber from 'bignumber.js'

BigNumber.config({
  DECIMAL_PLACES: 15, // Up to 15 decimal places, IOUs
  ROUNDING_MODE: BigNumber.ROUND_HALF_UP // Standard rounding mode
})

export const add = (a, b) => new BigNumber(a).plus(new BigNumber(b)).toFixed().toString()

export const subtract = (a, b) => new BigNumber(a).minus(new BigNumber(b)).toString()

export const multiply = (a, b) => new BigNumber(a).times(new BigNumber(b)).toString()

export const divide = (a, b) => {
  if (new BigNumber(b).isZero()) {
    return 'Cannot divide by zero'
  }
  return new BigNumber(a).div(new BigNumber(b)).toString()
}

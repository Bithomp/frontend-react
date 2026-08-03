export const RLUSD_CURRENCY = '524C555344000000000000000000000000000000'
export const MAINNET_RLUSD_ISSUER = 'rMxCKbEDwqr76QuheSUMdEGf4B9xJ8m5De'
export const TESTNET_RLUSD_ISSUER = 'rQhWct2fv4Vc4KRjRgMrxa8xPN9Zx9iLKV'

export const rlusdToken = (network) => {
  if (network === 'mainnet') {
    return {
      currency: RLUSD_CURRENCY,
      issuer: MAINNET_RLUSD_ISSUER,
      currencyDetails: { currency: 'RLUSD' },
      issuerDetails: { service: 'Ripple' }
    }
  }
  return null
}

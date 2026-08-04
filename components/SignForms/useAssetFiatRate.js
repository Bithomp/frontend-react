import { useEffect, useState } from 'react'

import { isNativeCurrency } from '../../utils'
import { fetchCurrentTokenFiatRate } from '../../utils/common'
import { mptIssuanceId } from '../../utils/acceptedTokens'

export default function useAssetFiatRate(asset, selectedCurrency, fiatRate) {
  const [tokenRate, setTokenRate] = useState(null)
  const issuer = asset?.issuer || asset?.account
  const currency = asset?.currency
  const issuanceId = mptIssuanceId(asset)
  const nativeAsset = isNativeCurrency(asset)
  const spotInNative = Number(asset?.priceNativeCurrencySpot)

  useEffect(() => {
    setTokenRate(null)
    if (!currency || !issuer || !selectedCurrency || nativeAsset || issuanceId) return

    const nativeFiatRate = Number(fiatRate)
    if (Number.isFinite(spotInNative) && Number.isFinite(nativeFiatRate)) {
      setTokenRate(spotInNative * nativeFiatRate)
      return
    }

    let ignore = false
    fetchCurrentTokenFiatRate({ issuer, currency, selectedCurrency }).then((rate) => {
      if (!ignore) setTokenRate(rate)
    })

    return () => {
      ignore = true
    }
  }, [currency, fiatRate, issuanceId, issuer, nativeAsset, selectedCurrency, spotInNative])

  if (!currency || !selectedCurrency || issuanceId) return null
  if (nativeAsset) return Number(fiatRate) || null
  return tokenRate
}

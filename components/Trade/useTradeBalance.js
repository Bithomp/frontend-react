import { useEffect, useState } from 'react'
import axios from 'axios'
import BigNumber from 'bignumber.js'

import { nativeCurrency } from '../../utils'
import { niceCurrency } from '../../utils/format'

const NATIVE_FEE_BUFFER = new BigNumber('0.0001')
export const tradeBalanceKey = (asset) => {
  if (!asset?.currency) return null
  return asset.issuer ? `${asset.issuer}:${asset.currency}` : nativeCurrency
}

const assetMatches = (token, asset, accountAddress) => {
  const currency = token?.currency || token?.Balance?.currency || token?.HighLimit?.currency || token?.LowLimit?.currency
  const highIssuer = token?.HighLimit?.issuer
  const lowIssuer = token?.LowLimit?.issuer
  const issuer = token?.issuer || token?.counterparty ||
    (highIssuer && highIssuer !== accountAddress ? highIssuer : lowIssuer && lowIssuer !== accountAddress ? lowIssuer : highIssuer || lowIssuer)
  return issuer === asset?.issuer && (currency === asset?.currency || niceCurrency(currency) === niceCurrency(asset?.currency))
}

const tokenBalance = (token) => {
  const balance = token?.Balance?.value ?? token?.balance ?? token?.value ?? token?.amount
  const value = new BigNumber(balance || 0).minus(token?.LockedBalance?.value || 0).abs()
  return value.isFinite() && value.gt(0) ? value : new BigNumber(0)
}

const trustlineLimit = (token, accountAddress) => {
  const normalizedLimit = token?.limit ?? token?.Limit?.value
  if (normalizedLimit !== undefined) return new BigNumber(normalizedLimit)

  const accountLimit = token?.HighLimit?.issuer === accountAddress
    ? token.HighLimit.value
    : token?.LowLimit?.issuer === accountAddress
      ? token.LowLimit.value
      : null
  return accountLimit === null ? null : new BigNumber(accountLimit)
}

const trustlineCanReceive = (token, accountAddress) => {
  if (!token) return false
  const limit = trustlineLimit(token, accountAddress)
  return limit === null || (limit.isFinite() && limit.gt(0))
}

const nativeBalance = (addressData, serverData) => {
  const ledgerInfo = addressData?.ledgerInfo
  const balanceDrops = new BigNumber(ledgerInfo?.balance ?? NaN)
  const reserveBase = new BigNumber(serverData?.reserveBase ?? NaN)
  const reserveIncrement = new BigNumber(serverData?.reserveIncrement ?? NaN)
  const ownerCount = new BigNumber(ledgerInfo?.ownerCount || 0)
  if (!balanceDrops.isFinite() || !reserveBase.isFinite() || !reserveIncrement.isFinite()) return new BigNumber(0)
  const reservedDrops = BigNumber.minimum(balanceDrops, reserveBase.plus(ownerCount.multipliedBy(reserveIncrement)))
  return BigNumber.maximum(0, balanceDrops.minus(reservedDrops).dividedBy(1_000_000).minus(NATIVE_FEE_BUFFER))
}

export default function useTradeBalances(accountAddress, assets, refreshPage) {
  const [state, setState] = useState({ balances: {}, trustlines: {}, loading: false })
  const assetIds = assets.map(tradeBalanceKey).join('|')

  useEffect(() => {
    if (!accountAddress || !assets.some((asset) => asset?.currency)) {
      setState({ balances: {}, trustlines: {}, loading: false })
      return
    }

    let ignore = false
    setState({ balances: {}, trustlines: {}, loading: true })
    const needsNative = assets.some((asset) => asset?.currency && !asset.issuer)
    const needsTokens = assets.some((asset) => asset?.issuer)

    Promise.all([
      needsNative ? axios(`/v2/address/${encodeURIComponent(accountAddress)}?ledgerInfo=true`) : Promise.resolve(null),
      needsNative ? axios('/v2/server') : Promise.resolve(null),
      needsTokens ? axios(`v2/trustlines/${encodeURIComponent(accountAddress)}`) : Promise.resolve(null)
    ])
      .then(([addressResult, serverResult, trustlinesResult]) => {
        if (ignore) return
        const balances = {}
        const trustlinesByAsset = {}
        if (needsNative) balances[nativeCurrency] = nativeBalance(addressResult?.data, serverResult?.data)
        const data = trustlinesResult?.data
        const trustlines = Array.isArray(data) ? data : data?.trustlines || data?.tokens || data?.lines || []
        assets.filter((asset) => asset?.issuer).forEach((asset) => {
          const key = tradeBalanceKey(asset)
          const trustline = trustlines.find((token) => assetMatches(token, asset, accountAddress))
          balances[key] = tokenBalance(trustline)
          trustlinesByAsset[key] = trustlineCanReceive(trustline, accountAddress)
        })
        setState({ balances, trustlines: trustlinesByAsset, loading: false })
      })
      .catch(() => {
        if (!ignore) setState({ balances: {}, trustlines: {}, loading: false })
      })

    return () => {
      ignore = true
    }
    // Asset display metadata is irrelevant; ledger identifiers define balances.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountAddress, assetIds, refreshPage])

  return state
}

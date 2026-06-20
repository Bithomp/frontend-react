import { useEffect, useMemo, useState } from 'react'
import { Trans, useTranslation } from 'next-i18next'
import Link from 'next/link'
import BigNumber from 'bignumber.js'
import axios from 'axios'

import { nativeCurrency } from '../../utils'
import { fetchCurrentTokenFiatRate } from '../../utils/common'
import { CurrencyWithIconInline, niceCurrency, shortNiceNumber } from '../../utils/format'
import SimpleSelect from '../UI/SimpleSelect'
import CheckBox from '../UI/CheckBox'

const FLAGS = {
  tfLPToken: 0x00010000,
  tfSingleAsset: 0x00080000,
  tfTwoAsset: 0x00100000,
  tfOneAssetLPToken: 0x00200000,
  tfLimitLPToken: 0x00400000
}

const FEE_SCALE = 100000
const SINGLE_ASSET_MAX_AMOUNT_MARGIN = new BigNumber('0.005')
const NATIVE_MAX_SPEND_BUFFER = new BigNumber('0.0001')

const isNativeAsset = (asset) => !asset || typeof asset !== 'object' || !asset.issuer
const assetName = (asset) => (isNativeAsset(asset) ? nativeCurrency : niceCurrency(asset.currency))
const displayToken = (asset) => (isNativeAsset(asset) ? { currency: nativeCurrency } : asset)
const isPositiveAmount = (value) => value !== '' && Number.isFinite(Number(value)) && Number(value) > 0
const stripTrailingZeros = (value) => value.replace(/(\.\d*?[1-9])0+$/, '$1').replace(/\.0+$/, '')
const hasPositiveBalance = (value) => value !== '' && Number.isFinite(Number(value)) && Number(value) > 0
const normalizeAmountInput = (value) => {
  const normalized = value.replace(/,/g, '.').replace(/[^\d.]/g, '')
  const [integerPart, ...decimalParts] = normalized.split('.')

  return `${integerPart}${decimalParts.length ? `.${decimalParts.join('')}` : ''}`
}
const formatPoolAmount = (amount) => {
  if (!amount?.isFinite() || !amount.gt(0)) return ''
  return stripTrailingZeros(amount.gte(1) ? amount.toFixed(8) : amount.toFixed(15))
}
const formatAssetInputAmount = (amount, asset) => {
  if (!amount?.isFinite() || !amount.gt(0)) return ''
  if (isNativeAsset(asset)) return stripTrailingZeros(amount.toFixed(6))
  return formatPoolAmount(amount)
}
const nativeDrops = (value) => {
  const drops = new BigNumber(value || 0).multipliedBy(1000000).integerValue(BigNumber.ROUND_FLOOR)
  return drops.isFinite() && drops.gt(0) ? drops.toFixed(0) : ''
}
const isPositiveAssetAmount = (asset, value) => {
  if (isNativeAsset(asset)) return !!nativeDrops(value)
  return isPositiveAmount(value)
}
const addMaxAmountMargin = (amount) => {
  const value = new BigNumber(amount || 0)
  if (!value.isFinite() || !value.gt(0)) return ''
  return formatPoolAmount(value.multipliedBy(new BigNumber(1).plus(SINGLE_ASSET_MAX_AMOUNT_MARGIN)))
}
const removeMaxAmountMargin = (amount) => {
  const value = new BigNumber(amount || 0)
  if (!value.isFinite() || !value.gt(0)) return ''
  return formatPoolAmount(value.dividedBy(new BigNumber(1).plus(SINGLE_ASSET_MAX_AMOUNT_MARGIN)))
}
const feeDecimal = (tradingFee) => new BigNumber(tradingFee || 0).dividedBy(FEE_SCALE)
const feeMult = (tradingFee) => new BigNumber(1).minus(feeDecimal(tradingFee))
const feeMultHalf = (tradingFee) => new BigNumber(1).minus(feeDecimal(tradingFee).dividedBy(2))
const solveQuadraticEq = (a, b, c) => {
  const b2minus4ac = b.multipliedBy(b).minus(a.multipliedBy(c).multipliedBy(4))
  return b.negated().plus(b2minus4ac.sqrt()).dividedBy(a.multipliedBy(2))
}

const reserveValue = (asset) => {
  if (!asset) return new BigNumber(0)
  if (typeof asset === 'object' && asset.value !== undefined) return new BigNumber(asset.value || 0)
  return new BigNumber(asset || 0).dividedBy(1000000)
}

const assetBalanceKey = (asset) =>
  isNativeAsset(asset) ? nativeCurrency : `${asset?.issuer || ''}:${asset?.currency || ''}`

const tokenCurrency = (token) => token?.currency || token?.Balance?.currency || token?.HighLimit?.currency || token?.LowLimit?.currency

const tokenIssuer = (token, accountAddress) => {
  if (token?.issuer) return token.issuer
  if (token?.counterparty) return token.counterparty
  if (token?.HighLimit?.issuer && token.HighLimit.issuer !== accountAddress) return token.HighLimit.issuer
  if (token?.LowLimit?.issuer && token.LowLimit.issuer !== accountAddress) return token.LowLimit.issuer
  return token?.HighLimit?.issuer || token?.LowLimit?.issuer || ''
}

const tokenBalanceValue = (token) => {
  const balance = token?.Balance?.value ?? token?.balance ?? token?.value ?? token?.amount
  if (balance === undefined || balance === null || balance === '') return ''

  const locked = token?.LockedBalance?.value || 0
  const value = new BigNumber(balance).minus(locked).abs()
  return value.isFinite() && value.gt(0) ? formatPoolAmount(value) : ''
}

const tokenMatchesAsset = (token, asset, accountAddress) => {
  if (isNativeAsset(asset)) return false

  const currency = tokenCurrency(token)
  const issuer = tokenIssuer(token, accountAddress)

  return (
    issuer === asset?.issuer &&
    (currency === asset?.currency || niceCurrency(currency) === niceCurrency(asset?.currency))
  )
}

const buildTokenBalanceMap = (tokens, assets, accountAddress) => {
  const balances = {}

  assets.filter(Boolean).forEach((asset) => {
    if (isNativeAsset(asset)) return

    const token = tokens.find((item) => tokenMatchesAsset(item, asset, accountAddress))
    const balance = tokenBalanceValue(token)

    if (balance) {
      balances[assetBalanceKey(asset)] = balance
    }
  })

  return balances
}

const nativeAvailableBalance = ({ addressData, networkInfo }) => {
  const ledgerInfo = addressData?.ledgerInfo
  const balanceDrops = Number(ledgerInfo?.balance)
  const reserveBase = Number(networkInfo?.reserveBase)
  const reserveIncrement = Number(networkInfo?.reserveIncrement)
  const ownerCount = Number(ledgerInfo?.ownerCount || 0)

  if (Number.isFinite(balanceDrops) && Number.isFinite(reserveBase) && Number.isFinite(reserveIncrement)) {
    const reservedDrops = Math.min(balanceDrops, reserveBase + ownerCount * reserveIncrement)
    const available = new BigNumber(balanceDrops - reservedDrops).dividedBy(1000000).minus(NATIVE_MAX_SPEND_BUFFER)
    return available.gt(0) ? formatPoolAmount(available) : ''
  }

  const fallbackBalance = addressData?.account?.balance
  if (fallbackBalance !== undefined && fallbackBalance !== null) {
    const available = new BigNumber(fallbackBalance).minus(NATIVE_MAX_SPEND_BUFFER)
    return available.gt(0) ? formatPoolAmount(available) : ''
  }

  return ''
}

const suggestedPairAmount = (amount, fromAsset, toAsset) => {
  const input = new BigNumber(amount || 0)
  const fromReserve = reserveValue(fromAsset)
  const toReserve = reserveValue(toAsset)

  if (!input.isFinite() || !input.gt(0) || !fromReserve.gt(0) || !toReserve.gt(0)) return ''

  return formatAssetInputAmount(input.multipliedBy(toReserve).dividedBy(fromReserve), toAsset)
}

const approximateLpTokensOut = ({ amount1, amount2, asset1, asset2, lpToken }) => {
  const input1 = new BigNumber(amount1 || 0)
  const input2 = new BigNumber(amount2 || 0)
  const reserve1 = reserveValue(asset1)
  const reserve2 = reserveValue(asset2)
  const lpSupply = new BigNumber(lpToken?.value || 0)

  if (
    !input1.isFinite() ||
    !input2.isFinite() ||
    !input1.gt(0) ||
    !input2.gt(0) ||
    !reserve1.gt(0) ||
    !reserve2.gt(0) ||
    !lpSupply.gt(0)
  ) {
    return ''
  }

  return formatPoolAmount(BigNumber.minimum(input1.dividedBy(reserve1), input2.dividedBy(reserve2)).multipliedBy(lpSupply))
}

const approximateAssetsInForLpTokens = ({ lpTokenOut, asset1, asset2, lpToken }) => {
  const lpTokens = new BigNumber(lpTokenOut || 0)
  const lpSupply = new BigNumber(lpToken?.value || 0)
  const reserve1 = reserveValue(asset1)
  const reserve2 = reserveValue(asset2)

  if (!lpTokens.isFinite() || !lpTokens.gt(0) || !lpSupply.gt(0) || !reserve1.gt(0) || !reserve2.gt(0)) {
    return { amount1: '', amount2: '' }
  }

  const share = lpTokens.dividedBy(lpSupply)

  return {
    amount1: formatPoolAmount(reserve1.multipliedBy(share)),
    amount2: formatPoolAmount(reserve2.multipliedBy(share))
  }
}

const ammAssetIn = (poolIn, lptBalance, desiredLpt, tradingFee) => {
  const lpTokens = new BigNumber(desiredLpt)
  const lptAMMBalance = new BigNumber(lptBalance)
  const assetBalance = new BigNumber(poolIn)
  const f1 = feeMult(tradingFee)
  const f2 = feeMultHalf(tradingFee).dividedBy(f1)
  const t1 = lpTokens.dividedBy(lptAMMBalance)
  const t2 = t1.plus(1)
  const d = f2.minus(t1.dividedBy(t2))
  const a = new BigNumber(1).dividedBy(t2.multipliedBy(t2))
  const b = new BigNumber(2).multipliedBy(d).dividedBy(t2).minus(new BigNumber(1).dividedBy(f1))
  const c = d.multipliedBy(d).minus(f2.multipliedBy(f2))

  return assetBalance.multipliedBy(solveQuadraticEq(a, b, c))
}

const approximateSingleAssetLpTokensOut = ({ amount, asset, lpToken, tradingFee }) => {
  const input = new BigNumber(amount || 0)
  const reserve = reserveValue(asset)
  const lpSupply = new BigNumber(lpToken?.value || 0)

  if (!input.isFinite() || !input.gt(0) || !reserve.gt(0) || !lpSupply.gt(0)) return ''

  let low = new BigNumber(0)
  let high = input.dividedBy(reserve).multipliedBy(lpSupply).multipliedBy(2).plus(1)

  for (let i = 0; i < 32 && ammAssetIn(reserve, lpSupply, high, tradingFee).lt(input); i++) {
    high = high.multipliedBy(2)
  }

  for (let i = 0; i < 48; i++) {
    const mid = low.plus(high).dividedBy(2)
    const requiredInput = ammAssetIn(reserve, lpSupply, mid, tradingFee)

    if (!requiredInput.isFinite()) return ''
    if (requiredInput.gt(input)) {
      high = mid
    } else {
      low = mid
    }
  }

  return formatPoolAmount(low)
}

const approximateSingleAssetAmountIn = ({ lpTokenOut, asset, lpToken, tradingFee }) => {
  const lpTokens = new BigNumber(lpTokenOut || 0)
  const reserve = reserveValue(asset)
  const lpSupply = new BigNumber(lpToken?.value || 0)

  if (!lpTokens.isFinite() || !lpTokens.gt(0) || !reserve.gt(0) || !lpSupply.gt(0)) return ''

  const amount = ammAssetIn(reserve, lpSupply, lpTokens, tradingFee)

  if (!amount.isFinite()) return ''

  return formatPoolAmount(amount)
}

const approximateSingleAssetMaxAmountIn = ({ lpTokenOut, asset, lpToken, tradingFee }) =>
  addMaxAmountMargin(approximateSingleAssetAmountIn({ lpTokenOut, asset, lpToken, tradingFee }))

const approximateSingleAssetLpTokensOutFromMaxAmount = ({ amount, asset, lpToken, tradingFee }) =>
  approximateSingleAssetLpTokensOut({
    amount: removeMaxAmountMargin(amount),
    asset,
    lpToken,
    tradingFee
  })

const approximateSingleAssetEffectivePrice = ({ amount, asset, lpToken, tradingFee }) => {
  const input = new BigNumber(amount || 0)
  const lpTokensOut = new BigNumber(approximateSingleAssetLpTokensOut({ amount, asset, lpToken, tradingFee }) || 0)

  if (!input.isFinite() || !input.gt(0) || !lpTokensOut.isFinite() || !lpTokensOut.gt(0)) return ''

  return addMaxAmountMargin(input.dividedBy(lpTokensOut))
}

const txIssue = (asset) => {
  if (asset?.mpt_issuance_id) return { mpt_issuance_id: asset.mpt_issuance_id }
  if (isNativeAsset(asset)) return { currency: nativeCurrency }
  return { currency: asset.currency, issuer: asset.issuer }
}

const txAmount = (asset, value) => {
  if (isNativeAsset(asset)) return nativeDrops(value)
  return { currency: asset.currency, issuer: asset.issuer, value }
}

const lpAmount = (lpToken, value) => ({
  currency: lpToken?.currency,
  issuer: lpToken?.issuer,
  value
})

const useAssetFiatRate = ({ asset, selectedCurrency, fiatRate }) => {
  const [tokenRate, setTokenRate] = useState(null)

  useEffect(() => {
    setTokenRate(null)
    if (!asset || isNativeAsset(asset) || !asset.issuer || !asset.currency || !selectedCurrency) return
    fetchCurrentTokenFiatRate({
      issuer: asset.issuer,
      currency: asset.currency,
      selectedCurrency,
      setRate: setTokenRate
    })
  }, [asset, selectedCurrency])

  if (!asset || !selectedCurrency) return null
  if (isNativeAsset(asset)) return Number(fiatRate) || null
  return tokenRate
}

const FiatEstimate = ({ amount, asset, selectedCurrency, fiatRate }) => {
  const rate = useAssetFiatRate({ asset, selectedCurrency, fiatRate })
  const value = Number(amount)
  const hasEstimate = amount && Number.isFinite(value) && value > 0 && rate && selectedCurrency
  const estimate =
    hasEstimate ? `≈ ${shortNiceNumber(value * rate, 2, 1, selectedCurrency)}` : '\u00A0'

  return (
    <span className="input-title ammAmountFiatEstimate" suppressHydrationWarning aria-hidden={!hasEstimate}>
      {estimate}
    </span>
  )
}

const Field = ({
  label,
  value,
  setValue,
  asset,
  selectedCurrency,
  fiatRate,
  maxAmount,
  balanceLoading = false,
  t,
  placeholder = '0.00'
}) => {
  const assetLabel = assetName(asset)
  const showMax = hasPositiveBalance(maxAmount)
  const applyMaxAmount = (event) => {
    event.preventDefault()
    event.stopPropagation()
    if (!showMax) return
    setValue(maxAmount)
  }

  return (
    <span className="halv">
      <span className="input-title ammAmountHeader">
        <span>{label}</span>
        {asset ? (
          <span className="ammAvailableBalance" title={showMax ? `${maxAmount} ${assetLabel}` : undefined}>
            {balanceLoading ? (
              t('sign.deposit.balanceLoading')
            ) : showMax ? (
              <>
                <span>
                  {t('sign.deposit.available')}: {shortNiceNumber(maxAmount, 6, 2)} {assetLabel}
                </span>
                <button
                  type="button"
                  className="ammMaxAmountButton"
                  onMouseDown={applyMaxAmount}
                  onClick={applyMaxAmount}
                >
                  {t('sign.deposit.max')}
                </button>
              </>
            ) : null}
          </span>
        ) : null}
      </span>
      <input
        placeholder={placeholder}
        onChange={(e) => setValue(normalizeAmountInput(e.target.value))}
        className="input-text"
        spellCheck="false"
        value={value}
        inputMode="decimal"
      />
      {asset ? <FiatEstimate amount={value} asset={asset} selectedCurrency={selectedCurrency} fiatRate={fiatRate} /> : null}
    </span>
  )
}

const AssetInEstimate = ({ amount, asset, selectedCurrency, fiatRate }) =>
  amount ? (
    <div className="ammAssetInEstimateRow">
      <b>
        ≈ {amount} <CurrencyWithIconInline token={displayToken(asset)} link={true} />
      </b>
      <FiatEstimate amount={amount} asset={asset} selectedCurrency={selectedCurrency} fiatRate={fiatRate} />
    </div>
  ) : null

const formatAssetOption = (option) => (
  <span className="ammAssetSelectOption">
    <CurrencyWithIconInline token={option.token} />
  </span>
)

export default function AmmDeposit({
  setSignRequest,
  signRequest,
  setStatus,
  setAgreedToRisks,
  selectedCurrency,
  fiatRate,
  account
}) {
  const { t } = useTranslation(['amm', 'services'])
  const { asset1, asset2, lpToken, tradingFee } = signRequest?.data || {}
  const modes = useMemo(
    () => [
      {
        value: 'tfSingleAsset',
        label: t('sign.deposit.modes.singleAsset.label'),
        description: t('sign.deposit.modes.singleAsset.description')
      },
      {
        value: 'tfTwoAsset',
        label: t('sign.deposit.modes.twoAsset.label'),
        description: t('sign.deposit.modes.twoAsset.description')
      },
      {
        value: 'tfLPToken',
        label: t('sign.deposit.modes.exactLp.label'),
        description: t('sign.deposit.modes.exactLp.description')
      },
      {
        value: 'tfOneAssetLPToken',
        label: t('sign.deposit.modes.singleAssetForLp.label'),
        description: t('sign.deposit.modes.singleAssetForLp.description')
      },
      {
        value: 'tfLimitLPToken',
        label: t('sign.deposit.modes.singleAssetWithLimit.label'),
        description: t('sign.deposit.modes.singleAssetWithLimit.description')
      }
    ],
    [t]
  )
  const [mode, setMode] = useState('tfSingleAsset')
  const [selectedAssetKey, setSelectedAssetKey] = useState('asset1')
  const [amount1, setAmount1] = useState('')
  const [amount2, setAmount2] = useState('')
  const [lpTokenOut, setLpTokenOut] = useState('')
  const [ePrice, setEPrice] = useState('')
  const [availableBalances, setAvailableBalances] = useState({})
  const [balancesLoading, setBalancesLoading] = useState(false)
  const [agreeToAmmRisks, setAgreeToAmmRisks] = useState(false)
  const [agreeToTerms, setAgreeToTerms] = useState(false)

  const selectedAsset = selectedAssetKey === 'asset2' ? asset2 : asset1
  const modeInfo = modes.find((item) => item.value === mode)
  const isTwoAssetMode = mode === 'tfTwoAsset'
  const lpTokensOutEstimate = (() => {
    if (isTwoAssetMode) return approximateLpTokensOut({ amount1, amount2, asset1, asset2, lpToken })
    if (['tfSingleAsset', 'tfLimitLPToken'].includes(mode)) {
      return approximateSingleAssetLpTokensOut({ amount: amount1, asset: selectedAsset, lpToken, tradingFee })
    }
    return ''
  })()
  const showLpTokensOutEstimate = !!lpTokensOutEstimate
  const reserveLpTokensOutEstimate = ['tfSingleAsset', 'tfTwoAsset', 'tfLimitLPToken'].includes(mode)
  const lpTokenAssetInEstimate =
    mode === 'tfLPToken' ? approximateAssetsInForLpTokens({ lpTokenOut, asset1, asset2, lpToken }) : null
  const showLpTokenAssetInEstimate = !!lpTokenAssetInEstimate?.amount1 && !!lpTokenAssetInEstimate?.amount2
  const assetOptions = [
    { value: 'asset1', label: assetName(asset1), token: displayToken(asset1) },
    { value: 'asset2', label: assetName(asset2), token: displayToken(asset2) }
  ]
  const balanceForAsset = (asset) => availableBalances[assetBalanceKey(asset)] || ''

  useEffect(() => {
    const address = account?.address

    if (!address) {
      setAvailableBalances({})
      setBalancesLoading(false)
      return
    }

    let ignore = false
    setBalancesLoading(true)

    Promise.allSettled([
      axios(`/v2/address/${address}?ledgerInfo=true`),
      axios('/v2/server'),
      axios(`v2/trustlines/${encodeURIComponent(address)}`)
    ])
      .then(([addressResult, serverResult, trustlinesResult]) => {
        if (ignore) return

        const nextBalances = {}
        const addressData = addressResult.status === 'fulfilled' ? addressResult.value?.data : null
        const networkInfo = serverResult.status === 'fulfilled' ? serverResult.value?.data : null
        const nativeBalance = nativeAvailableBalance({ addressData, networkInfo })

        if (nativeBalance) {
          nextBalances[nativeCurrency] = nativeBalance
        }

        const trustlinesPayload = trustlinesResult.status === 'fulfilled' ? trustlinesResult.value?.data : null
        const trustlines = Array.isArray(trustlinesPayload)
          ? trustlinesPayload
          : trustlinesPayload?.trustlines || trustlinesPayload?.tokens || trustlinesPayload?.lines || []
        Object.assign(nextBalances, buildTokenBalanceMap(trustlines, [asset1, asset2], address))

        setAvailableBalances(nextBalances)
      })
      .finally(() => {
        if (!ignore) setBalancesLoading(false)
      })

    return () => {
      ignore = true
    }
  }, [account?.address, asset1, asset2])

  const onModeChange = (nextMode) => {
    const previousMode = mode

    setMode(nextMode)

    if (nextMode === 'tfTwoAsset' && amount1 && !amount2) {
      setAmount2(suggestedPairAmount(amount1, asset1, asset2))
    } else if (nextMode === 'tfTwoAsset' && amount2 && !amount1) {
      setAmount1(suggestedPairAmount(amount2, asset2, asset1))
    } else if (nextMode === 'tfOneAssetLPToken') {
      if (previousMode === 'tfLPToken' && lpTokenOut) {
        setAmount1(approximateSingleAssetMaxAmountIn({ lpTokenOut, asset: selectedAsset, lpToken, tradingFee }))
      } else if (amount1) {
        const nextLpTokenOut = approximateSingleAssetLpTokensOut({ amount: amount1, asset: selectedAsset, lpToken, tradingFee })
        setLpTokenOut(nextLpTokenOut)
        setAmount1(approximateSingleAssetMaxAmountIn({ lpTokenOut: nextLpTokenOut, asset: selectedAsset, lpToken, tradingFee }))
      } else if (lpTokenOut) {
        setAmount1(approximateSingleAssetMaxAmountIn({ lpTokenOut, asset: selectedAsset, lpToken, tradingFee }))
      }
    } else if (nextMode === 'tfLimitLPToken' && amount1) {
      setEPrice(approximateSingleAssetEffectivePrice({ amount: amount1, asset: selectedAsset, lpToken, tradingFee }))
    }
  }

  const onSelectedAssetChange = (assetKey) => {
    const nextAsset = assetKey === 'asset2' ? asset2 : asset1

    setSelectedAssetKey(assetKey)
    if (mode === 'tfLimitLPToken' && amount1) {
      setEPrice(approximateSingleAssetEffectivePrice({ amount: amount1, asset: nextAsset, lpToken, tradingFee }))
      return
    }
    if (mode !== 'tfOneAssetLPToken') return

    if (lpTokenOut) {
      setAmount1(approximateSingleAssetMaxAmountIn({ lpTokenOut, asset: nextAsset, lpToken, tradingFee }))
    } else if (amount1) {
      const nextLpTokenOut = approximateSingleAssetLpTokensOutFromMaxAmount({
        amount: amount1,
        asset: nextAsset,
        lpToken,
        tradingFee
      })
      setLpTokenOut(nextLpTokenOut)
      setAmount1(approximateSingleAssetMaxAmountIn({ lpTokenOut: nextLpTokenOut, asset: nextAsset, lpToken, tradingFee }))
    }
  }

  const onAmount1Change = (value) => {
    setAmount1(value)
    if (isTwoAssetMode) setAmount2(suggestedPairAmount(value, asset1, asset2))
    if (mode === 'tfOneAssetLPToken') {
      setLpTokenOut(
        approximateSingleAssetLpTokensOutFromMaxAmount({
          amount: value,
          asset: selectedAsset,
          lpToken,
          tradingFee
        })
      )
    } else if (mode === 'tfLimitLPToken') {
      setEPrice(approximateSingleAssetEffectivePrice({ amount: value, asset: selectedAsset, lpToken, tradingFee }))
    }
  }

  const onAmount2Change = (value) => {
    setAmount2(value)
    if (isTwoAssetMode) setAmount1(suggestedPairAmount(value, asset2, asset1))
  }

  const onLpTokenOutChange = (value) => {
    setLpTokenOut(value)
    if (mode === 'tfOneAssetLPToken') {
      setAmount1(approximateSingleAssetMaxAmountIn({ lpTokenOut: value, asset: selectedAsset, lpToken, tradingFee }))
    }
  }

  const request = useMemo(() => {
    if (!asset1 || !asset2) return null

    const tx = {
      TransactionType: 'AMMDeposit',
      Asset: txIssue(asset1),
      Asset2: txIssue(asset2),
      Flags: FLAGS[mode]
    }

    switch (mode) {
      case 'tfTwoAsset':
        if (!isPositiveAssetAmount(asset1, amount1) || !isPositiveAssetAmount(asset2, amount2)) return null
        tx.Amount = txAmount(asset1, amount1)
        tx.Amount2 = txAmount(asset2, amount2)
        return tx
      case 'tfLPToken':
        if (!isPositiveAmount(lpTokenOut) || !lpToken?.currency || !lpToken?.issuer) return null
        tx.LPTokenOut = lpAmount(lpToken, lpTokenOut)
        return tx
      case 'tfSingleAsset':
        if (!isPositiveAssetAmount(selectedAsset, amount1)) return null
        tx.Amount = txAmount(selectedAsset, amount1)
        return tx
      case 'tfOneAssetLPToken':
        if (!isPositiveAssetAmount(selectedAsset, amount1) || !isPositiveAmount(lpTokenOut) || !lpToken?.currency || !lpToken?.issuer) return null
        tx.Amount = txAmount(selectedAsset, amount1)
        tx.LPTokenOut = lpAmount(lpToken, lpTokenOut)
        return tx
      case 'tfLimitLPToken':
        if (!isPositiveAssetAmount(selectedAsset, amount1) || !isPositiveAssetAmount(selectedAsset, ePrice)) return null
        tx.Amount = txAmount(selectedAsset, amount1)
        tx.EPrice = txAmount(selectedAsset, ePrice)
        return tx
      default:
        return null
    }
  }, [amount1, amount2, asset1, asset2, ePrice, lpToken, lpTokenOut, mode, selectedAsset])

  useEffect(() => {
    const valid = !!request
    const depositAgreementsConfirmed = agreeToAmmRisks && agreeToTerms
    const nextSignRequest = signRequest

    nextSignRequest.data = {
      ...nextSignRequest.data,
      depositFormValid: valid,
      depositAgreementsConfirmed,
      depositConfirmed: valid && depositAgreementsConfirmed
    }
    nextSignRequest.request = request || {
      TransactionType: 'AMMDeposit',
      Asset: asset1 ? txIssue(asset1) : undefined,
      Asset2: asset2 ? txIssue(asset2) : undefined
    }

    setSignRequest(nextSignRequest)
    setAgreedToRisks(valid && depositAgreementsConfirmed)
    if (valid && depositAgreementsConfirmed) setStatus('')
  }, [
    agreeToAmmRisks,
    agreeToTerms,
    asset1,
    asset2,
    request,
    setAgreedToRisks,
    setSignRequest,
    setStatus,
    signRequest
  ])

  const showSingleAssetSelector = ['tfSingleAsset', 'tfLimitLPToken'].includes(mode)
  const showSingleAssetAmountField = ['tfSingleAsset', 'tfLimitLPToken'].includes(mode)

  return (
    <div className="center">
      <br />
      <span className="halv">
        <span className="input-title">{t('sign.deposit.modeLabel')}</span>
        <SimpleSelect
          value={mode}
          setValue={onModeChange}
          optionsList={modes}
          instanceId="amm-deposit-mode-select"
        />
        {modeInfo?.description ? <span className="input-title ammModeDescription">{modeInfo.description}</span> : null}
      </span>

      <span className="halv ammPoolSummary">
        <span className="input-title">{t('sign.deposit.pool')}</span>
        <b className="ammPoolPair">
          <CurrencyWithIconInline token={displayToken(asset1)} link={true} /> /{' '}
          <CurrencyWithIconInline token={displayToken(asset2)} link={true} />
        </b>
      </span>

      <br />
      {showSingleAssetSelector ? (
        <span className="halv">
          <span className="input-title">{t('sign.deposit.assetToDeposit')}</span>
          <SimpleSelect
            value={selectedAssetKey}
            setValue={onSelectedAssetChange}
            optionsList={assetOptions}
            instanceId="amm-deposit-asset-select"
            formatOptionLabel={formatAssetOption}
          />
        </span>
      ) : null}

      {mode === 'tfOneAssetLPToken' ? (
        <Field label={t('sign.deposit.lpTokensToReceive')} value={lpTokenOut} setValue={onLpTokenOutChange} t={t} />
      ) : null}

      {showSingleAssetAmountField ? (
        <Field
          label={t('sign.deposit.amountLabel', { asset: assetName(selectedAsset) })}
          value={amount1}
          setValue={onAmount1Change}
          asset={selectedAsset}
          selectedCurrency={selectedCurrency}
          fiatRate={fiatRate}
          maxAmount={balanceForAsset(selectedAsset)}
          balanceLoading={balancesLoading}
          t={t}
        />
      ) : null}

      {mode === 'tfOneAssetLPToken' ? (
        <>
          <span className="halv">
            <span className="input-title">{t('sign.deposit.assetToDeposit')}</span>
            <SimpleSelect
              value={selectedAssetKey}
              setValue={onSelectedAssetChange}
              optionsList={assetOptions}
              instanceId="amm-deposit-asset-select"
              formatOptionLabel={formatAssetOption}
            />
          </span>
          <Field
            label={t('sign.deposit.maxAmountLabel', { asset: assetName(selectedAsset) })}
            value={amount1}
            setValue={onAmount1Change}
            asset={selectedAsset}
            selectedCurrency={selectedCurrency}
            fiatRate={fiatRate}
            maxAmount={balanceForAsset(selectedAsset)}
            balanceLoading={balancesLoading}
            t={t}
          />
          <span className="halv ammAmountLimitNote">
            {t('sign.deposit.singleAssetLimitNote')}
          </span>
        </>
      ) : null}

      {mode === 'tfTwoAsset' ? (
        <>
          <Field
            label={t('sign.deposit.asset1AmountLabel', { asset: assetName(asset1) })}
            value={amount1}
            setValue={onAmount1Change}
            asset={asset1}
            selectedCurrency={selectedCurrency}
            fiatRate={fiatRate}
            maxAmount={balanceForAsset(asset1)}
            balanceLoading={balancesLoading}
            t={t}
          />
          <Field
            label={t('sign.deposit.asset2AmountLabel', { asset: assetName(asset2) })}
            value={amount2}
            setValue={onAmount2Change}
            asset={asset2}
            selectedCurrency={selectedCurrency}
            fiatRate={fiatRate}
            maxAmount={balanceForAsset(asset2)}
            balanceLoading={balancesLoading}
            t={t}
          />
        </>
      ) : null}

      {mode === 'tfLPToken' ? (
        <Field label={t('sign.deposit.lpTokensToReceive')} value={lpTokenOut} setValue={onLpTokenOutChange} t={t} />
      ) : null}

      {showLpTokenAssetInEstimate ? (
        <span className="halv ammAssetInEstimate">
          <span className="input-title">{t('sign.deposit.approxAssetsToDeposit')}</span>
          <AssetInEstimate
            amount={lpTokenAssetInEstimate.amount1}
            asset={asset1}
            selectedCurrency={selectedCurrency}
            fiatRate={fiatRate}
          />
          <AssetInEstimate
            amount={lpTokenAssetInEstimate.amount2}
            asset={asset2}
            selectedCurrency={selectedCurrency}
            fiatRate={fiatRate}
          />
        </span>
      ) : null}

      {mode === 'tfLimitLPToken' ? (
        <>
          <Field
            label={t('sign.deposit.maxPricePerLp', { asset: assetName(selectedAsset) })}
            value={ePrice}
            setValue={setEPrice}
            t={t}
          />
          <span className="halv ammAmountLimitNote">
            {t('sign.deposit.priceLimitNote')}
          </span>
        </>
      ) : null}

      {reserveLpTokensOutEstimate ? (
        <span className={`halv ammLpEstimate${showLpTokensOutEstimate ? '' : ' empty'}`}>
          <span className="ammLpEstimateLine">
            {showLpTokensOutEstimate ? (
              <>
                {t('sign.deposit.youWillGetLp')} <b>≈ {lpTokensOutEstimate} LP</b>
              </>
            ) : (
              '\u00A0'
            )}
          </span>
        </span>
      ) : null}

      <div className="terms-checkbox ammDepositConsent">
        <CheckBox checked={agreeToAmmRisks} setChecked={setAgreeToAmmRisks} name="amm-deposit-risks">
          <span className="orange bold">{t('amm.deposit.risks', { ns: 'services' })}</span>
        </CheckBox>
      </div>

      <div className="terms-checkbox ammDepositConsent">
        <CheckBox checked={agreeToTerms} setChecked={setAgreeToTerms} name="amm-deposit-terms">
          <Trans
            i18nKey="shared.agree-terms"
            ns="services"
            components={[<Link key="0" href="/terms-and-conditions" target="_blank" />]}
          />
        </CheckBox>
      </div>
    </div>
  )
}

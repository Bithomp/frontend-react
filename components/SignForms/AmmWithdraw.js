import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'next-i18next'
import BigNumber from 'bignumber.js'

import { nativeCurrency } from '../../utils'
import { multiply } from '../../utils/calc'
import { fetchCurrentTokenFiatRate } from '../../utils/common'
import { CurrencyWithIconInline, niceCurrency, shortNiceNumber } from '../../utils/format'
import SimpleSelect from '../UI/SimpleSelect'

const FLAGS = {
  tfLPToken: 0x00010000,
  tfWithdrawAll: 0x00020000,
  tfOneAssetWithdrawAll: 0x00040000,
  tfSingleAsset: 0x00080000,
  tfTwoAsset: 0x00100000,
  tfOneAssetLPToken: 0x00200000,
  tfLimitLPToken: 0x00400000
}

const FEE_SCALE = 100000
const WITHDRAW_ESTIMATE_MARGIN = new BigNumber('0.005')

const isNativeAsset = (asset) => !asset || typeof asset !== 'object' || !asset.issuer
const assetName = (asset) => (isNativeAsset(asset) ? nativeCurrency : niceCurrency(asset.currency))
const displayToken = (asset) => (isNativeAsset(asset) ? { currency: nativeCurrency } : asset)
const isPositiveAmount = (value) => value !== '' && Number.isFinite(Number(value)) && Number(value) > 0
const isNonNegativeAmount = (value) => value !== '' && Number.isFinite(Number(value)) && Number(value) >= 0
const stripTrailingZeros = (value) => value.replace(/(\.\d*?[1-9])0+$/, '$1').replace(/\.0+$/, '')
const normalizeAmountInput = (value) => {
  const normalized = value.replace(/,/g, '.').replace(/[^\d.]/g, '')
  const [integerPart, ...decimalParts] = normalized.split('.')

  return `${integerPart}${decimalParts.length ? `.${decimalParts.join('')}` : ''}`
}
const formatPoolAmount = (amount) => {
  if (!amount?.isFinite() || !amount.gt(0)) return ''
  return stripTrailingZeros(amount.gte(1) ? amount.toFixed(8) : amount.toFixed(15))
}
const addMargin = (amount) => {
  const value = new BigNumber(amount || 0)
  if (!value.isFinite() || !value.gt(0)) return ''
  return formatPoolAmount(value.multipliedBy(new BigNumber(1).plus(WITHDRAW_ESTIMATE_MARGIN)))
}
const feeDecimal = (tradingFee) => new BigNumber(tradingFee || 0).dividedBy(FEE_SCALE)

const reserveValue = (asset) => {
  if (!asset) return new BigNumber(0)
  if (typeof asset === 'object' && asset.value !== undefined) return new BigNumber(asset.value || 0)
  return new BigNumber(asset || 0).dividedBy(1000000)
}

const pairedAssetAmount = (amount, fromAsset, toAsset) => {
  const input = new BigNumber(amount || 0)
  const fromReserve = reserveValue(fromAsset)
  const toReserve = reserveValue(toAsset)

  if (!input.isFinite() || !input.gt(0) || !fromReserve.gt(0) || !toReserve.gt(0)) return ''

  return formatPoolAmount(input.multipliedBy(toReserve).dividedBy(fromReserve))
}

const approximateLpTokensInForAssets = ({ amount1, amount2, asset1, asset2, lpToken }) => {
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

  return formatPoolAmount(BigNumber.maximum(input1.dividedBy(reserve1), input2.dividedBy(reserve2)).multipliedBy(lpSupply))
}

const approximateAssetsOutForLpTokens = ({ lpTokenIn, asset1, asset2, lpToken }) => {
  const lpTokens = new BigNumber(lpTokenIn || 0)
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

const approximateSingleAssetLpTokensIn = ({ amount, asset, lpToken, tradingFee }) => {
  const input = new BigNumber(amount || 0)
  const reserve = reserveValue(asset)
  const lpSupply = new BigNumber(lpToken?.value || 0)

  if (!input.isFinite() || !input.gt(0) || !reserve.gt(0) || !lpSupply.gt(0)) return ''

  const feeMultiplier = new BigNumber(1).plus(feeDecimal(tradingFee).dividedBy(2)).plus(WITHDRAW_ESTIMATE_MARGIN)
  return formatPoolAmount(input.dividedBy(reserve).multipliedBy(lpSupply).multipliedBy(feeMultiplier))
}

const approximateSingleAssetAmountOut = ({ lpTokenIn, asset, lpToken, tradingFee }) => {
  const lpTokens = new BigNumber(lpTokenIn || 0)
  const reserve = reserveValue(asset)
  const lpSupply = new BigNumber(lpToken?.value || 0)

  if (!lpTokens.isFinite() || !lpTokens.gt(0) || !reserve.gt(0) || !lpSupply.gt(0)) return ''

  const feeMultiplier = new BigNumber(1).minus(feeDecimal(tradingFee).dividedBy(2))
  return formatPoolAmount(lpTokens.dividedBy(lpSupply).multipliedBy(reserve).multipliedBy(feeMultiplier))
}

const approximateSingleAssetAmountLimit = ({ lpTokenIn, asset, lpToken, tradingFee }) =>
  addMargin(approximateSingleAssetAmountOut({ lpTokenIn, asset, lpToken, tradingFee }))

const approximateEffectivePrice = ({ amount, asset, lpToken, tradingFee }) => {
  const input = new BigNumber(amount || 0)
  const lpTokensIn = new BigNumber(approximateSingleAssetLpTokensIn({ amount, asset, lpToken, tradingFee }) || 0)

  if (!input.isFinite() || !input.gt(0) || !lpTokensIn.isFinite() || !lpTokensIn.gt(0)) return ''

  return addMargin(lpTokensIn.dividedBy(input))
}

const txIssue = (asset) => {
  if (asset?.mpt_issuance_id) return { mpt_issuance_id: asset.mpt_issuance_id }
  if (isNativeAsset(asset)) return { currency: nativeCurrency }
  return { currency: asset.currency, issuer: asset.issuer }
}

const txAmount = (asset, value) => {
  if (isNativeAsset(asset)) return multiply(value, 1000000)
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

const Field = ({ label, value, setValue, asset, selectedCurrency, fiatRate, placeholder = '0.00' }) => (
  <span className="halv">
    <span className="input-title">{label}</span>
    <input
      placeholder={placeholder}
      onChange={(e) => setValue(normalizeAmountInput(e.target.value))}
      className="input-text"
      spellCheck="false"
      value={value}
    />
    {asset ? <FiatEstimate amount={value} asset={asset} selectedCurrency={selectedCurrency} fiatRate={fiatRate} /> : null}
  </span>
)

const AssetEstimate = ({ amount, asset, selectedCurrency, fiatRate }) => {
  const hasAmount = !!amount

  return (
    <div className={`ammAssetInEstimateRow${hasAmount ? '' : ' empty'}`}>
      <b>
        {hasAmount ? (
          <>
            ≈ {amount} <CurrencyWithIconInline token={displayToken(asset)} link={true} />
          </>
        ) : (
          '\u00A0'
        )}
      </b>
      <FiatEstimate amount={amount} asset={asset} selectedCurrency={selectedCurrency} fiatRate={fiatRate} />
    </div>
  )
}

const formatAssetOption = (option) => (
  <span className="ammAssetSelectOption">
    <CurrencyWithIconInline token={option.token} />
  </span>
)

export default function AmmWithdraw({
  setSignRequest,
  signRequest,
  setStatus,
  setAgreedToRisks,
  selectedCurrency,
  fiatRate
}) {
  const { t } = useTranslation('amm')
  const { asset1, asset2, lpToken, tradingFee } = signRequest?.data || {}
  const modes = useMemo(
    () => [
      {
        value: 'tfTwoAsset',
        label: t('sign.withdraw.modes.twoAsset.label'),
        description: t('sign.withdraw.modes.twoAsset.description')
      },
      {
        value: 'tfSingleAsset',
        label: t('sign.withdraw.modes.singleAsset.label'),
        description: t('sign.withdraw.modes.singleAsset.description')
      },
      {
        value: 'tfLPToken',
        label: t('sign.withdraw.modes.redeemLp.label'),
        description: t('sign.withdraw.modes.redeemLp.description')
      },
      {
        value: 'tfOneAssetLPToken',
        label: t('sign.withdraw.modes.singleAssetForLp.label'),
        description: t('sign.withdraw.modes.singleAssetForLp.description')
      },
      {
        value: 'tfOneAssetWithdrawAll',
        label: t('sign.withdraw.modes.allLpIntoOneAsset.label'),
        description: t('sign.withdraw.modes.allLpIntoOneAsset.description')
      },
      {
        value: 'tfLimitLPToken',
        label: t('sign.withdraw.modes.singleAssetWithLimit.label'),
        description: t('sign.withdraw.modes.singleAssetWithLimit.description')
      },
      {
        value: 'tfWithdrawAll',
        label: t('sign.withdraw.modes.withdrawAll.label'),
        description: t('sign.withdraw.modes.withdrawAll.description')
      }
    ],
    [t]
  )
  const [mode, setMode] = useState('tfTwoAsset')
  const [selectedAssetKey, setSelectedAssetKey] = useState('asset1')
  const [amount1, setAmount1] = useState('')
  const [amount2, setAmount2] = useState('')
  const [lpTokenIn, setLpTokenIn] = useState('')
  const [ePrice, setEPrice] = useState('')

  const selectedAsset = selectedAssetKey === 'asset2' ? asset2 : asset1
  const modeInfo = modes.find((item) => item.value === mode)
  const isTwoAssetMode = mode === 'tfTwoAsset'
  const lpTokensInEstimate = (() => {
    if (isTwoAssetMode) return approximateLpTokensInForAssets({ amount1, amount2, asset1, asset2, lpToken })
    if (['tfSingleAsset', 'tfLimitLPToken'].includes(mode)) {
      return approximateSingleAssetLpTokensIn({ amount: amount1, asset: selectedAsset, lpToken, tradingFee })
    }
    return ''
  })()
  const showLpTokensInEstimate = !!lpTokensInEstimate
  const reserveLpTokensInEstimate = ['tfSingleAsset', 'tfTwoAsset', 'tfLimitLPToken'].includes(mode)
  const assetsOutEstimate =
    mode === 'tfLPToken' ? approximateAssetsOutForLpTokens({ lpTokenIn, asset1, asset2, lpToken }) : null
  const showAssetsOutEstimate = !!assetsOutEstimate?.amount1 && !!assetsOutEstimate?.amount2
  const reserveAssetsOutEstimate = mode === 'tfLPToken'
  const assetOptions = [
    { value: 'asset1', label: assetName(asset1), token: displayToken(asset1) },
    { value: 'asset2', label: assetName(asset2), token: displayToken(asset2) }
  ]
  const setWithdrawMode = (value) => {
    setMode(value)

    if (value === 'tfTwoAsset' && amount1 && !amount2) {
      setAmount2(pairedAssetAmount(amount1, asset1, asset2))
    } else if (value === 'tfTwoAsset' && amount2 && !amount1) {
      setAmount1(pairedAssetAmount(amount2, asset2, asset1))
    } else if (value === 'tfOneAssetLPToken') {
      if (lpTokenIn) {
        setAmount1(approximateSingleAssetAmountLimit({ lpTokenIn, asset: selectedAsset, lpToken, tradingFee }))
      } else if (amount1) {
        setLpTokenIn(approximateSingleAssetLpTokensIn({ amount: amount1, asset: selectedAsset, lpToken, tradingFee }))
      }
    } else if (value === 'tfLimitLPToken' && amount1) {
      setEPrice(approximateEffectivePrice({ amount: amount1, asset: selectedAsset, lpToken, tradingFee }))
    }
  }

  const onSelectedAssetChange = (assetKey) => {
    const nextAsset = assetKey === 'asset2' ? asset2 : asset1

    setSelectedAssetKey(assetKey)
    if (mode === 'tfOneAssetLPToken' && lpTokenIn) {
      setAmount1(approximateSingleAssetAmountLimit({ lpTokenIn, asset: nextAsset, lpToken, tradingFee }))
    } else if (mode === 'tfOneAssetLPToken' && amount1) {
      setLpTokenIn(approximateSingleAssetLpTokensIn({ amount: amount1, asset: nextAsset, lpToken, tradingFee }))
    } else if (mode === 'tfLimitLPToken' && amount1) {
      setEPrice(approximateEffectivePrice({ amount: amount1, asset: nextAsset, lpToken, tradingFee }))
    }
  }

  const onAmount1Change = (value) => {
    setAmount1(value)
    if (isTwoAssetMode) setAmount2(pairedAssetAmount(value, asset1, asset2))
    if (mode === 'tfOneAssetLPToken') {
      setLpTokenIn(approximateSingleAssetLpTokensIn({ amount: value, asset: selectedAsset, lpToken, tradingFee }))
    } else if (mode === 'tfLimitLPToken') {
      setEPrice(approximateEffectivePrice({ amount: value, asset: selectedAsset, lpToken, tradingFee }))
    }
  }

  const onAmount2Change = (value) => {
    setAmount2(value)
    if (isTwoAssetMode) setAmount1(pairedAssetAmount(value, asset2, asset1))
  }

  const onLpTokenInChange = (value) => {
    setLpTokenIn(value)
    if (mode === 'tfOneAssetLPToken') {
      setAmount1(approximateSingleAssetAmountLimit({ lpTokenIn: value, asset: selectedAsset, lpToken, tradingFee }))
    }
  }

  const request = useMemo(() => {
    if (!asset1 || !asset2) return null

    const tx = {
      TransactionType: 'AMMWithdraw',
      Asset: txIssue(asset1),
      Asset2: txIssue(asset2),
      Flags: FLAGS[mode]
    }

    switch (mode) {
      case 'tfTwoAsset':
        if (!isPositiveAmount(amount1) || !isPositiveAmount(amount2)) return null
        tx.Amount = txAmount(asset1, amount1)
        tx.Amount2 = txAmount(asset2, amount2)
        return tx
      case 'tfLPToken':
        if (!isPositiveAmount(lpTokenIn) || !lpToken?.currency || !lpToken?.issuer) return null
        tx.LPTokenIn = lpAmount(lpToken, lpTokenIn)
        return tx
      case 'tfWithdrawAll':
        return tx
      case 'tfSingleAsset':
        if (!isPositiveAmount(amount1)) return null
        tx.Amount = txAmount(selectedAsset, amount1)
        return tx
      case 'tfOneAssetWithdrawAll':
        if (!isNonNegativeAmount(amount1)) return null
        tx.Amount = txAmount(selectedAsset, amount1)
        return tx
      case 'tfOneAssetLPToken':
        if (!isPositiveAmount(amount1) || !isPositiveAmount(lpTokenIn) || !lpToken?.currency || !lpToken?.issuer) return null
        tx.Amount = txAmount(selectedAsset, amount1)
        tx.LPTokenIn = lpAmount(lpToken, lpTokenIn)
        return tx
      case 'tfLimitLPToken':
        if (!isPositiveAmount(amount1) || !isPositiveAmount(ePrice) || !lpToken?.currency || !lpToken?.issuer) return null
        tx.Amount = txAmount(selectedAsset, amount1)
        tx.EPrice = lpAmount(lpToken, ePrice)
        return tx
      default:
        return null
    }
  }, [amount1, amount2, asset1, asset2, ePrice, lpToken, lpTokenIn, mode, selectedAsset])

  useEffect(() => {
    const valid = !!request
    const nextSignRequest = signRequest

    nextSignRequest.data = {
      ...nextSignRequest.data,
      withdrawConfirmed: valid
    }
    nextSignRequest.request = request || {
      TransactionType: 'AMMWithdraw',
      Asset: asset1 ? txIssue(asset1) : undefined,
      Asset2: asset2 ? txIssue(asset2) : undefined
    }

    setSignRequest(nextSignRequest)
    setAgreedToRisks(valid)
    if (valid) setStatus('')
  }, [asset1, asset2, request, setAgreedToRisks, setSignRequest, setStatus, signRequest])

  const showSingleAssetSelector = ['tfSingleAsset', 'tfOneAssetWithdrawAll', 'tfLimitLPToken'].includes(mode)

  return (
    <div className="center">
      <br />
      <span className="halv">
        <span className="input-title">{t('sign.withdraw.modeLabel')}</span>
        <SimpleSelect
          value={mode}
          setValue={setWithdrawMode}
          optionsList={modes}
          instanceId="amm-withdraw-mode-select"
        />
        {modeInfo?.description ? <span className="input-title ammModeDescription">{modeInfo.description}</span> : null}
      </span>

      <span className="halv ammPoolSummary">
        <span className="input-title">{t('sign.withdraw.pool')}</span>
        <b className="ammPoolPair">
          <CurrencyWithIconInline token={displayToken(asset1)} link={true} /> /{' '}
          <CurrencyWithIconInline token={displayToken(asset2)} link={true} />
        </b>
      </span>

      <br />
      {showSingleAssetSelector ? (
        <>
          <span className="halv">
            <span className="input-title">{t('sign.withdraw.assetToWithdraw')}</span>
            <SimpleSelect
              value={selectedAssetKey}
              setValue={onSelectedAssetChange}
              optionsList={assetOptions}
              instanceId="amm-withdraw-asset-select"
              formatOptionLabel={formatAssetOption}
            />
          </span>
          <Field
            label={
              mode === 'tfOneAssetWithdrawAll'
                ? t('sign.withdraw.minimumAmountLabel', { asset: assetName(selectedAsset) })
                : t('sign.withdraw.amountLabel', { asset: assetName(selectedAsset) })
            }
            value={amount1}
            setValue={onAmount1Change}
            asset={selectedAsset}
            selectedCurrency={selectedCurrency}
            fiatRate={fiatRate}
          />
        </>
      ) : null}

      {mode === 'tfTwoAsset' ? (
        <>
          <Field
            label={t('sign.withdraw.asset1AmountLabel', { asset: assetName(asset1) })}
            value={amount1}
            setValue={onAmount1Change}
            asset={asset1}
            selectedCurrency={selectedCurrency}
            fiatRate={fiatRate}
          />
          <Field
            label={t('sign.withdraw.asset2AmountLabel', { asset: assetName(asset2) })}
            value={amount2}
            setValue={onAmount2Change}
            asset={asset2}
            selectedCurrency={selectedCurrency}
            fiatRate={fiatRate}
          />
        </>
      ) : null}

      {mode === 'tfOneAssetLPToken' ? (
        <>
          <Field label={t('sign.withdraw.lpTokensToRedeemUpTo')} value={lpTokenIn} setValue={onLpTokenInChange} />
          <span className="halv">
            <span className="input-title">{t('sign.withdraw.assetToWithdraw')}</span>
            <SimpleSelect
              value={selectedAssetKey}
              setValue={onSelectedAssetChange}
              optionsList={assetOptions}
              instanceId="amm-withdraw-asset-select"
              formatOptionLabel={formatAssetOption}
            />
          </span>
          <Field
            label={t('sign.withdraw.assetAmountToReceiveUpTo', { asset: assetName(selectedAsset) })}
            value={amount1}
            setValue={onAmount1Change}
            asset={selectedAsset}
            selectedCurrency={selectedCurrency}
            fiatRate={fiatRate}
          />
          <span className="halv ammAmountLimitNote">
            {t('sign.withdraw.lpAssetCapsNote')}
          </span>
        </>
      ) : null}

      {mode === 'tfLPToken' ? (
        <Field label={t('sign.withdraw.lpTokensToRedeem')} value={lpTokenIn} setValue={onLpTokenInChange} />
      ) : null}

      {reserveAssetsOutEstimate ? (
        <span className={`halv ammAssetInEstimate${showAssetsOutEstimate ? '' : ' empty'}`}>
          <span className="input-title">{t('sign.withdraw.approxAssetsToReceive')}</span>
          <AssetEstimate
            amount={assetsOutEstimate?.amount1}
            asset={asset1}
            selectedCurrency={selectedCurrency}
            fiatRate={fiatRate}
          />
          <AssetEstimate
            amount={assetsOutEstimate?.amount2}
            asset={asset2}
            selectedCurrency={selectedCurrency}
            fiatRate={fiatRate}
          />
        </span>
      ) : null}

      {mode === 'tfLimitLPToken' ? (
        <>
          <Field label={t('sign.withdraw.maxLpPerAsset', { asset: assetName(selectedAsset) })} value={ePrice} setValue={setEPrice} />
          <span className="halv ammAmountLimitNote">
            {t('sign.withdraw.priceLimitNote')}
          </span>
        </>
      ) : null}

      {reserveLpTokensInEstimate ? (
        <span className={`halv ammLpEstimate${showLpTokensInEstimate ? '' : ' empty'}`}>
          <span className="ammLpEstimateLine">
            {showLpTokensInEstimate ? (
              <>
                {t('sign.withdraw.approxLpToRedeem')} <b>≈ {lpTokensInEstimate} LP</b>
              </>
            ) : (
              '\u00A0'
            )}
          </span>
        </span>
      ) : null}

    </div>
  )
}

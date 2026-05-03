import { useState } from 'react'
import { Trans, useTranslation } from 'next-i18next'
import Link from 'next/link'
import { multiply } from '../../../utils/calc'
import CheckBox from '../../UI/CheckBox'
import FormInput from '../../UI/FormInput'
import { nativeCurrency, typeNumberOnly } from '../../../utils'
import TokenSelector from '../../UI/TokenSelector'
import { LinkTx } from '../../../utils/links'
import CopyButton from '../../UI/CopyButton'
import { errorCodeDescription } from '../../../utils/transaction'
import SimpleSelect from '../../UI/SimpleSelect'

export default function AMMWithdrawForm({
  setSignRequest,
  queryCurrency,
  queryCurrencyIssuer,
  queryCurrency2,
  queryCurrency2Issuer
}) {
  const { t } = useTranslation(['common', 'services'])
  const ts = (key, options) => t(key, { ns: 'services', ...options })
  const [asset1, setAsset1] = useState({ currency: queryCurrency || nativeCurrency, issuer: queryCurrencyIssuer || '' })
  const [asset2, setAsset2] = useState({
    currency: queryCurrency2 || nativeCurrency,
    issuer: queryCurrency2Issuer || ''
  })
  const [amount1, setAmount1] = useState('')
  const [amount2, setAmount2] = useState('')
  const [lpTokenIn, setLpTokenIn] = useState('')
  const [ePrice, setEPrice] = useState('')
  const [withdrawMode, setWithdrawMode] = useState('tfTwoAsset') // Default to double-asset withdrawal
  const [error, setError] = useState('')
  const [agreeToTerms, setAgreeToTerms] = useState(false)
  const [agreeToRisks, setAgreeToRisks] = useState(false)
  const [txResult, setTxResult] = useState(null)

  const withdrawModes = [
    {
      value: 'tfLPToken',
      label: ts('amm.modes.withdraw.tfLPToken.label'),
      description: ts('amm.modes.withdraw.tfLPToken.description')
    },
    {
      value: 'tfWithdrawAll',
      label: ts('amm.modes.withdraw.tfWithdrawAll.label'),
      description: ts('amm.modes.withdraw.tfWithdrawAll.description')
    },
    {
      value: 'tfTwoAsset',
      label: ts('amm.modes.withdraw.tfTwoAsset.label'),
      description: ts('amm.modes.withdraw.tfTwoAsset.description')
    },
    {
      value: 'tfSingleAsset',
      label: ts('amm.modes.withdraw.tfSingleAsset.label'),
      description: ts('amm.modes.withdraw.tfSingleAsset.description')
    },
    {
      value: 'tfOneAssetWithdrawAll',
      label: ts('amm.modes.withdraw.tfOneAssetWithdrawAll.label'),
      description: ts('amm.modes.withdraw.tfOneAssetWithdrawAll.description')
    },
    {
      value: 'tfOneAssetLPToken',
      label: ts('amm.modes.withdraw.tfOneAssetLPToken.label'),
      description: ts('amm.modes.withdraw.tfOneAssetLPToken.description')
    },
    {
      value: 'tfLimitLPToken',
      label: ts('amm.modes.withdraw.tfLimitLPToken.label'),
      description: ts('amm.modes.withdraw.tfLimitLPToken.description')
    }
  ]

  const validateForm = () => {
    if (asset1.currency === asset2.currency) {
      setError(ts('amm.errors.sameAssets'))
      return false
    }

    // Validate based on withdraw mode
    switch (withdrawMode) {
      case 'tfTwoAsset':
        if (!amount1 || isNaN(parseFloat(amount1)) || parseFloat(amount1) <= 0) {
          setError(ts('amm.errors.asset1Amount'))
          return false
        }
        if (!amount2 || isNaN(parseFloat(amount2)) || parseFloat(amount2) <= 0) {
          setError(ts('amm.errors.asset2Amount'))
          return false
        }
        break
      case 'tfLPToken':
        if (!lpTokenIn || isNaN(parseFloat(lpTokenIn)) || parseFloat(lpTokenIn) <= 0) {
          setError(ts('amm.errors.lpToken'))
          return false
        }
        break
      case 'tfSingleAsset':
        if (!amount1 || isNaN(parseFloat(amount1)) || parseFloat(amount1) <= 0) {
          setError(ts('amm.errors.assetWithdraw'))
          return false
        }
        break
      case 'tfOneAssetWithdrawAll':
        if (!amount1 || isNaN(parseFloat(amount1)) || parseFloat(amount1) < 0) {
          setError(ts('amm.errors.assetWithdrawZero'))
          return false
        }
        break
      case 'tfOneAssetLPToken':
        if (!amount1 || isNaN(parseFloat(amount1)) || parseFloat(amount1) <= 0) {
          setError(ts('amm.errors.assetWithdraw'))
          return false
        }
        if (!lpTokenIn || isNaN(parseFloat(lpTokenIn)) || parseFloat(lpTokenIn) <= 0) {
          setError(ts('amm.errors.lpToken'))
          return false
        }
        break
      case 'tfLimitLPToken':
        if (!amount1 || isNaN(parseFloat(amount1)) || parseFloat(amount1) <= 0) {
          setError(ts('amm.errors.assetWithdraw'))
          return false
        }
        if (!ePrice || isNaN(parseFloat(ePrice)) || parseFloat(ePrice) <= 0) {
          setError(ts('amm.errors.effectivePriceAsset'))
          return false
        }
        break
      case 'tfWithdrawAll':
        // No validation needed for withdraw all
        break
    }

    if (!agreeToRisks) {
      setError(ts('amm.errors.risks'))
      return false
    }

    if (!agreeToTerms) {
      setError(ts('amm.errors.terms'))
      return false
    }

    return true
  }

  const onSubmit = () => {
    setTxResult(null)
    setError('')

    if (!validateForm()) {
      return
    }

    try {
      const ammWithdraw = {
        TransactionType: 'AMMWithdraw',
        Asset:
          asset1.currency === nativeCurrency
            ? { currency: nativeCurrency }
            : {
                currency: asset1.currency,
                issuer: asset1.issuer
              },
        Asset2:
          asset2.currency === nativeCurrency
            ? { currency: nativeCurrency }
            : {
                currency: asset2.currency,
                issuer: asset2.issuer
              }
      }

      // Add fields based on withdraw mode
      switch (withdrawMode) {
        case 'tfTwoAsset':
          // Asset 1 amount formatting
          if (asset1.currency === nativeCurrency) {
            ammWithdraw.Amount = multiply(amount1, 1000000)
          } else {
            ammWithdraw.Amount = {
              currency: asset1.currency,
              issuer: asset1.issuer,
              value: amount1
            }
          }
          // Asset 2 amount formatting
          if (asset2.currency === nativeCurrency) {
            ammWithdraw.Amount2 = multiply(amount2, 1000000)
          } else {
            ammWithdraw.Amount2 = {
              currency: asset2.currency,
              issuer: asset2.issuer,
              value: amount2
            }
          }
          break
        case 'tfLPToken':
          ammWithdraw.LPTokenIn = {
            currency: 'LP', // AMM LP token currency
            issuer: '', // Will be set by the AMM account
            value: lpTokenIn
          }
          break
        case 'tfSingleAsset':
          // Asset 1 amount formatting
          if (asset1.currency === nativeCurrency) {
            ammWithdraw.Amount = multiply(amount1, 1000000)
          } else {
            ammWithdraw.Amount = {
              currency: asset1.currency,
              issuer: asset1.issuer,
              value: amount1
            }
          }
          break
        case 'tfOneAssetWithdrawAll':
          // Asset 1 amount formatting
          if (asset1.currency === nativeCurrency) {
            ammWithdraw.Amount = multiply(amount1, 1000000)
          } else {
            ammWithdraw.Amount = {
              currency: asset1.currency,
              issuer: asset1.issuer,
              value: amount1
            }
          }
          break
        case 'tfOneAssetLPToken':
          // Asset 1 amount formatting
          if (asset1.currency === nativeCurrency) {
            ammWithdraw.Amount = multiply(amount1, 1000000)
          } else {
            ammWithdraw.Amount = {
              currency: asset1.currency,
              issuer: asset1.issuer,
              value: amount1
            }
          }
          ammWithdraw.LPTokenIn = {
            currency: 'LP',
            issuer: '',
            value: lpTokenIn
          }
          break
        case 'tfLimitLPToken':
          // Asset 1 amount formatting
          if (asset1.currency === nativeCurrency) {
            ammWithdraw.Amount = multiply(amount1, 1000000)
          } else {
            ammWithdraw.Amount = {
              currency: asset1.currency,
              issuer: asset1.issuer,
              value: amount1
            }
          }

          if (asset1.currency === nativeCurrency) {
            ammWithdraw.EPrice = multiply(ePrice, 1000000)
          } else {
            ammWithdraw.EPrice = {
              currency: asset1.currency,
              issuer: asset1.issuer,
              value: ePrice
            }
          }
          break
        case 'tfWithdrawAll':
          // No additional fields needed for withdraw all
          break
      }

      // Add flags
      const flags = {
        tfLPToken: 0x00010000,
        tfWithdrawAll: 0x00020000,
        tfOneAssetWithdrawAll: 0x00040000,
        tfSingleAsset: 0x00080000,
        tfTwoAsset: 0x00100000,
        tfOneAssetLPToken: 0x00200000,
        tfLimitLPToken: 0x00400000
      }
      ammWithdraw.Flags = flags[withdrawMode]

      setSignRequest({
        request: ammWithdraw,
        callback: (result) => {
          if (result) {
            const status = result.meta?.TransactionResult

            if (status !== 'tesSUCCESS') {
              setError(errorCodeDescription(status))
            } else {
              setTxResult({
                status,
                hash: result.hash
              })
            }
          }
        }
      })
    } catch (err) {
      setError(err.message)
    }
  }

  const renderModeSpecificFields = () => {
    switch (withdrawMode) {
      case 'tfTwoAsset':
        return (
          <>
            <div className="flex flex-col sm:gap-4 sm:flex-row">
              <div className="flex-1">
                <FormInput
                  title={ts('amm.fields.asset1AmountWithdraw')}
                  placeholder={ts('amm.fields.amount')}
                  setInnerValue={setAmount1}
                  defaultValue={amount1}
                  onKeyPress={typeNumberOnly}
                  hideButton={true}
                />
              </div>
              <div className="w-full sm:w-1/2">
                <span className="input-title">{ts('amm.fields.asset1Currency')}</span>
                <TokenSelector value={asset1} onChange={setAsset1} />
              </div>
            </div>
            <br />
            <div className="flex flex-col sm:gap-4 sm:flex-row">
              <div className="flex-1">
                <FormInput
                  title={ts('amm.fields.asset2AmountWithdraw')}
                  placeholder={ts('amm.fields.amount')}
                  setInnerValue={setAmount2}
                  defaultValue={amount2}
                  onKeyPress={typeNumberOnly}
                  hideButton={true}
                />
              </div>
              <div className="w-full sm:w-1/2">
                <span className="input-title">{ts('amm.fields.asset2Currency')}</span>
                <TokenSelector value={asset2} onChange={setAsset2} />
              </div>
            </div>
          </>
        )
      case 'tfLPToken':
        return (
          <>
            <div className="flex flex-col sm:gap-4 sm:flex-row">
              <div className="w-full sm:w-1/2">
                <span className="input-title">{ts('amm.fields.asset1Currency')}</span>
                <TokenSelector value={asset1} onChange={setAsset1} />
              </div>
              <div className="w-full sm:w-1/2">
                <span className="input-title">{ts('amm.fields.asset2Currency')}</span>
                <TokenSelector value={asset2} onChange={setAsset2} />
              </div>
            </div>
            <br />
            <FormInput
              title={ts('amm.fields.lpTokenAmountReturn')}
              placeholder={ts('amm.fields.lpTokenPlaceholder')}
              setInnerValue={setLpTokenIn}
              defaultValue={lpTokenIn}
              onKeyPress={typeNumberOnly}
              hideButton={true}
            />
          </>
        )
      case 'tfSingleAsset':
        return (
          <>
            <div className="flex flex-col sm:gap-4 sm:flex-row">
              <div className="flex-1">
                <FormInput
                  title={ts('amm.fields.assetAmountWithdraw')}
                  placeholder={ts('amm.fields.amount')}
                  setInnerValue={setAmount1}
                  defaultValue={amount1}
                  onKeyPress={typeNumberOnly}
                  hideButton={true}
                />
              </div>
              <div className="w-full sm:w-1/2">
                <span className="input-title">{ts('amm.fields.assetToWithdraw')}</span>
                <TokenSelector value={asset1} onChange={setAsset1} />
              </div>
            </div>
            <br />
            <div className="w-full">
              <span className="input-title">{ts('amm.fields.otherAssetPool')}</span>
              <TokenSelector value={asset2} onChange={setAsset2} />
            </div>
          </>
        )
      case 'tfOneAssetWithdrawAll':
        return (
          <>
            <div className="flex flex-col sm:gap-4 sm:flex-row">
              <div className="flex-1">
                <FormInput
                  title={ts('amm.fields.minimumAssetAmountWithdraw')}
                  placeholder={ts('amm.fields.minimumAmountCanBeZero')}
                  setInnerValue={setAmount1}
                  defaultValue={amount1}
                  onKeyPress={typeNumberOnly}
                  hideButton={true}
                />
              </div>
              <div className="w-full sm:w-1/2">
                <span className="input-title">{ts('amm.fields.assetToWithdraw')}</span>
                <TokenSelector value={asset1} onChange={setAsset1} />
              </div>
            </div>
            <br />
            <div className="w-full">
              <span className="input-title">{ts('amm.fields.otherAssetPool')}</span>
              <TokenSelector value={asset2} onChange={setAsset2} />
            </div>
          </>
        )
      case 'tfOneAssetLPToken':
        return (
          <>
            <div className="flex flex-col sm:gap-4 sm:flex-row">
              <div className="flex-1">
                <FormInput
                  title={ts('amm.fields.assetAmountWithdraw')}
                  placeholder={ts('amm.fields.amount')}
                  setInnerValue={setAmount1}
                  defaultValue={amount1}
                  onKeyPress={typeNumberOnly}
                  hideButton={true}
                />
              </div>
              <div className="w-full sm:w-1/2">
                <span className="input-title">{ts('amm.fields.assetToWithdraw')}</span>
                <TokenSelector value={asset1} onChange={setAsset1} />
              </div>
            </div>
            <br />
            <div className="w-full">
              <span className="input-title">{ts('amm.fields.otherAssetPool')}</span>
              <TokenSelector value={asset2} onChange={setAsset2} />
            </div>
            <br />
            <FormInput
              title={ts('amm.fields.lpTokenAmountReturn')}
              placeholder={ts('amm.fields.lpTokenPlaceholder')}
              setInnerValue={setLpTokenIn}
              defaultValue={lpTokenIn}
              onKeyPress={typeNumberOnly}
              hideButton={true}
            />
          </>
        )
      case 'tfLimitLPToken':
        return (
          <>
            <div className="flex flex-col sm:gap-4 sm:flex-row">
              <div className="flex-1">
                <FormInput
                  title={ts('amm.fields.assetAmountWithdraw')}
                  placeholder={ts('amm.fields.amount')}
                  setInnerValue={setAmount1}
                  defaultValue={amount1}
                  onKeyPress={typeNumberOnly}
                  hideButton={true}
                />
              </div>
              <div className="w-full sm:w-1/2">
                <span className="input-title">{ts('amm.fields.assetToWithdraw')}</span>
                <TokenSelector value={asset1} onChange={setAsset1} currencyQueryName="currency" />
              </div>
            </div>
            <br />
            <div className="w-full">
              <span className="input-title">{ts('amm.fields.otherAssetPool')}</span>
              <TokenSelector value={asset2} onChange={setAsset2} currencyQueryName="currency2" />
            </div>
            <br />
            <FormInput
              title={ts('amm.fields.effectivePriceAsset')}
              placeholder={ts('amm.fields.priceLimit')}
              setInnerValue={setEPrice}
              defaultValue={ePrice}
              onKeyPress={typeNumberOnly}
              hideButton={true}
            />
          </>
        )
      case 'tfWithdrawAll':
        return (
          <>
            <div className="flex flex-col sm:gap-4 sm:flex-row">
              <div className="w-full sm:w-1/2">
                <span className="input-title">{ts('amm.fields.asset1Currency')}</span>
                <TokenSelector value={asset1} onChange={setAsset1} />
              </div>
              <div className="w-full sm:w-1/2">
                <span className="input-title">{ts('amm.fields.asset2Currency')}</span>
                <TokenSelector value={asset2} onChange={setAsset2} />
              </div>
            </div>
            <br />
            <div className="text-sm text-gray-600">
              {ts('amm.withdraw.withdrawAllInfo')}
            </div>
          </>
        )
      default:
        return null
    }
  }

  return (
    <div className="form-container">
      <div>
        <div className="mb-4">
          <span className="input-title">{ts('amm.fields.withdrawMode')}</span>
          <SimpleSelect value={withdrawMode} setValue={setWithdrawMode} optionsList={withdrawModes} />
          <p className="text-sm text-gray-600 mt-1">
            {withdrawModes.find((m) => m.value === withdrawMode)?.description}
          </p>
        </div>
        <br />
        {renderModeSpecificFields()}
        <br />
        <CheckBox checked={agreeToRisks} setChecked={setAgreeToRisks} name="amm-withdraw-risks">
          <span className="orange bold">
            {ts('amm.withdraw.risks')}
          </span>
        </CheckBox>
        <CheckBox checked={agreeToTerms} setChecked={setAgreeToTerms} name="amm-withdraw-terms">
          <Trans
            i18nKey="shared.agree-terms"
            ns="services"
            components={[<Link key="0" href="/terms-and-conditions" target="_blank" />]}
          />
        </CheckBox>
        {error && (
          <>
            <br />
            <div className="red center">{error}</div>
          </>
        )}
        <br />
        <div className="center service-form-actions">
          <button className="button-action" onClick={onSubmit}>
            {ts('amm.actions.withdraw')}
          </button>
        </div>
      </div>

      {txResult?.status && (
        <>
          {txResult.status === 'tesSUCCESS' ? (
            <div className="center">
              <h4>{ts('shared.transaction-successful')}</h4>
              <p>
                {ts('amm.fields.hash')}: <LinkTx tx={txResult.hash} /> <CopyButton text={txResult.hash} />
              </p>
            </div>
          ) : (
            <div className="center">
              <p>
                {ts('amm.fields.hash')}: <LinkTx tx={txResult.hash} /> <CopyButton text={txResult.hash} />
              </p>
            </div>
          )}
        </>
      )}
    </div>
  )
}

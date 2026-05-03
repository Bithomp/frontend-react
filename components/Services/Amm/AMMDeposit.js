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

export default function AMMDepositForm({
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
  const [lpTokenOut, setLpTokenOut] = useState('')
  const [ePrice, setEPrice] = useState('')
  const [depositMode, setDepositMode] = useState('tfSingleAsset')
  const [error, setError] = useState('')
  const [agreeToTerms, setAgreeToTerms] = useState(false)
  const [agreeToRisks, setAgreeToRisks] = useState(false)
  const [txResult, setTxResult] = useState(null)

  const depositModes = [
    {
      value: 'tfSingleAsset',
      label: ts('amm.modes.deposit.tfSingleAsset.label'),
      description: ts('amm.modes.deposit.tfSingleAsset.description')
    },
    {
      value: 'tfTwoAsset',
      label: ts('amm.modes.deposit.tfTwoAsset.label'),
      description: ts('amm.modes.deposit.tfTwoAsset.description')
    },
    {
      value: 'tfTwoAssetIfEmpty',
      label: ts('amm.modes.deposit.tfTwoAssetIfEmpty.label'),
      description: ts('amm.modes.deposit.tfTwoAssetIfEmpty.description')
    },
    {
      value: 'tfLPToken',
      label: ts('amm.modes.deposit.tfLPToken.label'),
      description: ts('amm.modes.deposit.tfLPToken.description')
    },
    {
      value: 'tfOneAssetLPToken',
      label: ts('amm.modes.deposit.tfOneAssetLPToken.label'),
      description: ts('amm.modes.deposit.tfOneAssetLPToken.description')
    },
    {
      value: 'tfLimitLPToken',
      label: ts('amm.modes.deposit.tfLimitLPToken.label'),
      description: ts('amm.modes.deposit.tfLimitLPToken.description')
    }
  ]

  const validateForm = () => {
    if (asset1.currency === asset2.currency) {
      setError(ts('amm.errors.sameAssets'))
      return false
    }

    // Validate based on deposit mode
    switch (depositMode) {
      case 'tfTwoAsset':
      case 'tfTwoAssetIfEmpty':
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
        if (!lpTokenOut || isNaN(parseFloat(lpTokenOut)) || parseFloat(lpTokenOut) <= 0) {
          setError(ts('amm.errors.lpToken'))
          return false
        }
        break
      case 'tfSingleAsset':
        if (!amount1 || isNaN(parseFloat(amount1)) || parseFloat(amount1) <= 0) {
          setError(ts('amm.errors.assetDeposit'))
          return false
        }
        break
      case 'tfOneAssetLPToken':
        if (!amount1 || isNaN(parseFloat(amount1)) || parseFloat(amount1) <= 0) {
          setError(ts('amm.errors.assetDeposit'))
          return false
        }
        if (!lpTokenOut || isNaN(parseFloat(lpTokenOut)) || parseFloat(lpTokenOut) <= 0) {
          setError(ts('amm.errors.lpToken'))
          return false
        }
        break
      case 'tfLimitLPToken':
        if (!amount1 || isNaN(parseFloat(amount1)) || parseFloat(amount1) <= 0) {
          setError(ts('amm.errors.assetDeposit'))
          return false
        }
        if (!ePrice || isNaN(parseFloat(ePrice)) || parseFloat(ePrice) <= 0) {
          setError(ts('amm.errors.effectivePriceLp'))
          return false
        }
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
      const ammDeposit = {
        TransactionType: 'AMMDeposit',
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

      // Add fields based on deposit mode
      switch (depositMode) {
        case 'tfTwoAsset':
        case 'tfTwoAssetIfEmpty':
          // Asset 1 amount formatting
          if (asset1.currency === nativeCurrency) {
            ammDeposit.Amount = multiply(amount1, 1000000)
          } else {
            ammDeposit.Amount = {
              currency: asset1.currency,
              issuer: asset1.issuer,
              value: amount1
            }
          }
          // Asset 2 amount formatting
          if (asset2.currency === nativeCurrency) {
            ammDeposit.Amount2 = multiply(amount2, 1000000)
          } else {
            ammDeposit.Amount2 = {
              currency: asset2.currency,
              issuer: asset2.issuer,
              value: amount2
            }
          }
          break
        case 'tfLPToken':
          ammDeposit.LPTokenOut = {
            currency: 'LP', // AMM LP token currency
            issuer: '', // Will be set by the AMM account
            value: lpTokenOut
          }
          break
        case 'tfSingleAsset':
          // Asset 1 amount formatting
          if (asset1.currency === nativeCurrency) {
            ammDeposit.Amount = multiply(amount1, 1000000)
          } else {
            ammDeposit.Amount = {
              currency: asset1.currency,
              issuer: asset1.issuer,
              value: amount1
            }
          }
          break
        case 'tfOneAssetLPToken':
          // Asset 1 amount formatting
          if (asset1.currency === nativeCurrency) {
            ammDeposit.Amount = multiply(amount1, 1000000)
          } else {
            ammDeposit.Amount = {
              currency: asset1.currency,
              issuer: asset1.issuer,
              value: amount1
            }
          }
          ammDeposit.LPTokenOut = {
            currency: 'LP',
            issuer: '',
            value: lpTokenOut
          }
          break
        case 'tfLimitLPToken':
          // Asset 1 amount formatting
          if (asset1.currency === nativeCurrency) {
            ammDeposit.Amount = multiply(amount1, 1000000)
          } else {
            ammDeposit.Amount = {
              currency: asset1.currency,
              issuer: asset1.issuer,
              value: amount1
            }
          }

          if (asset1.currency === nativeCurrency) {
            ammDeposit.EPrice = multiply(ePrice, 1000000)
          } else {
            ammDeposit.EPrice = {
              currency: asset1.currency,
              issuer: asset1.issuer,
              value: ePrice
            }
          }
          break
      }

      // Add flags
      const flags = {
        tfTwoAsset: 0x00100000,
        tfTwoAssetIfEmpty: 0x00800000,
        tfLPToken: 0x00010000,
        tfSingleAsset: 0x00080000,
        tfOneAssetLPToken: 0x00200000,
        tfLimitLPToken: 0x00400000
      }
      ammDeposit.Flags = flags[depositMode]

      setSignRequest({
        request: ammDeposit,
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
    switch (depositMode) {
      case 'tfTwoAsset':
      case 'tfTwoAssetIfEmpty':
        return (
          <>
            <div className="flex flex-col sm:gap-4 sm:flex-row">
              <div className="flex-1">
                <FormInput
                  title={ts('amm.fields.asset1Amount')}
                  placeholder={ts('amm.fields.amount')}
                  setInnerValue={setAmount1}
                  defaultValue={amount1}
                  onKeyPress={typeNumberOnly}
                  hideButton={true}
                />
              </div>
              <div className="w-full sm:w-1/2">
                <span className="input-title">{ts('amm.fields.asset1Currency')}</span>
                <TokenSelector value={asset1} onChange={setAsset1} currencyQueryName="currency" />
              </div>
            </div>
            <br />
            <div className="flex flex-col sm:gap-4 sm:flex-row">
              <div className="flex-1">
                <FormInput
                  title={ts('amm.fields.asset2Amount')}
                  placeholder={ts('amm.fields.amount')}
                  setInnerValue={setAmount2}
                  defaultValue={amount2}
                  onKeyPress={typeNumberOnly}
                  hideButton={true}
                />
              </div>
              <div className="w-full sm:w-1/2">
                <span className="input-title">{ts('amm.fields.asset2Currency')}</span>
                <TokenSelector value={asset2} onChange={setAsset2} currencyQueryName="currency2" />
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
              title={ts('amm.fields.lpTokenAmountReceive')}
              placeholder={ts('amm.fields.lpTokenPlaceholder')}
              setInnerValue={setLpTokenOut}
              defaultValue={lpTokenOut}
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
                  title={ts('amm.fields.assetAmountDeposit')}
                  placeholder={ts('amm.fields.amount')}
                  setInnerValue={setAmount1}
                  defaultValue={amount1}
                  onKeyPress={typeNumberOnly}
                  hideButton={true}
                />
              </div>
              <div className="w-full sm:w-1/2">
                <span className="input-title">{ts('amm.fields.assetToDeposit')}</span>
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
                  title={ts('amm.fields.assetAmountDeposit')}
                  placeholder={ts('amm.fields.amount')}
                  setInnerValue={setAmount1}
                  defaultValue={amount1}
                  onKeyPress={typeNumberOnly}
                  hideButton={true}
                />
              </div>
              <div className="w-full sm:w-1/2">
                <span className="input-title">{ts('amm.fields.assetToDeposit')}</span>
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
              title={ts('amm.fields.lpTokenAmountReceive')}
              placeholder={ts('amm.fields.lpTokenPlaceholder')}
              setInnerValue={setLpTokenOut}
              defaultValue={lpTokenOut}
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
                  title={ts('amm.fields.assetAmountDeposit')}
                  placeholder={ts('amm.fields.amount')}
                  setInnerValue={setAmount1}
                  defaultValue={amount1}
                  onKeyPress={typeNumberOnly}
                  hideButton={true}
                />
              </div>
              <div className="w-full sm:w-1/2">
                <span className="input-title">{ts('amm.fields.assetToDeposit')}</span>
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
              title={ts('amm.fields.effectivePriceLpToken')}
              placeholder={ts('amm.fields.priceLimit')}
              setInnerValue={setEPrice}
              defaultValue={ePrice}
              onKeyPress={typeNumberOnly}
              hideButton={true}
            />
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
          <span className="input-title">{ts('amm.fields.depositMode')}</span>
          <SimpleSelect value={depositMode} setValue={setDepositMode} optionsList={depositModes} />
          <p className="text-sm text-gray-600 mt-1">{depositModes.find((m) => m.value === depositMode)?.description}</p>
        </div>
        <br />
        {renderModeSpecificFields()}
        <br />
        <CheckBox checked={agreeToRisks} setChecked={setAgreeToRisks} name="amm-deposit-risks">
          <span className="orange bold">
            {ts('amm.deposit.risks')}
          </span>
        </CheckBox>
        <CheckBox checked={agreeToTerms} setChecked={setAgreeToTerms} name="amm-deposit-terms">
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
            {ts('amm.actions.deposit')}
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

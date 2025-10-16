import { useState } from 'react'
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

export default function AMMWithdrawForm({ setSignRequest }) {
  const [asset1, setAsset1] = useState({ currency: nativeCurrency })
  const [asset2, setAsset2] = useState({ currency: nativeCurrency })
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
      label: 'LP Token Withdrawal',
      description:
        "Return the specified amount of LP Tokens and receive both assets from the AMM's pool in amounts based on the returned LP Tokens' share of the total LP Tokens issued."
    },
    {
      value: 'tfWithdrawAll',
      label: 'Withdraw All',
      description: "Return all of your LP Tokens and receive as much as you can of both assets in the AMM's pool."
    },
    {
      value: 'tfTwoAsset',
      label: 'Double Asset Withdrawal',
      description:
        "Withdraw both of this AMM's assets, in up to the specified amounts. The actual amounts received maintains the balance of assets in the AMM's pool."
    },
    {
      value: 'tfSingleAsset',
      label: 'Single Asset Withdrawal',
      description: 'Withdraw exactly the specified amount of one asset, by returning as many LP Tokens as necessary.'
    },
    {
      value: 'tfOneAssetWithdrawAll',
      label: 'Single Asset Withdraw All',
      description:
        "Withdraw at least the specified amount of one asset, by returning all of your LP Tokens. Fails if you can't receive at least the specified amount."
    },
    {
      value: 'tfOneAssetLPToken',
      label: 'Single Asset + LP Token',
      description:
        'Withdraw up to the specified amount of one asset, by returning up to the specified amount of LP Tokens.'
    },
    {
      value: 'tfLimitLPToken',
      label: 'Single Asset + Price Limit',
      description:
        'Withdraw up to the specified amount of one asset, but pay no more than the specified effective price in LP Tokens per unit of the asset received.'
    }
  ]

  const validateForm = () => {
    if (asset1.currency === asset2.currency) {
      setError('The selected assets cannot be the same. Please choose two different assets to proceed.')
      return false
    }

    // Validate based on withdraw mode
    switch (withdrawMode) {
      case 'tfTwoAsset':
        if (!amount1 || isNaN(parseFloat(amount1)) || parseFloat(amount1) <= 0) {
          setError('Please enter a valid amount for asset 1.')
          return false
        }
        if (!amount2 || isNaN(parseFloat(amount2)) || parseFloat(amount2) <= 0) {
          setError('Please enter a valid amount for asset 2.')
          return false
        }
        break
      case 'tfLPToken':
        if (!lpTokenIn || isNaN(parseFloat(lpTokenIn)) || parseFloat(lpTokenIn) <= 0) {
          setError('Please enter a valid LP token amount.')
          return false
        }
        break
      case 'tfSingleAsset':
        if (!amount1 || isNaN(parseFloat(amount1)) || parseFloat(amount1) <= 0) {
          setError('Please enter a valid amount for the asset to withdraw.')
          return false
        }
        break
      case 'tfOneAssetWithdrawAll':
        if (!amount1 || isNaN(parseFloat(amount1)) || parseFloat(amount1) < 0) {
          setError('Please enter a valid amount for the asset to withdraw (can be 0).')
          return false
        }
        break
      case 'tfOneAssetLPToken':
        if (!amount1 || isNaN(parseFloat(amount1)) || parseFloat(amount1) <= 0) {
          setError('Please enter a valid amount for the asset to withdraw.')
          return false
        }
        if (!lpTokenIn || isNaN(parseFloat(lpTokenIn)) || parseFloat(lpTokenIn) <= 0) {
          setError('Please enter a valid LP token amount.')
          return false
        }
        break
      case 'tfLimitLPToken':
        if (!amount1 || isNaN(parseFloat(amount1)) || parseFloat(amount1) <= 0) {
          setError('Please enter a valid amount for the asset to withdraw.')
          return false
        }
        if (!ePrice || isNaN(parseFloat(ePrice)) || parseFloat(ePrice) <= 0) {
          setError('Please enter a valid effective price per unit of asset.')
          return false
        }
        break
      case 'tfWithdrawAll':
        // No validation needed for withdraw all
        break
    }

    if (!agreeToRisks) {
      setError('Please agree to the risks.')
      return false
    }

    if (!agreeToTerms) {
      setError('Please agree to the terms and conditions.')
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
                  title="Asset 1 Amount to Withdraw"
                  placeholder="Amount"
                  setInnerValue={setAmount1}
                  defaultValue={amount1}
                  onKeyPress={typeNumberOnly}
                  hideButton={true}
                />
              </div>
              <div className="w-full sm:w-1/2">
                <span className="input-title">Asset 1 Currency</span>
                <TokenSelector value={asset1} onChange={setAsset1} />
              </div>
            </div>
            <br />
            <div className="flex flex-col sm:gap-4 sm:flex-row">
              <div className="flex-1">
                <FormInput
                  title="Asset 2 Amount to Withdraw"
                  placeholder="Amount"
                  setInnerValue={setAmount2}
                  defaultValue={amount2}
                  onKeyPress={typeNumberOnly}
                  hideButton={true}
                />
              </div>
              <div className="w-full sm:w-1/2">
                <span className="input-title">Asset 2 Currency</span>
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
                <span className="input-title">Asset 1 Currency</span>
                <TokenSelector value={asset1} onChange={setAsset1} />
              </div>
              <div className="w-full sm:w-1/2">
                <span className="input-title">Asset 2 Currency</span>
                <TokenSelector value={asset2} onChange={setAsset2} />
              </div>
            </div>
            <br />
            <FormInput
              title="LP Token Amount to Return"
              placeholder="LP Token amount"
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
                  title="Asset Amount to Withdraw"
                  placeholder="Amount"
                  setInnerValue={setAmount1}
                  defaultValue={amount1}
                  onKeyPress={typeNumberOnly}
                  hideButton={true}
                />
              </div>
              <div className="w-full sm:w-1/2">
                <span className="input-title">Asset to Withdraw</span>
                <TokenSelector value={asset1} onChange={setAsset1} />
              </div>
            </div>
            <br />
            <div className="w-full">
              <span className="input-title">Other Asset in Pool</span>
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
                  title="Minimum Asset Amount to Withdraw"
                  placeholder="Minimum amount (can be 0)"
                  setInnerValue={setAmount1}
                  defaultValue={amount1}
                  onKeyPress={typeNumberOnly}
                  hideButton={true}
                />
              </div>
              <div className="w-full sm:w-1/2">
                <span className="input-title">Asset to Withdraw</span>
                <TokenSelector value={asset1} onChange={setAsset1} />
              </div>
            </div>
            <br />
            <div className="w-full">
              <span className="input-title">Other Asset in Pool</span>
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
                  title="Asset Amount to Withdraw"
                  placeholder="Amount"
                  setInnerValue={setAmount1}
                  defaultValue={amount1}
                  onKeyPress={typeNumberOnly}
                  hideButton={true}
                />
              </div>
              <div className="w-full sm:w-1/2">
                <span className="input-title">Asset to Withdraw</span>
                <TokenSelector value={asset1} onChange={setAsset1} />
              </div>
            </div>
            <br />
            <div className="w-full">
              <span className="input-title">Other Asset in Pool</span>
              <TokenSelector value={asset2} onChange={setAsset2} />
            </div>
            <br />
            <FormInput
              title="LP Token Amount to Return"
              placeholder="LP Token amount"
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
                  title="Asset Amount to Withdraw"
                  placeholder="Amount"
                  setInnerValue={setAmount1}
                  defaultValue={amount1}
                  onKeyPress={typeNumberOnly}
                  hideButton={true}
                />
              </div>
              <div className="w-full sm:w-1/2">
                <span className="input-title">Asset to Withdraw</span>
                <TokenSelector value={asset1} onChange={setAsset1} currencyQueryName="currency" />
              </div>
            </div>
            <br />
            <div className="w-full">
              <span className="input-title">Other Asset in Pool</span>
              <TokenSelector value={asset2} onChange={setAsset2} currencyQueryName="currency2" />
            </div>
            <br />
            <FormInput
              title="Effective Price per Unit of Asset"
              placeholder="Price limit"
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
                <span className="input-title">Asset 1 Currency</span>
                <TokenSelector value={asset1} onChange={setAsset1} />
              </div>
              <div className="w-full sm:w-1/2">
                <span className="input-title">Asset 2 Currency</span>
                <TokenSelector value={asset2} onChange={setAsset2} />
              </div>
            </div>
            <br />
            <div className="text-sm text-gray-600">
              This will withdraw all of your LP Tokens and return as much as possible of both assets.
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
          <span className="input-title">Withdraw Mode</span>
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
            I acknowledge and understand the risks associated with XRPL AMMs, including impermanent loss, fund
            withdrawal risks, market volatility, and the impact of withdrawing from unbalanced pools. I agree to
            participate at my own risk.
          </span>
        </CheckBox>
        <CheckBox checked={agreeToTerms} setChecked={setAgreeToTerms} name="amm-withdraw-terms">
          I agree with the{' '}
          <Link href="/terms-and-conditions" target="_blank">
            Terms and conditions
          </Link>
          .
        </CheckBox>
        {error && (
          <>
            <br />
            <div className="red center">{error}</div>
          </>
        )}
        <br />
        <div className="center">
          <button className="button-action" onClick={onSubmit}>
            Withdraw
          </button>
        </div>
      </div>

      {txResult?.status && (
        <>
          {txResult.status === 'tesSUCCESS' ? (
            <div className="center">
              <h4>Transaction Successful</h4>
              <p>
                Hash: <LinkTx tx={txResult.hash} /> <CopyButton text={txResult.hash} />
              </p>
            </div>
          ) : (
            <div className="center">
              <p>
                Hash: <LinkTx tx={txResult.hash} /> <CopyButton text={txResult.hash} />
              </p>
            </div>
          )}
        </>
      )}
    </div>
  )
}

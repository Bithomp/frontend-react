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

export default function AMMDepositForm({ setSignRequest }) {
  const [asset1, setAsset1] = useState({ currency: nativeCurrency })
  const [asset2, setAsset2] = useState({ currency: nativeCurrency })
  const [amount1, setAmount1] = useState('')
  const [amount2, setAmount2] = useState('')
  const [lpTokenOut, setLpTokenOut] = useState('')
  const [ePrice, setEPrice] = useState('')
  const [depositMode, setDepositMode] = useState('tfTwoAsset') // Default to double-asset deposit
  const [error, setError] = useState('')
  const [agreeToTerms, setAgreeToTerms] = useState(false)
  const [agreeToRisks, setAgreeToRisks] = useState(false)
  const [txResult, setTxResult] = useState(null)

  const depositModes = [
    {
      value: 'tfTwoAsset',
      label: 'Double Asset Deposit (Amount + Amount2)',
      description:
        "Deposit both of this AMM's assets, up to the specified amounts. The actual amounts deposited must maintain the same balance of assets as the AMM already holds, so the amount of either one deposited MAY be less than specified. The amount of LP Tokens you get in return is based on the total value deposited."
    },
    {
      value: 'tfTwoAssetIfEmpty',
      label: 'Empty AMM Deposit',
      description:
        "Deposit both of this AMM's assets, in exactly the specified amounts, to an AMM with an empty asset pool. The amount of LP Tokens you get in return is based on the total value deposited."
    },
    {
      value: 'tfLPToken',
      label: 'LP Token Target',
      description:
        "Deposit both of this AMM's assets, in amounts calculated so that you receive the specified amount of LP Tokens in return. The amounts deposited maintain the relative proportions of the two assets the AMM already holds. The amount of LP Tokens you get in return is based on the total value deposited."
    },
    {
      value: 'tfSingleAsset',
      label: 'Single Asset Deposit',
      description:
        'Deposit exactly the specified amount of one asset, and receive an amount of LP Tokens based on the resulting share of the pool (minus fees).'
    },
    {
      value: 'tfOneAssetLPToken',
      label: 'Single Asset + LP Target',
      description:
        'Deposit up to the specified amount of one asset, so that you receive exactly the specified amount of LP Tokens in return (after fees).'
    },
    {
      value: 'tfLimitLPToken',
      label: 'Single Asset + Price Limit',
      description:
        'Deposit up to the specified amount of one asset, but pay no more than the specified effective price per LP Token (after fees).'
    }
  ]

  const validateForm = () => {
    if (asset1.currency === asset2.currency) {
      setError('The selected assets cannot be the same. Please choose two different assets to proceed.')
      return false
    }

    // Validate based on deposit mode
    switch (depositMode) {
      case 'tfTwoAsset':
      case 'tfTwoAssetIfEmpty':
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
        if (!lpTokenOut || isNaN(parseFloat(lpTokenOut)) || parseFloat(lpTokenOut) <= 0) {
          setError('Please enter a valid LP token amount.')
          return false
        }
        break
      case 'tfSingleAsset':
        if (!amount1 || isNaN(parseFloat(amount1)) || parseFloat(amount1) <= 0) {
          setError('Please enter a valid amount for the asset to deposit.')
          return false
        }
        break
      case 'tfOneAssetLPToken':
        if (!amount1 || isNaN(parseFloat(amount1)) || parseFloat(amount1) <= 0) {
          setError('Please enter a valid amount for the asset to deposit.')
          return false
        }
        if (!lpTokenOut || isNaN(parseFloat(lpTokenOut)) || parseFloat(lpTokenOut) <= 0) {
          setError('Please enter a valid LP token amount.')
          return false
        }
        break
      case 'tfLimitLPToken':
        if (!amount1 || isNaN(parseFloat(amount1)) || parseFloat(amount1) <= 0) {
          setError('Please enter a valid amount for the asset to deposit.')
          return false
        }
        if (!ePrice || isNaN(parseFloat(ePrice)) || parseFloat(ePrice) <= 0) {
          setError('Please enter a valid effective price per LP token.')
          return false
        }
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
                  title="Asset 1 Amount"
                  placeholder="Amount"
                  setInnerValue={setAmount1}
                  defaultValue={amount1}
                  onKeyPress={typeNumberOnly}
                  hideButton={true}
                />
              </div>
              <div className="w-full sm:w-1/2">
                <span className="input-title">Asset 1 Currency</span>
                <TokenSelector value={asset1} onChange={setAsset1} currencyQueryName="currency" />
              </div>
            </div>
            <br />
            <div className="flex flex-col sm:gap-4 sm:flex-row">
              <div className="flex-1">
                <FormInput
                  title="Asset 2 Amount"
                  placeholder="Amount"
                  setInnerValue={setAmount2}
                  defaultValue={amount2}
                  onKeyPress={typeNumberOnly}
                  hideButton={true}
                />
              </div>
              <div className="w-full sm:w-1/2">
                <span className="input-title">Asset 2 Currency</span>
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
              title="LP Token Amount to Receive"
              placeholder="LP Token amount"
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
                  title="Asset Amount to Deposit"
                  placeholder="Amount"
                  setInnerValue={setAmount1}
                  defaultValue={amount1}
                  onKeyPress={typeNumberOnly}
                  hideButton={true}
                />
              </div>
              <div className="w-full sm:w-1/2">
                <span className="input-title">Asset to Deposit</span>
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
                  title="Asset Amount to Deposit"
                  placeholder="Amount"
                  setInnerValue={setAmount1}
                  defaultValue={amount1}
                  onKeyPress={typeNumberOnly}
                  hideButton={true}
                />
              </div>
              <div className="w-full sm:w-1/2">
                <span className="input-title">Asset to Deposit</span>
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
              title="LP Token Amount to Receive"
              placeholder="LP Token amount"
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
                  title="Asset Amount to Deposit"
                  placeholder="Amount"
                  setInnerValue={setAmount1}
                  defaultValue={amount1}
                  onKeyPress={typeNumberOnly}
                  hideButton={true}
                />
              </div>
              <div className="w-full sm:w-1/2">
                <span className="input-title">Asset to Deposit</span>
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
              title="Effective Price per LP Token"
              placeholder="Price limit"
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
          <span className="input-title">Deposit Mode</span>
          <SimpleSelect value={depositMode} setValue={setDepositMode} optionsList={depositModes} />
          <p className="text-sm text-gray-600 mt-1">{depositModes.find((m) => m.value === depositMode)?.description}</p>
        </div>
        <br />
        {renderModeSpecificFields()}
        <br />
        <CheckBox checked={agreeToRisks} setChecked={setAgreeToRisks} name="amm-deposit-risks">
          <span className="orange bold">
            I acknowledge and understand the risks associated with XRPL AMMs, including impermanent loss, fund
            withdrawal risks, market volatility, and the impact of depositing into unbalanced pools. I agree to
            participate at my own risk.
          </span>
        </CheckBox>
        <CheckBox checked={agreeToTerms} setChecked={setAgreeToTerms} name="amm-deposit-terms">
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
            Deposit
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

import { useState } from 'react'
import Link from 'next/link'
import { multiply } from '../../../utils/calc'
import CheckBox from '../../UI/CheckBox'
import FormInput from '../../UI/FormInput'
import { nativeCurrency, typeNumberOnly } from '../../../utils'
import TokenSelector from '../../UI/TokenSelector'
import { LinkAmm } from '../../../utils/links'

export default function AMMCreateForm({ setSignRequest }) {
  const [asset1, setAsset1] = useState({ currency: nativeCurrency })
  const [asset1Amount, setAsset1Amount] = useState('')
  const [asset2, setAsset2] = useState({ currency: nativeCurrency })
  const [asset2Amount, setAsset2Amount] = useState('')

  const [tradingFee, setTradingFee] = useState()
  const [error, setError] = useState('')
  const [agreeToTerms, setAgreeToTerms] = useState(false)
  const [agreeToRisks, setAgreeToRisks] = useState(false)
  const [txResult, setTxResult] = useState(null)

  const onSubmit = () => {
    setError('')
    if (!asset1.currency || !asset2.currency) {
      setError('Please select both assets')
      return
    }
    if (asset1.currency === asset2.currency) {
      setError('Please select two different assets.')
      return
    }
    if (!asset1Amount || isNaN(parseFloat(asset1Amount)) || parseFloat(asset1Amount) <= 0) {
      setError('Please enter a valid amount for asset 1.')
      return
    }
    if (!asset2Amount || isNaN(parseFloat(asset2Amount)) || parseFloat(asset2Amount) <= 0) {
      setError('Please enter a valid amount for asset 2.')
      return
    }
    if (tradingFee && (isNaN(parseFloat(tradingFee)) || parseFloat(tradingFee) < 0 || parseFloat(tradingFee) > 1)) {
      setError('Please enter a valid trading fee between 0 and 1 (percent).')
      return
    }
    if (!agreeToRisks) {
      setError('Please agree to the risks.')
      return
    }
    if (!agreeToTerms) {
      setError('Please agree to the terms and conditions.')
      return
    }
    
    try {
      const ammCreate = {
        TransactionType: 'AMMCreate'
      }

      // Asset 1 amount formatting
      if (asset1.currency === nativeCurrency) {
        ammCreate.Amount = multiply(asset1Amount, 1000000)
      } else {
        ammCreate.Amount = {
          currency: asset1.currency,
          issuer: asset1.issuer,
          value: multiply(asset1Amount, 1000000)
        }
      }

      // Asset 2 amount formatting
      if (asset2.currency === nativeCurrency) {
        ammCreate.Amount2 = multiply(asset2Amount, 1000000)
      } else {
        ammCreate.Amount2 = {
          currency: asset2.currency,
          issuer: asset2.issuer,
          value: multiply(asset2Amount, 1000000)
        }
      }

      if (tradingFee) {
        // Convert percentage to units of 1/100,000 (e.g. 0.001% -> 1, 1% -> 1000)
        ammCreate.TradingFee = Math.round(parseFloat(tradingFee) * 1000)
      }

      setSignRequest({
        request: ammCreate,
        callback: (result) => {
          if (result.result) {
            setTxResult({
              status: result.result.meta?.TransactionResult,
              ammId: result.result.meta?.AmmID,
            })
          }
        }
      })
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div className="form-container">
      <div>
        <div className="flex flex-col sm:gap-4 sm:flex-row">
            <div className="flex-1">
              <FormInput
              title="Asset 1 Amount"
              placeholder="Amount"
              setInnerValue={setAsset1Amount}
              defaultValue={asset1Amount}
              onKeyPress={typeNumberOnly}
              hideButton={true}            
              />
            </div>
            <div  className="w-full sm:w-1/2">
              <span className="input-title">Asset 1 Currency</span>
              <TokenSelector value={asset1} onChange={setAsset1} />        
            </div>        
        </div>
        <br />
        <div className="flex flex-col sm:gap-4 sm:flex-row">
            <div className="flex-1">
                <FormInput
                title="Asset 2 Amount"
                placeholder="Amount"
                setInnerValue={setAsset2Amount}
                defaultValue={asset2Amount}
                onKeyPress={typeNumberOnly}
                hideButton={true}
                />
            </div>
            <div  className="w-full sm:w-1/2">
                <span className="input-title">Asset 2 Currency</span>
                <TokenSelector value={asset2} onChange={setAsset2} />        
            </div>        
        </div>
        <br />   
        <FormInput
          title="Trading Fee (0 - 1%, optional)"
          placeholder="Fee in percent (max 1)"
          setInnerValue={setTradingFee}
          defaultValue={tradingFee}
          onKeyPress={typeNumberOnly}
          hideButton={true}
        />
        <br />
        <CheckBox checked={agreeToRisks} setChecked={setAgreeToRisks} name="amm-create-risks">
          <span className="orange bold">
            I acknowledge and understand the risks associated with XRPL AMMs, including impermanent loss, fund withdrawal risks, market volatility, and the impact of creating unbalanced pools. I agree to participate at my own risk.
          </span>
        </CheckBox>
        <CheckBox checked={agreeToTerms} setChecked={setAgreeToTerms} name="amm-create-terms">
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
            Create AMM
          </button>
        </div>        
      </div>

      {txResult?.status === 'tesSUCCESS' && (
        <div className="center">
          <h3>Transaction Successful</h3>
          <LinkAmm ammId={txResult.ammId} hash={true} icon={true} copy={true} />
        </div>
      )}
    </div>
  )
} 
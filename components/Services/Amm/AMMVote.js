import { useState } from 'react'
import Link from 'next/link'
import CheckBox from '../../UI/CheckBox'
import FormInput from '../../UI/FormInput'
import { nativeCurrency, typeNumberOnly } from '../../../utils'
import TokenSelector from '../../UI/TokenSelector'
import { LinkAmm } from '../../../utils/links'


export default function AMMVoteForm({ setSignRequest }) {
  const [asset1, setAsset1] = useState({ currency: nativeCurrency })
  const [asset2, setAsset2] = useState({ currency: nativeCurrency })

  const [tradingFee, setTradingFee] = useState('0')
  const [error, setError] = useState('')
  const [agreeToTerms, setAgreeToTerms] = useState(false)
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
    
    if (tradingFee && (isNaN(parseFloat(tradingFee)) || parseFloat(tradingFee) < 0 || parseFloat(tradingFee) > 1000)) {
      setError('Please enter a valid trading fee between 0 and 1000.')
      return
    }
    if (!agreeToTerms) {
      setError('Please agree to the terms and conditions.')
      return
    }
    
    try {
      const ammVote = {
        TransactionType: 'AMMVote'
      }

      // Asset 1 amount formatting
      if (asset1.currency === nativeCurrency) {
        ammVote.Asset = {
          currency: asset1.currency,
        }
      } else {
        ammVote.Asset = {
          currency: asset1.currency,
          issuer: asset1.issuer,
        }
      }

      // Asset 2 amount formatting
      if (asset2.currency === nativeCurrency) {
        ammVote.Asset2 = {
          currency: asset2.currency,
        }
      } else {
        ammVote.Asset2 = {
          currency: asset2.currency,
          issuer: asset2.issuer,
        }
      }

      if (tradingFee) {
        ammVote.TradingFee = parseInt(tradingFee)
      }

      setSignRequest({
        request: ammVote,
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
        <div  className="w-full">
          <span className="input-title">Asset 1 Currency</span>
          <TokenSelector value={asset1} onChange={setAsset1} />        
        </div>  
        <br />
        <div  className="w-full">
          <span className="input-title">Asset 2 Currency</span>
          <TokenSelector value={asset2} onChange={setAsset2} />        
        </div>
        <br />   
        <FormInput
          title="Trading Fee (0 - 1000, optional)"
          placeholder="Fee in tenth of a percent"
          setInnerValue={setTradingFee}
          defaultValue={tradingFee}
          onKeyPress={typeNumberOnly}
          hideButton={true}
        />
        <br />
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
            Submit AMMVote
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
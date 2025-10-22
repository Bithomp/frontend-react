import { useState } from 'react'
import Link from 'next/link'
import { multiply } from '../../../utils/calc'
import CheckBox from '../../UI/CheckBox'
import FormInput from '../../UI/FormInput'
import { nativeCurrency, typeNumberOnly, isNativeCurrency } from '../../../utils'
import TokenSelector from '../../UI/TokenSelector'
import { LinkAmm, LinkTx } from '../../../utils/links'
import CopyButton from '../../UI/CopyButton'
import { errorCodeDescription } from '../../../utils/transaction'

export default function AMMCreateForm({
  setSignRequest,
  queryCurrency,
  queryCurrencyIssuer,
  queryCurrency2,
  queryCurrency2Issuer
}) {
  const [asset1, setAsset1] = useState({ currency: queryCurrency || nativeCurrency, issuer: queryCurrencyIssuer || '' })
  const [asset2, setAsset2] = useState({
    currency: queryCurrency2 || nativeCurrency,
    issuer: queryCurrency2Issuer || ''
  })
  const [asset1Amount, setAsset1Amount] = useState('')
  const [asset2Amount, setAsset2Amount] = useState('')

  const [tradingFee, setTradingFee] = useState()
  const [error, setError] = useState('')
  const [agreeToTerms, setAgreeToTerms] = useState(false)
  const [agreeToRisks, setAgreeToRisks] = useState(false)
  const [txResult, setTxResult] = useState(null)

  const onSubmit = () => {
    setTxResult(null)
    setError('')
    if (asset1.currency === asset2.currency) {
      setError('The selected assets cannot be the same. Please choose two different assets to proceed.')
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
        TransactionType: 'AMMCreate',
        TradingFee: Math.round(parseFloat(tradingFee) * 1000) || 0
      }

      // Asset 1 amount formatting
      if (isNativeCurrency(asset1)) {
        ammCreate.Amount = multiply(asset1Amount, 1000000)
      } else {
        ammCreate.Amount = {
          currency: asset1.currency,
          issuer: asset1.issuer,
          value: asset1Amount
        }
      }

      // Asset 2 amount formatting
      if (isNativeCurrency(asset2)) {
        ammCreate.Amount2 = multiply(asset2Amount, 1000000)
      } else {
        ammCreate.Amount2 = {
          currency: asset2.currency,
          issuer: asset2.issuer,
          value: asset2Amount
        }
      }

      setSignRequest({
        request: ammCreate,
        callback: (result) => {
          if (result) {
            const meta = result.meta || {}
            let ammId = ''
            for (let i = 0; i < meta?.AffectedNodes?.length; i++) {
              const node = meta.AffectedNodes[i]
              if (node.CreatedNode?.LedgerEntryType === 'AMM') {
                ammId = node.CreatedNode?.LedgerIndex
                break
              }
            }

            const status = result.meta?.TransactionResult

            if (status !== 'tesSUCCESS') {
              setError(errorCodeDescription(status))
            } else {
              setTxResult({
                status,
                hash: result.hash,
                ammId
              })
            }
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
          <div className="w-full sm:w-1/2">
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
          <div className="w-full sm:w-1/2">
            <span className="input-title">Asset 2 Currency</span>
            <TokenSelector value={asset2} onChange={setAsset2} />
          </div>
        </div>
        <br />
        <FormInput
          title="Trading Fee (0 - 1%)"
          placeholder="Fee in percent (max 1)"
          setInnerValue={setTradingFee}
          defaultValue={tradingFee}
          onKeyPress={typeNumberOnly}
          hideButton={true}
        />
        <br />
        <CheckBox checked={agreeToRisks} setChecked={setAgreeToRisks} name="amm-create-risks">
          <span className="orange bold">
            I acknowledge and understand the risks associated with XRPL AMMs, including impermanent loss, fund
            withdrawal risks, market volatility, and the impact of creating unbalanced pools. I agree to participate at
            my own risk.
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

      {txResult?.status && (
        <>
          {txResult.status === 'tesSUCCESS' ? (
            <div className="center">
              <h4>Transaction Successful</h4>
              <p>
                Hash: <LinkTx tx={txResult.hash} /> <CopyButton text={txResult.hash} />
              </p>
              <p>
                <strong>AMM ID: </strong>
                <LinkAmm ammId={txResult.ammId} hash={true} copy={true} />
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

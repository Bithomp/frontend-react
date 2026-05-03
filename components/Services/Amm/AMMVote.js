import { useState } from 'react'
import { useTranslation } from 'next-i18next'
import FormInput from '../../UI/FormInput'
import { nativeCurrency, typeNumberOnly, isNativeCurrency } from '../../../utils'
import TokenSelector from '../../UI/TokenSelector'
import { LinkAmm, LinkTx } from '../../../utils/links'
import CopyButton from '../../UI/CopyButton'
import { errorCodeDescription } from '../../../utils/transaction'

export default function AMMVoteForm({
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

  const [tradingFee, setTradingFee] = useState()
  const [error, setError] = useState('')
  const [txResult, setTxResult] = useState(null)

  const onSubmit = () => {
    setTxResult(null)
    setError('')

    if (asset1.currency === asset2.currency) {
      setError(ts('amm.errors.sameAssets'))
      return
    }

    if (tradingFee && (isNaN(parseFloat(tradingFee)) || parseFloat(tradingFee) < 0 || parseFloat(tradingFee) > 1)) {
      setError(ts('amm.errors.tradingFee'))
      return
    }

    try {
      const ammVote = {
        TransactionType: 'AMMVote',
        TradingFee: Math.round(parseFloat(tradingFee) * 1000) || 0
      }

      // Asset 1 amount formatting
      if (isNativeCurrency(asset1)) {
        ammVote.Asset = {
          currency: asset1.currency
        }
      } else {
        ammVote.Asset = {
          currency: asset1.currency,
          issuer: asset1.issuer
        }
      }

      // Asset 2 amount formatting
      if (isNativeCurrency(asset2)) {
        ammVote.Asset2 = {
          currency: asset2.currency
        }
      } else {
        ammVote.Asset2 = {
          currency: asset2.currency,
          issuer: asset2.issuer
        }
      }

      setSignRequest({
        request: ammVote,
        callback: (result) => {
          if (result) {
            const meta = result.meta || {}
            let ammId = ''
            for (let i = 0; i < meta?.AffectedNodes?.length; i++) {
              const node = meta.AffectedNodes[i]
              if (node.ModifiedNode?.LedgerEntryType === 'AMM') {
                ammId = node.ModifiedNode?.LedgerIndex
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
        <p className="center">
          {ts('amm.vote.intro')}
        </p>
        <br />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
          <div className="w-full">
            <span className="input-title">{ts('amm.fields.asset1Currency')}</span>
            <TokenSelector value={asset1} onChange={setAsset1} />
          </div>
          <div className="w-full">
            <span className="input-title">{ts('amm.fields.asset2Currency')}</span>
            <TokenSelector value={asset2} onChange={setAsset2} />
          </div>
        </div>
        <br />
        <FormInput
          title={ts('amm.fields.tradingFee')}
          placeholder={ts('amm.fields.tradingFeePlaceholder')}
          setInnerValue={setTradingFee}
          defaultValue={tradingFee}
          onKeyPress={typeNumberOnly}
          hideButton={true}
        />
        {error && (
          <>
            <br />
            <div className="red center">{error}</div>
          </>
        )}
        <br />
        <div className="center">
          <button className="button-action" onClick={onSubmit}>
            {ts('amm.actions.vote')}
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
              <p>
                <strong>{ts('amm.fields.ammId')}: </strong>
                <LinkAmm ammId={txResult.ammId} hash={true} copy={true} />
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

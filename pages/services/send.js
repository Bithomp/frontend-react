import { i18n, useTranslation } from 'next-i18next'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import SEO from '../../components/SEO'
import { useWidth } from '../../utils'
import CheckBox from '../../components/UI/CheckBox'
import AddressInput from '../../components/UI/AddressInput'
import FormInput from '../../components/UI/FormInput'
import CopyButton from '../../components/UI/CopyButton'
import { LinkTx, LinkAccount } from '../../utils/links'
import { multiply } from '../../utils/calc'
import NetworkTabs from '../../components/Tabs/NetworkTabs'
import { typeNumberOnly, isAddressValid, isTagValid, nativeCurrency, encode, decode } from '../../utils'
import { fullDateAndTime, timeFromNow, amountFormat } from '../../utils/format'
import { useState } from 'react'

export default function Send({ account, setSignRequest }) {
  const { t } = useTranslation()
  const width = useWidth()
  const [address, setAddress] = useState('')
  const [destinationTag, setDestinationTag] = useState('')
  const [amount, setAmount] = useState('')
  const [memo, setMemo] = useState('')
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [fee, setFee] = useState('')
  const [feeError, setFeeError] = useState('')
  const [error, setError] = useState('')
  const [txResult, setTxResult] = useState(null)

  const handleFeeChange = (e) => {
    const value = e.target.value
    setFee(value)

    if (Number(value) > 1) {
      setFeeError('Maximum fee is 1 ' + nativeCurrency)
    } else {
      setFeeError('')
    }
  }

  const handleSend = async () => {
    setError('')
    setTxResult(null)

    if (!address || !isAddressValid(address)) {
      setError(t('form.error.address-invalid'))
      return
    }

    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      setError('Please enter a valid amount.')
      return
    }

    if (destinationTag && !isTagValid(destinationTag)) {
      setError('Please enter a valid destination tag.')
      return
    }

    if (feeError) {
      setError(feeError)
      return
    }
    try {
      let payment = {
        TransactionType: 'Payment',
        Destination: address,
        Amount: multiply(amount, 1000000)
      }

      if (account?.address) {
        payment.Account = account.address
      }

      if (destinationTag) {
        payment.DestinationTag = parseInt(destinationTag)
      }

      if (memo) {
        payment.Memos = [
          {
            Memo: {
              MemoData: encode(memo)
            }
          }
        ]
      }

      if (fee) {
        payment.Fee = multiply(fee, 1000000)
      }

      setSignRequest({
        request: payment,
        callback: (result) => {
          if (result.result) {
            setTxResult({
              status: result.result.meta?.TransactionResult,
              date: result.result.date,
              destination: result.result.Destination,
              amount: amountFormat(result.result.Amount),
              destinationTag: result.result.DestinationTag,
              sourceTag: result.result.SourceTag,
              fee: amountFormat(result.result.Fee),
              sequence: result.result.Sequence,
              memo: result.result.Memos?.[0]?.Memo?.MemoData ? decode(result.result.Memos[0].Memo.MemoData) : undefined,
              hash: result.result.hash,
              status: result.result.meta?.TransactionResult,
              validated: result.result.validated,
              ledgerIndex: result.result.ledger_index,
              balanceChanges: result.result.balanceChanges
            })
          } else {
            setError('Transaction failed')
          }
        }
      })
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <>
      <SEO title="Send payment" description="Send a payment to a destination address" />
      <div className="content-text content-center">
        <h1 className="center">Send payment</h1>
        <NetworkTabs />

        <div>
          <AddressInput
            title={t('table.destination')}
            placeholder="Destination address"
            name="destination"
            hideButton={true}
            setValue={setAddress}
          />
          {width > 1100 && <br />}
          <FormInput
            title={t('table.destination-tag')}
            placeholder={t('form.placeholder.destination-tag')}
            setInnerValue={setDestinationTag}
            hideButton={true}
            onKeyPress={typeNumberOnly}
            defaultValue={destinationTag}
          />
          <div className="form-input">
            {width > 1100 && <br />}
            <span className="input-title">{t('table.amount')}</span>
            <input
              placeholder={'Enter amount in ' + nativeCurrency}
              onChange={(e) => setAmount(e.target.value)}
              onKeyPress={typeNumberOnly}
              className="input-text"
              spellCheck="false"
              maxLength="35"
              min="0"
              type="text"
              inputMode="decimal"
              defaultValue={amount}
            />
          </div>
          <div className="form-input">
            {width > 1100 && <br />}
            <span className="input-title">
              {t('table.memo')} (<span className="orange">It will be public</span>)
            </span>
            <input
              placeholder="Enter a memo (optional)"
              onChange={(e) => setMemo(e.target.value)}
              className="input-text"
              spellCheck="false"
              maxLength="100"
              type="text"
              defaultValue={memo}
            />
          </div>
          <CheckBox checked={showAdvanced} setChecked={() => setShowAdvanced(!showAdvanced)} name="advanced-payment">
            Advanced Payment Options
          </CheckBox>
          {showAdvanced && (
            <div>
              <br />
              <span className="input-title">Fee</span>
              <input
                placeholder={'Enter fee in ' + nativeCurrency}
                onChange={handleFeeChange}
                onKeyPress={typeNumberOnly}
                className={`input-text ${feeError ? 'error' : ''}`}
                spellCheck="false"
                maxLength="35"
                min="0"
                type="text"
                inputMode="decimal"
                defaultValue={fee}
              />
              {feeError && <div className="red">{feeError}</div>}
            </div>
          )}
          <br />
          {error && (
            <>
              <div className="red center">{error}</div>
              <br />
            </>
          )}
          <div className="center">
            <button className="button-action" onClick={handleSend}>
              Send Payment
            </button>
          </div>
          {txResult?.status === 'tesSUCCESS' && (
            <>
              <br />
              <div>
                <h3 className="center">Transaction Successful</h3>
                <div>
                  <p>
                    <strong>{t('table.date')}:</strong> {timeFromNow(txResult.date, i18n, 'ripple')} (
                    {fullDateAndTime(txResult.date, 'ripple')})
                  </p>
                  <p>
                    <strong>{t('table.destination')}:</strong> <LinkAccount address={txResult.destination} />{' '}
                    <CopyButton text={txResult.destination} />
                  </p>
                  <p>
                    <strong>{t('table.amount')}:</strong> {txResult.amount}
                  </p>
                  {txResult.destinationTag && (
                    <p>
                      <strong>{t('table.destination-tag')}:</strong> {txResult.destinationTag}
                    </p>
                  )}
                  {txResult.sourceTag && (
                    <p>
                      <strong>Source Tag:</strong> {txResult.sourceTag}
                    </p>
                  )}
                  <p>
                    <strong>Fee:</strong> {txResult.fee}
                  </p>
                  <p>
                    <strong>{t('table.sequence')}:</strong> #{txResult.sequence}
                  </p>
                  {txResult.memo && (
                    <p>
                      <strong>{t('table.memo')}:</strong> {txResult.memo}
                    </p>
                  )}
                  <p>
                    <strong>{t('table.hash')}: </strong>
                    <LinkTx tx={txResult.hash} /> <CopyButton text={txResult.hash} />
                  </p>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  )
}

export async function getStaticProps({ locale }) {
  return {
    props: {
      ...(await serverSideTranslations(locale, ['common']))
    }
  }
}

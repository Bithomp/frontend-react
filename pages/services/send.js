import { i18n, useTranslation } from 'next-i18next'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import SEO from '../../components/SEO'
import { addAndRemoveQueryParams } from '../../utils'
import { getIsSsrMobile } from '../../utils/mobile'
import CheckBox from '../../components/UI/CheckBox'
import AddressInput from '../../components/UI/AddressInput'
import FormInput from '../../components/UI/FormInput'
import CopyButton from '../../components/UI/CopyButton'
import { LinkTx, LinkAccount } from '../../utils/links'
import { multiply } from '../../utils/calc'
import NetworkTabs from '../../components/Tabs/NetworkTabs'
import { typeNumberOnly, isAddressValid, isTagValid, isIdValid, nativeCurrency, encode, decode } from '../../utils'
import { fullDateAndTime, timeFromNow, amountFormat, shortHash } from '../../utils/format'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import axios from 'axios'

export default function Send({
  account,
  setSignRequest,
  addressQuery,
  amountQuery,
  destinationTagQuery,
  memoQuery,
  feeQuery,
  sourceTagQuery,
  invoiceIdQuery
}) {
  const { t } = useTranslation()
  const router = useRouter()
  const [address, setAddress] = useState(isAddressValid(addressQuery) ? addressQuery : null)
  const [destinationTag, setDestinationTag] = useState(isTagValid(destinationTagQuery) ? destinationTagQuery : null)
  const [amount, setAmount] = useState(Number(amountQuery) > 0 ? amountQuery : null)
  const [memo, setMemo] = useState(memoQuery)
  const [showAdvanced, setShowAdvanced] = useState(Number(feeQuery) > 0 || isTagValid(sourceTagQuery) || isIdValid(invoiceIdQuery))
  const [fee, setFee] = useState(Number(feeQuery) > 0 && Number(feeQuery) <= 1 ? feeQuery : null)
  const [feeError, setFeeError] = useState('')
  const [sourceTag, setSourceTag] = useState(isTagValid(sourceTagQuery) ? sourceTagQuery : null)
  const [invoiceId, setInvoiceId] = useState(isIdValid(invoiceIdQuery) ? invoiceIdQuery : null)
  const [error, setError] = useState('')
  const [txResult, setTxResult] = useState(null)
  const [agreeToSiteTerms, setAgreeToSiteTerms] = useState(false)
  const [isDestinationFlagged, setIsDestinationFlagged] = useState(false)
  const [agreeToSendToFlagged, setAgreeToSendToFlagged] = useState(false)

  useEffect(() => {
    let queryAddList = []
    let queryRemoveList = []

    if (isAddressValid(address)) {
      queryAddList.push({ name: 'address', value: address })
    } else {
      queryRemoveList.push('address')
    }

    if (isTagValid(destinationTag)) {
      queryAddList.push({ name: 'destinationTag', value: destinationTag })
    } else {
      queryRemoveList.push('destinationTag')
    }

    if (amount && Number(amount) > 0) {
      queryAddList.push({ name: 'amount', value: amount })
    } else {
      queryRemoveList.push('amount')
    }

    if (memo) {
      queryAddList.push({ name: 'memo', value: memo })
    } else {
      queryRemoveList.push('memo')
    }

    if (fee && Number(amount) > 0) {
      queryAddList.push({ name: 'fee', value: fee })
    } else {
      queryRemoveList.push('fee')
    }

    if (isTagValid(sourceTag)) {
      queryAddList.push({ name: 'sourceTag', value: sourceTag })
    } else {
      queryRemoveList.push('sourceTag')
    }

    if (isIdValid(invoiceId)) {
      queryAddList.push({ name: 'invoiceId', value: invoiceId })
    } else {
      queryRemoveList.push('invoiceId')
    }

    addAndRemoveQueryParams(router, queryAddList, queryRemoveList)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address, destinationTag, amount, memo, fee, sourceTag, invoiceId])

  // Fetch destination account data when address changes
  useEffect(() => {
    const fetchDestinationAccountData = async () => {
      if (!address || !isAddressValid(address)) {
        setIsDestinationFlagged(false)
        setAgreeToSendToFlagged(false)
        return
      }

      try {
        const response = await axios(`/v2/address/${address}?blacklist=true`)
        const data = response?.data
        
        if (data?.address) {
          const isFlagged = data.blacklist?.blacklisted || false
          setIsDestinationFlagged(isFlagged)
          
          // Reset agreement if account is no longer flagged
          if (!isFlagged) {
            setAgreeToSendToFlagged(false)
          }
        } else {
          setIsDestinationFlagged(false)
          setAgreeToSendToFlagged(false)
        }
      } catch (error) {
        setError('Error fetching destination account data')
        setIsDestinationFlagged(false)
        setAgreeToSendToFlagged(false)
      }
    }

    fetchDestinationAccountData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address])

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

    if (Number(fee) > 1) {
      setError('Maximum fee is 1 ' + nativeCurrency)
      return
    }

    if (sourceTag && !isTagValid(sourceTag)) {
      setError('Please enter a valid source tag.')
      return
    }

    if (invoiceId && !isIdValid(invoiceId)) {
      setError('Invoice ID must be a 64-character hexadecimal string.')
      return
    }

    if (!agreeToSiteTerms) {
      setError('Please agree to the Terms and conditions')
      return
    }

    if (isDestinationFlagged && !agreeToSendToFlagged) {
      setError('Please acknowledge that you understand the risks of sending to a flagged account')
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

      if (sourceTag) {
        payment.SourceTag = parseInt(sourceTag)
      }

      if (invoiceId) {
        payment.InvoiceID = invoiceId
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
              balanceChanges: result.result.balanceChanges,
              invoiceId: result.result.InvoiceID
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
            setInnerValue={setAddress}
            rawData={isAddressValid(address) ? { address } : {}}
            type="address"
          />
          
          {/* Show warning if destination account is flagged */}
          {isDestinationFlagged && (
            <div>
              <div className="form-spacing" />
              <div className="red center p-2 rounded-md bg-red-50 border border-red-200 mb-4 sm:mb-0">
                <strong>⚠️ Fraud Alert</strong>
                <br />
                This account has been flagged as potentially involved in scams, phishing, or other malicious activities.
                <br />
                <strong>We strongly recommend proceeding with caution to ensure the safety of your assets.</strong>
                <br />
                <Link href="/blacklisted-address" target="_blank" style={{ color: '#ff6b6b', textDecoration: 'underline' }}>
                  Learn more about flagged accounts
                </Link>
              </div>
            </div>
          )}

          <div className="form-spacing" />
          <FormInput
            title={t('table.destination-tag')}
            placeholder={t('form.placeholder.destination-tag')}
            setInnerValue={setDestinationTag}
            hideButton={true}
            onKeyPress={typeNumberOnly}
            defaultValue={destinationTag}
          />
          <div className="form-input">
            <div className="form-spacing" />
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
            <div className="form-spacing" />
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
          <CheckBox
            checked={showAdvanced}
            setChecked={() => {
              setShowAdvanced(!showAdvanced)
              setFee(null)
              setSourceTag(null)
              setInvoiceId(null)
            }}
            name="advanced-payment"
          >
            Advanced Payment Options
          </CheckBox>
          {showAdvanced && (
            <>
              <br />
              <div className="form-input">
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
              <div className="form-spacing" />
              <div className="form-input">
                <span className="input-title">Source Tag</span>
                <input
                  placeholder="Enter source tag"
                  onChange={(e) => setSourceTag(e.target.value)}
                  onKeyPress={typeNumberOnly}
                  className="input-text"
                  spellCheck="false"
                  maxLength="35"
                  type="text"
                  defaultValue={sourceTag}
                />
              </div>
              <div className="form-spacing" />
              <div className="form-input">
                <span className="input-title">Invoice ID</span>
                <input
                  placeholder="Enter invoice ID"
                  onChange={(e) => setInvoiceId(e.target.value)}
                  className="input-text"
                  spellCheck="false"
                  maxLength="64"
                  type="text"
                  defaultValue={invoiceId}
                />
              </div>
            </>
          )}
          <br />
          <CheckBox checked={agreeToSiteTerms} setChecked={setAgreeToSiteTerms} name="agree-to-terms">
            I agree with the{' '}
            <Link href="/terms-and-conditions" target="_blank">
              Terms and conditions
            </Link>
            .
          </CheckBox>
          
          {/* Show additional checkbox for flagged accounts */}
          {isDestinationFlagged && (
            <div>
              <CheckBox checked={agreeToSendToFlagged} setChecked={setAgreeToSendToFlagged} name="agree-to-flagged">
                I understand the risks and want to proceed with sending to this flagged account
              </CheckBox>
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
                  {txResult.invoiceId && (
                    <p>
                      <strong>Invoice ID:</strong> {shortHash(txResult.invoiceId)} <CopyButton text={txResult.invoiceId} />
                    </p>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  )
}

export const getServerSideProps = async (context) => {
  const { query, locale } = context
  const { address, amount, destinationTag, memo, fee, sourceTag, invoiceId } = query

  return {
    props: {
      addressQuery: address || '',
      amountQuery: amount || '',
      destinationTagQuery: destinationTag || '',
      memoQuery: memo || '',
      feeQuery: fee || '',
      sourceTagQuery: sourceTag || '',
      invoiceIdQuery: invoiceId || '',
      isSsrMobile: getIsSsrMobile(context),
      ...(await serverSideTranslations(locale, ['common']))
    }
  }
}

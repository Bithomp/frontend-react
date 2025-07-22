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
import {
  typeNumberOnly,
  isAddressValid,
  isTagValid,
  isIdValid,
  nativeCurrency,
  isNativeCurrency,
  encode,
  decode
} from '../../utils'
import { fullDateAndTime, timeFromNow, amountFormat, shortHash } from '../../utils/format'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import axios from 'axios'
import { errorCodeDescription } from '../../utils/transaction'
import TokenSelector from '../../components/UI/TokenSelector'

export const getServerSideProps = async (context) => {
  const { query, locale } = context
  const { address, amount, destinationTag, memo, fee, sourceTag, invoiceId, currency, currencyIssuer } = query

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
      currencyQuery: currency || nativeCurrency,
      currencyIssuerQuery: currencyIssuer || '',
      ...(await serverSideTranslations(locale, ['common']))
    }
  }
}

export default function Send({
  account,
  setSignRequest,
  addressQuery,
  amountQuery,
  destinationTagQuery,
  memoQuery,
  feeQuery,
  sourceTagQuery,
  invoiceIdQuery,
  sessionToken,
  subscriptionExpired,
  currencyQuery,
  currencyIssuerQuery
}) {
  const { t } = useTranslation()
  const router = useRouter()
  const [address, setAddress] = useState(isAddressValid(addressQuery) ? addressQuery : null)
  const [destinationTag, setDestinationTag] = useState(isTagValid(destinationTagQuery) ? destinationTagQuery : null)
  const [amount, setAmount] = useState(Number(amountQuery) > 0 ? amountQuery : null)
  const [memo, setMemo] = useState(memoQuery)
  const [showAdvanced, setShowAdvanced] = useState(
    Number(feeQuery) > 0 || isTagValid(sourceTagQuery) || isIdValid(invoiceIdQuery)
  )
  const [fee, setFee] = useState(
    Number(feeQuery) > 0 && Number(feeQuery) <= 1 && sessionToken && !subscriptionExpired ? feeQuery : null
  )
  const [feeError, setFeeError] = useState('')
  const [sourceTag, setSourceTag] = useState(
    isTagValid(sourceTagQuery) && sessionToken && !subscriptionExpired ? sourceTagQuery : null
  )
  const [invoiceId, setInvoiceId] = useState(
    isIdValid(invoiceIdQuery) && sessionToken && !subscriptionExpired ? invoiceIdQuery : null
  )
  const [error, setError] = useState('')
  const [txResult, setTxResult] = useState(null)
  const [agreeToSiteTerms, setAgreeToSiteTerms] = useState(false)
  const [isDestinationFlagged, setIsDestinationFlagged] = useState(false)
  const [isNonActive, setIsNonActive] = useState(false)
  const [agreeToSendToFlagged, setAgreeToSendToFlagged] = useState(false)
  const [requireDestTag, setRequireDestTag] = useState(false)
  const [agreeToSendToNonActive, setAgreeToSendToNonActive] = useState(false)
  const [selectedToken, setSelectedToken] = useState({ currency: currencyQuery, issuer: currencyIssuerQuery })
  const [networkInfo, setNetworkInfo] = useState({})

  const onTokenChange = (token) => {
    setSelectedToken(token)
  }

  // Helper to get maximum amount that can be sent for the selected token
  const getMaxAmount = () => {
    if (!selectedToken || selectedToken.currency === nativeCurrency) return null
    return selectedToken.limit
  }

  // Helper to format max amount display
  const getMaxAmountDisplay = () => {
    const maxAmount = getMaxAmount()
    if (!maxAmount) return null

    return (
      <>
        <span className="max-amount-display">
          (<span className="max-amount-label">Dest. can accept max</span>{' '}
          <span className="max-amount-value">
            {amountFormat(
              { value: maxAmount, currency: selectedToken.currency, issuer: selectedToken.issuer },
              { short: true }
            )}
          </span>
          )
        </span>
        <style jsx>{`
          .max-amount-display {
            align-items: center;
            margin-top: 4px;
            font-size: 12px;

            .max-amount-label {
              color: #6b7280;
              font-weight: 500;
              .dark & {
                color: #9ca3af;
              }
            }

            .max-amount-value {
              color: var(--accent-link);
              font-weight: 500;
            }
          }
        `}</style>
      </>
    )
  }

  // Fetch network info for reserve amounts only when account is not activated
  useEffect(() => {
    const fetchNetworkInfo = async () => {
      try {
        const response = await axios('/v2/server')
        setNetworkInfo(response?.data || {})
      } catch (error) {
        console.error('Error fetching network info:', error)
      }
    }

    // Only fetch network info if the destination account is not activated
    if (isNonActive) {
      fetchNetworkInfo()
    }
  }, [isNonActive])

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

    if (fee && Number(fee) > 0 && Number(fee) <= 1) {
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
        setRequireDestTag(false)
        setIsNonActive(false)
        setAgreeToSendToNonActive(false)
        return
      }

      try {
        const response = await axios(`/v2/address/${address}?blacklist=true&ledgerInfo=true`)
        const data = response?.data

        if (data?.address) {
          const isFlagged = data.blacklist?.blacklisted || false
          const isNonActivated = data.ledgerInfo && data.ledgerInfo.activated === false

          setIsDestinationFlagged(isFlagged)
          setIsNonActive(isNonActivated)

          // Reset agreements if account status changes
          if (!isFlagged) {
            setAgreeToSendToFlagged(false)
          }
          if (!isNonActivated) {
            setAgreeToSendToNonActive(false)
          }
        } else {
          setIsDestinationFlagged(false)
          setAgreeToSendToFlagged(false)
          setIsNonActive(false)
          setAgreeToSendToNonActive(false)
        }

        // Fetch destination tag requirement from new endpoint
        const accountResponse = await axios(`/xrpl/accounts/${address}`)
        const accountData = accountResponse?.data
        if (accountData?.account_data?.require_dest_tag) {
          setRequireDestTag(accountData?.account_data?.require_dest_tag)
        } else {
          setRequireDestTag(false)
        }
      } catch (error) {
        setError('Error fetching destination account data')
        setIsDestinationFlagged(false)
        setAgreeToSendToFlagged(false)
        setRequireDestTag(false)
        setIsNonActive(false)
        setAgreeToSendToNonActive(false)
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

    // Check if destination requires a tag but none is provided
    if (requireDestTag && !destinationTag) {
      setError('This destination account requires a destination tag. Please enter a destination tag.')
      return
    }

    if (destinationTag && !isTagValid(destinationTag)) {
      setError('Please enter a valid destination tag.')
      return
    }

    // Check if advanced options are being used without proper subscription
    if ((fee || sourceTag || invoiceId) && (!sessionToken || subscriptionExpired)) {
      setError(
        'Advanced options (fee, source tag, invoice ID) are available only to logged-in Bithomp Pro subscribers.'
      )
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

    if (isNonActive && !agreeToSendToNonActive) {
      setError('Please acknowledge that you understand the risks of sending to a non-activated account')
      return
    }

    try {
      let payment = {
        TransactionType: 'Payment',
        Destination: address
      }

      if (isNativeCurrency(selectedToken)) {
        payment.Amount = multiply(amount, 1000000)
      } else {
        payment.Amount = {
          currency: selectedToken.currency,
          issuer: selectedToken.issuer,
          value: amount
        }
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
          const status = result.meta?.TransactionResult
          if (status !== 'tesSUCCESS') {
            setError(errorCodeDescription(status))
          } else {
            setTxResult({
              status,
              date: result.date,
              destination: result.Destination,
              amount: amountFormat(result.Amount),
              destinationTag: result.DestinationTag,
              sourceTag: result.SourceTag,
              fee: amountFormat(result.Fee),
              sequence: result.Sequence,
              memo: result.Memos?.[0]?.Memo?.MemoData ? decode(result.Memos[0].Memo.MemoData) : undefined,
              hash: result.hash,
              validated: result.validated,
              ledgerIndex: result.ledger_index,
              balanceChanges: result.balanceChanges,
              invoiceId: result.InvoiceID
            })
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
            setValue={(value) => {
              setAddress(value)
              setSelectedToken({ currency: nativeCurrency })
            }}
            setInnerValue={setAddress}
            rawData={isAddressValid(address) ? { address } : {}}
            type="address"
          />

          {/* Show warning if destination account is flagged */}
          {isDestinationFlagged && (
            <div>
              <div className="form-spacing" />
              <div className="red center p-2 rounded-md border border-red-200 mb-4 sm:mb-0">
                <strong>⚠️ Fraud Alert</strong>
                <br />
                This account has been flagged as potentially involved in scams, phishing, or other malicious activities.
                <br />
                <strong>We strongly recommend proceeding with caution to ensure the safety of your assets.</strong>
                <br />
                <Link
                  href="/blacklisted-address"
                  target="_blank"
                  style={{ color: '#ff6b6b', textDecoration: 'underline' }}
                >
                  Learn more about flagged accounts
                </Link>
              </div>
            </div>
          )}

          {/* Show warning if destination account is non-activated */}
          {isNonActive && (
            <div>
              <div className="form-spacing" />
              <div className="orange center p-2 rounded-md border border-orange-200 mb-4 sm:mb-0">
                <strong>⚠️ Non-Activated Account</strong>
                <br />
                You are attempting to send funds to a non-activated account.
                <br />
                This account has never been used and currently has a zero balance.
                <br />
                <strong>Proceed with caution.</strong>
                <br />
                If you continue, {amountFormat(networkInfo?.reserveBase || '1000000')} will be used to activate the
                account on the ledger.
              </div>
            </div>
          )}

          <div className="form-spacing" />
          <FormInput
            title={
              <>
                {t('table.destination-tag')}{' '}
                {requireDestTag ? (
                  <>
                    {' '}
                    (<span className="orange bold">required</span>)
                  </>
                ) : (
                  ''
                )}
              </>
            }
            placeholder={t('form.placeholder.destination-tag')}
            setInnerValue={setDestinationTag}
            hideButton={true}
            onKeyPress={typeNumberOnly}
            defaultValue={destinationTag}
          />
          <div className="form-input">
            <div className="form-spacing" />
            <div className="flex flex-col gap-4 sm:flex-row">
              <div className="flex-1">
                <span className="input-title">
                  {t('table.amount')} {getMaxAmountDisplay()}
                </span>
                <input
                  placeholder="Enter amount"
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
              <div className="w-full sm:w-1/2">
                <span className="input-title">Currency</span>
                <TokenSelector
                  value={selectedToken}
                  onChange={onTokenChange}
                  destinationAddress={address}
                  currencyQueryName="currency"
                />
              </div>
            </div>
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
            {!sessionToken ? (
              <>
                {' '}
                <span className="orange">
                  (available to <Link href="/admin">logged-in</Link> Bithomp Pro subscribers)
                </span>
              </>
            ) : (
              subscriptionExpired && (
                <>
                  {' '}
                  <span className="orange">
                    Your Bithomp Pro subscription has expired.{' '}
                    <Link href="/admin/subscriptions">Renew your subscription</Link>
                  </span>
                </>
              )
            )}
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
                  disabled={!sessionToken || subscriptionExpired}
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
                  disabled={!sessionToken || subscriptionExpired}
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
                  disabled={!sessionToken || subscriptionExpired}
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
            <div className="orange">
              <CheckBox checked={agreeToSendToFlagged} setChecked={setAgreeToSendToFlagged} name="agree-to-flagged">
                I understand the risks and I want to proceed with sending funds to this flagged account
              </CheckBox>
            </div>
          )}

          {/* Show additional checkbox for non-activated accounts */}
          {isNonActive && (
            <div className="orange">
              <CheckBox
                checked={agreeToSendToNonActive}
                setChecked={setAgreeToSendToNonActive}
                name="agree-to-non-active"
              >
                I understand that {amountFormat(networkInfo?.reserveBase || '1000000')} will be used to activate this
                account and I want to proceed
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
                      <strong>Invoice ID:</strong> {shortHash(txResult.invoiceId)}{' '}
                      <CopyButton text={txResult.invoiceId} />
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

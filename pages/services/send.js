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
import {
  typeNumberOnly,
  isAddressValid,
  isTagValid,
  isIdValid,
  nativeCurrency,
  isNativeCurrency,
  encode,
  decode,
  xahauNetwork
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
  const { address, amount, destinationTag, memo, fee, sourceTag, invoiceId, currency, currencyIssuer, remit } = query

  return {
    props: {
      addressQuery: address || '',
      amountQuery: amount || '',
      destinationTagQuery: destinationTag || '',
      memoQuery: memo || '',
      feeQuery: fee || '',
      sourceTagQuery: sourceTag || '',
      invoiceIdQuery: invoiceId || '',
      remitQuery: remit === 'true',
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
  remitQuery,
  sessionToken,
  subscriptionExpired,
  openEmailLogin,
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
  const [isNonActive, setIsNonActive] = useState(false)
  const [agreeToSendToFlagged, setAgreeToSendToFlagged] = useState(false)
  const [requireDestTag, setRequireDestTag] = useState(false)
  const [agreeToSendToNonActive, setAgreeToSendToNonActive] = useState(false)
  const [selectedToken, setSelectedToken] = useState({ currency: currencyQuery, issuer: currencyIssuerQuery })
  const [networkInfo, setNetworkInfo] = useState({})
  const [destinationStatus, setDestinationStatus] = useState(0)
  const [useRemit, setUseRemit] = useState(remitQuery)
  const [destinationRemitDisabled, setDestinationRemitDisabled] = useState(false)

  const onTokenChange = (token) => {
    setSelectedToken(token)
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

    if (useRemit) {
      queryAddList.push({ name: 'remit', value: 'true' })
    } else {
      queryRemoveList.push('remit')
    }

    addAndRemoveQueryParams(router, queryAddList, queryRemoveList)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address, destinationTag, amount, memo, fee, sourceTag, invoiceId, useRemit])

  // Fetch destination account data when address changes
  useEffect(() => {
    const fetchDestinationAccountData = async () => {
      if (!address || !isAddressValid(address)) {
        setDestinationStatus(0)
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
          const status = data.blacklist?.status ?? 0
          setDestinationStatus(status)
          const isNonActivated = data.ledgerInfo && data.ledgerInfo.activated === false
          setIsNonActive(isNonActivated)
          // Reset agreements if account status changes
          if (status === 0) {
            setAgreeToSendToFlagged(false)
          }
          if (!isNonActivated) {
            setAgreeToSendToNonActive(false)
          }
        } else {
          setDestinationStatus(0)
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

        // Check if destination has incoming remit disabled (Xahau only)
        if (xahauNetwork && data?.ledgerInfo?.flags) {
          const flags = data.ledgerInfo.flags
          const disallowIncomingRemit = flags.disallowIncomingRemit
          setDestinationRemitDisabled(disallowIncomingRemit)
        } else {
          setDestinationRemitDisabled(false)
        }
      } catch (error) {
        setError('Error fetching destination account data')
        setDestinationStatus(0)
        setAgreeToSendToFlagged(false)
        setRequireDestTag(false)
        setIsNonActive(false)
        setAgreeToSendToNonActive(false)
      }
    }

    fetchDestinationAccountData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address])

  const handleFeeChange = (value) => {
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

    // Check remit validation for Xahau
    if (xahauNetwork && useRemit) {
      if (destinationRemitDisabled) {
        setError('Cannot use Remit: Destination account has incoming remit disabled.')
        return
      }
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

    if (isNonActive && !agreeToSendToNonActive) {
      setError('Please acknowledge that you understand the risks of sending to a non-activated account')
      return
    }

    if (destinationStatus === 3) {
      setError('This account has been flagged as FRAUD. Sending is not allowed.')
      return
    }

    try {
      let payment = {}

      let amountData = null
      let particialPayment = false

      if (isNativeCurrency(selectedToken)) {
        amountData = multiply(amount, 1000000)
      } else {
        amountData = {
          currency: selectedToken.currency,
          issuer: selectedToken.issuer,
          value: amount
        }
        particialPayment = true
      }

      if (xahauNetwork && useRemit) {
        // Use Remit transaction for Xahau
        payment = {
          TransactionType: 'Remit',
          Destination: address,
          Amounts: [
            {
              AmountEntry: {
                Amount: amountData
              }
            }
          ]
        }
      } else {
        // Use regular Payment transaction
        payment = {
          TransactionType: 'Payment',
          Destination: address,
          Amount: amountData
        }
        if (particialPayment) {
          payment.Flags = 131072 // tfPartialPayment
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
              amount:
                xahauNetwork && useRemit && result.Amounts
                  ? amountFormat(result.Amounts[0]?.AmountEntry?.Amount)
                  : amountFormat(result.Amount),
              destinationTag: result.DestinationTag,
              sourceTag: result.SourceTag,
              fee: amountFormat(result.Fee),
              sequence: result.Sequence,
              memo: result.Memos?.[0]?.Memo?.MemoData ? decode(result.Memos[0].Memo.MemoData) : undefined,
              hash: result.hash,
              validated: result.validated,
              ledgerIndex: result.ledger_index,
              invoiceId: result.InvoiceID,
              transactionType: xahauNetwork && useRemit ? 'Remit' : 'Payment'
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
      <SEO
        title="Send payment"
        description="Send a payment to a destination address"
        image={{
          width: 1200,
          height: 630,
          file: 'previews/1200x630/services/send.png'
        }}
        twitterImage={{ file: 'previews/630x630/services/send.png' }}
      />
      <div className="content-text content-center">
        <h1 className="center">Send payment</h1>

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

          {/* Show warning if destination account is flagged (status 1,2,3) */}
          {(destinationStatus === 1 || destinationStatus === 2 || destinationStatus === 3) && (
            <div>
              <div className="form-spacing" />
              <div className="red center p-2 rounded-md border border-red-200 mb-4 sm:mb-0">
                <strong>
                  ⚠️{' '}
                  {destinationStatus === 1
                    ? 'Spam Alert'
                    : destinationStatus === 2
                    ? 'Potential Fraud Alert'
                    : 'Fraud Alert'}
                </strong>
                <br />
                {destinationStatus === 1 && (
                  <>
                    This account has been flagged for spam. Proceed with caution.
                    <br />
                  </>
                )}
                {destinationStatus === 2 && (
                  <>
                    This account has been flagged as potentially involved in fraud, scams, or phishing.{' '}
                    <strong>Proceed with caution.</strong>
                    <br />
                  </>
                )}
                {destinationStatus === 3 && (
                  <>
                    <strong>This account has been flagged as FRAUD. Sending is not allowed.</strong>
                    <br />
                  </>
                )}
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

          {/* Show warning if destination has incoming remit disabled and user wants to use remit */}
          {xahauNetwork && useRemit && destinationRemitDisabled && (
            <div>
              <div className="form-spacing" />
              <div className="red center p-2 rounded-md border border-red-200 mb-4 sm:mb-0">
                <strong>🚫 Remit Not Available</strong>
                <br />
                This destination account has incoming remit disabled.
                <br />
                <strong>You cannot use Remit to send tokens to this account.</strong>
                <br />
                Please uncheck the "Use Remit" option or choose a different destination.
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
          {/* Remit option for Xahau network */}
          {xahauNetwork && (
            <>
              <CheckBox
                checked={useRemit}
                setChecked={setUseRemit}
                name="use-remit"
                disabled={destinationRemitDisabled && !useRemit}
              >
                Use Remit
                <span className="orange"> - Send any token and pay for destination reserves.</span>
                {destinationRemitDisabled && (
                  <span className="red"> (Disabled - destination has incoming remit disabled)</span>
                )}
              </CheckBox>

              {useRemit && (
                <>
                  <br />
                  <div className="grey p-2 rounded-md border border-grey-200 mb-4 sm:mb-0">
                    <strong>ℹ️ Remit Transaction</strong>
                    <br />
                    <br />
                    When using Remit, you can send any token to the destination account, even if they don't have a
                    trustline for it.
                    <br />
                    <br />
                    <strong>Note:</strong> You will pay for the destination account's reserve requirements if the
                    account needs to be activated.
                    <br />
                    <br />
                    <strong>Token Selection:</strong> All available tokens (including native XAH) are shown since remit
                    allows sending any token regardless of trustlines.
                    <br />
                    <br />
                    This feature is only available on the Xahau network.
                  </div>
                </>
              )}
            </>
          )}
          <br />
          <div className="flex flex-col gap-x-4 sm:flex-row">
            <div className="flex-1">
              <FormInput
                title={t('table.amount')}
                placeholder="Enter amount"
                setInnerValue={setAmount}
                hideButton={true}
                onKeyPress={typeNumberOnly}
                defaultValue={amount}
                maxLength={35}
                min={0}
                inputMode="decimal"
                type="text"
              />
            </div>
            <div className="w-full sm:w-1/2">
              <span className="input-title">Currency</span>
              <TokenSelector
                value={selectedToken}
                onChange={onTokenChange}
                destinationAddress={useRemit ? null : address}
                currencyQueryName="currency"
                senderAddress={account?.address || null}
              />
            </div>
          </div>
          <br />
          <FormInput
            title={
              <>
                {t('table.memo')} (<span className="orange">It will be public</span>)
              </>
            }
            placeholder="Enter a memo (optional)"
            setInnerValue={setMemo}
            hideButton={true}
            defaultValue={memo}
            maxLength={100}
            type="text"
          />

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
                  (available to{' '}
                  <span className="link" onClick={() => openEmailLogin()}>
                    logged-in
                  </span>{' '}
                  Bithomp Pro subscribers)
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
              <FormInput
                title="Fee"
                placeholder={'Enter fee in ' + nativeCurrency}
                setInnerValue={handleFeeChange}
                hideButton={true}
                onKeyPress={typeNumberOnly}
                defaultValue={fee}
                maxLength={35}
                min={0}
                inputMode="decimal"
                type="text"
                disabled={!sessionToken || subscriptionExpired}
                className={feeError ? 'error' : ''}
              />
              {feeError && <div className="red">{feeError}</div>}
              <div className="form-spacing" />
              <FormInput
                title="Source Tag"
                placeholder="Enter source tag"
                setInnerValue={setSourceTag}
                hideButton={true}
                onKeyPress={typeNumberOnly}
                defaultValue={sourceTag}
                maxLength={35}
                type="text"
                disabled={!sessionToken || subscriptionExpired}
              />
              <div className="form-spacing" />
              <FormInput
                title="Invoice ID"
                placeholder="Enter invoice ID"
                setInnerValue={setInvoiceId}
                hideButton={true}
                defaultValue={invoiceId}
                maxLength={64}
                type="text"
                disabled={!sessionToken || subscriptionExpired}
              />
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

          {/* Show additional checkbox for flagged accounts (only for status 1 and 2) */}
          {(destinationStatus === 1 || destinationStatus === 2) && (
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
            <button className="button-action" onClick={handleSend} disabled={destinationStatus === 3}>
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
                  {txResult.transactionType === 'Remit' && (
                    <p>
                      <strong>Transaction Type:</strong> <span className="bold">Remit</span>
                    </p>
                  )}
                </div>
              </div>
            </>
          )}

          <br />
          <div className="grey">
            To mint a token (by sending a payment to a distribution account that already has a trustline to you), you
            must be logged in with the issuer address.
          </div>
        </div>
      </div>
    </>
  )
}

import { i18n, useTranslation } from 'next-i18next'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import SEO from '../../components/SEO'
import {
  isAddressValid,
  typeNumberOnly,
  nativeCurrency,
  isTagValid,
  isIdValid,
  decode,
  encode,
  addAndRemoveQueryParams
} from '../../utils'
import { multiply } from '../../utils/calc'
import { getIsSsrMobile } from '../../utils/mobile'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import AddressInput from '../../components/UI/AddressInput'
import FormInput from '../../components/UI/FormInput'
import CheckBox from '../../components/UI/CheckBox'
import ExpirationSelect from '../../components/UI/ExpirationSelect'
import NetworkTabs from '../../components/Tabs/NetworkTabs'
import CopyButton from '../../components/UI/CopyButton'
import { amountFormat, fullDateAndTime, timeFromNow, shortHash } from '../../utils/format'
import { LinkTx, LinkAccount } from '../../utils/links'
import Link from 'next/link'
import { errorCodeDescription } from '../../utils/transaction'

export default function IssueCheck({
  setSignRequest,
  sessionToken,
  subscriptionExpired,
  openEmailLogin,
  addressQuery,
  amountQuery,
  destinationTagQuery,
  expirationQuery,
  invoiceIdQuery,
  memoQuery,
  feeQuery,
  sourceTagQuery
}) {
  const { t } = useTranslation()
  const router = useRouter()
  const [error, setError] = useState('')
  const [address, setAddress] = useState(isAddressValid(addressQuery) ? addressQuery : null)
  const [destinationTag, setDestinationTag] = useState(isTagValid(destinationTagQuery) ? destinationTagQuery : null)
  const [amount, setAmount] = useState(Number(amountQuery) > 0 ? amountQuery : null)
  const [expiration, setExpiration] = useState(Number(expirationQuery) > 0 ? Number(expirationQuery) : null)
  const [invoiceID, setInvoiceID] = useState(isIdValid(invoiceIdQuery) ? invoiceIdQuery : null)
  const [txResult, setTxResult] = useState(null)
  const [showAdvanced, setShowAdvanced] = useState(
    Number(feeQuery) > 0 || isTagValid(sourceTagQuery) || isIdValid(invoiceIdQuery)
  )
  const [agreeToSiteTerms, setAgreeToSiteTerms] = useState(false)
  const [memo, setMemo] = useState(memoQuery || null)
  const [fee, setFee] = useState(Number(feeQuery) > 0 && Number(feeQuery) <= 1 ? feeQuery : null)
  const [feeError, setFeeError] = useState(null)
  const [sourceTag, setSourceTag] = useState(isTagValid(sourceTagQuery) ? sourceTagQuery : null)
  // Reflect filled parameters in URL like /send does
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

    if (isIdValid(invoiceID)) {
      queryAddList.push({ name: 'invoiceId', value: invoiceID })
    } else {
      queryRemoveList.push('invoiceId')
    }

    if (expiration && Number(expiration) > 0) {
      queryAddList.push({ name: 'expiration', value: String(expiration) })
    } else {
      queryRemoveList.push('expiration')
    }

    addAndRemoveQueryParams(router, queryAddList, queryRemoveList)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address, destinationTag, amount, memo, fee, sourceTag, invoiceID, expiration])

  const handleFeeChange = (value) => {
    setFee(value)
    if (Number(value) > 1) {
      setFeeError('Maximum fee is 1 ' + nativeCurrency)
    } else {
      setFeeError('')
    }
  }

  const onExpirationChange = (days) => {
    setExpiration(days)
  }

  const handleIssueCheck = async () => {
    setError('')

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

    if ((fee || sourceTag || invoiceID) && (!sessionToken || subscriptionExpired)) {
      setError(
        'Advanced options (fee, source tag, invoice ID) are available only to logged-in Bithomp Pro subscribers.'
      )
      return
    }

    if (sourceTag && !isTagValid(sourceTag)) {
      setError('Please enter a valid source tag.')
      return
    }

    if (invoiceID && !isIdValid(invoiceID)) {
      setError('Please enter a valid invoice ID.')
      return
    }

    if (!agreeToSiteTerms) {
      setError('Please agree to the Terms and conditions')
      return
    }

    try {
      let checkCreate = {
        TransactionType: 'CheckCreate',
        Destination: address,
        SendMax: multiply(amount, 1000000)
      }

      if (destinationTag) {
        checkCreate.DestinationTag = parseInt(destinationTag)
      }

      if (expiration) {
        checkCreate.Expiration = Math.floor(Date.now() / 1000) + expiration * 24 * 60 * 60 - 946684800
      }

      if (invoiceID) {
        checkCreate.InvoiceID = invoiceID
      }

      if (memo) {
        checkCreate.Memos = [
          {
            Memo: {
              MemoData: encode(memo)
            }
          }
        ]
      }

      if (fee) {
        checkCreate.Fee = multiply(fee, 1000000)
      }

      if (sourceTag) {
        checkCreate.SourceTag = parseInt(sourceTag)
      }

      setSignRequest({
        request: checkCreate,
        callback: (result) => {
          const status = result.meta?.TransactionResult
          if (status === 'tesSUCCESS') {
            setTxResult({
              status: status,
              date: result.date,
              destination: result.Destination,
              amount: amountFormat(result.SendMax),
              destinationTag: result.DestinationTag,
              sourceTag: result.SourceTag,
              fee: amountFormat(result.Fee),
              sequence: result.Sequence,
              memo: result.Memos?.[0]?.Memo?.MemoData ? decode(result.Memos[0].Memo.MemoData) : undefined,
              hash: result.hash,
              invoiceID: result.InvoiceID,
              expiration: result.Expiration,
              ledgerIndex: result.ledger_index,
              balanceChanges: result.balanceChanges
            })
          } else {
            setError(errorCodeDescription(status))
          }
        }
      })
    } catch (error) {
      setError(error.message)
    }
  }

  return (
    <>
      <SEO title="Issue Check" description="Create a deferred payment Check" />
      <div className="content-text content-center">
        <h1 className="center">Issue Check</h1>
        <NetworkTabs />
        <div>
          <AddressInput
            title={t('table.destination')}
            placeholder="Destination address"
            name="destination"
            hideButton={true}
            setInnerValue={setAddress}
            rawData={isAddressValid(address) ? { address } : {}}
            type="address"
          />
          <div className="form-spacing" />
          <FormInput
            title={t('table.destination-tag')}
            placeholder={t('form.placeholder.destination-tag')}
            setInnerValue={setDestinationTag}
            hideButton={true}
            onKeyPress={typeNumberOnly}
            defaultValue={destinationTag}
          />
          <div className="form-spacing" />
          <FormInput
            title={t('table.amount')}
            placeholder={'Enter amount in ' + nativeCurrency}
            setInnerValue={setAmount}
            hideButton={true}
            onKeyPress={typeNumberOnly}
            defaultValue={amount}
            maxLength={35}
            min={0}
            inputMode="decimal"
            type="text"
          />
          <div className="form-spacing" />
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
          <div className="form-spacing" />
          <div>
            <span className="input-title">Expiration</span>
            <ExpirationSelect onChange={onExpirationChange} value={expiration} />
          </div>
          <CheckBox
            checked={showAdvanced}
            setChecked={() => {
              setShowAdvanced(!showAdvanced)
              setFee(null)
              setSourceTag(null)
              setInvoiceID(null)
            }}
            name="advanced-check"
          >
            Advanced options
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
                setInnerValue={setInvoiceID}
                hideButton={true}
                defaultValue={invoiceID}
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
          {error && (
            <>
              <br />
              <div className="red center">{error}</div>
            </>
          )}
          <br />
          <div className="center">
            <button className="button-action" onClick={handleIssueCheck}>
              Issue Check
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
                    <strong>Max amount:</strong> {txResult.amount}
                  </p>
                  {txResult.destinationTag && (
                    <p>
                      <strong>{t('table.destination-tag')}:</strong> {txResult.destinationTag}
                    </p>
                  )}
                  {txResult.sourceTag && (
                    <p>
                      <strong>Source tag:</strong> {txResult.sourceTag}
                    </p>
                  )}
                  {txResult.fee && (
                    <p>
                      <strong>Fee:</strong> {txResult.fee}
                    </p>
                  )}
                  {txResult.sequence && (
                    <p>
                      <strong>{t('table.sequence')}:</strong> {txResult.sequence}
                    </p>
                  )}
                  {txResult.memo && (
                    <p>
                      <strong>{t('table.memo')}:</strong> {txResult.memo}
                    </p>
                  )}
                  {txResult.invoiceID && (
                    <p>
                      <strong>Invoice ID:</strong> {shortHash(txResult.invoiceID)}{' '}
                      <CopyButton text={txResult.invoiceID} />
                    </p>
                  )}
                  {txResult.expiration && (
                    <p>
                      <strong>Expiration:</strong> {timeFromNow(txResult.expiration, i18n, 'ripple')} (
                      {fullDateAndTime(txResult.expiration, 'ripple')})
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

export const getServerSideProps = async (context) => {
  const { locale, query } = context
  const { address, amount, destinationTag, expiration, invoiceId, memo, fee, sourceTag } = query || {}
  return {
    props: {
      ...(await serverSideTranslations(locale, ['common'])),
      isSsrMobile: getIsSsrMobile(context),
      addressQuery: address || '',
      amountQuery: amount || '',
      destinationTagQuery: destinationTag || '',
      expirationQuery: expiration || '',
      invoiceIdQuery: invoiceId || '',
      memoQuery: memo || '',
      feeQuery: fee || '',
      sourceTagQuery: sourceTag || ''
    }
  }
}

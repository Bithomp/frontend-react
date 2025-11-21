import { i18n, useTranslation } from 'next-i18next'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import SEO from '../../components/SEO'
import {
  isAddressValid,
  typeNumberOnly,
  nativeCurrency,
  isTagValid,
  encode,
  decode,
  addAndRemoveQueryParams
} from '../../utils'
import { multiply } from '../../utils/calc'
import { getIsSsrMobile } from '../../utils/mobile'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import AddressInput from '../../components/UI/AddressInput'
import FormInput from '../../components/UI/FormInput'
import CheckBox from '../../components/UI/CheckBox'
import NetworkTabs from '../../components/Tabs/NetworkTabs'
import CopyButton from '../../components/UI/CopyButton'
import { amountFormat, fullDateAndTime, timeFromNow, shortHash } from '../../utils/format'
import { LinkTx, LinkAccount } from '../../utils/links'
import { errorCodeDescription } from '../../utils/transaction'
import Link from 'next/link'
import DatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'
import axios from 'axios'

const RIPPLE_EPOCH_OFFSET = 946684800 // Seconds between 1970-01-01 and 2000-01-01

export default function CreateEscrow({
  setSignRequest,
  sessionToken,
  subscriptionExpired,
  openEmailLogin,
  addressQuery,
  amountQuery,
  destinationTagQuery,
  finishAfterQuery,
  cancelAfterQuery,
  conditionQuery,
  fulfillmentQuery,
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
  const [finishAfter, setFinishAfter] = useState(Number(finishAfterQuery) > 0 ? Number(finishAfterQuery) : null)
  const [cancelAfter, setCancelAfter] = useState(Number(cancelAfterQuery) > 0 ? Number(cancelAfterQuery) : null)
  const [condition, setCondition] = useState(conditionQuery || null)
  const [fulfillment, setFulfillment] = useState(fulfillmentQuery || null)
  const [sourceTag, setSourceTag] = useState(isTagValid(sourceTagQuery) ? sourceTagQuery : null)
  const [txResult, setTxResult] = useState(null)
  const [showAdvanced, setShowAdvanced] = useState(
    Number(feeQuery) > 0 || isTagValid(sourceTagQuery) || !!conditionQuery || !!fulfillmentQuery
  )
  const [agreeToSiteTerms, setAgreeToSiteTerms] = useState(false)
  const [memo, setMemo] = useState(memoQuery || null)
  const [fee, setFee] = useState(Number(feeQuery) > 0 && Number(feeQuery) <= 1 ? feeQuery : null)
  const [feeError, setFeeError] = useState(null)
  // Reflect filled parameters in URL similar to /send
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

    // Condition & fulfillment (hex strings)
    if (condition && condition.trim()) {
      queryAddList.push({ name: 'condition', value: condition.trim() })
    } else {
      queryRemoveList.push('condition')
    }
    if (fulfillment && fulfillment.trim()) {
      queryAddList.push({ name: 'fulfillment', value: fulfillment.trim() })
    } else {
      queryRemoveList.push('fulfillment')
    }

    // Date fields as relative days; keep as entered
    if (finishAfter) {
      queryAddList.push({ name: 'finishAfter', value: String(finishAfter) })
    } else {
      queryRemoveList.push('finishAfter')
    }
    if (cancelAfter) {
      queryAddList.push({ name: 'cancelAfter', value: String(cancelAfter) })
    } else {
      queryRemoveList.push('cancelAfter')
    }

    addAndRemoveQueryParams(router, queryAddList, queryRemoveList)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address, destinationTag, amount, memo, fee, sourceTag, finishAfter, cancelAfter, condition, fulfillment])

  const handleFeeChange = (value) => {
    setFee(value)
    if (Number(value) > 1) {
      setFeeError('Maximum fee is 1 ' + nativeCurrency)
    } else {
      setFeeError('')
    }
  }

  const handleCreateEscrow = async () => {
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

    if ((fee || sourceTag || condition) && (!sessionToken || subscriptionExpired)) {
      setError('Advanced options (fee, source tag, condition) are available only to logged-in Bithomp Pro subscribers.')
      return
    }

    if (sourceTag && !isTagValid(sourceTag)) {
      setError('Please enter a valid source tag.')
      return
    }

    // Validate field combinations according to XRPL documentation
    // Valid combinations: FinishAfter only, FinishAfter+CancelAfter, FinishAfter+Condition,
    // FinishAfter+Condition+CancelAfter, or Condition+CancelAfter
    if (!finishAfter && !condition) {
      setError('You must specify either a unlock time or a condition (or both).')
      return
    }

    if (condition && !finishAfter && !cancelAfter) {
      setError('A conditional escrow must have either a unlock time or an expiration time (or both).')
      return
    }

    if (condition && condition.length % 2 !== 0) {
      setError('Condition must be a valid hexadecimal string.')
      return
    }

    if (condition && !condition.match(/^[0-9A-Fa-f]*$/)) {
      setError('Condition must contain only hexadecimal characters.')
      return
    }

    const now = Math.floor(Date.now() / 1000)

    if (finishAfter && finishAfter <= now) {
      setError('Unlock time must be in the future.')
      return
    }

    if (cancelAfter && cancelAfter <= now) {
      setError('Cancel time must be in the future.')
      return
    }

    if (finishAfter && cancelAfter && cancelAfter <= finishAfter) {
      setError('Cancel time must be after unlock time.')
      return
    }

    if (!agreeToSiteTerms) {
      setError('Please agree to the Terms and conditions')
      return
    }

    try {
      let escrowCreate = {
        TransactionType: 'EscrowCreate',
        Destination: address,
        Amount: multiply(amount, 1000000)
      }

      if (destinationTag) {
        escrowCreate.DestinationTag = parseInt(destinationTag)
      }

      if (finishAfter) {
        escrowCreate.FinishAfter = finishAfter - RIPPLE_EPOCH_OFFSET
      }

      if (cancelAfter) {
        escrowCreate.CancelAfter = cancelAfter - RIPPLE_EPOCH_OFFSET
      }

      if (condition && condition.trim()) {
        escrowCreate.Condition = condition.trim().toUpperCase()
      }

      if (sourceTag) {
        escrowCreate.SourceTag = parseInt(sourceTag)
      }

      if (memo) {
        escrowCreate.Memos = [{ Memo: { MemoData: encode(memo) } }]
      }

      if (fee) {
        escrowCreate.Fee = multiply(fee, 1000000)
      }

      setSignRequest({
        request: escrowCreate,
        callback: (result) => {
          const status = result.meta?.TransactionResult
          if (status === 'tesSUCCESS') {
            setTxResult({
              status: status,
              date: result.date,
              destination: result.Destination,
              amount: amountFormat(result.Amount),
              destinationTag: result.DestinationTag,
              sourceTag: result.SourceTag,
              fee: amountFormat(result.Fee),
              sequence: result.Sequence,
              memo: result.Memos?.[0]?.Memo?.MemoData ? decode(result.Memos[0].Memo.MemoData) : undefined,
              hash: result.hash,
              finishAfter: result.FinishAfter,
              cancelAfter: result.CancelAfter,
              condition: result.Condition,
              ledgerIndex: result.ledger_index,
              balanceChanges: result.balanceChanges
            })
          } else {
            setError(errorCodeDescription(status))
          }
        }
      })
    } catch (err) {
      setError(err.message)
    }
  }

  const handleGenerateCondition = async () => {
    setError('')
    try {
      const response = await axios('/v2/escrows/generate-condition')
      const { condition: generatedCondition, fulfillment: generatedFulfillment } = response.data
      setCondition(generatedCondition)
      setFulfillment(generatedFulfillment)
    } catch (err) {
      setError('Failed to generate condition')
    }
  }

  return (
    <>
      <SEO title="Create Escrow" description="Create an Escrow transaction" />
      <div className="content-text content-center">
        <h1 className="center">Create Escrow</h1>
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

          <span className="input-title">
            Unlock after <span className="grey">(when funds can be released)</span>
          </span>
          <DatePicker
            selected={finishAfter ? new Date(finishAfter * 1000) : null}
            onChange={(date) => setFinishAfter(date ? Math.floor(date.getTime() / 1000) : null)}
            selectsStart
            showTimeInput
            timeInputLabel={t('table.time')}
            dateFormat="yyyy/MM/dd HH:mm:ss"
            className="dateAndTimeRange"
            minDate={new Date()}
            showMonthDropdown
            showYearDropdown
          />

          <span className="input-title">
            Cancel after <span className="grey">(when escrow expires)</span>
          </span>
          <DatePicker
            selected={cancelAfter ? new Date(cancelAfter * 1000) : null}
            onChange={(date) => setCancelAfter(date ? Math.floor(date.getTime() / 1000) : null)}
            selectsStart
            showTimeInput
            timeInputLabel={t('table.time')}
            dateFormat="yyyy/MM/dd HH:mm:ss"
            className="dateAndTimeRange"
            minDate={new Date()}
            showMonthDropdown
            showYearDropdown
          />

          <CheckBox
            checked={showAdvanced}
            setChecked={() => {
              setShowAdvanced(!showAdvanced)
              if (!showAdvanced) {
                setCondition(null)
                setSourceTag(null)
                setFulfillment(null)
                setFee(null)
              }
            }}
            name="advanced-escrow"
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
                    <Link href="/admin/subscriptions"> Renew your subscription</Link>
                  </span>
                </>
              )
            )}
          </CheckBox>

          {showAdvanced && (
            <>
              <br />
              <FormInput
                title="Condition"
                placeholder="PREIMAGE-SHA-256"
                setInnerValue={setCondition}
                hideButton={true}
                defaultValue={condition}
                type="text"
                disabled={!sessionToken || subscriptionExpired}
              />
              <br />
              <button
                className="button-action"
                onClick={handleGenerateCondition}
                disabled={!sessionToken || subscriptionExpired}
              >
                Generate a random Condition
              </button>
              <br />
              <br />
              {fulfillment && (
                <>
                  <div>
                    Fulfillment:
                    <div className="form-spacing" />
                    <span className="brake bold">{fulfillment}</span> <CopyButton text={fulfillment} />
                  </div>
                  <br />
                  <div className="red bold">
                    We do not save/keep the Fulfillment. Please copy and save it securely.
                    <br />
                    <br />
                    <b>If you lose it, you won't be able to relase the funds.</b>
                  </div>
                  <br />
                </>
              )}
              <FormInput
                title="Source Tag"
                placeholder="Enter source tag"
                setInnerValue={setSourceTag}
                hideButton={true}
                onKeyPress={typeNumberOnly}
                defaultValue={sourceTag}
                disabled={!sessionToken || subscriptionExpired}
              />
              <div className="form-spacing" />
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
            <button className="button-action" onClick={handleCreateEscrow}>
              Create Escrow
            </button>
          </div>

          {txResult?.status === 'tesSUCCESS' && (
            <>
              <br />
              <div>
                <h3 className="center">Escrow Created Successfully</h3>
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
                  {txResult.finishAfter && (
                    <p>
                      <strong>Unlock:</strong> {timeFromNow(txResult.finishAfter, i18n, 'ripple')} (
                      {fullDateAndTime(txResult.finishAfter, 'ripple')})
                    </p>
                  )}
                  {txResult.cancelAfter && (
                    <p>
                      <strong>Cancel After:</strong> {timeFromNow(txResult.cancelAfter, i18n, 'ripple')} (
                      {fullDateAndTime(txResult.cancelAfter, 'ripple')})
                    </p>
                  )}
                  {txResult.condition && (
                    <p>
                      <strong>Condition:</strong> {shortHash(txResult.condition)}{' '}
                      <CopyButton text={txResult.condition} />
                    </p>
                  )}
                  {txResult.fulfillment && (
                    <p>
                      <strong>Fulfillment:</strong> {shortHash(txResult.fulfillment)}{' '}
                      <CopyButton text={txResult.fulfillment} />
                    </p>
                  )}
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

export const getServerSideProps = async (context) => {
  const { locale, query } = context
  const { address, amount, destinationTag, finishAfter, cancelAfter, condition, fulfillment, memo, fee, sourceTag } =
    query || {}
  return {
    props: {
      ...(await serverSideTranslations(locale, ['common'])),
      isSsrMobile: getIsSsrMobile(context),
      addressQuery: address || '',
      amountQuery: amount || '',
      destinationTagQuery: destinationTag || '',
      finishAfterQuery: finishAfter || '',
      cancelAfterQuery: cancelAfter || '',
      conditionQuery: condition || '',
      fulfillmentQuery: fulfillment || '',
      memoQuery: memo || '',
      feeQuery: fee || '',
      sourceTagQuery: sourceTag || ''
    }
  }
}

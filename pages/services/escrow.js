import { i18n, Trans, useTranslation } from 'next-i18next'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import SEO from '../../components/SEO'
import {
  isAddressValid,
  typeNumberOnly,
  nativeCurrency,
  isTagValid,
  encode,
  decode,
  addAndRemoveQueryParams,
  explorerName,
  isNativeCurrency
} from '../../utils'
import { multiply } from '../../utils/calc'
import { getIsSsrMobile } from '../../utils/mobile'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import AddressInput from '../../components/UI/AddressInput'
import FormInput from '../../components/UI/FormInput'
import CheckBox from '../../components/UI/CheckBox'
import NetworkTabs from '../../components/Tabs/NetworkTabs'
import ServicesTabs from '../../components/Tabs/ServicesTabs'
import CopyButton from '../../components/UI/CopyButton'
import TokenSelector from '../../components/UI/TokenSelector'
import {
  amountFormat,
  fullDateAndTime,
  timeFromNow,
  shortHash,
  formatXDigits,
  transferRateToPercent
} from '../../utils/format'
import { LinkTx, LinkAccount } from '../../utils/links'
import { errorCodeDescription } from '../../utils/transaction'
import Link from 'next/link'
import DatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'
import axios from 'axios'

const RIPPLE_EPOCH_OFFSET = 946684800 // Seconds between 1970-01-01 and 2000-01-01

export default function CreateEscrow({
  account,
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
  sourceTagQuery,
  currencyQuery,
  currencyIssuerQuery
}) {
  const { t } = useTranslation(['common', 'services'])
  const ts = (key, options) => t(key, { ns: 'services', ...options })
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
  const [selectedToken, setSelectedToken] = useState({ currency: currencyQuery, issuer: currencyIssuerQuery })

  const onTokenChange = (token) => {
    setSelectedToken(token)
  }

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
      setFeeError(ts('shared.errors.max-fee', { nativeCurrency }))
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
      setError(ts('shared.errors.valid-amount'))
      return
    }

    if (destinationTag && !isTagValid(destinationTag)) {
      setError(ts('shared.errors.valid-destination-tag'))
      return
    }

    if ((fee || sourceTag || condition) && (!sessionToken || subscriptionExpired)) {
      setError(ts('escrow.errors.advanced-pro'))
      return
    }

    if (sourceTag && !isTagValid(sourceTag)) {
      setError(ts('shared.errors.valid-source-tag'))
      return
    }

    // Validate field combinations according to XRPL documentation
    // Valid combinations: FinishAfter only, FinishAfter+CancelAfter, FinishAfter+Condition,
    // FinishAfter+Condition+CancelAfter, or Condition+CancelAfter
    if (!finishAfter && !condition) {
      setError(ts('escrow.errors.unlock-or-condition'))
      return
    }

    if (condition && !finishAfter && !cancelAfter) {
      setError(ts('escrow.errors.conditional-time'))
      return
    }

    if (condition && condition.length % 2 !== 0) {
      setError(ts('escrow.errors.condition-hex'))
      return
    }

    if (condition && !condition.match(/^[0-9A-Fa-f]*$/)) {
      setError(ts('escrow.errors.condition-characters'))
      return
    }

    const now = Math.floor(Date.now() / 1000)

    if (finishAfter && finishAfter <= now) {
      setError(ts('escrow.errors.unlock-future'))
      return
    }

    if (cancelAfter && cancelAfter <= now) {
      setError(ts('escrow.errors.cancel-future'))
      return
    }

    if (finishAfter && cancelAfter && cancelAfter <= finishAfter) {
      setError(ts('escrow.errors.cancel-after-unlock'))
      return
    }

    if (!agreeToSiteTerms) {
      setError(ts('shared.errors.terms'))
      return
    }

    try {
      let amountData = null

      if (isNativeCurrency(selectedToken)) {
        amountData = multiply(amount, 1000000) // drops
      } else {
        // IMPORTANT: Escrow for IOU requires a trustline at destination (no partial payment escape hatch like Payment)
        if (!selectedToken?.issuer || !selectedToken?.currency) {
          setError(ts('shared.errors.valid-token'))
          return
        }
        amountData = {
          currency: selectedToken.currency,
          issuer: selectedToken.issuer,
          value: String(amount)
        }
      }

      let escrowCreate = {
        TransactionType: 'EscrowCreate',
        Destination: address,
        Amount: amountData
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
              ledgerIndex: result.ledger_index
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
      setError(ts('escrow.errors.generate-condition'))
    }
  }

  return (
    <>
      <SEO title={ts('escrow.title')} description={ts('escrow.description')} />
      <div className="content-text content-center">
        <ServicesTabs category="payments" tab="escrow" />
        <h1 className="center">{ts('escrow.title')}</h1>
        <p>
          {ts('escrow.intro', { nativeCurrency })}{' '}
          {ts('escrow.view-guide')}{' '}
          <Link href="/learn/create-escrow" target="_blank" rel="noreferrer">
            {ts('escrow.guide-link', { explorerName })}
          </Link>
          .
        </p>
        <NetworkTabs />

        <div>
          <AddressInput
            title={t('table.destination')}
            placeholder={ts('shared.destination-address')}
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
          <div className="flex flex-col gap-x-4 sm:flex-row">
            <div className="flex-1">
              <FormInput
                title={t('table.amount')}
                placeholder={ts('shared.enter-amount')}
                setInnerValue={setAmount}
                hideButton={true}
                onKeyPress={typeNumberOnly}
                defaultValue={amount}
                maxLength={35}
                min={0}
                inputMode="decimal"
                type="text"
                textUnder={
                  selectedToken?.transferFee && amount && !isNaN(parseFloat(amount)) && parseFloat(amount) > 0 ? (
                    <span className="grey">
                      {ts('shared.to-receive', { amount: formatXDigits(parseFloat(amount) / selectedToken.transferFee, 11) })}
                    </span>
                  ) : null
                }
              />
            </div>
            <div className="flex-1" style={{ marginBottom: 20 }}>
              <span className="input-title">{ts('shared.currency')}</span>
              <TokenSelector
                value={selectedToken}
                onChange={onTokenChange}
                destinationAddress={address}
                currencyQueryName="currency"
                senderAddress={account?.address || null}
                canLock={true}
              />
              {selectedToken.transferFee ? (
                <div style={{ marginTop: 8 }}>
                  <span className="orange">{ts('shared.issuer-fee', { fee: transferRateToPercent(selectedToken.transferFee) })}</span>
                </div>
              ) : null}
            </div>
          </div>
          <FormInput
            title={
              <>
                {t('table.memo')} (<span className="orange">{ts('shared.it-will-be-public')}</span>)
              </>
            }
            placeholder={ts('shared.enter-memo-optional')}
            setInnerValue={setMemo}
            hideButton={true}
            defaultValue={memo}
            maxLength={100}
            type="text"
          />
          <div className="form-spacing" />

          <span className="input-title">
            <Trans i18nKey="escrow.unlock-after" ns="services" components={[<span key="0" className="grey" />]} />
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
            <Trans i18nKey="escrow.cancel-after" ns="services" components={[<span key="0" className="grey" />]} />
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

          <br />

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
            {ts('escrow.advanced-options')}
            {!sessionToken ? (
              <>
                {' '}
                  <span className="orange">
                  (
                  <Trans
                    i18nKey="shared.advanced-pro"
                    ns="services"
                    components={[<span key="0" className="link" onClick={() => openEmailLogin()} />]}
                  />
                  )
                </span>
              </>
            ) : (
              subscriptionExpired && (
                <>
                  {' '}
                  <span className="orange">
                    <Trans
                      i18nKey="shared.subscription-expired"
                      ns="services"
                      components={[<Link key="0" href="/admin#bithomp-pro-subscription" />]}
                    />
                  </span>
                </>
              )
            )}
          </CheckBox>

          {showAdvanced && (
            <>
              <br />
              <FormInput
                title={ts('escrow.condition')}
                placeholder={ts('escrow.condition-placeholder')}
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
                {ts('escrow.generate-condition')}
              </button>
              <br />
              <br />
              {fulfillment && (
                <>
                  <div>
                    {ts('escrow.fulfillment')}:
                    <div className="form-spacing" />
                    <span className="brake bold">{fulfillment}</span> <CopyButton text={fulfillment} />
                  </div>
                  <br />
                  <div className="red bold">
                    {ts('escrow.fulfillment-warning')}
                    <br />
                    <br />
                    <b>{ts('escrow.condition-warning')}</b>
                  </div>
                  <br />
                </>
              )}
              <FormInput
                title={ts('shared.source-tag')}
                placeholder={ts('shared.enter-source-tag')}
                setInnerValue={setSourceTag}
                hideButton={true}
                onKeyPress={typeNumberOnly}
                defaultValue={sourceTag}
                disabled={!sessionToken || subscriptionExpired}
              />
              <div className="form-spacing" />
              <FormInput
                title={ts('shared.fee')}
                placeholder={ts('shared.enter-fee', { nativeCurrency })}
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
            <Trans
              i18nKey="shared.agree-terms"
              ns="services"
              components={[<Link key="0" href="/terms-and-conditions" target="_blank" />]}
            />
          </CheckBox>
          {error && (
            <>
              <br />
              <div className="red center">{error}</div>
            </>
          )}
          <br />
          <div className="center service-form-actions">
            <button className="button-action" onClick={handleCreateEscrow}>
              {ts('escrow.title')}
            </button>
          </div>

          {txResult?.status === 'tesSUCCESS' && (
            <>
              <br />
              <div>
                <h3 className="center">{ts('escrow.created')}</h3>
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
                      <strong>{ts('shared.source-tag-result')}:</strong> {txResult.sourceTag}
                    </p>
                  )}
                  <p>
                    <strong>{ts('shared.fee')}:</strong> {txResult.fee}
                  </p>
                  <p>
                    <strong>{t('table.sequence')}:</strong> #{txResult.sequence}
                  </p>
                  {txResult.finishAfter && (
                    <p>
                      <strong>{ts('escrow.unlock')}:</strong> {timeFromNow(txResult.finishAfter, i18n, 'ripple')} (
                      {fullDateAndTime(txResult.finishAfter, 'ripple')})
                    </p>
                  )}
                  {txResult.cancelAfter && (
                    <p>
                      <strong>{ts('escrow.cancel-after-result')}:</strong> {timeFromNow(txResult.cancelAfter, i18n, 'ripple')} (
                      {fullDateAndTime(txResult.cancelAfter, 'ripple')})
                    </p>
                  )}
                  {txResult.condition && (
                    <p>
                      <strong>{ts('escrow.condition')}:</strong> {shortHash(txResult.condition)}{' '}
                      <CopyButton text={txResult.condition} />
                    </p>
                  )}
                  {txResult.fulfillment && (
                    <p>
                      <strong>{ts('escrow.fulfillment')}:</strong> {shortHash(txResult.fulfillment)}{' '}
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
  const {
    address,
    amount,
    destinationTag,
    finishAfter,
    cancelAfter,
    condition,
    fulfillment,
    memo,
    fee,
    sourceTag,
    currency,
    currencyIssuer
  } = query || {}
  return {
    props: {
      ...(await serverSideTranslations(locale, ['common', 'services'])),
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
      sourceTagQuery: sourceTag || '',
      currencyQuery: currency || nativeCurrency,
      currencyIssuerQuery: currencyIssuer || ''
    }
  }
}

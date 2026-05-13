import { i18n, Trans, useTranslation } from 'next-i18next'
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
  addAndRemoveQueryParams,
  explorerName
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
import ServicesTabs from '../../components/Tabs/ServicesTabs'
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
  const { t } = useTranslation(['common', 'services'])
  const ts = (key, options) => t(key, { ns: 'services', ...options })
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
      setFeeError(ts('shared.errors.max-fee', { nativeCurrency }))
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
      setError(ts('shared.errors.valid-amount'))
      return
    }

    if (destinationTag && !isTagValid(destinationTag)) {
      setError(ts('shared.errors.valid-destination-tag'))
      return
    }

    if ((fee || sourceTag || invoiceID) && (!sessionToken || subscriptionExpired)) {
      setError(
        ts('shared.errors.advanced-pro')
      )
      return
    }

    if (sourceTag && !isTagValid(sourceTag)) {
      setError(ts('shared.errors.valid-source-tag'))
      return
    }

    if (invoiceID && !isIdValid(invoiceID)) {
      setError(ts('check.errors.invoice-id'))
      return
    }

    if (!agreeToSiteTerms) {
      setError(ts('shared.errors.terms'))
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
              ledgerIndex: result.ledger_index
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
      <SEO title={ts('check.title')} description={ts('check.description')} />
      <div className="content-text content-center">
        <ServicesTabs category="payments" tab="check" />
        <h1 className="center">{ts('check.title')}</h1>
        <p className="center">
          {ts('check.intro')}{' '}
          <Link href="/learn/checks" target="_blank" rel="noreferrer">
            {ts('check.learn', { explorerName })}
          </Link>
        </p>
        <NetworkTabs />
        <div>
          <AddressInput
            title={t('table.destination')}
            placeholder={ts('shared.destination-address')}
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
            placeholder={ts('shared.enter-amount')}
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
          <div>
            <span className="input-title">{ts('check.expiration')}</span>
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
            {ts('send.advanced-options')}
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
              <div className="form-spacing" />
              <FormInput
                title={ts('shared.source-tag')}
                placeholder={ts('shared.enter-source-tag')}
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
                title={ts('shared.invoice-id')}
                placeholder={ts('shared.enter-invoice-id')}
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
            <button className="button-action" onClick={handleIssueCheck}>
              {ts('check.title')}
            </button>
          </div>
          {txResult?.status === 'tesSUCCESS' && (
            <>
              <br />
              <div>
                <h3 className="center">{ts('shared.transaction-successful')}</h3>
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
                    <strong>{ts('check.max-amount')}:</strong> {txResult.amount}
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
                  {txResult.fee && (
                    <p>
                      <strong>{ts('shared.fee')}:</strong> {txResult.fee}
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
                      <strong>{ts('shared.invoice-id')}:</strong> {shortHash(txResult.invoiceID)}{' '}
                      <CopyButton text={txResult.invoiceID} />
                    </p>
                  )}
                  {txResult.expiration && (
                    <p>
                      <strong>{ts('check.expiration')}:</strong> {timeFromNow(txResult.expiration, i18n, 'ripple')} (
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
      ...(await serverSideTranslations(locale, ['common', 'services'])),
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

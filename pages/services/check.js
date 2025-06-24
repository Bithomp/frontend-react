import { i18n, useTranslation } from 'next-i18next'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import SEO from '../../components/SEO'
import {
  useWidth,
  explorerName,
  isAddressValid,
  typeNumberOnly,
  nativeCurrency,
  isTagValid,
  isIdValid,
  decode
} from '../../utils'
import { multiply } from '../../utils/calc'
import { getIsSsrMobile } from '../../utils/mobile'
import { useState } from 'react'
import AddressInput from '../../components/UI/AddressInput'
import FormInput from '../../components/UI/FormInput'
import CheckBox from '../../components/UI/CheckBox'
import ExpirationSelect from '../../components/UI/ExpirationSelect'
import NetworkTabs from '../../components/Tabs/NetworkTabs'
import CopyButton from '../../components/UI/CopyButton'
import { amountFormat, fullDateAndTime, timeFromNow, shortHash } from '../../utils/format'
import { LinkTx, LinkAccount } from '../../utils/links'
import Link from 'next/link'

export default function IssueCheck({ setSignRequest }) {
  const { t } = useTranslation()
  const width = useWidth()
  const [error, setError] = useState('')
  const [address, setAddress] = useState(null)
  const [destinationTag, setDestinationTag] = useState(null)
  const [amount, setAmount] = useState(null)
  const [expiration, setExpiration] = useState(null)
  const [invoiceID, setInvoiceID] = useState(null)
  const [txResult, setTxResult] = useState(null)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [agreeToSiteTerms, setAgreeToSiteTerms] = useState(false)

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

      setSignRequest({
        request: checkCreate,
        callback: (result) => {
          setTxResult({
            status: result.meta?.TransactionResult,
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
        }
      })
    } catch (error) {
      setError(error.message)
    }
  }

  return (
    <>
      <SEO title="Issue Check" description={'Create a deferred payment check on the ' + explorerName} />
      <div className="content-text content-center">
        <h1 className="center">Issue Check</h1>
        <NetworkTabs />
        <div>
          <AddressInput
            title={t('table.destination')}
            placeholder="Destination address"
            name="destination"
            hideButton={true}
            setValue={setAddress}
            rawData={isAddressValid(address) ? { address } : {}}
            type="address"
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
          {width > 1100 && <br />}
          <div className="form-input">
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
          {width > 1100 && <br />}
          <div>
            <span className="input-title">Expiration</span>
            <ExpirationSelect onChange={onExpirationChange} />
          </div>
          <CheckBox
            checked={showAdvanced}
            setChecked={() => {
              setShowAdvanced(!showAdvanced)
              setInvoiceID(null)
            }}
            name="advanced-check"
          >
            Advanced Options
          </CheckBox>
          {showAdvanced && (
            <>
              <br />
              <div className="form-input">
                <span className="input-title">Invoice ID</span>
                <input
                  placeholder="Enter invoice ID"
                  onChange={(e) => setInvoiceID(e.target.value)}
                  className="input-text"
                  spellCheck="false"
                  maxLength="64"
                  type="text"
                  defaultValue={invoiceID}
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
  const { locale } = context
  return {
    props: {
      ...(await serverSideTranslations(locale, ['common'])),
      isSsrMobile: getIsSsrMobile(context)
    }
  }
}

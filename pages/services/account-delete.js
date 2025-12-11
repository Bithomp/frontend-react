import { i18n, useTranslation } from 'next-i18next'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import SEO from '../../components/SEO'
import { addAndRemoveQueryParams, explorerName } from '../../utils'
import { getIsSsrMobile } from '../../utils/mobile'
import CheckBox from '../../components/UI/CheckBox'
import AddressInput from '../../components/UI/AddressInput'
import FormInput from '../../components/UI/FormInput'
import CopyButton from '../../components/UI/CopyButton'
import { LinkTx, LinkAccount } from '../../utils/links'
import { multiply } from '../../utils/calc'
import { typeNumberOnly, isAddressValid, isTagValid, nativeCurrency, encode, decode } from '../../utils'
import { fullDateAndTime, timeFromNow, amountFormat } from '../../utils/format'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import axios from 'axios'
import { errorCodeDescription } from '../../utils/transaction'

export const getServerSideProps = async (context) => {
  const { query, locale } = context
  const { address, destinationTag, memo, fee, sourceTag } = query

  return {
    props: {
      addressQuery: address || '',
      destinationTagQuery: destinationTag || '',
      memoQuery: memo || '',
      feeQuery: fee || '',
      sourceTagQuery: sourceTag || '',
      isSsrMobile: getIsSsrMobile(context),
      ...(await serverSideTranslations(locale, ['common']))
    }
  }
}

export default function AccountDelete({
  account,
  setSignRequest,
  addressQuery,
  destinationTagQuery,
  memoQuery,
  feeQuery,
  sourceTagQuery,
  sessionToken,
  subscriptionExpired,
  openEmailLogin,
  signOut
}) {
  const { t } = useTranslation()
  const router = useRouter()

  const [accountData, setAccountData] = useState(null)
  const [address, setAddress] = useState(isAddressValid(addressQuery) ? addressQuery : null)
  const [destinationTag, setDestinationTag] = useState(isTagValid(destinationTagQuery) ? destinationTagQuery : null)
  const [memo, setMemo] = useState(memoQuery)
  const [showAdvanced, setShowAdvanced] = useState(Number(feeQuery) > 0 || isTagValid(sourceTagQuery))
  const [fee, setFee] = useState(
    Number(feeQuery) > 0 && Number(feeQuery) <= 1 && sessionToken && !subscriptionExpired ? feeQuery : null
  )
  const [feeError, setFeeError] = useState('')
  const [sourceTag, setSourceTag] = useState(
    isTagValid(sourceTagQuery) && sessionToken && !subscriptionExpired ? sourceTagQuery : null
  )
  const [errorMessage, setErrorMessage] = useState('')
  const [txResult, setTxResult] = useState(null)
  const [agreeToSiteTerms, setAgreeToSiteTerms] = useState(false)
  const [isNonActive, setIsNonActive] = useState(false)
  const [agreeToSendToFlagged, setAgreeToSendToFlagged] = useState(false)
  const [requireDestTag, setRequireDestTag] = useState(false)
  const [requiredFee, setRequiredFee] = useState('200000') // default fee if network info is not loaded
  const [destinationStatus, setDestinationStatus] = useState(0)

  // Fetch network info for reserve amounts
  useEffect(() => {
    const fetchNetworkInfo = async () => {
      try {
        const response = await axios('/v2/server')
        if (response?.data?.reserveIncrement) {
          setRequiredFee(response.data.reserveIncrement)
        }
      } catch (error) {
        console.error('Error fetching network info:', error)
      }
    }

    fetchNetworkInfo()
  }, [])

  useEffect(() => {
    const fetchAccountData = async () => {
      try {
        const response = await axios(`/v2/address/${account.address}?ledgerInfo=true`)
        setAccountData(response?.data)
      } catch (error) {
        setErrorMessage('Error fetching account data')
      }
    }

    if (account?.address) {
      fetchAccountData()
    } else {
      setAccountData(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [account])

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

    if (memo) {
      queryAddList.push({ name: 'memo', value: memo })
    } else {
      queryRemoveList.push('memo')
    }

    if (fee && Number(fee) > requiredFee / 1000000 && Number(fee) <= 1) {
      queryAddList.push({ name: 'fee', value: fee })
    } else {
      queryRemoveList.push('fee')
    }

    if (isTagValid(sourceTag)) {
      queryAddList.push({ name: 'sourceTag', value: sourceTag })
    } else {
      queryRemoveList.push('sourceTag')
    }

    addAndRemoveQueryParams(router, queryAddList, queryRemoveList)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address, destinationTag, memo, fee, sourceTag, requiredFee])

  // Fetch destination account data when address changes
  useEffect(() => {
    const fetchDestinationAccountData = async () => {
      if (!address || !isAddressValid(address)) {
        setDestinationStatus(0)
        setAgreeToSendToFlagged(false)
        setRequireDestTag(false)
        setIsNonActive(false)
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
        } else {
          setDestinationStatus(0)
          setAgreeToSendToFlagged(false)
          setIsNonActive(false)
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
        setDestinationStatus(0)
        setAgreeToSendToFlagged(false)
        setRequireDestTag(false)
        setIsNonActive(false)
      }
    }

    fetchDestinationAccountData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address])

  const handleFeeChange = (value) => {
    setFee(value)

    if (Number(value) > 1) {
      setFeeError('Maximum fee is 1 ' + nativeCurrency)
    } else if (Number(value) < requiredFee / 1000000) {
      setFeeError('Minimum fee is ' + requiredFee / 1000000 + ' ' + nativeCurrency)
    } else {
      setFeeError('')
    }
  }

  const handleSend = async () => {
    setErrorMessage('')
    setTxResult(null)

    if (!address || !isAddressValid(address)) {
      setErrorMessage('Please enter a valid Destination address.')
      return
    }

    // Check if destination requires a tag but none is provided
    if (requireDestTag && !destinationTag) {
      setErrorMessage('This destination account requires a destination tag. Please enter a destination tag.')
      return
    }

    // Check if advanced options are being used without proper subscription
    if ((fee || sourceTag || destinationTag) && (!sessionToken || subscriptionExpired)) {
      setErrorMessage(
        'Advanced options (fee, source tag, invoice ID) are available only to logged-in Bithomp Pro subscribers.'
      )
      return
    }

    if (fee && Number(fee) < requiredFee / 1000000) {
      setErrorMessage('Minimum fee is ' + requiredFee / 1000000 + ' ' + nativeCurrency + ' ' + fee + ' ' + requiredFee)
      return
    }

    if (Number(fee) > 1) {
      setErrorMessage('Maximum fee is 1 ' + nativeCurrency)
      return
    }

    if (destinationTag && !isTagValid(destinationTag)) {
      setErrorMessage('Please enter a valid destination tag.')
      return
    }

    if (sourceTag && !isTagValid(sourceTag)) {
      setErrorMessage('Please enter a valid source tag.')
      return
    }

    if (!agreeToSiteTerms) {
      setErrorMessage('Please agree to the Terms and conditions')
      return
    }

    if (isNonActive) {
      setErrorMessage('You can send funds only to already activated account.')
      return
    }

    if (destinationStatus === 3) {
      setErrorMessage('This account has been flagged as FRAUD. Sending is not allowed.')
      return
    }

    try {
      let tx = {}

      tx = {
        TransactionType: 'AccountDelete',
        Destination: address
      }

      if (account?.address) {
        tx.Account = account.address
      }

      if (destinationTag) {
        tx.DestinationTag = parseInt(destinationTag)
      }

      if (memo) {
        tx.Memos = [
          {
            Memo: {
              MemoData: encode(memo)
            }
          }
        ]
      }

      if (fee && Number(fee) > requiredFee / 1000000) {
        tx.Fee = multiply(fee, 1000000)
      } else {
        tx.Fee = requiredFee
      }

      if (sourceTag) {
        tx.SourceTag = parseInt(sourceTag)
      }

      setSignRequest({
        request: tx,
        callback: (result) => {
          const status = result.meta?.TransactionResult
          if (status !== 'tesSUCCESS') {
            setError(errorCodeDescription(status))
          } else {
            setTxResult({
              status,
              date: result.date,
              destination: result.Destination,
              destinationTag: result.DestinationTag,
              sourceTag: result.SourceTag,
              fee: amountFormat(result.Fee),
              sequence: result.Sequence,
              memo: result.Memos?.[0]?.Memo?.MemoData ? decode(result.Memos[0].Memo.MemoData) : undefined,
              hash: result.hash,
              validated: result.validated,
              ledgerIndex: result.ledger_index,
              transactionType: 'AccountDelete'
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
      <SEO title="Account delete" description="Delete your account by sending all funds to another account." />
      <div className="content-text content-center">
        <h1 className="center red">Account delete</h1>

        {!txResult && accountData?.ledgerInfo?.deleted ? (
          <>
            The account <span className="bold">{account?.address}</span> has already been deleted on the {explorerName}{' '}
            Ledger.
            <br />
            <br />
            <center>
              <button onClick={signOut} className="button-action">
                {t('signin.signout')}
              </button>
            </center>
          </>
        ) : (
          <>
            <p>
              An Account delete transaction permanently deletes an account and any objects it owns on the {explorerName}{' '}
              Ledger, if possible, and transfers the account’s remaining {nativeCurrency} to a specified destination
              account.
            </p>
            <p>
              The fee to execute this transaction is{' '}
              <span className="bold">{amountFormat(requiredFee, { noSpace: true })}</span>. This is a protocol
              requirement of the {explorerName} Ledger, and the {amountFormat(requiredFee, { noSpace: true })} is
              permanently burned as part of the process.
            </p>

            <p className="red bold">
              ⚠️ Attention: Do NOT use an exchange or custodial wallet as the destination address. You may permanently
              lose your funds.
            </p>

            <div>
              {account?.address && (
                <>
                  <FormInput
                    defaultValue={account.address}
                    hideButton={true}
                    title={
                      <>
                        <span className="red">Deleting account</span> [
                        <span onClick={signOut} className="link bold">
                          {t('signin.signout')}
                        </span>
                        ]
                      </>
                    }
                    disabled={true}
                  />
                  <br />
                </>
              )}

              <AddressInput
                title={t('table.destination')}
                placeholder="Destination address"
                name="destination"
                hideButton={true}
                setValue={(value) => {
                  setAddress(value)
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
                    <strong>⚠️ Non-activated account</strong>
                    <br />
                    You can not send funds to a non-activated account.
                  </div>
                </div>
              )}
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
                }}
                name="advanced-options"
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
                    title={
                      <>
                        {t('table.destination-tag')}
                        <br />
                        <span className="red">
                          I acknowledge that the destination account MUST NOT be an exchange or custodial wallet, as
                          this may lead to a loss of funds.
                        </span>
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
                    disabled={!sessionToken || subscriptionExpired}
                  />
                  <br />
                  <FormInput
                    title={'Fee in ' + nativeCurrency}
                    placeholder={'Enter fee in ' + nativeCurrency}
                    setInnerValue={handleFeeChange}
                    hideButton={true}
                    onKeyPress={typeNumberOnly}
                    defaultValue={requiredFee / 1000000}
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
                    title="Source tag"
                    placeholder="Enter source tag"
                    setInnerValue={setSourceTag}
                    hideButton={true}
                    onKeyPress={typeNumberOnly}
                    defaultValue={sourceTag}
                    maxLength={35}
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
              {(destinationStatus === 1 || destinationStatus === 2 || isNonActive) && (
                <div className="orange">
                  <CheckBox checked={agreeToSendToFlagged} setChecked={setAgreeToSendToFlagged} name="agree-to-flagged">
                    I understand the risks and I want to proceed with sending funds to this flagged account
                  </CheckBox>
                </div>
              )}

              <br />
              {errorMessage && (
                <>
                  <div className="red center">{errorMessage}</div>
                  <br />
                </>
              )}
              <div className="center">
                <button
                  className="button-action"
                  onClick={handleSend}
                  disabled={destinationStatus === 3}
                  style={{ backgroundColor: '#ff4d4d' }}
                >
                  Delete my account
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
          </>
        )}
      </div>
    </>
  )
}

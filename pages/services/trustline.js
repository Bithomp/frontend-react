import { Trans, useTranslation } from 'next-i18next'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import SEO from '../../components/SEO'
import {
  explorerName,
  isAddressValid,
  typeNumberOnly,
  xahauNetwork,
  encodeCurrencyCode,
  validateCurrencyCode,
  nativeCurrency,
  server
} from '../../utils'
import { getIsSsrMobile } from '../../utils/mobile'
import { useState, useEffect } from 'react'
import AddressInput from '../../components/UI/AddressInput'
import FormInput from '../../components/UI/FormInput'
import CheckBox from '../../components/UI/CheckBox'
import RadioOptions from '../../components/UI/RadioOptions'
import CopyButton from '../../components/UI/CopyButton'
import TokenSelector from '../../components/UI/TokenSelector'
import { LinkTx } from '../../utils/links'
import Link from 'next/link'
import { multiply } from '../../utils/calc'
import axios from 'axios'
import { errorCodeDescription } from '../../utils/transaction'
import { amountFormat, niceCurrency } from '../../utils/format'
import { addAndRemoveQueryParams } from '../../utils'
import { useRouter } from 'next/router'
import ServicesTabs from '../../components/Tabs/ServicesTabs'

export const getServerSideProps = async (context) => {
  const { query, locale } = context
  const {
    currency,
    currencyIssuer,
    mode,
    issuer,
    limit,
    qualityIn,
    qualityOut,
    freeze,
    noRipple,
    authorized,
    deepFreeze
  } = query
  return {
    props: {
      currencyQuery: currency || '',
      currencyIssuerQuery: currencyIssuer || '',
      modeQuery: mode || 'simple',
      issuerQuery: issuer || '',
      limitQuery: limit || '',
      qualityInQuery: qualityIn || '',
      qualityOutQuery: qualityOut || '',
      freezeQuery: freeze || '',
      noRippleQuery: noRipple || '',
      authorizedQuery: authorized || '',
      deepFreezeQuery: deepFreeze || '',
      isSsrMobile: getIsSsrMobile(context),
      ...(await serverSideTranslations(locale, ['common', 'services']))
    }
  }
}

export default function TrustSet({
  setSignRequest,
  currencyQuery,
  currencyIssuerQuery,
  modeQuery,
  issuerQuery,
  limitQuery,
  qualityInQuery,
  qualityOutQuery,
  freezeQuery,
  noRippleQuery,
  authorizedQuery,
  deepFreezeQuery
}) {
  const { t } = useTranslation(['common', 'services'])
  const ts = (key, options) => t(key, { ns: 'services', ...options })
  const router = useRouter()
  const [error, setError] = useState('')
  const [mode, setMode] = useState(modeQuery === 'advanced' ? 'advanced' : 'simple') // 'simple' or 'advanced'

  // Simple mode state
  const [selectedToken, setSelectedToken] = useState({ currency: currencyQuery, issuer: currencyIssuerQuery })
  const [tokenSupply, setTokenSupply] = useState(null)
  // Advanced mode state
  const [issuer, setIssuer] = useState(issuerQuery || currencyIssuerQuery)
  const [currency, setCurrency] = useState({ currency: currencyQuery })

  // Common state
  const [limit, setLimit] = useState(limitQuery || '1000000')
  const [qualityIn, setQualityIn] = useState(qualityInQuery || '')
  const [qualityOut, setQualityOut] = useState(qualityOutQuery || '')
  const [txResult, setTxResult] = useState(null)
  const [agreeToSiteTerms, setAgreeToSiteTerms] = useState(false)

  // TrustSet flags - using radio select states: 'none', 'set', 'clear'
  const toFlagState = (v) => {
    if (v === 'true') return 'set'
    if (v === 'false') return 'clear'
    return 'none'
  }

  const [freezeState, setFreezeState] = useState(freezeQuery ? toFlagState(freezeQuery) : 'none')
  const [noRippleState, setNoRippleState] = useState(noRippleQuery ? toFlagState(noRippleQuery) : 'none')
  const [authorizedState, setAuthorizedState] = useState(authorizedQuery ? toFlagState(authorizedQuery) : 'none')
  const [deepFreezeState, setDeepFreezeState] = useState(deepFreezeQuery ? toFlagState(deepFreezeQuery) : 'none')

  // Fetch token supply when token is selected in simple mode
  useEffect(() => {
    if (mode === 'simple' && selectedToken.currency && selectedToken.issuer) {
      fetchTokenSupply()
    } else {
      setTokenSupply(null)
    }

    if (mode === 'simple') {
      // Sync currency between modes
      if (selectedToken.currency) {
        setCurrency({ currency: selectedToken.currency })
      }
      if (selectedToken.issuer) {
        setIssuer(selectedToken.issuer)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedToken, mode])

  // Sync URL query params with current form state for shareable links
  useEffect(() => {
    const addList = []
    const removeList = []

    if (mode && mode !== 'simple') {
      addList.push({ name: 'mode', value: mode })
    } else {
      removeList.push('mode')
    }

    if (mode === 'simple') {
      if (selectedToken.currency && selectedToken.currency !== nativeCurrency) {
        addList.push({ name: 'currency', value: selectedToken.currency })
      } else {
        removeList.push('currency')
      }
      if (selectedToken.issuer) {
        addList.push({ name: 'currencyIssuer', value: selectedToken.issuer })
      } else {
        removeList.push('currencyIssuer')
      }
      // Remove advanced-only params
      removeList.push('issuer')
      removeList.push('limit')
      removeList.push('qualityIn')
      removeList.push('qualityOut')
      removeList.push('noRipple')
      removeList.push('freeze')
      removeList.push('authorized')
      removeList.push('deepFreeze')
    } else {
      // advanced mode
      if (issuer && isAddressValid(issuer)) {
        addList.push({ name: 'issuer', value: issuer })
      } else {
        removeList.push('issuer')
      }
      if (currency.currency) {
        addList.push({ name: 'currency', value: currency.currency })
      } else {
        removeList.push('currency')
      }
      if (limit && !isNaN(parseFloat(limit)) && String(limit) !== '1000000') {
        addList.push({ name: 'limit', value: String(limit) })
      } else {
        removeList.push('limit')
      }
      if (qualityIn) {
        addList.push({ name: 'qualityIn', value: String(qualityIn) })
      } else {
        removeList.push('qualityIn')
      }
      if (qualityOut) {
        addList.push({ name: 'qualityOut', value: String(qualityOut) })
      } else {
        removeList.push('qualityOut')
      }

      if (noRippleState === 'set') addList.push({ name: 'noRipple', value: 'true' })
      else if (noRippleState === 'clear') addList.push({ name: 'noRipple', value: 'false' })
      else removeList.push('noRipple')

      if (freezeState === 'set') addList.push({ name: 'freeze', value: 'true' })
      else if (freezeState === 'clear') addList.push({ name: 'freeze', value: 'false' })
      else removeList.push('freeze')

      if (authorizedState === 'set') addList.push({ name: 'authorized', value: 'true' })
      else removeList.push('authorized')

      if (!xahauNetwork) {
        if (deepFreezeState === 'set') addList.push({ name: 'deepFreeze', value: 'true' })
        else if (deepFreezeState === 'clear') addList.push({ name: 'deepFreeze', value: 'false' })
        else removeList.push('deepFreeze')
      }
    }

    addAndRemoveQueryParams(router, addList, removeList)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    mode,
    selectedToken,
    issuer,
    currency,
    limit,
    qualityIn,
    qualityOut,
    freezeState,
    noRippleState,
    authorizedState,
    deepFreezeState
  ])

  const buildShareUrl = () => {
    if (typeof window === 'undefined') return ''
    const params = new URLSearchParams()

    if (mode && mode !== 'simple') params.set('mode', mode)

    if (mode === 'simple') {
      if (selectedToken.currency && selectedToken.currency !== nativeCurrency) {
        params.set('currency', selectedToken.currency)
      }
      if (selectedToken.issuer) params.set('currencyIssuer', selectedToken.issuer)
    } else {
      if (issuer && isAddressValid(issuer)) params.set('issuer', issuer)
      if (selectedToken.issuer) params.set('currencyIssuer', selectedToken.issuer)
      if (currency.currency) params.set('currency', currency.currency)
      if (limit && !isNaN(parseFloat(limit)) && String(limit) !== '1000000') {
        params.set('limit', String(limit))
      }
      if (qualityIn) params.set('qualityIn', String(qualityIn))
      if (qualityOut) params.set('qualityOut', String(qualityOut))

      if (freezeState === 'set') params.set('freeze', 'true')
      else if (freezeState === 'clear') params.set('freeze', 'false')

      if (noRippleState === 'set') params.set('noRipple', 'true')
      else if (noRippleState === 'clear') params.set('noRipple', 'false')

      if (authorizedState === 'set') params.set('authorized', 'true')

      if (!xahauNetwork) {
        if (deepFreezeState === 'set') params.set('deepFreeze', 'true')
        else if (deepFreezeState === 'clear') params.set('deepFreeze', 'false')
      }
    }

    const qs = params.toString()
    return qs ? `${server}${router.pathname}?${qs}` : `${server}${router.pathname}`
  }

  const [shareCopied, setShareCopied] = useState(false)
  const selectedTokenName =
    mode === 'simple' && selectedToken?.currency
      ? selectedToken.currencyDetails?.currency || niceCurrency(selectedToken.currency)
      : ''

  const handleShare = async () => {
    try {
      const url = buildShareUrl()
      await navigator.clipboard.writeText(url)
      setShareCopied(true)
      setTimeout(() => setShareCopied(false), 2000)
    } catch (e) {
      setError(ts('shared.errors.copy-link'))
    }
  }

  // Sync limit when switching modes
  useEffect(() => {
    if (mode === 'advanced' && tokenSupply) {
      setLimit(Math.round(Number(tokenSupply)))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, tokenSupply])

  const fetchTokenSupply = async () => {
    try {
      // Try to get token supply from API if available
      const response = await axios(
        `v2/trustlines/tokens?currency=${selectedToken.currency}&issuer=${selectedToken.issuer}`
      )
      const token = response.data?.tokens[0]

      if (token && token.supply) {
        setTokenSupply(token.supply)
        setLimit(Math.round(Number(token.supply)))
      } else {
        // Default to 1B if no supply info available
        setTokenSupply('1000000000')
        setLimit('1000000000')
      }
    } catch (error) {
      console.error('Error fetching token supply:', error)
      // Default to 1B if API call fails
      setTokenSupply('1000000000')
      setLimit('1000000000')
    }
  }

  const handleTrustSet = async () => {
    setError('')
    setTxResult(null)

    // Validation based on mode
    if (mode === 'advanced') {
      if (!issuer || !isAddressValid(issuer)) {
        setError(t('form.error.address-invalid'))
        return
      }
    } else {
      if (!selectedToken.issuer || !selectedToken.currency) {
        setError(ts('trustline.errors.select-token'))
        return
      }
    }

    // Validate currency code
    const currencyValidation = validateCurrencyCode(currency.currency)
    if (!currencyValidation.valid) {
      setError(currencyValidation.error)
      return
    }

    // In simple mode, limit is automatically set to token supply
    // In advanced mode, validate the manually entered limit
    if (mode === 'advanced') {
      if (!limit || isNaN(parseFloat(limit)) || parseFloat(limit) < 0) {
        setError(ts('trustline.errors.valid-limit'))
        return
      }
    }

    // Validate QualityIn
    if (qualityIn && (isNaN(parseFloat(qualityIn)) || parseFloat(qualityIn) < 0)) {
      setError(ts('trustline.errors.quality-in'))
      return
    }

    // Validate QualityOut
    if (qualityOut && (isNaN(parseFloat(qualityOut)) || parseFloat(qualityOut) < 0)) {
      setError(ts('trustline.errors.quality-out'))
      return
    }

    if (!agreeToSiteTerms) {
      setError(ts('shared.errors.terms'))
      return
    }

    try {
      let trustSet = {
        TransactionType: 'TrustSet',
        LimitAmount: {
          currency: encodeCurrencyCode(currency.currency),
          issuer: mode === 'simple' ? selectedToken.issuer : issuer,
          value: limit.toString()
        }
      }
      // Add QualityIn if provided
      if (qualityIn && qualityIn.trim() !== '') {
        trustSet.QualityIn = Number(multiply(qualityIn, 10000000))
      }

      // Add QualityOut if provided
      if (qualityOut && qualityOut.trim() !== '') {
        trustSet.QualityOut = Number(multiply(qualityOut, 10000000))
      }

      // Add flags - only include flags that are explicitly set or cleared
      let flags = 0
      if (mode === 'advanced') {
        if (freezeState === 'set')
          flags |= 0x00100000 // tfSetFreeze
        else if (freezeState === 'clear') flags |= 0x00200000 // tfClearFreeze

        if (noRippleState === 'set')
          flags |= 0x00020000 // tfSetNoRipple
        else if (noRippleState === 'clear') flags |= 0x00040000 // tfClearNoRipple

        if (authorizedState === 'set') flags |= 0x00010000 // tfSetfAuth

        if (!xahauNetwork) {
          if (deepFreezeState === 'set')
            flags |= 0x00400000 // tfSetDeepFreeze (XRP only)
          else if (deepFreezeState === 'clear') flags |= 0x00800000 // tfClearDeepFreeze (XRP only)
        }
      } else {
        flags |= 0x00020000 // tfSetNoRipple in simple mode
      }

      if (flags > 0) {
        trustSet.Flags = flags
      }

      setSignRequest({
        request: trustSet,
        callback: (result) => {
          const status = result.meta?.TransactionResult
          if (status !== 'tesSUCCESS') {
            setError(errorCodeDescription(status))
          } else {
            setTxResult({
              status,
              hash: result.hash
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
        title={ts('trustline.title')}
        description={ts('trustline.description')}
        image={{
          width: 1200,
          height: 630,
          file: 'previews/1200x630/services/trustline.png'
        }}
      />
      <div className="content-text content-center">
        <ServicesTabs category="payments" tab="trustline" />
        <h1 className="center">{ts('trustline.heading')}</h1>

        <p className="center">
          <Trans
            i18nKey="trustline.learn-text"
            ns="services"
            values={{ explorerName }}
            components={[<Link key="0" href="/learn/trustlines" target="_blank" rel="noreferrer" />]}
          />
        </p>

        <div className="center">
          <Link href="/tokens">{ts('trustline.view-top-tokens')}</Link>
          <br />
          <br />
        </div>

        <div>
          {/* Mode Selection */}
          <div className="radio-options" style={{ justifyContent: 'center' }}>
            <div className="radio-input">
              <input
                type="radio"
                name="trustlineMode"
                checked={mode === 'simple'}
                onChange={() => setMode('simple')}
                id="trustlineModeSimple"
              />
              <label htmlFor="trustlineModeSimple">{ts('trustline.simple')}</label>
            </div>
            <div className="radio-input" style={{ marginLeft: 20 }}>
              <input
                type="radio"
                name="trustlineMode"
                checked={mode === 'advanced'}
                onChange={() => setMode('advanced')}
                id="trustlineModeAdvanced"
              />
              <label htmlFor="trustlineModeAdvanced">{ts('trustline.advanced')}</label>
            </div>
          </div>
          {mode === 'simple' ? (
            // Simple Mode
            <div>
              <span className="input-title">
                {ts('trustline.token')}
                {tokenSupply && selectedToken.currency && (
                  <span className="grey">
                    {' - '}
                    {ts('trustline.limit-total-supply')}{' '}
                    {amountFormat({ value: tokenSupply, currency: selectedToken.currency }, { short: true })}
                  </span>
                )}
              </span>
              <TokenSelector
                value={selectedToken}
                onChange={setSelectedToken}
                excludeNative={true}
                currencyQueryName="currency"
              />
              {selectedToken.description && (
                <div style={{ marginTop: 10 }}>
                  <span className="grey">
                    <b>{ts('trustline.issuer-description')}</b> {selectedToken.description}
                  </span>
                  <br />
                  <br />
                  <span className="orange">
                    {ts('trustline.token-info-warning')}
                  </span>
                </div>
              )}
            </div>
          ) : (
            // Advanced Mode
            <div>
              <p className="center">{ts('trustline.intro')}</p>
              <AddressInput
                title={ts('trustline.counterparty')}
                placeholder={ts('trustline.issuer-address')}
                name="issuer"
                hideButton={true}
                setInnerValue={setIssuer}
                type="issuer"
                rawData={issuer && isAddressValid(issuer) ? { issuer } : {}}
              />
              <div className="form-spacing" />
              <FormInput
                title={ts('trustline.currency-code')}
                placeholder={ts('trustline.currency-placeholder')}
                setInnerValue={(value) => {
                  if (value.length <= 40) {
                    setCurrency({ currency: value })
                  }
                }}
                hideButton={true}
                defaultValue={currency.currency}
                maxLength={40}
                type="text"
              />
            </div>
          )}
          {mode === 'advanced' && (
            <>
              <div className="form-spacing" />
              <FormInput
                title={ts('trustline.limit')}
                placeholder={ts('trustline.limit-placeholder')}
                setInnerValue={setLimit}
                hideButton={true}
                onKeyPress={typeNumberOnly}
                defaultValue={limit}
              />
            </>
          )}
          {mode === 'advanced' && (
            <>
              <div className="form-spacing" />
              <div>
                <b>{ts('trustline.rippling')}</b> - {ts('trustline.rippling-text')}
                <RadioOptions
                  tabList={[
                    { value: 'none', label: ts('trustline.no-change') },
                    { value: 'clear', label: ts('trustline.allow') },
                    { value: 'set', label: ts('trustline.disallow') }
                  ]}
                  tab={noRippleState}
                  setTab={setNoRippleState}
                  name="noRipple"
                />
              </div>
              <br />
              <div>
                <b>{ts('trustline.freeze')}</b> - {ts('trustline.freeze-text')}
                <RadioOptions
                  tabList={[
                    { value: 'none', label: ts('trustline.no-change') },
                    { value: 'set', label: ts('trustline.freeze') },
                    { value: 'clear', label: ts('trustline.unfreeze') }
                  ]}
                  tab={freezeState}
                  setTab={setFreezeState}
                  name="freeze"
                />
              </div>
              {!xahauNetwork && (
                <>
                  <br />
                  <div>
                    <b>{ts('trustline.deep-freeze')}</b> - {ts('trustline.deep-freeze-text')}
                    <RadioOptions
                      tabList={[
                        { value: 'none', label: ts('trustline.no-change') },
                        { value: 'set', label: ts('trustline.deep-freeze') },
                        { value: 'clear', label: ts('trustline.clear-deep-freeze') }
                      ]}
                      tab={deepFreezeState}
                      setTab={setDeepFreezeState}
                      name="deepFreeze"
                    />
                  </div>
                </>
              )}
              <br />
              <div>
                <b>{ts('trustline.authorize')}</b> - {ts('trustline.authorize-text')}{' '}
                <span className="orange bold">{ts('trustline.authorize-warning')}</span>
                <RadioOptions
                  tabList={[
                    { value: 'none', label: ts('trustline.no-change') },
                    { value: 'set', label: ts('trustline.authorize') }
                  ]}
                  tab={authorizedState}
                  setTab={setAuthorizedState}
                  name="authorized"
                />
              </div>
              <br />
              <p>
                <strong>{ts('trustline.quality')}</strong> — {ts('trustline.quality-text')}
              </p>
              <ul>
                <li>
                  <strong>QualityIn</strong>: {ts('trustline.quality-in-text')}
                </li>
                <li>
                  <strong>QualityOut</strong>: {ts('trustline.quality-out-text')}
                </li>
              </ul>
              <p>
                <em>{ts('trustline.quality-example')}</em> {ts('trustline.quality-example-text')}
              </p>
              <p>{ts('trustline.quality-separate')}</p>
              <FormInput
                title={ts('trustline.quality-in')}
                placeholder={ts('trustline.quality-placeholder')}
                setInnerValue={setQualityIn}
                hideButton={true}
                onKeyPress={typeNumberOnly}
                defaultValue={qualityIn}
              />
              <div className="form-spacing" />
              <FormInput
                title={ts('trustline.quality-out')}
                placeholder={ts('trustline.quality-placeholder')}
                setInnerValue={setQualityOut}
                hideButton={true}
                onKeyPress={typeNumberOnly}
                defaultValue={qualityOut}
              />
              <div className="form-spacing" />
            </>
          )}
          <CheckBox checked={agreeToSiteTerms} setChecked={() => setAgreeToSiteTerms(!agreeToSiteTerms)}>
            <Trans
              i18nKey="shared.agree-terms"
              ns="services"
              components={[<Link key="0" href="/terms-and-conditions" target="_blank" />]}
            />
          </CheckBox>
          <br />
          {error && (
            <>
              <div className="red center">{error}</div>
              <br />
            </>
          )}
          <div className="center service-form-actions trustline-actions">
            <button className="button-action" onClick={handleTrustSet} style={{ minWidth: '120px' }}>
              {mode === 'simple' ? ts('trustline.add-token-button') : ts('trustline.create-button')}
            </button>
            <button type="button" className="button-outline trustline-copy-link" onClick={handleShare}>
              {shareCopied
                ? ts('trustline.link-copied')
                : selectedTokenName
                ? ts('trustline.copy-link-token', { token: selectedTokenName })
                : ts('trustline.copy-link')}
            </button>
          </div>
          {txResult?.status === 'tesSUCCESS' && (
            <>
              <h3 className="center">{ts('shared.transaction-successful')}</h3>
              <p>
                <strong>{ts('trustline.transaction-hash')}:</strong> <LinkTx tx={txResult.hash} short={12} />
                <CopyButton text={txResult.hash} />
              </p>
            </>
          )}
        </div>
      </div>
    </>
  )
}

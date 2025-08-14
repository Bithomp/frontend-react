import { useTranslation } from 'next-i18next'
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
import NetworkTabs from '../../components/Tabs/NetworkTabs'
import CopyButton from '../../components/UI/CopyButton'
import TokenSelector from '../../components/UI/TokenSelector'
import { LinkTx } from '../../utils/links'
import Link from 'next/link'
import { multiply } from '../../utils/calc'
import axios from 'axios'
import { errorCodeDescription } from '../../utils/transaction'
import { amountFormat } from '../../utils/format'
import { addAndRemoveQueryParams } from '../../utils'
import { useRouter } from 'next/router'

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
      currencyQuery: currency || nativeCurrency,
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
      ...(await serverSideTranslations(locale, ['common']))
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
  const { t } = useTranslation()
  const router = useRouter()
  const [error, setError] = useState('')
  const [mode, setMode] = useState(modeQuery === 'advanced' ? 'advanced' : 'simple') // 'simple' or 'advanced'

  const [selectedTokenData, setSelectedTokenData] = useState({})

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

  // TrustSet flags
  const toBool = (v) => v === '1' || v === 'true'
  const [setFreeze, setSetFreeze] = useState(freezeQuery ? toBool(freezeQuery) : false)
  const [setNoRipple, setSetNoRipple] = useState(noRippleQuery ? toBool(noRippleQuery) : true)
  const [setAuthorized, setSetAuthorized] = useState(authorizedQuery ? toBool(authorizedQuery) : false)
  const [setDeepFreeze, setSetDeepFreeze] = useState(deepFreezeQuery ? toBool(deepFreezeQuery) : false)

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
        setSelectedTokenData(selectedToken)
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
    }

    if (setFreeze) addList.push({ name: 'freeze', value: '1' }); else removeList.push('freeze')
    if (!setNoRipple) addList.push({ name: 'noRipple', value: '0' }); else removeList.push('noRipple')
    if (setAuthorized) addList.push({ name: 'authorized', value: '1' }); else removeList.push('authorized')
    if (!xahauNetwork) {
      if (setDeepFreeze) addList.push({ name: 'deepFreeze', value: '1' }); else removeList.push('deepFreeze')
    } else {
      removeList.push('deepFreeze')
    }

    addAndRemoveQueryParams(router, addList, removeList)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, selectedToken, issuer, currency, limit, qualityIn, qualityOut, setFreeze, setNoRipple, setAuthorized, setDeepFreeze])

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
      if (currency.currency) params.set('currency', currency.currency)
      if (limit && !isNaN(parseFloat(limit)) && String(limit) !== '1000000') {
        params.set('limit', String(limit))
      }
      if (qualityIn) params.set('qualityIn', String(qualityIn))
      if (qualityOut) params.set('qualityOut', String(qualityOut))
    }

    if (setFreeze) params.set('freeze', '1')
    if (!setNoRipple) params.set('noRipple', '0')
    if (setAuthorized) params.set('authorized', '1')
    if (!xahauNetwork && setDeepFreeze) params.set('deepFreeze', '1')

    const qs = params.toString()
    return qs
      ? `${server}${router.pathname}?${qs}`
      : `${server}${router.pathname}`
  }

  const [shareCopied, setShareCopied] = useState(false)
  const handleShare = async () => {
    try {
      const url = buildShareUrl()
      await navigator.clipboard.writeText(url)
      setShareCopied(true)
      setTimeout(() => setShareCopied(false), 2000)
    } catch (e) {
      setError('Failed to copy the link')
    }
  }

  // Sync limit when switching modes
  useEffect(() => {
    if (mode === 'advanced' && tokenSupply) {
      setLimit(Math.round(tokenSupply * 1000000) / 1000000)
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
        setLimit(Math.round(token.supply * 1000000) / 1000000)
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
        setError('Please select a token.')
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
        setError('Please enter a valid limit (must be 0 or positive).')
        return
      }
    }

    // Validate QualityIn
    if (qualityIn && (isNaN(parseFloat(qualityIn)) || parseFloat(qualityIn) < 0)) {
      setError('QualityIn must be a valid positive number.')
      return
    }

    // Validate QualityOut
    if (qualityOut && (isNaN(parseFloat(qualityOut)) || parseFloat(qualityOut) < 0)) {
      setError('QualityOut must be a valid positive number.')
      return
    }

    if (!agreeToSiteTerms) {
      setError('Please agree to the Terms and conditions')
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

      // Add flags
      let flags = 0
      if (setFreeze) flags |= 0x00100000 // tfSetFreeze
      if (setNoRipple) flags |= 0x00020000 // tfSetNoRipple
      if (setAuthorized) flags |= 0x00010000 // tfSetfAuth
      if (!xahauNetwork && setDeepFreeze) flags |= 0x00400000 // tfSetDeepFreeze (XRP only)

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
      <SEO title="Set Trustline" description={'Set a Trustline on the ' + explorerName} />
      <div className="content-text content-center">
        <h1 className="center">Set/Update Trust (Trustlines)</h1>
        <p className="center">Create or modify a Trustline linking two accounts.</p>
        <NetworkTabs />

        <p className="center">
          Trustlines are structures in the {explorerName} for holding tokens. Trustlines enforce the rule that you
          cannot cause someone else to hold a token they don't want.
        </p>

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
              <label htmlFor="trustlineModeSimple">Simple</label>
            </div>
            <div className="radio-input" style={{ marginLeft: 20 }}>
              <input
                type="radio"
                name="trustlineMode"
                checked={mode === 'advanced'}
                onChange={() => setMode('advanced')}
                id="trustlineModeAdvanced"
              />
              <label htmlFor="trustlineModeAdvanced">Advanced</label>
            </div>
          </div>
          {mode === 'simple' ? (
            // Simple Mode
            <div>
              <span className="input-title">
                Token
                {tokenSupply && selectedToken.currency && (
                  <span className="grey">
                    {' '}
                    - the Limit will be set to the total supply:{' '}
                    {amountFormat({ value: tokenSupply, currency: selectedToken.currency })}
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
                    <b>Description (by the Token issuer):</b> {selectedToken.description}
                  </span>
                  <br />
                  <br />
                  <span className="orange">
                    We do not take responsibility for the accuracy of the token descriptions or related information.
                    Users should always do their own research (DYOR). The content is for informational purposes only,
                    not financial advice.
                  </span>
                </div>
              )}
            </div>
          ) : (
            // Advanced Mode
            <div>
              <AddressInput
                title="Counterparty"
                placeholder="Issuer address"
                name="issuer"
                hideButton={true}
                setValue={setIssuer}
                type="issuer"
                rawData={selectedTokenData}
              />
              <div className="form-spacing" />
              <FormInput
                title="Currency code"
                placeholder="Currency code (e.g., USD, myCurrency or HEX)"
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
                title="Limit (The maximum amount you want to trust)"
                placeholder="Enter the maximum amount you want to trust"
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
              <b>No Rippling</b> blocks indirect movement of your funds. (keep it checked unless you are a token issuer)
              <CheckBox
                checked={setNoRipple}
                setChecked={() => {
                  setSetNoRipple(!setNoRipple)
                }}
              >
                No Rippling
              </CheckBox>
              <br />
              <br />
              <b>Authorize</b> - Authorizes the counterparty to hold currency issued by this account.{' '}
              <span className="orange bold">Can not be unset.</span>
              <CheckBox
                checked={setAuthorized}
                setChecked={() => {
                  setSetAuthorized(!setAuthorized)
                }}
              >
                Authorize
              </CheckBox>
              <br />
              <br />
              <b>Freeze</b> - Freezes the counterparty's ability to send the frozen currencies to others, but the
              counterparty can still send them directly to the issuer.
              <CheckBox
                checked={setFreeze}
                setChecked={() => {
                  setSetFreeze(!setFreeze)
                }}
              >
                Freeze
              </CheckBox>
              {!xahauNetwork && (
                <>
                  <br />
                  <br />
                  <b>Deep Freeze</b> - The counterparty cannot receive funds until or unless their Trustline is
                  unfrozen. It requires that the issuer implement a standard freeze on the Trustline before enacting a
                  Deep Freeze. The issuer cannot enact a Deep Freeze if they have enabled No Freeze on their account.
                  <CheckBox
                    checked={setDeepFreeze}
                    setChecked={() => {
                      setSetDeepFreeze(!setDeepFreeze)
                    }}
                  >
                    Deep Freeze
                  </CheckBox>
                </>
              )}
              <br />
              <p>
                <strong>Quality</strong> — the exchange rate for this trustline.
              </p>
              <ul>
                <li>
                  <strong>QualityIn</strong>: % of incoming funds kept by the sender.
                </li>
                <li>
                  <strong>QualityOut</strong>: % of outgoing funds kept by the issuer.
                </li>
              </ul>
              <p>
                <em>Example:</em> If QualityIn or QualityOut is set to 1%, then for every 100 units sent, 1 unit is
                retained and 99 reach the recipient.
              </p>
              <p>These are separate from token transfer fees.</p>
              <FormInput
                title="Quality in (%)"
                placeholder="Exchange rate (0 = face value)"
                setInnerValue={setQualityIn}
                hideButton={true}
                onKeyPress={typeNumberOnly}
                defaultValue={qualityIn}
              />
              <div className="form-spacing" />
              <FormInput
                title="Quality out (%)"
                placeholder="Exchange rate (0 = face value)"
                setInnerValue={setQualityOut}
                hideButton={true}
                onKeyPress={typeNumberOnly}
                defaultValue={qualityOut}
              />
              <div className="form-spacing" />
            </>
          )}
          <CheckBox checked={agreeToSiteTerms} setChecked={() => setAgreeToSiteTerms(!agreeToSiteTerms)}>
            I agree to the{' '}
            <Link href="/terms-and-conditions" target="_blank">
              Terms and conditions
            </Link>
          </CheckBox>
          <br />
          {error && (
            <>
              <div className="red center">{error}</div>
              <br />
            </>
          )}
          <div className="center">
            <button className="button-action" onClick={handleShare} style={{ minWidth: '120px', marginRight: 10 }}>
              {shareCopied ? 'Link copied' : 'Share'}
            </button>
            <button className="button-action" onClick={handleTrustSet}>
              Create Trustline
            </button>
          </div>
          {txResult?.status === 'tesSUCCESS' && (
            <>
              <h3 className="center">Transaction Successful</h3>
              <p>
                <strong>Transaction Hash:</strong> <LinkTx tx={txResult.hash} short={12} />
                <CopyButton text={txResult.hash} />
              </p>
            </>
          )}
        </div>
      </div>
    </>
  )
}

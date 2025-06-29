import { useTranslation } from 'next-i18next'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import SEO from '../../components/SEO'
import { explorerName, isAddressValid, typeNumberOnly, xahauNetwork } from '../../utils'
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

export default function TrustSet({ setSignRequest }) {
  const { t } = useTranslation()
  const [error, setError] = useState('')
  const [mode, setMode] = useState('simple') // 'simple' or 'advanced'

  const [selectedTokenData, setSelectedTokenData] = useState({})

  // Simple mode state
  const [selectedToken, setSelectedToken] = useState({ currency: '' })
  const [tokenSupply, setTokenSupply] = useState(null)

  // Advanced mode state
  const [issuer, setIssuer] = useState('')
  const [currency, setCurrency] = useState({ currency: '' })

  // Common state
  const [limit, setLimit] = useState('1000000')
  const [qualityIn, setQualityIn] = useState('')
  const [qualityOut, setQualityOut] = useState('')
  const [txResult, setTxResult] = useState(null)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [agreeToSiteTerms, setAgreeToSiteTerms] = useState(false)

  // TrustSet flags
  const [setFreeze, setSetFreeze] = useState(false)
  const [setNoRipple, setSetNoRipple] = useState(true) // Default to true for simple mode
  const [setAuthorized, setSetAuthorized] = useState(false)
  const [setDeepFreeze, setSetDeepFreeze] = useState(false)

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
      }
    }
  }, [selectedToken, mode])

  // Sync limit when switching modes
  useEffect(() => {
    if (mode === 'advanced' && tokenSupply) {
      setLimit(Math.round(tokenSupply * 1000000) / 1000000)
    }
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

    if (!currency.currency) {
      setError('Please enter a valid currency.')
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
          currency: currency.currency,
          issuer: mode === 'simple' ? selectedToken.issuer : issuer,
          value: limit.toString()
        }
      }
      // Add QualityIn if provided
      if (qualityIn && qualityIn.trim() !== '') {
        trustSet.QualityIn = Number(multiply(qualityIn, 1000000000))
      }

      // Add QualityOut if provided
      if (qualityOut && qualityOut.trim() !== '') {
        trustSet.QualityOut = Number(multiply(qualityOut, 1000000000))
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
        <h1 className="center">Set Trust (Trustlines)</h1>
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
              <TokenSelector value={selectedToken} onChange={setSelectedToken} excludeNative={true} inTitle={<></>} />
            </div>
          ) : (
            // Advanced Mode
            <div>
              <AddressInput
                title="Address that issues the token"
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
                placeholder="Currency code (e.g., USD, EUR or HEX)"
                setInnerValue={(value) => setCurrency({ currency: value })}
                hideButton={true}
                defaultValue={currency.currency}
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
          <CheckBox checked={showAdvanced} setChecked={() => setShowAdvanced(!showAdvanced)} name="advanced-trustline">
            Quality settings and Flags (optional)
          </CheckBox>
          <div className="form-spacing" />
          {showAdvanced && (
            <>
              <FormInput
                title="Quality in"
                placeholder="Exchange rate for incoming balances (0 = face value)"
                setInnerValue={setQualityIn}
                hideButton={true}
                onKeyPress={typeNumberOnly}
                defaultValue={qualityIn}
              />
              <div className="form-spacing" />
              <FormInput
                title="Quality out"
                placeholder="Exchange rate for outgoing balances (0 = face value)"
                setInnerValue={setQualityOut}
                hideButton={true}
                onKeyPress={typeNumberOnly}
                defaultValue={qualityOut}
              />
              <div className="form-spacing" />
              <CheckBox
                checked={setNoRipple}
                setChecked={() => {
                  setSetNoRipple(!setNoRipple)
                }}
              >
                Set No Rippling
              </CheckBox>
              <CheckBox
                checked={setAuthorized}
                setChecked={() => {
                  setSetAuthorized(!setAuthorized)
                }}
              >
                Set Authorized
              </CheckBox>
              <CheckBox
                checked={setFreeze}
                setChecked={() => {
                  setSetFreeze(!setFreeze)
                }}
              >
                Set Freeze
              </CheckBox>
              {!xahauNetwork && (
                <CheckBox
                  checked={setDeepFreeze}
                  setChecked={() => {
                    setSetDeepFreeze(!setDeepFreeze)
                  }}
                >
                  Set Deep Freeze
                </CheckBox>
              )}
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

export const getServerSideProps = async (context) => {
  const { locale } = context
  return {
    props: {
      isSsrMobile: getIsSsrMobile(context),
      ...(await serverSideTranslations(locale, ['common']))
    }
  }
}

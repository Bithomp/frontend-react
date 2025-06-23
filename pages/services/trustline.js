import { useTranslation } from 'next-i18next'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import SEO from '../../components/SEO'
import { explorerName, isAddressValid, typeNumberOnly, nativeCurrency } from '../../utils'
import { getIsSsrMobile } from '../../utils/mobile'
import { useState } from 'react'
import AddressInput from '../../components/UI/AddressInput'
import FormInput from '../../components/UI/FormInput'
import CheckBox from '../../components/UI/CheckBox'
import NetworkTabs from '../../components/Tabs/NetworkTabs'
import CopyButton from '../../components/UI/CopyButton'
import TokenSelector from '../../components/UI/TokenSelector'
import { LinkTx } from '../../utils/links'
import Link from 'next/link'
import { multiply } from '../../utils/calc'

export default function TrustSet({ setSignRequest }) {
  const { t } = useTranslation()
  const [error, setError] = useState('')
  const [issuer, setIssuer] = useState(null)
  const [currency, setCurrency] = useState({currency: nativeCurrency})
  const [limit, setLimit] = useState(null)
  const [qualityIn, setQualityIn] = useState('')
  const [qualityOut, setQualityOut] = useState('')
  const [txResult, setTxResult] = useState(null)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [agreeToSiteTerms, setAgreeToSiteTerms] = useState(false)
  
  // TrustSet flags
  const [setFreeze, setSetFreeze] = useState(false)
  const [setNoRipple, setSetNoRipple] = useState(false)
  const [setAuthorized, setSetAuthorized] = useState(false)
  // const [setDeepFreeze, setSetDeepFreeze] = useState(false)

  const handleTrustSet = async () => {
    setError('')
    setTxResult(null)

    if (!issuer || !isAddressValid(issuer)) {
      setError(t('form.error.address-invalid'))
      return
    }

    if (!currency.currency) {
      setError('Please enter a valid currency.')
      return
    }

    if (!limit || isNaN(parseFloat(limit)) || parseFloat(limit) < 0) {
      setError('Please enter a valid limit (must be 0 or positive).')
      return
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
          issuer: issuer,
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
      // if (setDeepFreeze) flags |= 0x00400000 // tfSetDeepFreeze

      if (flags > 0) {
        trustSet.Flags = flags
      }

      setSignRequest({
        request: trustSet,
        callback: (result) => {
          if (result.result) {
            setTxResult({
              status: result.result.meta?.TransactionResult,
              hash: result.result.hash,
            })
          } else {
            setError('Transaction failed')
          }
        }
      })
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <>
      <SEO title="Set Trust Line" description={'Set a trust line on the ' + explorerName} />
      <div className="content-text content-center">
        <h1 className="center">Create a Trustline</h1>
        <NetworkTabs />

        <div>
          <AddressInput
            title="LimitAmount Issuer"
            placeholder="LimitAmount Issuer address"
            name="issuer"
            hideButton={true}
            setValue={setIssuer}
            type="address"
          />
          <div className="form-spacing" />
          <div>
            <span className="input-title">LimitAmount Currency</span>
            <TokenSelector
              value={currency}
              onChange={setCurrency}
            />
          </div>
          <br />
          <FormInput
            title="LimitAmount Value"
            placeholder="LimitAmount Value"
            setInnerValue={setLimit}
            hideButton={true}
            onKeyPress={typeNumberOnly}
            defaultValue={limit}
          />
          <CheckBox
            checked={showAdvanced}
            setChecked={() => setShowAdvanced(!showAdvanced)}
            name="advanced-trustline"
          >
            Advanced Options
          </CheckBox>
          <br />

          {showAdvanced && (
            <>
              <h4>Quality Settings</h4>
              <FormInput
                title="Quality In"
                placeholder="Exchange rate for incoming balances (0 = face value)"
                setInnerValue={setQualityIn}
                hideButton={true}
                onKeyPress={typeNumberOnly}
                defaultValue={qualityIn}
              />
              <div className="form-spacing" />
              <FormInput
                title="Quality Out"
                placeholder="Exchange rate for outgoing balances (0 = face value)"
                setInnerValue={setQualityOut}
                hideButton={true}
                onKeyPress={typeNumberOnly}
                defaultValue={qualityOut}
              />
              <div className="form-spacing" />
              <CheckBox
                checked={setFreeze}
                setChecked={() => {
                  setSetFreeze(!setFreeze)
                }}
              >
                Set Freeze
              </CheckBox>             
              {/* <CheckBox
                checked={setDeepFreeze}
                setChecked={() => {
                  setSetDeepFreeze(!setDeepFreeze)
                }}
              >
                Set Deep Freeze
              </CheckBox>               */}
              <CheckBox
                checked={setNoRipple}
                setChecked={() => {
                  setSetNoRipple(!setNoRipple)
                }}
              >
                Set No Ripple
              </CheckBox>
              <CheckBox
                checked={setAuthorized}
                setChecked={() => {
                  setSetAuthorized(!setAuthorized)
                }}
              >
                Set Authorized
              </CheckBox>
              <br />
            </> 
          )}

          <CheckBox
            checked={agreeToSiteTerms}
            setChecked={() => setAgreeToSiteTerms(!agreeToSiteTerms)}
          >
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
                <strong>Transaction Hash:</strong>{' '}
                <LinkTx tx={txResult.hash} short={12} />
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
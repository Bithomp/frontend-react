import { useTranslation } from 'next-i18next'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import SEO from '../components/SEO'
import { useWidth } from '../utils'
import CheckBox from '../components/UI/CheckBox'
import AddressInput from '../components/UI/AddressInput'
import FormInput from '../components/UI/FormInput'
import NetworkTabs from '../components/Tabs/NetworkTabs'
import { typeNumberOnly } from '../utils'
import { devNet, explorerName, ledgerName, nativeCurrency } from '../utils'
import { useState } from 'react'

export default function Send({ account }) {
  const { t } = useTranslation()
  const width = useWidth()
  const [address, setAddress] = useState('')
  const [destinationTag, setDestinationTag] = useState('')
  const [amount, setAmount] = useState('')
  const [memo, setMemo] = useState('')
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [fee, setFee] = useState('')
  const [feeError, setFeeError] = useState('')

  const handleFeeChange = (e) => {
    const value = e.target.value
    setFee(value)
    
    // Convert to drops (1 XRP = 1,000,000 drops)
    const feeInDrops = parseFloat(value) * 1000000
    
    if (feeInDrops > 1000000) { // 1 XRP in drops
      setFeeError(t('form.error.max-fee', 'Maximum fee is 1 XRP'))
    } else {
      setFeeError('')
    }
  }

  return (
    <>
      <SEO
        title={t('send.title', 'Send Payment')}
        description={t('send.description', 'Send a payment to a destination address')}
      />
      <div className="content-text content-center">
        <h1 className="center">{t('send.title', 'Send Payment')}</h1>
        <NetworkTabs />
        
        <div>
          <AddressInput
            title={t('form.destination', 'Destination')}
            placeholder="Destination address"
            name="destination"
            hideButton={true}
            setValue={setAddress}
            initialValue={address}
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
          <div className="form-input">
            {width > 1100 && <br />}
            <span className="input-title">
              amount
            </span>
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
              defaultValue={amount / 1000000}
            />
          </div>
          <div className="form-input">
            {width > 1100 && <br />}
            <span className="input-title">
              {t('form.memo', 'Memo')}
            </span>
            <input
              placeholder={t('form.placeholder.memo', 'Enter memo')}
              onChange={(e) => setMemo(e.target.value)}
              className="input-text"
              spellCheck="false"
              maxLength="100"
              type="text"
              defaultValue={memo}
            />
          </div>
          <CheckBox checked={showAdvanced} setChecked={() => setShowAdvanced(!showAdvanced)} name="advanced-payment">
            {t('form.advanced-payment', 'Advanced Payment Options')}
          </CheckBox>
          {showAdvanced && (
            <div>
              <br />
              <span className="input-title">
                {t('form.fee', 'Fee')}
              </span>
              <input
                placeholder={t('form.placeholder.fee', 'Enter fee in XRP')}
                onChange={handleFeeChange}
                onKeyPress={typeNumberOnly}
                className={`input-text ${feeError ? 'error' : ''}`}
                spellCheck="false"
                maxLength="35"
                min="0"
                type="text"
                inputMode="decimal"
                defaultValue={fee}
              />
              {feeError && <div className="error-message">{feeError}</div>}
            </div>
          )}
          <br />
          <div className="center">
            <button
              className="button-action"
              onClick={() => {
                // TODO: Implement send payment logic
                console.log('Sending payment:', {
                  address,
                  destinationTag,
                  amount,
                  memo,
                  fee: showAdvanced ? fee : undefined
                })
              }}
            >
              {t('form.send', 'Send Payment')}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

export async function getStaticProps({ locale }) {
  return {
    props: {
      ...(await serverSideTranslations(locale, ['common']))
    }
  }
} 
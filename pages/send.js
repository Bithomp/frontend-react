import { useTranslation } from 'next-i18next'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import SEO from '../components/SEO'
import { useWidth } from '../utils'
import AddressInput from '../components/UI/AddressInput'
import FormInput from '../components/UI/FormInput'
import NetworkTabs from '../components/Tabs/NetworkTabs'
import { typeNumberOnly } from '../utils'
import { capitalize, devNet, maxAmount, nativeCurrency } from '../utils/format'
import { useState } from 'react'

export default function Send({ account, showAds }) {
  const { t } = useTranslation()
  const width = useWidth()
  const [address, setAddress] = useState('')
  const [destinationTag, setDestinationTag] = useState('')
  const [amount, setAmount] = useState('')

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
          <div>
            {width > 1100 && <br />}
            <span className="input-title">
              {capitalize(devNet)} {nativeCurrency} amount (maximum: {maxAmount} {nativeCurrency})
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
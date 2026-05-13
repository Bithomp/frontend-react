import { useEffect, useState } from 'react'
import Select from 'react-select'
import { useWidth } from '../../../utils'
import { useTranslation } from 'next-i18next'

const priceOptions = {
  basic: ['30 EUR', '90 EUR', '180 EUR', '300 EUR'],
  standard: ['100 EUR', '300 EUR', '600 EUR', '1000 EUR'],
  premium: ['250 EUR', '750 EUR', '1500 EUR', '2500 EUR'],
  enterprise: ['500 EUR', '1500 EUR', '3000 EUR', '5000 EUR'],
  enterprise2: ['1000 EUR', '3000 EUR', '6000 EUR', '10000 EUR'],
  enterprise3: ['2000 EUR', '6000 EUR', '12000 EUR', '20000 EUR']
}

const optionIndex = (val) => {
  switch (val) {
    case 'm1':
      return 0
    case 'm3':
      return 1
    case 'm6':
      return 2
    case 'y1':
      return 3
    default:
      return 1
  }
}

export default function Api({ setPayPeriod, setTier, tier }) {
  const { t } = useTranslation('admin')
  const periodValues = ['m1', 'm3', 'm6', 'y1']
  const periodLabels = [t('period.m1'), t('period.m3'), t('period.m6'), t('period.y1')]
  const options = Object.fromEntries(
    Object.entries(priceOptions).map(([key, prices]) => [
      key,
      periodValues.map((value, index) => ({ value, label: periodLabels[index], price: prices[index] }))
    ])
  )
  const tierOptions = [
    { value: 'basic', label: t('plans.basic') },
    { value: 'standard', label: t('plans.standard') },
    { value: 'premium', label: t('plans.premium') },
    { value: 'enterprise', label: t('plans.enterprise') },
    { value: 'enterprise2', label: t('plans.enterprise2') },
    { value: 'enterprise3', label: t('plans.enterprise3') }
  ]
  const [innerTier, setInnerTier] = useState(tier)
  const [optionsList, setOptionsList] = useState(options[tier])
  const [optionValue, setOptionValue] = useState(options[tier][1])

  const width = useWidth()

  useEffect(() => {
    const index = optionIndex(optionValue.value)
    setTier(innerTier)
    setOptionsList(options[innerTier])
    setOptionValue(options[innerTier][index])
    setPayPeriod(options[innerTier][index].value)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [innerTier])

  return (
    <>
      <div className="left">
        {t('subscriptions.api.check-docs')}{' '}
        <a href="https://docs.bithomp.com/#price-and-limits" target="_blank" rel="noreferrer">
          https://docs.bithomp.com/#price-and-limits
        </a>
        <br />
      </div>
      <h4 className="center">{t('subscriptions.api.why-title')}</h4>
      <div style={{ textAlign: 'left' }}>
        <p>{t('subscriptions.api.intro')}</p>
        <p>
          <b>{t('subscriptions.api.benefits.limits-title')}</b>: {t('subscriptions.api.benefits.limits-text')}
        </p>
        <p>
          <b>{t('subscriptions.api.benefits.features-title')}</b>: {t('subscriptions.api.benefits.features-text')}
        </p>
      </div>
      <p>{t('subscriptions.api.subscribe')}</p>

      <div className="center">
        <Select
          options={tierOptions}
          getOptionLabel={(option) => (
            <div style={{ width: width > 400 ? '170px' : '160px', whiteSpace: 'nowrap' }}>{option.label}</div>
          )}
          onChange={(selected) => {
            setInnerTier(selected.value)
          }}
          defaultValue={tierOptions[1]}
          isSearchable={false}
          className="simple-select"
          classNamePrefix="react-select"
          instanceId="tier-select"
        />
        {width > 400 ? (
          <div style={{ display: 'inline-block', width: '10px' }}></div>
        ) : (
          <div style={{ height: '20px' }}></div>
        )}
        <Select
          options={optionsList}
          getOptionLabel={(option) => (
            <div style={{ width: '160px' }}>
              {option.label} <span style={{ float: 'right' }}>{option.price}</span>
            </div>
          )}
          onChange={(selected) => {
            setPayPeriod(selected.value)
            setOptionValue(selected)
          }}
          defaultValue={optionsList[1]}
          isSearchable={false}
          className="simple-select"
          classNamePrefix="react-select"
          instanceId="period-select"
          value={optionValue}
        />
      </div>
    </>
  )
}

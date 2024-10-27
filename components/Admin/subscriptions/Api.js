import { useEffect, useState } from 'react'
import Select from 'react-select'
import { useWidth } from '../../../utils'

const options = {
  basic: [
    { value: 'm1', label: '1 month', price: '30 EUR' },
    { value: 'm3', label: '3 months', price: '90 EUR' },
    { value: 'm6', label: '6 months', price: '180 EUR' },
    { value: 'y1', label: '1 year', price: '300 EUR' }
  ],
  standard: [
    { value: 'm1', label: '1 month', price: '100 EUR' },
    { value: 'm3', label: '3 months', price: '300 EUR' },
    { value: 'm6', label: '6 months', price: '600 EUR' },
    { value: 'y1', label: '1 year', price: '1000 EUR' }
  ],
  premium: [
    { value: 'm1', label: '1 month', price: '250 EUR' },
    { value: 'm3', label: '3 months', price: '750 EUR' },
    { value: 'm6', label: '6 months', price: '1500 EUR' },
    { value: 'y1', label: '1 year', price: '2500 EUR' }
  ],
  enterprise: [
    { value: 'm1', label: '1 month', price: '500 EUR' },
    { value: 'm3', label: '3 months', price: '1500 EUR' },
    { value: 'm6', label: '6 months', price: '3000 EUR' },
    { value: 'y1', label: '1 year', price: '5000 EUR' }
  ],
  enterprise2: [
    { value: 'm1', label: '1 month', price: '1000 EUR' },
    { value: 'm3', label: '3 months', price: '3000 EUR' },
    { value: 'm6', label: '6 months', price: '6000 EUR' },
    { value: 'y1', label: '1 year', price: '10000 EUR' }
  ],
  enterprise3: [
    { value: 'm1', label: '1 month', price: '2000 EUR' },
    { value: 'm3', label: '3 months', price: '6000 EUR' },
    { value: 'm6', label: '6 months', price: '12000 EUR' },
    { value: 'y1', label: '1 year', price: '20000 EUR' }
  ]
}

const tierOptions = [
  { value: 'basic', label: 'Basic' },
  { value: 'standard', label: 'Standard' },
  { value: 'premium', label: 'Premium' },
  { value: 'enterprise', label: 'Enterprise' },
  { value: 'enterprise2', label: 'Enterprise II' },
  { value: 'enterprise3', label: 'Enterprise III' }
]

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
        Check documentation and choose your API plan:{' '}
        <a href="https://docs.bithomp.com/#price-and-limits" target="_blank" rel="noreferrer">
          https://docs.bithomp.com/#price-and-limits
        </a>
        <br />
      </div>
      <h4 className="center">Why Purchase an API Subscription?</h4>
      <div style={{ textAlign: 'left' }}>
        <p>Purchasing an API subscription can be beneficial for several reasons:</p>
        <p>
          ✅ <b>Increased Rate Limits</b>: Paid plans offer higher request limits, which include more requests per
          minute as well as more requests per day. This is particularly crucial for applications requiring real-time
          data.
        </p>
        <p>
          ✅ <b>Access to Advanced Features</b>: Subscribing to a paid plan grants access to additional features,
          including specialized endpoints that are not available in the Free tier.
        </p>
      </div>
      <p>Subscribe to our API!</p>

      <div className="center">
        <Select
          options={tierOptions}
          getOptionLabel={(option) => <div style={{ width: width > 400 ? '100px' : '160px' }}>{option.label}</div>}
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

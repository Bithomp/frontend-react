import Select from 'react-select'
import { useState, useEffect } from 'react'
import Image from 'next/image'

import { fiatCurrencyList } from '../../utils'

export default function CurrencySelect({ setSelectedCurrency, selectedCurrency }) {
  const currencies = fiatCurrencyList

  let defaultOption = { value: 'usd', label: 'USD' }
  for (let i = 0; i < currencies.length; i++) {
    if (currencies[i].value.toLowerCase() === selectedCurrency.toLowerCase()) {
      defaultOption = currencies[i]
      break
    }
  }

  const [selectedOption, setSelectedOption] = useState(defaultOption)
  const [rendered, setRendered] = useState(false)

  const onCurrencyChange = (value) => {
    setSelectedOption(value)
    if (value.value) {
      setSelectedCurrency(value.value)
    }
  }

  useEffect(() => {
    setRendered(true)
  }, [])

  useEffect(() => {
    for (let i = 0; i < currencies.length; i++) {
      if (currencies[i].value.toLowerCase() === selectedCurrency.toLowerCase()) {
        setSelectedOption(currencies[i])
        break
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCurrency])

  // otherwise shows error for aria-activedescendant
  if (!rendered) return ''

  return (
    <Select
      options={currencies}
      defaultValue={defaultOption}
      value={selectedOption}
      onChange={onCurrencyChange}
      isSearchable={true}
      getOptionLabel={(e) => (
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <span style={{}}>
            <Image
              alt="country flag"
              src={'/images/flags/' + e.value.slice(0, 2) + (e.value === 'krw' ? '.png' : '.svg')}
              width={24}
              height={18}
            />
          </span>
          <span style={{ marginLeft: 5 }}>{e.label}</span>
        </div>
      )}
      className="currency-select"
      classNamePrefix="react-select"
      instanceId="currency-select"
      aria-label="Currency select"
    />
  )
}

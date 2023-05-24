import Select from 'react-select'
import { useState } from 'react'
import Image from 'next/image'

import { fiatCurrencyList } from '../../utils';

export default function CurrencySelect({ setSelectedCurrency, selectedCurrency }) {

  const currencies = fiatCurrencyList

  let defaultOption = { value: 'usd', label: 'USD' };
  for (let i = 0; i < currencies.length; i++) {
    if (currencies[i].value.toLowerCase() === selectedCurrency.toLowerCase()) {
      defaultOption = currencies[i];
      break;
    }
  }

  const [selectCurrency, setSelectCurrency] = useState(defaultOption);

  const onCurrencyChange = value => {
    setSelectCurrency(value)
    setSelectedCurrency(value.value)
  }

  return (
    <Select
      options={currencies}
      defaultValue={selectCurrency}
      onChange={onCurrencyChange}
      isSearchable={true}
      getOptionLabel={e => (
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <span style={{}}>
            <Image
              alt="country flag"
              src={"/images/flags/" + e.value.slice(0, 2) + (e.value === "krw" ? ".png" : ".svg")}
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
    />
  );
};

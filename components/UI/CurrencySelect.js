import Select from 'react-select'
import { useState } from 'react'
import Image from 'next/image'

export default function CurrencySelect({ setSelectedCurrency, selectedCurrency }) {

  const currencies = [
    { value: 'usd', label: 'USD' },
    { value: 'eur', label: 'EUR' },
    { value: 'jpy', label: 'JPY' },
    { value: 'gbp', label: 'GBP' },
    { value: 'aud', label: 'AUD' },
    { value: 'cad', label: 'CAD' },
    { value: 'chf', label: 'CHF' },
    { value: 'cny', label: 'CNY' },
    { value: 'hkd', label: 'HKD' },
    { value: 'nzd', label: 'NZD' },
    { value: 'sek', label: 'SEK' },
    { value: 'krw', label: 'KRW' },
    { value: 'sgd', label: 'SGD' },
    { value: 'nok', label: 'NOK' },
    { value: 'mxn', label: 'MXN' },
    { value: 'inr', label: 'INR' },
    { value: 'rub', label: 'RUB' },
    { value: 'zar', label: 'ZAR' },
    { value: 'try', label: 'TRY' },
    { value: 'brl', label: 'BRL' },
    { value: 'twd', label: 'TWD' },
    { value: 'dkk', label: 'DKK' },
    { value: 'pln', label: 'PLN' },
    { value: 'thb', label: 'THB' },
    { value: 'idr', label: 'IDR' },
    { value: 'huf', label: 'HUF' },
    { value: 'czk', label: 'CZK' },
    { value: 'ils', label: 'ILS' },
    { value: 'clp', label: 'CLP' },
    { value: 'php', label: 'PHP' },
    { value: 'aed', label: 'AED' },
    { value: 'sar', label: 'SAR' },
    { value: 'myr', label: 'MYR' },
    { value: 'ars', label: 'ARS' },
    { value: 'bdt', label: 'BDT' },
    { value: 'bhd', label: 'BHD' },
    { value: 'kwd', label: 'KWD' },
    { value: 'ngn', label: 'NGN' },
    { value: 'uah', label: 'UAH' },
    { value: 'vnd', label: 'VND' },
  ];

  let defaultOption = { value: 'usd', label: 'USD' };
  for (let i = 0; i < currencies.length; i++) {
    if (currencies[i].value.toLowerCase() === selectedCurrency.toLowerCase()) {
      defaultOption = currencies[i];
      break;
    }
  }

  const [selectCurrency, setSelectCurrency] = useState(defaultOption);

  const onCurrencyChange = value => {
    setSelectCurrency(value);
    setSelectedCurrency(value.value);
  };

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
              src={"/images/flags/" + e.value.slice(0, 2) + ".svg"}
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

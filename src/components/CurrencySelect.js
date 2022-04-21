import Select from 'react-select'
import { useState } from 'react';

import '../assets/styles/components/currencySelect.scss';
import { ReactComponent as Eu } from "../assets/images/flags/eu.svg";
import { ReactComponent as Us } from "../assets/images/flags/us.svg";

function CurrencySelect({ setSelectedCurrency }) {

  const [selectCurrency, setSelectCurrency] = useState({ value: 'usd', label: 'USD', icon: <Us /> });

  const onCurrencyChange = value => {
    setSelectCurrency(value);
    setSelectedCurrency(value.value);
  };

  const currencies = [
    { value: 'usd', label: 'USD', icon: <Us /> },
    { value: 'eur', label: 'EUR', icon: <Eu /> },
  ];

  return (
    <Select
      options={currencies}
      defaultValue={selectCurrency}
      onChange={onCurrencyChange}
      isSearchable={false}
      getOptionLabel={e => (
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <span style={{ width: '24px', height: '18px' }}>{e.icon}</span>
          <span style={{ marginLeft: 5 }}>{e.label}</span>
        </div>
      )}
      className="currency-select"
      classNamePrefix="currency-select"
    />
  );
}
export default CurrencySelect;

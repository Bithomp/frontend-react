import Select from 'react-select'
import { useState } from 'react';

import '../assets/styles/components/currencySelect.scss';
import { ReactComponent as Us } from "../assets/images/flags/us.svg";
import { ReactComponent as Eu } from "../assets/images/flags/eu.svg";
import { ReactComponent as Jp } from "../assets/images/flags/jp.svg";
import { ReactComponent as Gb } from "../assets/images/flags/gb.svg";
import { ReactComponent as Au } from "../assets/images/flags/au.svg";
import { ReactComponent as Ca } from "../assets/images/flags/ca.svg";
import { ReactComponent as Ch } from "../assets/images/flags/ch.svg";
import { ReactComponent as Cn } from "../assets/images/flags/cn.svg";
import { ReactComponent as Hk } from "../assets/images/flags/hk.svg";
import { ReactComponent as Nz } from "../assets/images/flags/nz.svg";
import { ReactComponent as Se } from "../assets/images/flags/se.svg";
import krFlag from "../assets/images/flags/kr.png";
import { ReactComponent as Sg } from "../assets/images/flags/sg.svg";
import { ReactComponent as No } from "../assets/images/flags/no.svg";
import { ReactComponent as Mx } from "../assets/images/flags/mx.svg";
import { ReactComponent as In } from "../assets/images/flags/in.svg";
import { ReactComponent as Ru } from "../assets/images/flags/ru.svg";
import { ReactComponent as Za } from "../assets/images/flags/za.svg";
import { ReactComponent as Tr } from "../assets/images/flags/tr.svg";
import { ReactComponent as Br } from "../assets/images/flags/br.svg";
import { ReactComponent as Tw } from "../assets/images/flags/tw.svg";
import { ReactComponent as Dk } from "../assets/images/flags/dk.svg";
import { ReactComponent as Pl } from "../assets/images/flags/pl.svg";
import { ReactComponent as Th } from "../assets/images/flags/th.svg";
import { ReactComponent as Id } from "../assets/images/flags/id.svg";
import { ReactComponent as Hu } from "../assets/images/flags/hu.svg";
import { ReactComponent as Cz } from "../assets/images/flags/cz.svg";
import { ReactComponent as Il } from "../assets/images/flags/il.svg";
import { ReactComponent as Cl } from "../assets/images/flags/cl.svg";
import { ReactComponent as Ph } from "../assets/images/flags/ph.svg";
import { ReactComponent as Ae } from "../assets/images/flags/ae.svg";
import { ReactComponent as Sa } from "../assets/images/flags/sa.svg";
import { ReactComponent as My } from "../assets/images/flags/my.svg";
import { ReactComponent as Ar } from "../assets/images/flags/ar.svg";
import { ReactComponent as Bd } from "../assets/images/flags/bd.svg";
import { ReactComponent as Bh } from "../assets/images/flags/bh.svg";
import { ReactComponent as Kw } from "../assets/images/flags/kw.svg";
import { ReactComponent as Ng } from "../assets/images/flags/ng.svg";
import { ReactComponent as Ua } from "../assets/images/flags/ua.svg";
import { ReactComponent as Vn } from "../assets/images/flags/vn.svg";

function Kr() {
  return <img src={krFlag} alt="korea" height="18px" width="24px" />;
}

function CurrencySelect({ setSelectedCurrency }) {

  const [selectCurrency, setSelectCurrency] = useState({ value: 'usd', label: 'USD', icon: <Us /> });

  const onCurrencyChange = value => {
    setSelectCurrency(value);
    setSelectedCurrency(value.value);
  };

  const currencies = [
    { value: 'usd', label: 'USD', icon: <Us /> },
    { value: 'eur', label: 'EUR', icon: <Eu /> },
    { value: 'jpy', label: 'JPY', icon: <Jp /> },
    { value: 'gbp', label: 'GBP', icon: <Gb /> },
    { value: 'aud', label: 'AUD', icon: <Au /> },
    { value: 'cad', label: 'CAD', icon: <Ca /> },
    { value: 'chf', label: 'CHF', icon: <Ch /> },
    { value: 'cny', label: 'CNY', icon: <Cn /> },
    { value: 'hkd', label: 'HKD', icon: <Hk /> },
    { value: 'nzd', label: 'NZD', icon: <Nz /> },
    { value: 'sek', label: 'SEK', icon: <Se /> },
    { value: 'krw', label: 'KRW', icon: <Kr /> },
    { value: 'sgd', label: 'SGD', icon: <Sg /> },
    { value: 'nok', label: 'NOK', icon: <No /> },
    { value: 'mxn', label: 'MXN', icon: <Mx /> },
    { value: 'inr', label: 'INR', icon: <In /> },
    { value: 'rub', label: 'RUB', icon: <Ru /> },
    { value: 'zar', label: 'ZAR', icon: <Za /> },
    { value: 'try', label: 'TRY', icon: <Tr /> },
    { value: 'brl', label: 'BRL', icon: <Br /> },
    { value: 'twd', label: 'TWD', icon: <Tw /> },
    { value: 'dkk', label: 'DKK', icon: <Dk /> },
    { value: 'pln', label: 'PLN', icon: <Pl /> },
    { value: 'thb', label: 'THB', icon: <Th /> },
    { value: 'idr', label: 'IDR', icon: <Id /> },
    { value: 'huf', label: 'HUF', icon: <Hu /> },
    { value: 'czk', label: 'CZK', icon: <Cz /> },
    { value: 'ils', label: 'ILS', icon: <Il /> },
    { value: 'clp', label: 'CLP', icon: <Cl /> },
    { value: 'php', label: 'PHP', icon: <Ph /> },
    { value: 'aed', label: 'AED', icon: <Ae /> },
    { value: 'sar', label: 'SAR', icon: <Sa /> },
    { value: 'myr', label: 'MYR', icon: <My /> },
    { value: 'ars', label: 'ARS', icon: <Ar /> },
    { value: 'bdt', label: 'BDT', icon: <Bd /> },
    { value: 'bhd', label: 'BHD', icon: <Bh /> },
    { value: 'kwd', label: 'KWD', icon: <Kw /> },
    { value: 'ngn', label: 'NGN', icon: <Ng /> },
    { value: 'uah', label: 'UAH', icon: <Ua /> },
    { value: 'vnd', label: 'VND', icon: <Vn /> },
  ];

  return (
    <Select
      options={currencies}
      defaultValue={selectCurrency}
      onChange={onCurrencyChange}
      isSearchable={true}
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

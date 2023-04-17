import axios from 'axios'
import { useState, useEffect } from 'react'
import Image from 'next/image'

import CurrencySelect from "../UI/CurrencySelect"
import { typeNumberOnly } from '../../utils'

export default function Converter({ selectedCurrency, setSelectedCurrency, chartPeriod }) {
  const [data, setData] = useState({});
  const [xrpValue, setXrpValue] = useState('1');
  const [fiatValue, setFiatValue] = useState('');

  useEffect(() => {
    async function fetchData() {
      const response = await axios(
        'v2/rates/current/' + selectedCurrency,
      );
      setData(response.data);
      setFiatValue((xrpValue * response.data[selectedCurrency]).toFixed(2));
    }
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCurrency, chartPeriod])

  const onXrpAmountChange = e => {
    let xrpAmount = e.target.value
    if (xrpAmount) {
      xrpAmount = xrpAmount * 1
    }
    setXrpValue(xrpAmount)
    setFiatValue((xrpAmount * data[selectedCurrency]).toFixed(2))
  }

  const onFiatAmountChange = e => {
    let fiatAmount = e.target.value
    if (fiatAmount) {
      fiatAmount = fiatAmount * 1
    }
    setFiatValue(fiatAmount)
    setXrpValue((fiatAmount / data[selectedCurrency]).toFixed(2))
  }

  const rate = data[selectedCurrency] ? '1 XRP = ' + data[selectedCurrency] + ' ' + selectedCurrency.toUpperCase() : <br/>

  return <>
    <h2>{rate}</h2>

    <div>
      <input
        className="converter-amount"
        value={xrpValue}
        onChange={onXrpAmountChange}
        onKeyPress={typeNumberOnly}
        type="text"
        min="0"
        inputMode="decimal"
      />
      <div className="converter-xrp">
        <Image height={18} width={18} src="/images/xrp-black.svg" alt="xrp logo" />
        <span className="converter-xrp-text">XRP</span>
      </div>
    </div>
          
    <div>
      <input
        className="converter-amount"
        value={fiatValue}
        onChange={onFiatAmountChange}
        onKeyPress={typeNumberOnly}
        type="text"
        min="0"
        inputMode="decimal"
      />
      <div className="converter-currency-select">
        <CurrencySelect setSelectedCurrency={setSelectedCurrency} selectedCurrency={selectedCurrency} />
      </div>
    </div>
  </>;
};
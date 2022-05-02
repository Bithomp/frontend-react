import axios from 'axios';
import { useState, useEffect } from 'react';

import CurrencySelect from "../components/CurrencySelect";

import '../assets/styles/components/converter.scss';
import { ReactComponent as XrpBlack } from "../assets/images/xrp-black.svg";

function Converter({ selectedCurrency, setSelectedCurrency }) {
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
  }, [selectedCurrency, xrpValue]);

  const onXrpAmountChange = (e) => {
    const xrpAmount = e.target.value;
    setXrpValue(xrpAmount);
    setFiatValue((xrpAmount * data[selectedCurrency]).toFixed(2));
  }

  const onFiatAmountChange = (e) => {
    const fiatAmount = e.target.value;
    setFiatValue(fiatAmount);
    setXrpValue((fiatAmount / data[selectedCurrency]).toFixed(2));
  }

  return <>
    <div>
      <input className="converter-amount" value={xrpValue} onChange={onXrpAmountChange} />
      <div className="converter-xrp">
        <XrpBlack style={{ height: '18px', width: '18px' }} />
        <span className="converter-xrp-text">XRP</span>
      </div>
    </div>
    <div>
      <input className="converter-amount" value={fiatValue} onChange={onFiatAmountChange} />
      <div className="converter-currency-select">
        <CurrencySelect setSelectedCurrency={setSelectedCurrency} />
      </div>
    </div>
  </>;
}
export default Converter;
import axios from 'axios'
import { useState, useEffect } from 'react'
import Image from 'next/image'

import CurrencySelect from '../UI/CurrencySelect'
import { typeNumberOnly, nativeCurrency } from '../../utils'

export default function Converter({ selectedCurrency, setSelectedCurrency, chartPeriod }) {
  const [data, setData] = useState({})
  const [nativeTokenValue, setNativeTokenValue] = useState('1')
  const [fiatValue, setFiatValue] = useState('')

  useEffect(() => {
    async function fetchData() {
      const response = await axios('v2/rates/current/' + selectedCurrency)
      setData(response.data)
      setFiatValue((nativeTokenValue * response.data[selectedCurrency]).toFixed(2))
    }
    fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCurrency, chartPeriod])

  const onXrpAmountChange = (e) => {
    let xrpAmount = e.target.value
    if (xrpAmount) {
      xrpAmount = xrpAmount * 1
    }
    setNativeTokenValue(xrpAmount)
    setFiatValue((xrpAmount * data[selectedCurrency]).toFixed(2))
  }

  const onFiatAmountChange = (e) => {
    let fiatAmount = e.target.value
    if (fiatAmount) {
      fiatAmount = fiatAmount * 1
    }
    setFiatValue(fiatAmount)
    setNativeTokenValue((fiatAmount / data[selectedCurrency]).toFixed(2))
  }

  const rate = data[selectedCurrency] ? (
    '1 ' + nativeCurrency + ' = ' + data[selectedCurrency] + ' ' + selectedCurrency.toUpperCase()
  ) : (
    <br />
  )

  const nativeCurrenciesImages = {
    XRP: '/images/currencies/xrp.svg',
    XAH: '/images/currencies/xah.png'
  }

  return (
    <>
      <h2>{rate}</h2>
      <div>
        <input
          className="converter-amount"
          value={nativeTokenValue}
          onChange={onXrpAmountChange}
          onKeyPress={typeNumberOnly}
          type="text"
          min="0"
          inputMode="decimal"
          aria-label="Crypto amount"
        />
        <div className="converter-xrp">
          <Image height={18} width={18} src={nativeCurrenciesImages[nativeCurrency]} alt="crypto logo" />
          <span className="converter-xrp-text">{nativeCurrency}</span>
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
          aria-label="Fiat amount"
        />
        <div className="converter-currency-select">
          <CurrencySelect setSelectedCurrency={setSelectedCurrency} selectedCurrency={selectedCurrency} />
        </div>
      </div>
    </>
  )
}

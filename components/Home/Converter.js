import { useState, useEffect } from 'react'
import Image from 'next/image'

import CurrencySelect from '../UI/CurrencySelect'
import { typeNumberOnly, nativeCurrency, nativeCurrenciesImages } from '../../utils'

export default function Converter({ selectedCurrency, setSelectedCurrency, chartPeriod, fiatRate }) {
  const [nativeTokenValue, setNativeTokenValue] = useState('1')
  const [fiatValue, setFiatValue] = useState('')
  const [rendered, setRendered] = useState(false)

  useEffect(() => {
    setRendered(true)
  }, [])

  useEffect(() => {
    setFiatValue((nativeTokenValue * fiatRate).toFixed(2))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fiatRate, chartPeriod])

  const onXrpAmountChange = (e) => {
    let xrpAmount = e.target.value
    if (xrpAmount) {
      xrpAmount = xrpAmount * 1
    }
    setNativeTokenValue(xrpAmount)
    setFiatValue((xrpAmount * fiatRate).toFixed(2))
  }

  const onFiatAmountChange = (e) => {
    let fiatAmount = e.target.value
    if (fiatAmount) {
      fiatAmount = fiatAmount * 1
    }
    setFiatValue(fiatAmount)
    setNativeTokenValue((fiatAmount / fiatRate).toFixed(2))
  }

  return (
    <div className="converter">
      <p className="converter-rate" style={{ marginBottom: '1rem', fontSize: '1.4rem' }}>
        {fiatRate ? (
          <>
            1 {nativeCurrency} ={' '}
            <b>
              {fiatRate} {selectedCurrency.toUpperCase()}
            </b>
          </>
        ) : (
          <br />
        )}
      </p>
      <div className="converter-input-group">
        <input
          className="converter-amount"
          value={nativeTokenValue}
          onChange={onXrpAmountChange}
          onKeyPress={typeNumberOnly}
          type="text"
          min="0"
          inputMode="decimal"
          aria-label="Crypto amount"
          name="cryptoAmount"
        />
        <div className="converter-xrp">
          <Image height={18} width={18} src={nativeCurrenciesImages[nativeCurrency]} alt="crypto logo" />
          <span className="converter-xrp-text">{nativeCurrency}</span>
        </div>
      </div>
      <div className="converter-input-group">
        <input
          className="converter-amount"
          value={fiatValue}
          onChange={onFiatAmountChange}
          onKeyPress={typeNumberOnly}
          type="text"
          min="0"
          inputMode="decimal"
          aria-label="Fiat amount"
          name="fiatAmount"
        />
        {rendered ? (
          <div className="converter-currency-select">
            <CurrencySelect setSelectedCurrency={setSelectedCurrency} selectedCurrency={selectedCurrency} />
          </div>
        ) : (
          <div className="converter-xrp"></div>
        )}
      </div>
    </div>
  )
}

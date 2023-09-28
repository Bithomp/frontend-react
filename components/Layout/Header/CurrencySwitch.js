import { useState, useEffect } from "react"

import { fiatCurrencyList } from "../../../utils"

export default function CurrencySwitch({ 
  selectedCurrency, 
  setSelectedCurrency, 
  currencySwitchOpen, 
  setCurrencySwitchOpen,
  setLangSwitchOpen
 }) {
  const [rendered, setRendered] = useState(false)

  useEffect(() => {
    setRendered(true)
  }, [])

  if (!rendered) return null

  const spanClass = (currency) => {
    return selectedCurrency === currency.value ? "link blue" : "link"
  }

  const onCurrencySelect = (currency) => {
    setSelectedCurrency(currency)
    setCurrencySwitchOpen(false)
  }

  const td = (currencyList, i) => {
    let cols = [];
    for (let j = 0; j < 4; j++) {
      cols.push(
        <td key={j}>
          <span className={spanClass(currencyList[4 * i + j])} onClick={() => onCurrencySelect(currencyList[4 * i + j].value)}>
            {currencyList[4 * i + j].label}
          </span>
        </td>
      )
    }
    return cols
  }

  const currencyTable = () => {
    const currencyList = fiatCurrencyList
    const lines = Math.ceil(currencyList.length / 4)
    let rows = []
    for (let i = 0; i < lines; i++) {
      rows.push(
        <tr key={i}>{td(currencyList, i)}</tr>
      )
    }
    return <table>
      <tbody>
        {rows}
      </tbody>
    </table>
  }

  const switchOnClick = () => {
    setCurrencySwitchOpen(!currencySwitchOpen)
    setLangSwitchOpen(false)
  }

  return (
    <div className="top-switch">
      <div className="menu-dropdown">
        <div className="switch-container menu-dropdown-button contrast" onClick={switchOnClick}>
          {selectedCurrency.toUpperCase()}
        </div>
        {currencySwitchOpen &&
          <div className="menu-dropdown-content">
            {currencyTable()}
          </div>
        }
      </div>
    </div>
  )
}

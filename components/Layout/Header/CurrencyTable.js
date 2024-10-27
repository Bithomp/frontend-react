import { useState, useEffect } from 'react'

import { fiatCurrencyList } from '../../../utils'

export default function CurrencySwitch({ selectedCurrency, setSelectedCurrency, close }) {
  const [rendered, setRendered] = useState(false)

  useEffect(() => {
    setRendered(true)
  }, [])

  if (!rendered) return null

  const spanClass = (currency) => {
    return selectedCurrency === currency.value ? 'link blue' : 'link'
  }

  const onCurrencySelect = (currency) => {
    if (currency) {
      setSelectedCurrency(currency)
    }
    close()
  }

  const td = (currencyList, i) => {
    let cols = []
    for (let j = 0; j < 4; j++) {
      cols.push(
        <td key={j}>
          <span
            className={spanClass(currencyList[4 * i + j])}
            onClick={() => onCurrencySelect(currencyList[4 * i + j].value)}
          >
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
      rows.push(<tr key={i}>{td(currencyList, i)}</tr>)
    }
    return (
      <table>
        <tbody>{rows}</tbody>
      </table>
    )
  }

  return currencyTable()
}

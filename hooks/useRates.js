import { useState, useEffect } from 'react'
import { wssServer } from '../utils'
import { fetchCurrentFiatRate } from '../utils/common'

let ws = null
let requestId = 1

function sendData(currency) {
  if (ws.readyState) {
    ws.send(JSON.stringify({ 
      command: 'subscribe', 
      streams: ['rates'], 
      currency: currency.toLowerCase(), 
      id: requestId++ 
    }))
  } else {
    setTimeout(() => sendData(currency), 1000)
  }
}

export const useRates = (selectedCurrency = 'usd') => {
  const [fiatRate, setFiatRate] = useState(null)
  const [update, setUpdate] = useState(true)

  const connect = () => {
    ws = new WebSocket(wssServer)

    ws.onopen = () => {
      sendData(selectedCurrency)
    }

    ws.onmessage = (evt) => {
      const message = JSON.parse(evt.data)
      if (message.type === 'rates') {
        const currencyKey = selectedCurrency.toLowerCase()
        if (message[currencyKey] !== undefined) {
          setFiatRate(message[currencyKey])
        }
      }
    }

    ws.onclose = () => {
      if (update) {
        connect()
      }
    }
  }

  useEffect(() => {
    setUpdate(true)
    
    // Fetch initial rate via HTTP while WebSocket connects
    fetchCurrentFiatRate(selectedCurrency, setFiatRate).catch(() => {})
    
    if (navigator.onLine) {
      connect()
    }
    
    return () => {
      setFiatRate(null)
      setUpdate(false)
      if (ws) ws.close()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCurrency])

  return { fiatRate }
}

import { useState, useEffect, useRef } from 'react'
import { wssServer } from '../utils'
import { fetchCurrentFiatRate } from '../utils/common'

let requestId = 1

function sendData(ws, currency, command = 'subscribe') {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ 
      command: command, 
      streams: ['rates'], 
      currency: currency.toLowerCase(), 
      id: requestId++ 
    }))
  }
}

export const useRates = (selectedCurrency = 'usd') => {
  const [fiatRate, setFiatRate] = useState(null)
  const [update, setUpdate] = useState(true)
  const wsRef = useRef(null)
  const currentCurrencyRef = useRef(null)

  const connect = (currency) => {
    // Close existing connection if any
    if (wsRef.current) {
      // Unsubscribe from previous currency if different
      if (currentCurrencyRef.current && currentCurrencyRef.current !== currency) {
        sendData(wsRef.current, currentCurrencyRef.current, 'unsubscribe')
      }
      wsRef.current.close()
      wsRef.current = null
    }

    wsRef.current = new WebSocket(wssServer)

    wsRef.current.onopen = () => {
      sendData(wsRef.current, currency)
      currentCurrencyRef.current = currency
    }

    wsRef.current.onmessage = (evt) => {
      const message = JSON.parse(evt.data)
      if (message.type === 'rates') {
        const currencyKey = currency.toLowerCase()
        if (message[currencyKey] !== undefined) {
          setFiatRate(message[currencyKey])
        }
      }
    }

    wsRef.current.onclose = () => {
      if (update) {
        // Reconnect after a delay, but only if the currency hasn't changed
        setTimeout(() => {
          if (update && currentCurrencyRef.current === currency) {
            connect(currency)
          }
        }, 1000)
      }
    }

    wsRef.current.onerror = (error) => {
      console.error('WebSocket error:', error)
    }
  }

  useEffect(() => {
    setUpdate(true)
    
    fetchCurrentFiatRate(selectedCurrency, setFiatRate).catch(() => {})
    
    if (navigator.onLine) {
      connect(selectedCurrency)
    }
    
    return () => {
      setFiatRate(null)
      setUpdate(false)
      if (wsRef.current) {
        // Unsubscribe before closing
        if (currentCurrencyRef.current) {
          sendData(wsRef.current, currentCurrencyRef.current, 'unsubscribe')
        }
        wsRef.current.close()
        wsRef.current = null
      }
      currentCurrencyRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCurrency])

  return { fiatRate }
}

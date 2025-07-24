import { useState, useEffect, useRef } from 'react'
import { wssServer } from '../utils'
import { fetchCurrentFiatRate } from '../utils/common'

let requestId = 1

export const useRates = (selectedCurrency = 'usd') => {
  const [fiatRate, setFiatRate] = useState(null)
  const [isConnected, setIsConnected] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState('disconnected')
  const [lastError, setLastError] = useState(null)
  const wsRef = useRef(null)
  const reconnectTimeoutRef = useRef(null)
  const shouldConnectRef = useRef(true)

  const sendSubscription = () => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      const subscriptionMessage = {
        command: 'subscribe',
        streams: ['rates'],
        currency: selectedCurrency.toLowerCase(),
        id: requestId++
      }
      
      try {
        wsRef.current.send(JSON.stringify(subscriptionMessage))
        console.log('Sent rates subscription for currency:', selectedCurrency)
      } catch (error) {
        console.error('Error sending subscription:', error)
        setLastError(error.message)
      }
    } else {
      setTimeout(sendSubscription, 1000)
    }
  }

  const connect = () => {
    if (!shouldConnectRef.current || !navigator.onLine) {
      return
    }

    try {
      setConnectionStatus('connecting')
      setLastError(null)
      
      wsRef.current = new WebSocket(wssServer)

      wsRef.current.onopen = () => {
        console.log('Rates WebSocket connected')
        setIsConnected(true)
        setConnectionStatus('connected')
        setLastError(null)
        sendSubscription()
      }

      wsRef.current.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data)
          
          if (message.type === 'rates') {
            // Message format: {"usd":2.16402,"type":"rates"}
            const currencyKey = selectedCurrency.toLowerCase()
            if (message[currencyKey] !== undefined) {
              setFiatRate(message[currencyKey])
              console.log(`Rate updated for ${selectedCurrency.toUpperCase()}:`, message[currencyKey])
            }
          }
        } catch (error) {
          console.error('Error parsing rates message:', error)
          setLastError(error.message)
        }
      }

      wsRef.current.onclose = (event) => {
        console.log('Rates WebSocket closed:', event.code, event.reason)
        setIsConnected(false)
        setConnectionStatus('disconnected')
        
        // Reconnect if it should still be connected
        if (shouldConnectRef.current && !event.wasClean) {
          console.log('Attempting to reconnect rates WebSocket...')
          reconnectTimeoutRef.current = setTimeout(() => {
            if (shouldConnectRef.current) {
              connect()
            }
          }, 3000) // Reconnect after 3 seconds
        }
      }

      wsRef.current.onerror = (error) => {
        console.error('Rates WebSocket error:', error)
        setLastError('WebSocket connection error')
        setConnectionStatus('error')
      }

    } catch (error) {
      console.error('Error creating WebSocket connection:', error)
      setLastError(error.message)
      setConnectionStatus('error')
    }
  }

  const disconnect = () => {
    shouldConnectRef.current = false
    
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }
    
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }
    
    setIsConnected(false)
    setConnectionStatus('disconnected')
  }

  // Effect to handle connection when currency changes
  useEffect(() => {
    shouldConnectRef.current = true
    
    // Fetch initial rate via HTTP while WebSocket connects
    fetchCurrentFiatRate(selectedCurrency, setFiatRate).catch((error) => {
      console.error('Error fetching initial rate:', error)
    })
    
    if (navigator.onLine) {
      connect()
    }

    // Handle online/offline events
    const handleOnline = () => {
      if (shouldConnectRef.current && !isConnected) {
        connect()
      }
    }

    const handleOffline = () => {
      disconnect()
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      disconnect()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCurrency])

  // Clean up on unmount
  useEffect(() => {
    return () => {
      disconnect()
    }
  }, [])

  return {
    fiatRate,
    isConnected,
    connectionStatus,
    lastError
  }
}

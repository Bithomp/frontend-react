import { useEffect, useState } from 'react'

import {
  createPartnerConnection,
  deletePartnerConnection,
  getPartnerConnectionListeners,
  getPartnerConnections
} from '@/api/partner'

export const useGetNotifications = () => {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  const [channels, setChannels] = useState([])
  const [rules, setRules] = useState([])

  useEffect(() => {
    const fetchAllRules = async () => {
      setIsLoading(true)
      try {
        const data = await getPartnerConnections()
        const connections = data.connections
        if (!connections || !Array.isArray(connections)) {
          setRules([])
          setChannels([])
          return
        }
        // Fetch listeners for all connections concurrently
        const allRulesPerConnection = await Promise.all(
          connections.map(async (connection) => {
            try {
              const response = await getPartnerConnectionListeners(connection.id)
              const listenersArr = response.listeners || []
              // Attach connection info to each listener
              return {
                ...connection,
                rules: listenersArr.map((listener) => ({
                  ...listener,
                  channel: connection // renamed for clarity
                }))
              }
            } catch (err) {
              // If error, return connection with empty rules
              return {
                ...connection,
                rules: []
              }
            }
          })
        )
        setChannels(allRulesPerConnection)
        // Flatten all rules for the rules state, each rule with its related channel
        setRules(allRulesPerConnection.flatMap((channel) => channel.rules))
      } catch (error) {
        setError(error)
        setRules([])
        setChannels([])
      } finally {
        setIsLoading(false)
      }
    }
    fetchAllRules()
  }, [])

  return {
    data: {
      rules, // each rule has a 'channel' property
      channels // each channel has a 'rules' property
    },
    isLoading,
    error
  }
}

export const useCreateNotificationChannel = () => {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  const [data, setData] = useState(null)

  const mutate = async (data) => {
    setIsLoading(true)
    try {
      const response = await createPartnerConnection(data)
      setData(response)
    } catch (error) {
      setError(error)
    } finally {
      setIsLoading(false)
    }
  }

  return {
    data,
    isLoading,
    error,
    mutate
  }
}

export const useDeleteNotificationChannel = () => {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)

  const mutate = async (channelId) => {
    setIsLoading(true)
    try {
      await deletePartnerConnection(channelId)
      // Optionally invalidate/refetch data
    } catch (error) {
      setError(error)
    } finally {
      setIsLoading(false)
    }
  }

  return { mutate, isLoading, error }
}

import { useCallback, useEffect, useState } from 'react'

import {
  createPartnerConnectionListener,
  createPartnerConnection,
  createPartner,
  deletePartnerConnectionListener,
  deletePartnerConnection,
  getPartnerConnectionListenerExecutions,
  getPartnerConnectionListeners,
  getPartnerConnections,
  updatePartnerConnection,
  updatePartnerConnectionListener
} from '@/api/partner'

export const useNotifications = ({ enabled = true } = {}) => {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  const [channels, setChannels] = useState([])
  const [rules, setRules] = useState([])

  const fetchNotifications = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const data = await getPartnerConnections()
      const connections = Array.isArray(data?.connections) ? data.connections : []
      const channelsWithRules = await Promise.all(
        connections.map(async (connection) => {
          try {
            const response = await getPartnerConnectionListeners(connection.id)
            const listeners = Array.isArray(response?.listeners) ? response.listeners : []
            return {
              ...connection,
              rules: listeners.map((listener) => ({
                ...listener,
                channel: connection
              }))
            }
          } catch {
            return {
              ...connection,
              rules: []
            }
          }
        })
      )

      setChannels(channelsWithRules)
      setRules(channelsWithRules.flatMap((channel) => channel.rules))
    } catch (error) {
      setError(error)
      setRules([])
      setChannels([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!enabled) return
    fetchNotifications()
  }, [enabled, fetchNotifications])

  return {
    rules,
    channels,
    isLoading,
    error,
    refetch: fetchNotifications
  }
}

export const useCreateNotificationChannel = () => {
  return useNotificationMutation(createPartnerConnection)
}

export const useCreateNotificationProfile = () => {
  return useNotificationMutation(createPartner)
}

export const useUpdateNotificationChannel = () => {
  return useNotificationMutation((data) => updatePartnerConnection(data.id, data.payload))
}

export const useDeleteNotificationChannel = () => {
  return useNotificationMutation(deletePartnerConnection)
}

export const useCreateNotificationRule = () => {
  return useNotificationMutation((data) => createPartnerConnectionListener(data.connectionId, data.payload))
}

export const useUpdateNotificationRule = () => {
  return useNotificationMutation((data) => updatePartnerConnectionListener(data.connectionId, data.id, data.payload))
}

export const useDeleteNotificationRule = () => {
  return useNotificationMutation((data) => deletePartnerConnectionListener(data.connectionId, data.id))
}

export const useNotificationRuleExecutions = () => {
  return useNotificationMutation((data) => getPartnerConnectionListenerExecutions(data.connectionId, data.id))
}

const useNotificationMutation = (request) => {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  const [data, setData] = useState(null)

  const mutate = async (data) => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await request(data)
      setData(response)
      return response
    } catch (error) {
      setError(error)
      throw error
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

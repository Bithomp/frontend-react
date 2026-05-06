import { axiosAdmin } from '@/utils/axios'

export const createPartner = async (data) => {
  const response = await axiosAdmin.post('partner', data)
  return response.data
}

export const getPartnerConnections = async () => {
  const response = await axiosAdmin.get('partner/connections')
  return response.data
}

export const getPartnerConnection = async (connectionId) => {
  const response = await axiosAdmin.get(`partner/connection/${connectionId}`)
  return response.data
}

export const getPartnerConnectionListeners = async (connectionId) => {
  const response = await axiosAdmin.get(`partner/connection/${connectionId}/listeners`)
  return response.data
}

export const createPartnerConnection = async (data) => {
  const response = await axiosAdmin.post('partner/connections', data)
  return response.data
}

export const updatePartnerConnection = async (connectionId, data) => {
  const response = await axiosAdmin.put(`partner/connection/${connectionId}`, data)
  return response.data
}

export const deletePartnerConnection = async (connectionId) => {
  const response = await axiosAdmin.delete(`partner/connection/${connectionId}`)
  return response.data
}

export const createPartnerConnectionListener = async (connectionId, data) => {
  const response = await axiosAdmin.post(`partner/connection/${connectionId}/listeners`, data)
  return response.data
}

export const updatePartnerConnectionListener = async (connectionId, listenerId, data) => {
  const response = await axiosAdmin.put(`partner/connection/${connectionId}/listener/${listenerId}`, data)
  return response.data
}

export const deletePartnerConnectionListener = async (connectionId, listenerId) => {
  const response = await axiosAdmin.delete(`partner/connection/${connectionId}/listener/${listenerId}`)
  return response.data
}

export const getPartnerConnectionListenerExecutions = async (connectionId, listenerId) => {
  const response = await axiosAdmin.get(`partner/connection/${connectionId}/listener/${listenerId}/executions`)
  return response.data
}

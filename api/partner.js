import { axiosAdmin } from '@/utils/axios'

export const getPartnerConnections = async () => {
    const response = await axiosAdmin.get('/partner/connections')
    return response.data
}

export const getPartnerConnectionListeners = async (connectionId) => {
    const response = await axiosAdmin.get(`/partner/connection/${connectionId}/listeners`)
    return response.data
}

export const createPartnerConnection = async (data) => {
    const response = await axiosAdmin.post('/partner/connections', data)
    return response.data
}

export const deletePartnerConnection = async (connectionId) => {
    const response = await axiosAdmin.delete(`/partner/connection/${connectionId}`)
    return response.data
}
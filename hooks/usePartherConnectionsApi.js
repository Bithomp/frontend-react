import { useEffect, useState } from 'react'

import { getPartnerConnections, getPartnerConnectionListeners } from '@/api/partnerConnections'

export const useGetPartherListeners = () => {
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState(null)
    const [listeners, setListeners] = useState([])

    useEffect(() => {
        const fetchAllListeners = async () => {
            setIsLoading(true)
            try {
                const data = await getPartnerConnections()
                const connections = data.connections
                if (!connections || !Array.isArray(connections)) {
                    setListeners([])
                    return
                }
                // Fetch listeners for all connections concurrently
                const allListeners = await Promise.all(
                    connections.map(async (connection) => {
                        try {
                            const response = await getPartnerConnectionListeners(connection.id)
                            const listenersArr = response.listeners || []
                            // Attach connection info to each listener
                            return listenersArr.map(listener => ({
                                ...listener,
                                connection
                            }))
                        } catch (err) {
                            // If error, return empty array for this connection
                            return []
                        }
                    })
                )
                // Flatten the array
                setListeners(allListeners.flat())
            } catch (error) {
                setError(error)
                setListeners([])
            } finally {
                setIsLoading(false)
            }
        }
        fetchAllListeners()
    }, [])

    return {
        data: listeners,
        isLoading,
        error
    }
}
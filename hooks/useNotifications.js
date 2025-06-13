import { useEffect, useState } from 'react'

import { getPartnerConnections, getPartnerConnectionListeners } from '@/api/partner'

export const useNotifications = () => {
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
                                rules: listenersArr.map(listener => ({
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
                setRules(allRulesPerConnection.flatMap(channel => channel.rules))
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
        rules, // each rule has a 'channel' property
        channels, // each channel has a 'rules' property
        isLoading,
        error
    }
}

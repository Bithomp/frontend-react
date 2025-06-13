import { useTranslation } from 'next-i18next'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'

import { useNotifications } from '@/hooks/useNotifications'
import AdminTabs from '@/components/Tabs/AdminTabs'
import EmptyState from '@/components/Admin/notifications/EmptyState'
import ErrorState from '@/components/Admin/notifications/ErrorState'

export const getStaticProps = async (context) => {
    const { locale } = context
    return {
        props: {
            ...(await serverSideTranslations(locale, ['common', 'admin']))
        }
    }
}

export default function Notifications() {
    const { t } = useTranslation('admin')
    const { rules, channels, isLoading, error } = useNotifications()

    if (isLoading) {
        return <div>Loading...</div>
    }
    if (error) {
        return <ErrorState />
    }

    return (
        <main className="page-admin content-center">
            <h1 className="center">{t('header', { ns: 'admin' })}</h1>
            <AdminTabs name="mainTabs" tab="notifications" />
                <p className="text-left mb-8">Set up custom rules to get notified about blockchain events - like NFT listings or high-value sales - through Slack, Discord, Email, and more.</p>
            {rules.length === 0 && channels.length === 0 && <EmptyState />}

            <h2>Your notification rules</h2>
            <div className="flex flex-col gap-4">
                {rules.map((rule) => (
                    <div
                        key={rule.id}
                        className="bg-white rounded-lg shadow p-4 border border-gray-200"
                    >
                        <div className="font-semibold text-lg mb-2">
                            {rule.name || `Rule #${rule.id}`}
                        </div>
                        <div className="text-sm text-gray-600 mb-1">
                            Channel: <span className="font-mono">{rule.channel?.name || rule.channel?.type || 'Unknown'}</span>
                        </div>
                        <div className="text-xs text-gray-500 mb-2">
                            Type: {rule.type || 'N/A'}
                        </div>
                        <pre className="bg-gray-50 rounded p-2 text-xs overflow-x-auto">
                            {JSON.stringify(rule, null, 2)}
                        </pre>
                    </div>
                ))}
            </div>

            <h2>Notification channels</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {channels.map((channel) => (
                    <pre key={channel.id}>{JSON.stringify(channel, null, 2)}</pre>
                ))}
            </div>
        </main>
    )
}
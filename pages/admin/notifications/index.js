import { useTranslation } from 'next-i18next'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'

import AddChannelButton from '@/components/Admin/notifications/AddChannelButton'
import AddRuleButton from '@/components/Admin/notifications/AddRuleButton'
import ChannelCard from '@/components/Admin/notifications/ChannelCard'
import EmptyState from '@/components/Admin/notifications/EmptyState'
import ErrorState from '@/components/Admin/notifications/ErrorState'
import RuleCard from '@/components/Admin/notifications/RuleCard'
import AdminTabs from '@/components/Tabs/AdminTabs'
import { useGetNotifications } from '@/hooks/useNotifications'

export const getServerSideProps = async (context) => {
  const { locale } = context
  return {
    props: {
      ...(await serverSideTranslations(locale, ['common', 'admin']))
    }
  }
}

export default function Notifications({ sessionToken, openEmailLogin }) {
  const { t } = useTranslation('admin')
  const notifications = useGetNotifications()

  if (sessionToken && notifications.isLoading) {
    return <div>Loading...</div>
  }
  if (sessionToken && notifications.error) {
    return <ErrorState />
  }

  return (
    <main className="page-admin content-center">
      <h1 className="center">{t('header', { ns: 'admin' })}</h1>
      <AdminTabs name="mainTabs" tab="notifications" />

      {sessionToken ? (
        <>
          <p className="text-left mb-8">
            Set up custom rules to get notified about blockchain events - like NFT listings or high-value sales -
            through Slack, Discord, Email, and more.
          </p>
          {notifications.data.rules.length === 0 && notifications.data.channels.length === 0 && (
            <EmptyState
              title="No notification rules or channels yet"
              description="Start by adding a channel to get notified about blockchain events"
              action={<AddChannelButton />}
              showImage={true}
            />
          )}

          {notifications.data.channels.length > 0 && notifications.data.rules.length === 0 && (
            <>
              <EmptyState
                title="No notification rules yet"
                description="Add a rule to get notified about blockchain events"
                action={<AddRuleButton />}
              />
            </>
          )}

          {notifications.data.rules.length > 0 && (
            <>
              <div className="flex justify-between items-center">
                <h2>Your notification rules</h2>
                <AddRuleButton />
              </div>
              <div className="flex flex-col gap-4">
                {notifications.data.rules.map((rule) => (
                  <RuleCard key={rule.id} rule={rule} />
                ))}
              </div>
            </>
          )}
          {notifications.data.channels.length > 0 && (
            <>
              <div className="h-8"></div>
              <div className="flex justify-between items-center">
                <h2>Notification channels</h2>
                <AddChannelButton />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {notifications.data.channels.map((channel) => (
                  <ChannelCard key={channel.id} channel={channel} />
                ))}
              </div>
            </>
          )}
        </>
      ) : (
        <>
          <br />
          <div className="center">
            <div style={{ maxWidth: '440px', margin: 'auto' }}>
              <p>Set up custom notification rules for blockchain events.</p>
              <p>Get notified via Slack, Discord, Email and more.</p>
            </div>
            <br />
            <center>
              <button className="button-action" onClick={() => openEmailLogin()}>
                Register or Sign In
              </button>
            </center>
          </div>
        </>
      )}
    </main>
  )
}

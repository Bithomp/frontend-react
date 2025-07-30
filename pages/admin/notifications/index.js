import { useTranslation } from 'next-i18next'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'

import EmptyState from '@/components/Admin/notifications/EmptyState'
import ErrorState from '@/components/Admin/notifications/ErrorState'
import ChannelCard from '@/components/Admin/notifications/ChannelCard'
import RuleCard from '@/components/Admin/notifications/RuleCard'
import AdminTabs from '@/components/Tabs/AdminTabs'
import { useNotifications } from '@/hooks/useNotifications'

export const getStaticProps = async (context) => {
  const { locale } = context
  return {
    props: {
      ...(await serverSideTranslations(locale, ['common', 'admin']))
    }
  }
}

export default function Notifications({ sessionToken, openEmailLogin }) {
  const { t } = useTranslation('admin')
  const { rules, channels, isLoading, error } = useNotifications()



  if (sessionToken && isLoading) {
    return <div>Loading...</div>
  }
  if (sessionToken && error) {
    return <ErrorState />
  }

  return (
    <>
      <main className="page-admin content-center">
        <h1 className="center">{t('header', { ns: 'admin' })}</h1>
        <AdminTabs name="mainTabs" tab="notifications" />
        
        {sessionToken ? (
          <>
            <p className="text-left mb-8">
              Set up custom rules to get notified about blockchain events - like NFT listings or high-value sales - through
              Slack, Discord, Email, and more.
            </p>
            {rules.length === 0 && channels.length === 0 && <EmptyState />}

            {rules.length > 0 && (
              <>
                <h2>Your notification rules</h2>
                <div className="flex flex-col gap-4">
                  {rules.map((rule) => (
                    <RuleCard key={rule.id} rule={rule} />
                  ))}
                </div>
              </>
            )}
            {channels.length > 0 && (
              <>
                <div className="h-8"></div>
                <h2>Notification channels</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {channels.map((channel) => (
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
    </>
  )
}

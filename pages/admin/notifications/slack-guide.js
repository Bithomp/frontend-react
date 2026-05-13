import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { useTranslation } from 'next-i18next'
import Link from 'next/link'
import { FaSlack } from 'react-icons/fa'

import AdminTabs from '@/components/Tabs/AdminTabs'
import SEO from '@/components/SEO'
import { adminNotificationGuide } from '@/styles/pages/adminNotificationGuide.module.scss'

export const getServerSideProps = async (context) => {
  const { locale } = context
  return {
    props: {
      ...(await serverSideTranslations(locale, ['common', 'admin']))
    }
  }
}

const imagePath = '/images/pages/admin/notifications/slack-guide/'

const guideSteps = [
  {
    title: 'Create a Slack app',
    text: 'Open the Slack API app page and create a new app for the workspace where alerts should be posted.',
    images: [
      { file: 'step-01.png', caption: 'Open Your Apps in Slack API and click Create an App.' },
      { file: 'step-02.png', caption: 'Choose From scratch so you can configure the app manually.' },
      { file: 'step-03.png', caption: 'After the app is created, open Incoming Webhooks from the left menu.' }
    ]
  },
  {
    title: 'Enable Incoming Webhooks',
    text: 'Incoming Webhooks let Alerts post messages into a Slack channel using a private webhook URL.',
    images: [
      { file: 'step-04.png', caption: 'Turn Activate Incoming Webhooks on for the app.' },
      { file: 'step-05.png', caption: 'Scroll to Webhook URLs for Your Workspace and click Add New Webhook.' }
    ]
  },
  {
    title: 'Choose a channel and copy the webhook URL',
    text: 'Select the Slack channel that should receive alerts, allow the app, and copy the generated webhook URL.',
    images: [
      { file: 'step-06.png', caption: 'Choose the channel for the webhook, then click Allow.' },
      { file: 'step-07.png', caption: 'Copy the new Webhook URL from the Incoming Webhooks page.' }
    ]
  },
  {
    title: 'Paste the webhook into Alerts',
    text: 'Return to Alerts, choose Slack, enter a private channel name, paste the webhook URL, and save the channel.',
    images: [
      { file: 'step-08.png', caption: 'Paste the Slack Incoming Webhook URL into the Webhook URL field in Alerts.' }
    ]
  }
]

export default function SlackNotificationGuide() {
  const { t } = useTranslation('admin')
  const tg = (key, defaultValue) => t(`notifications.slack-guide.${key}`, { defaultValue })

  return (
    <>
      <SEO
        title={tg('seo-title', 'Slack notification setup guide')}
        description={tg('seo-description', 'How to create a Slack Incoming Webhook URL for alerts.')}
        noindex={true}
      />
      <div className={adminNotificationGuide}>
        <div className="page-admin content-center notification-guide-page">
          <h1 className="center">{t('header')}</h1>
          <AdminTabs name="mainTabs" tab="notifications" />

          <section className="notification-guide-hero">
            <div>
              <div className="notification-guide-eyebrow">{tg('eyebrow', 'Slack setup')}</div>
              <h1>{tg('title', 'Set up Slack alerts')}</h1>
              <p>
                {tg(
                  'intro',
                  'Create a Slack app, enable Incoming Webhooks, and copy the webhook URL into Alerts.'
                )}
              </p>
            </div>
            <div className="notification-guide-icon" aria-hidden="true">
              <FaSlack />
            </div>
          </section>

          <section className="notification-guide-note">
            <h2>{tg('before-title', 'Before you start')}</h2>
            <ul className="notification-guide-checklist">
              <li>{tg('before.workspace', 'Use a Slack workspace where you can create or install apps.')}</li>
              <li>{tg('before.channel', 'Choose the channel that should receive alerts before creating the webhook.')}</li>
              <li>{tg('before.private', 'Keep the webhook URL private. Anyone with it can post to that channel.')}</li>
              <li>{tg('before.recreate', 'Create a new webhook if you need to move alerts to another channel.')}</li>
            </ul>
          </section>

          {guideSteps.map((step, index) => (
            <section className="notification-guide-step" key={step.title}>
              <h2>
                {index + 1}. {tg(`steps.${index}.title`, step.title)}
              </h2>
              <p>{tg(`steps.${index}.text`, step.text)}</p>
              <div className="notification-guide-images">
                {step.images.map((image, imageIndex) => (
                  <figure className="notification-guide-figure" key={image.file}>
                    <img
                      alt={tg(`steps.${index}.images.${imageIndex}`, image.caption)}
                      loading="lazy"
                      src={imagePath + image.file}
                    />
                    <figcaption>{tg(`steps.${index}.images.${imageIndex}`, image.caption)}</figcaption>
                  </figure>
                ))}
              </div>
            </section>
          ))}

          <div className="notification-guide-actions">
            <Link href="/admin/notifications" className="button-action">
              {tg('back', 'Back to Alerts')}
            </Link>
            <a href="https://api.slack.com/apps" className="button-action" target="_blank" rel="noreferrer">
              {tg('open-portal', 'Open Slack API apps')}
            </a>
          </div>
        </div>
      </div>
    </>
  )
}

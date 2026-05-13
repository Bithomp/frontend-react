import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { useTranslation } from 'next-i18next'
import Link from 'next/link'
import { FaXTwitter } from 'react-icons/fa6'

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

const imagePath = '/images/pages/admin/notifications/x-guide/'

const guideSteps = [
  {
    title: 'Create or open your X account',
    text: 'Use the X account that should publish alerts. The screenshots show the full new-account flow, including email confirmation and profile setup.',
    images: [
      { file: 'step-01.png', caption: 'Open X and choose Create account, or sign in if the bot account already exists.' },
      { file: 'step-02.png', caption: 'Enter the account name, email address, and date of birth.' },
      { file: 'step-03.png', caption: 'Choose the X customization options and continue.' },
      { file: 'step-04.png', caption: 'Review the account details and click Sign up.' },
      { file: 'step-05.png', caption: 'Complete the X account authentication check.' },
      { file: 'step-06.png', caption: 'Copy the verification code from the email sent by X.' },
      { file: 'step-07.png', caption: 'Add the profile picture for the account, or continue with your chosen setup.' },
      { file: 'step-08.png', caption: 'Confirm the account opens to the X home page.' }
    ]
  },
  {
    title: 'Apply for X developer access',
    text: 'Open the X Developer Portal, choose the available free developer account option, and complete the agreement form with a plain description of the alerts bot.',
    images: [
      { file: 'step-09.png', caption: 'Open the X Developer Platform page.' },
      { file: 'step-10.png', caption: 'Choose the Free account option on the developer plan page.' },
      { file: 'step-11.png', caption: 'Open the developer agreement form and fill in the intended use.' },
      { file: 'step-12.png', caption: 'Accept the required policy checkboxes and submit the form.' }
    ]
  },
  {
    title: 'Open the project app and generate keys',
    text: 'The Developer Portal creates a project and app. Open that app, then use Keys and tokens to generate the API Key pair and Access Token pair needed by the Alerts channel.',
    images: [
      { file: 'step-13.png', caption: 'Open the default project and app from the Developer Portal dashboard.' },
      { file: 'step-14.png', caption: 'Check the project overview and select the app from the left menu.' },
      { file: 'step-15.png', caption: 'Open app Settings and click Set up under User authentication settings.' },
      { file: 'step-16.png', caption: 'Open Keys and tokens to generate API Key, API Key Secret, Access Token, and Access Token Secret.' },
      { file: 'step-17.png', caption: 'Save API Key and API Key Secret. These match the first two fields in Bithomp Alerts.' },
      { file: 'step-18.png', caption: 'Save Access Token and Access Token Secret. If they were created with Read Only permissions, update permissions next.' }
    ]
  },
  {
    title: 'Enable write permissions',
    text: 'The app must have Read and write permissions before it can publish alerts. After changing permissions, regenerate Access Token and Access Token Secret so the new token can write.',
    images: [
      { file: 'step-19.png', caption: 'In User authentication settings, select Read and write permissions.' },
      { file: 'step-20.png', caption: 'Choose Web App, Automated App or Bot as the app type.' },
      { file: 'step-21.png', caption: 'Fill in the required Callback URI / Redirect URL and Website URL fields.' },
      { file: 'step-22.png', caption: 'Use your public callback and website URLs, then save the settings.' },
      { file: 'step-23.png', caption: 'Confirm the permission change when X asks.' },
      { file: 'step-24.png', caption: 'X shows OAuth 2.0 Client ID and Client Secret after saving. These are not the four Alerts channel fields.' }
    ]
  },
  {
    title: 'Copy the keys into Bithomp Alerts',
    text: 'Return to Keys and tokens after Read and write is saved. Paste API Key, API Key Secret, Access Token, and Access Token Secret into the matching fields on the Alerts page. If Access Token was generated before changing permissions, regenerate it first.',
    images: []
  }
]

export default function XNotificationGuide() {
  const { t } = useTranslation('admin')

  return (
    <>
      <SEO
        title={t('notifications.x-guide.seo-title')}
        description={t('notifications.x-guide.seo-description')}
        noindex={true}
      />
      <div className={adminNotificationGuide}>
        <div className="page-admin content-center notification-guide-page">
          <h1 className="center">{t('header')}</h1>
          <AdminTabs name="mainTabs" tab="notifications" />

          <section className="notification-guide-hero">
            <div>
              <div className="notification-guide-eyebrow">{t('notifications.x-guide.eyebrow')}</div>
              <h1>{t('notifications.x-guide.title')}</h1>
              <p>{t('notifications.x-guide.intro')}</p>
            </div>
            <div className="notification-guide-icon" aria-hidden="true">
              <FaXTwitter />
            </div>
          </section>

          <section className="notification-guide-note">
            <h2>{t('notifications.x-guide.before-title')}</h2>
            <ul className="notification-guide-checklist">
              <li>{t('notifications.x-guide.before.account')}</li>
              <li>{t('notifications.x-guide.before.private')}</li>
              <li>{t('notifications.x-guide.before.write')}</li>
              <li>{t('notifications.x-guide.before.regenerate')}</li>
            </ul>
          </section>

          {guideSteps.map((step, index) => (
            <section className="notification-guide-step" key={step.title}>
              <h2>
                {index + 1}. {t(`notifications.x-guide.steps.${index}.title`, { defaultValue: step.title })}
              </h2>
              <p>{t(`notifications.x-guide.steps.${index}.text`, { defaultValue: step.text })}</p>
              {step.images.length > 0 && (
                <div className="notification-guide-images">
                  {step.images.map((image, imageIndex) => (
                    <figure className="notification-guide-figure" key={image.file}>
                      <img
                        alt={t(`notifications.x-guide.steps.${index}.images.${imageIndex}`, {
                          defaultValue: image.caption
                        })}
                        loading="lazy"
                        src={imagePath + image.file}
                      />
                      <figcaption>
                        {t(`notifications.x-guide.steps.${index}.images.${imageIndex}`, {
                          defaultValue: image.caption
                        })}
                      </figcaption>
                    </figure>
                  ))}
                </div>
              )}
            </section>
          ))}

          <div className="notification-guide-actions">
            <Link href="/admin/notifications" className="button-action">
              {t('notifications.x-guide.back')}
            </Link>
            <a href="https://developer.twitter.com/en/portal/dashboard" className="button-action" target="_blank" rel="noreferrer">
              {t('notifications.x-guide.open-portal')}
            </a>
          </div>
        </div>
      </div>
    </>
  )
}

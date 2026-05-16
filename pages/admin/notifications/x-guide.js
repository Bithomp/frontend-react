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
    text: 'Open X Dev Console at console.x.com/onboarding and complete the developer agreement with a plain description of the alerts bot.',
    images: [
      { file: 'step-09.png', caption: 'Fill in the account name and use case, accept the developer agreement, and submit the form.' }
    ]
  },
  {
    title: 'Open the app and save the Consumer Key pair',
    text: 'After developer access is active, open Apps in X Dev Console and select your app. In Keys and Tokens, generate the OAuth 1.0 Consumer Key pair and copy it into Alerts as API Key and API Key Secret.',
    images: [
      { file: 'step-10.png', caption: 'On the X Dev Console dashboard, open Apps. Add credits to the X Dev Console balance before using the bot.' },
      { file: 'step-11.png', caption: 'Select the app that will publish Bithomp alerts.' },
      { file: 'step-12.png', caption: 'In Keys and Tokens, click Regenerate for the OAuth 1.0 Consumer Key.' },
      { file: 'step-13.png', caption: 'Copy Consumer Key and Consumer Key Secret, then paste them into API Key and API Key Secret in Bithomp Alerts.' }
    ]
  },
  {
    title: 'Enable write permissions',
    text: 'The app must have Read and write permissions before it can publish alerts. Set permissions before generating the Access Token so the token is created with write access.',
    images: [
      { file: 'step-14.png', caption: 'Open User authentication settings and click Set up.' },
      { file: 'step-15.png', caption: 'Select Read and write permissions.' },
      { file: 'step-16.png', caption: 'Choose Web App, Automated App or Bot as the app type.' },
      { file: 'step-17.png', caption: 'Fill in Callback URI / Redirect URL and Website URL, then save the changes.' },
      { file: 'step-18.png', caption: 'X shows OAuth 2.0 Client ID and Client Secret after saving. These are not the four Alerts channel fields.' }
    ]
  },
  {
    title: 'Copy the keys into Bithomp Alerts',
    text: 'Return to Keys and Tokens after Read and write is saved. Generate the Access Token pair, paste all four values into the matching Bithomp Alerts fields, and make sure the X Dev Console account has credits.',
    images: [
      { file: 'step-19.png', caption: 'Confirm the Access Token row shows Read and write, then create the Access Token pair.' },
      { file: 'step-20.png', caption: 'Copy Access Token and Access Token Secret, then paste them into the matching Bithomp Alerts fields.' },
      { file: 'step-21.png', caption: 'Save the Bithomp channel with API Key (Consumer Key), API Key Secret (Consumer Key Secret), Access Token, and Access Token Secret. X Dev Console also needs credits for the bot to work.' }
    ]
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
              <li>{t('notifications.x-guide.before.balance')}</li>
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
            <a href="https://console.x.com/onboarding" className="button-action" target="_blank" rel="noreferrer">
              {t('notifications.x-guide.open-portal')}
            </a>
          </div>
        </div>
      </div>
    </>
  )
}

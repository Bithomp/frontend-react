import { useTranslation } from 'next-i18next'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'

import { InputField } from '@/components/Admin/notifications/InputField'
import AdminTabs from '@/components/Tabs/AdminTabs'
import { useCreateNotificationChannel } from '@/hooks/useNotifications'
import { NOTIFICATION_CHANNEL_TYPES } from '@/lib/constants'
import {
  discordNotificationChannelSchema,
  emailNotificationChannelSchema,
  slackNotificationChannelSchema,
  twitterNotificationChannelSchema
} from '@/lib/schemas'

export async function getServerSideProps({ locale }) {
  return {
    props: {
      ...(await serverSideTranslations(locale, ['common', 'admin']))
    }
  }
}

const channelSettingsConfig = {
  [NOTIFICATION_CHANNEL_TYPES.SLACK]: [
    {
      id: 'webhook',
      label: 'Webhook URL',
      placeholder: 'https://hooks.slack.com/services/...',
      helpText: 'Enter the Slack Incoming Webhook URL.',
      required: true
    }
  ],
  [NOTIFICATION_CHANNEL_TYPES.DISCORD]: [
    {
      id: 'webhook',
      label: 'Webhook URL',
      placeholder: 'https://discord.com/api/webhooks/...',
      helpText: 'Enter the Discord Webhook URL.',
      required: true
    },
    {
      id: 'username',
      label: 'Username',
      placeholder: 'Bithomp Bot',
      helpText: 'Enter the username for the bot.',
      required: true
    }
  ],
  [NOTIFICATION_CHANNEL_TYPES.EMAIL]: [
    {
      id: 'email',
      label: 'Email Address',
      type: 'email',
      placeholder: 'your-email@example.com',
      helpText: 'The email address to send notifications to.',
      required: true
    }
  ],
  [NOTIFICATION_CHANNEL_TYPES.TWITTER]: [
    { id: 'consumer_key', label: 'Consumer Key', required: true },
    { id: 'consumer_secret', label: 'Consumer Secret', type: 'password', required: true },
    { id: 'access_token_key', label: 'Access Token Key', required: true },
    { id: 'access_token_secret', label: 'Access Token Secret', type: 'password', required: true }
  ]
}

const schema = {
  [NOTIFICATION_CHANNEL_TYPES.SLACK]: slackNotificationChannelSchema,
  [NOTIFICATION_CHANNEL_TYPES.DISCORD]: discordNotificationChannelSchema,
  [NOTIFICATION_CHANNEL_TYPES.EMAIL]: emailNotificationChannelSchema,
  [NOTIFICATION_CHANNEL_TYPES.TWITTER]: twitterNotificationChannelSchema
}

export default function AddChannel() {
  const { t } = useTranslation('admin')
  const [channelType, setChannelType] = useState(NOTIFICATION_CHANNEL_TYPES.SLACK)
  const [formData, setFormData] = useState({ name: '' })
  const [errors, setErrors] = useState({})
  const createChannel = useCreateNotificationChannel()
  const router = useRouter()

  useEffect(() => {
    if (createChannel.data) {
      router.push(`/admin/notifications/`)
    }
  }, [createChannel.data, router])

  useEffect(() => {
    if (createChannel.error) {
      console.error(createChannel.error)
    }
  }, [createChannel.error])

  const handleSubmit = (e) => {
    e.preventDefault()
    setErrors({})
    const parsedData = schema[channelType].safeParse(formData)
    if (!parsedData.success) {
      const fieldErrors = {}
      for (const issue of parsedData.error.issues) {
        fieldErrors[issue.path[0]] = issue.message
      }
      setErrors(fieldErrors)
      console.error(parsedData.error)
      return
    }
    const { name, ...settings } = parsedData.data
    const finalData = {
      name,
      type: channelType,
      settings
    }
    createChannel.mutate(finalData)
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: null }))
    }
  }

  const handleChannelTypeChange = (e) => {
    const newChannelType = e.target.value
    setChannelType(newChannelType)
    const newFormData = { name: formData.name }
    setFormData(newFormData)
    setErrors({})
  }

  const settingsFields = channelSettingsConfig[channelType]

  return (
    <main className="page-admin content-center">
      <h1 className="center">{t('header', { ns: 'admin' })}</h1>
      <AdminTabs name="mainTabs" tab="notifications" />
      <div className="max-w-xl mx-auto">
        <p className="text-left mb-8">
          Add a new notification channel to get notified through Slack, Discord, Email, or X (Twitter).
        </p>
        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          <InputField
            id="name"
            label="Channel Name"
            placeholder="My new channel"
            value={formData.name}
            onChange={handleInputChange}
            helpText="A descriptive name for your channel."
            error={errors.name}
            required
            autoFocus
          />
          <div className="flex flex-col gap-2">
            <label htmlFor="channel-type" className="font-bold">
              Channel type
            </label>
            <select
              id="channel-type"
              className="simple-select select select-bordered"
              value={channelType}
              onChange={handleChannelTypeChange}
            >
              <option value={NOTIFICATION_CHANNEL_TYPES.SLACK}>Slack</option>
              <option value={NOTIFICATION_CHANNEL_TYPES.DISCORD}>Discord</option>
              <option value={NOTIFICATION_CHANNEL_TYPES.EMAIL}>Email</option>
              <option value={NOTIFICATION_CHANNEL_TYPES.TWITTER}>Twitter</option>
            </select>
          </div>

          {settingsFields.map((field) => (
            <InputField
              key={field.id}
              id={field.id}
              label={field.label}
              type={field.type}
              placeholder={field.placeholder}
              value={formData[field.id] || ''}
              onChange={handleInputChange}
              helpText={field.helpText}
              error={errors[field.id]}
              required={field.required}
            />
          ))}

          {channelType === NOTIFICATION_CHANNEL_TYPES.TWITTER && (
            <p className="text-sm text-gray-500 -mt-2">Your Twitter application's credentials.</p>
          )}

          <button className="btn btn-primary w-full" disabled={createChannel.isLoading}>
            {createChannel.isLoading ? 'Adding channel...' : 'Add Channel'}
          </button>
        </form>
      </div>
    </main>
  )
}

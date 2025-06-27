import { useTranslation } from 'next-i18next'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'

import { InputField } from '@/components/Admin/notifications/InputField'
import AdminTabs from '@/components/Tabs/AdminTabs'
import { useCreateNotificationChannel } from '@/hooks/useNotifications'
import { NOTIFICATION_CHANNEL_TYPES, NOTIFICATION_CHANNELS } from '@/lib/notificationChannels'

export async function getServerSideProps({ locale }) {
  return {
    props: {
      ...(await serverSideTranslations(locale, ['common', 'admin']))
    }
  }
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
    const parsedData = NOTIFICATION_CHANNELS[channelType].schema.safeParse(formData)
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

  const { fields: settingsFields, helpText } = NOTIFICATION_CHANNELS[channelType]

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

          {helpText && <p className="text-sm text-gray-500 -mt-2">{helpText}</p>}

          <button className="btn btn-primary w-full" disabled={createChannel.isLoading}>
            {createChannel.isLoading ? 'Adding channel...' : 'Add Channel'}
          </button>
        </form>
      </div>
    </main>
  )
}

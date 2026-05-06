import { useTranslation } from 'next-i18next'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { useMemo, useState } from 'react'
import Select from 'react-select'
import { FaDiscord, FaEnvelope, FaSlack } from 'react-icons/fa'
import { FaXTwitter } from 'react-icons/fa6'
import { MdNotificationsActive, MdOutlineRule, MdWarningAmber, MdWebhook } from 'react-icons/md'

import AddChannelButton from '@/components/Admin/notifications/AddChannelButton'
import InputField from '@/components/Admin/notifications/InputField'
import ChannelCard from '@/components/Admin/notifications/ChannelCard'
import RuleCard from '@/components/Admin/notifications/RuleCard'
import AdminTabs from '@/components/Tabs/AdminTabs'
import Dialog from '@/components/UI/Dialog'
import CountrySelect from '@/components/UI/CountrySelect'
import { adminNotifications } from '@/styles/pages/adminNotifications.module.scss'
import {
  useCreateNotificationChannel,
  useCreateNotificationProfile,
  useCreateNotificationRule,
  useDeleteNotificationChannel,
  useDeleteNotificationRule,
  useNotificationRuleExecutions,
  useNotifications,
  useUpdateNotificationChannel,
  useUpdateNotificationRule
} from '@/hooks/useNotifications'
import { getNotificationChannelLabel, NOTIFICATION_CHANNELS, NOTIFICATION_CHANNEL_TYPES } from '@/utils/notificationChannels'

export const getServerSideProps = async (context) => {
  const { locale } = context
  return {
    props: {
      ...(await serverSideTranslations(locale, ['common', 'admin']))
    }
  }
}

const initialChannelForm = {
  name: ''
}

const initialRuleForm = {
  connectionId: '',
  event: '',
  name: '',
  settings: '{\n  "rules": {}\n}'
}

const setupGuides = [
  {
    type: NOTIFICATION_CHANNEL_TYPES.EMAIL,
    icon: FaEnvelope,
    title: 'Email',
    description: 'Use the mailbox that should receive blockchain alerts. No webhook setup is required.',
    steps: []
  },
  {
    type: NOTIFICATION_CHANNEL_TYPES.DISCORD,
    icon: FaDiscord,
    title: 'Discord',
    description: 'Create a webhook in the Discord server channel where Bithomp should post alerts.',
    steps: ['Server settings', 'Integrations', 'Webhooks', 'Copy Webhook URL']
  },
  {
    type: NOTIFICATION_CHANNEL_TYPES.SLACK,
    icon: FaSlack,
    title: 'Slack',
    description: 'Create an incoming webhook in Slack, choose a channel, then paste the webhook URL here.',
    steps: ['Slack app directory', 'Incoming Webhooks', 'Add to workspace', 'Copy Webhook URL']
  },
  {
    type: NOTIFICATION_CHANNEL_TYPES.TWITTER,
    icon: FaXTwitter,
    title: 'X / Twitter',
    description: 'Use credentials from the X developer portal if a rule should publish through your app.',
    steps: ['Developer portal', 'Project app', 'Keys and tokens', 'Copy API/access tokens']
  }
]

const apiErrorMessages = {
  'errors.connection.settings_required': 'Enter the required channel settings.'
}

const errorText = (error, fallback) => {
  const code = error?.response?.data?.error
  return apiErrorMessages[code] || code || error?.message || fallback
}

const listenerConnectionId = (listener) => listener?.channel?.id || ''

export default function Notifications({ sessionToken, openEmailLogin }) {
  const { t } = useTranslation('admin')
  const { rules, channels, isLoading, error, refetch } = useNotifications({ enabled: !!sessionToken })
  const createProfile = useCreateNotificationProfile()
  const createChannel = useCreateNotificationChannel()
  const updateChannel = useUpdateNotificationChannel()
  const deleteChannel = useDeleteNotificationChannel()
  const createRule = useCreateNotificationRule()
  const updateRule = useUpdateNotificationRule()
  const deleteRule = useDeleteNotificationRule()
  const ruleExecutions = useNotificationRuleExecutions()
  const [channelType, setChannelType] = useState(NOTIFICATION_CHANNEL_TYPES.EMAIL)
  const [channelToDelete, setChannelToDelete] = useState(null)
  const [editingChannel, setEditingChannel] = useState(null)
  const [formData, setFormData] = useState(initialChannelForm)
  const [formErrors, setFormErrors] = useState({})
  const [formMessage, setFormMessage] = useState('')
  const [showChannelForm, setShowChannelForm] = useState(false)
  const [ruleFormData, setRuleFormData] = useState(initialRuleForm)
  const [ruleFormErrors, setRuleFormErrors] = useState({})
  const [ruleFormMessage, setRuleFormMessage] = useState('')
  const [showRuleForm, setShowRuleForm] = useState(false)
  const [editingRule, setEditingRule] = useState(null)
  const [ruleToDelete, setRuleToDelete] = useState(null)
  const [executionsRule, setExecutionsRule] = useState(null)
  const [partnerCountry, setPartnerCountry] = useState('')
  const [partnerName, setPartnerName] = useState('')
  const [profileMessage, setProfileMessage] = useState('')

  const selectedChannel = useMemo(() => NOTIFICATION_CHANNELS[channelType], [channelType])
  const selectedGuide = useMemo(() => setupGuides.find((guide) => guide.type === channelType), [channelType])
  const ruleChannelOptions = useMemo(
    () =>
      channels.map((channel) => ({
        value: channel.id,
        label: channel.name || getNotificationChannelLabel(channel.type)
      })),
    [channels]
  )
  const selectedRuleChannelOption = useMemo(
    () => ruleChannelOptions.find((option) => String(option.value) === String(ruleFormData.connectionId)) || null,
    [ruleChannelOptions, ruleFormData.connectionId]
  )
  const savingChannel = createChannel.isLoading || updateChannel.isLoading
  const savingRule = createRule.isLoading || updateRule.isLoading
  const notificationErrorCode = error?.response?.data?.error
  const partnerMissing = notificationErrorCode === 'errors.partner.not_found'
  const tokenRequired = notificationErrorCode === 'errors.token.required'
  const notificationDataUnavailable = !!error

  const openAddChannel = (type = NOTIFICATION_CHANNEL_TYPES.EMAIL) => {
    setEditingChannel(null)
    setChannelType(type)
    setFormData(initialChannelForm)
    setFormErrors({})
    setFormMessage('')
    setShowChannelForm(true)
  }

  const openEditChannel = (channel) => {
    const nextType = channel.type || NOTIFICATION_CHANNEL_TYPES.SLACK
    const channelConfig = NOTIFICATION_CHANNELS[nextType]
    const nextForm = { name: channel.name || '' }
    channelConfig?.fields?.forEach((field) => {
      nextForm[field.id] = channel.settings?.[field.id] || ''
    })
    setEditingChannel(channel)
    setChannelType(nextType)
    setFormData(nextForm)
    setFormErrors({})
    setFormMessage('')
    setShowChannelForm(true)
  }

  const closeChannelForm = () => {
    setShowChannelForm(false)
    setEditingChannel(null)
    setFormErrors({})
    setFormMessage('')
  }

  const openAddRule = () => {
    setEditingRule(null)
    setRuleFormData({
      ...initialRuleForm,
      connectionId: channels[0]?.id || ''
    })
    setRuleFormErrors({})
    setRuleFormMessage('')
    setShowRuleForm(true)
  }

  const openEditRule = (rule) => {
    setEditingRule(rule)
    setRuleFormData({
      connectionId: listenerConnectionId(rule),
      event: rule.event || '',
      name: rule.name || '',
      settings: JSON.stringify(rule.settings || { rules: {} }, null, 2)
    })
    setRuleFormErrors({})
    setRuleFormMessage('')
    setShowRuleForm(true)
  }

  const closeRuleForm = () => {
    setShowRuleForm(false)
    setEditingRule(null)
    setRuleFormErrors({})
    setRuleFormMessage('')
  }

  const handleInputChange = (event) => {
    const { name, value } = event.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    setFormErrors((prev) => ({ ...prev, [name]: '' }))
    setFormMessage('')
  }

  const handleRuleInputChange = (event) => {
    const { name, value } = event.target
    setRuleFormData((prev) => ({ ...prev, [name]: value }))
    setRuleFormErrors((prev) => ({ ...prev, [name]: '' }))
    setRuleFormMessage('')
  }

  const handleTypeChange = (type) => {
    setChannelType(type)
    setFormData({ name: formData.name || '' })
    setFormErrors({})
    setFormMessage('')
  }

  const validateChannelForm = () => {
    const errors = {}
    if (!formData.name?.trim()) {
      errors.name = 'Enter a channel name.'
    }

    selectedChannel.fields.forEach((field) => {
      const value = formData[field.id]?.trim()
      if (field.required && !value) {
        errors[field.id] = `${field.label} is required.`
      } else if (value && field.validate) {
        const validation = field.validate(value)
        if (validation !== true) {
          errors[field.id] = validation
        }
      }
    })

    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const validateRuleForm = () => {
    const errors = {}
    if (!ruleFormData.connectionId) {
      errors.connectionId = 'Choose a channel.'
    }
    if (!ruleFormData.name?.trim()) {
      errors.name = 'Enter a rule name.'
    }
    if (!ruleFormData.event?.trim()) {
      errors.event = 'Enter an event.'
    }
    try {
      JSON.parse(ruleFormData.settings || '{}')
    } catch {
      errors.settings = 'Settings must be valid JSON.'
    }

    setRuleFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleCreateProfile = async (event) => {
    event.preventDefault()
    setProfileMessage('')
    if (!partnerName.trim()) {
      setProfileMessage('Enter your organization or account name.')
      return
    }
    if (!partnerCountry) {
      setProfileMessage('Choose your country.')
      return
    }

    try {
      await createProfile.mutate({ name: partnerName.trim(), country: partnerCountry })
      await refetch()
    } catch (error) {
      setProfileMessage(errorText(error, 'Could not finish notification setup.'))
    }
  }

  const handleSaveChannel = async (event) => {
    event.preventDefault()
    setFormMessage('')
    if (!validateChannelForm()) return

    const payload = {
      type: channelType,
      name: formData.name.trim(),
      settings: {}
    }

    selectedChannel.fields.forEach((field) => {
      payload.settings[field.id] = formData[field.id]?.trim() || ''
    })

    try {
      if (editingChannel) {
        await updateChannel.mutate({ id: editingChannel.id, payload })
      } else {
        await createChannel.mutate(payload)
      }
      await refetch()
      closeChannelForm()
    } catch (error) {
      setFormMessage(errorText(error, 'Could not save notification channel.'))
    }
  }

  const handleSaveRule = async (event) => {
    event.preventDefault()
    setRuleFormMessage('')
    if (!validateRuleForm()) return

    const payload = {
      event: ruleFormData.event.trim(),
      name: ruleFormData.name.trim(),
      settings: JSON.parse(ruleFormData.settings || '{}')
    }

    try {
      if (editingRule) {
        await updateRule.mutate({
          connectionId: ruleFormData.connectionId,
          id: editingRule.id,
          payload
        })
      } else {
        await createRule.mutate({
          connectionId: ruleFormData.connectionId,
          payload
        })
      }
      closeRuleForm()
      await refetch()
    } catch (error) {
      setRuleFormMessage(errorText(error, 'Could not save notification rule.'))
    }
  }

  const handleDeleteChannel = async () => {
    if (!channelToDelete) return

    try {
      await deleteChannel.mutate(channelToDelete.id)
      setChannelToDelete(null)
      await refetch()
    } catch {
      // The dialog keeps the action visible; the hook error is shown below.
    }
  }

  const handleDeleteRule = async () => {
    if (!ruleToDelete) return

    try {
      await deleteRule.mutate({
        connectionId: listenerConnectionId(ruleToDelete),
        id: ruleToDelete.id
      })
      setRuleToDelete(null)
      await refetch()
    } catch {
      // The dialog keeps the action visible; the hook error is shown below.
    }
  }

  const openExecutions = async (rule) => {
    setExecutionsRule(rule)
    try {
      await ruleExecutions.mutate({
        connectionId: listenerConnectionId(rule),
        id: rule.id
      })
    } catch {
      // The dialog shows the hook error.
    }
  }

  const renderChannelForm = () => {
    const showInitialChannelForm = !isLoading && !notificationDataUnavailable && channels.length === 0
    if (!showChannelForm && !showInitialChannelForm) return null

    return (
      <form className="notification-form" onSubmit={handleSaveChannel}>
        <div className="notification-form-grid">
          <div className="notification-channel-picker">
            <span>Channel type</span>
            <div className="notification-channel-type-grid">
              {setupGuides.map((guide) => {
                const Icon = guide.icon
                const active = guide.type === channelType
                return (
                  <button
                    aria-pressed={active}
                    className={`notification-channel-type-button${active ? ' active' : ''}`}
                    disabled={!!editingChannel}
                    key={guide.type}
                    onClick={() => handleTypeChange(guide.type)}
                    type="button"
                  >
                    <Icon />
                    <strong>{guide.title}</strong>
                  </button>
                )
              })}
            </div>
          </div>
          {selectedGuide && selectedGuide.steps.length > 0 && (
            <div className="notification-selected-guide">
              <div>
                <strong>{selectedGuide.title}</strong>
                <p>{selectedGuide.description}</p>
              </div>
              {selectedGuide.steps.length > 0 && (
                <ol>
                  {selectedGuide.steps.map((step) => (
                    <li key={step}>{step}</li>
                  ))}
                </ol>
              )}
            </div>
          )}
          <InputField
            error={formErrors.name}
            helpText="A short private name for this channel."
            id="name"
            label="Channel name"
            onChange={handleInputChange}
            placeholder="My alerts"
            required
            value={formData.name || ''}
          />
          {selectedChannel.fields.map((field) => (
            <InputField
              error={formErrors[field.id]}
              helpText={field.helpText}
              id={field.id}
              key={field.id}
              label={field.label}
              onChange={handleInputChange}
              placeholder={field.placeholder}
              required={field.required}
              type={field.type}
              value={formData[field.id] || ''}
            />
          ))}
        </div>
        {formMessage && <p className="red center">{formMessage}</p>}
        <div className="notification-form-actions">
          <button className="button-action" disabled={savingChannel} type="submit">
            {savingChannel ? 'Saving...' : editingChannel ? 'Save channel' : 'Add channel'}
          </button>
          {(channels.length > 0 || editingChannel) && (
            <button className="button-action thin secondary" onClick={closeChannelForm} type="button">
              Cancel
            </button>
          )}
        </div>
      </form>
    )
  }

  const renderRuleForm = () => {
    if (!showRuleForm) return null

    return (
      <form className="notification-form" onSubmit={handleSaveRule}>
        <div className="notification-form-grid">
          <label className="notification-field">
            <span>Channel</span>
            <Select
              className="simple-select"
              classNamePrefix="react-select"
              instanceId="notification-rule-channel"
              isSearchable={false}
              onChange={(option) => {
                setRuleFormData((prev) => ({ ...prev, connectionId: option?.value || '' }))
                setRuleFormErrors((prev) => ({ ...prev, connectionId: '' }))
                setRuleFormMessage('')
              }}
              options={ruleChannelOptions}
              placeholder="Choose channel"
              value={selectedRuleChannelOption}
            />
            {ruleFormErrors.connectionId && <strong>{ruleFormErrors.connectionId}</strong>}
          </label>
          <InputField
            error={ruleFormErrors.name}
            id="name"
            label="Rule name"
            onChange={handleRuleInputChange}
            placeholder="High-value NFT sales"
            required
            value={ruleFormData.name}
          />
          <InputField
            error={ruleFormErrors.event}
            helpText="Event key expected by the backend listener."
            id="event"
            label="Event"
            onChange={handleRuleInputChange}
            placeholder="nft_sale"
            required
            value={ruleFormData.event}
          />
          <label className="notification-field notification-field-wide" htmlFor="settings">
            <span>Settings JSON</span>
            <textarea
              className={`input-text notification-settings-textarea${ruleFormErrors.settings ? ' error' : ''}`}
              id="settings"
              name="settings"
              onChange={handleRuleInputChange}
              spellCheck="false"
              value={ruleFormData.settings}
            />
            <small>Example: {"{ \"rules\": { \"amount.usd\": { \"$gte\": 1000 } } }"}</small>
            {ruleFormErrors.settings && <strong>{ruleFormErrors.settings}</strong>}
          </label>
        </div>
        {ruleFormMessage && <p className="red center">{ruleFormMessage}</p>}
        <div className="notification-form-actions">
          <button className="button-action" disabled={savingRule} type="submit">
            {savingRule ? 'Saving...' : editingRule ? 'Save rule' : 'Add rule'}
          </button>
          <button className="button-action thin secondary" onClick={closeRuleForm} type="button">
            Cancel
          </button>
        </div>
      </form>
    )
  }

  return (
    <main className={`page-admin content-center ${adminNotifications}`}>
      <h1 className="center">{t('header', { ns: 'admin' })}</h1>
      <AdminTabs name="mainTabs" tab="notifications" />

      {sessionToken ? (
        <>
          <section className="notification-hero">
            <div>
              <p className="notification-eyebrow">Blockchain alerts</p>
              <h2>Notifications</h2>
              <p>
                Connect Slack, Discord, Email, or X/Twitter, then create rules for the events your team wants to see.
              </p>
            </div>
            <div className="notification-hero-visual" aria-hidden="true">
              <MdWebhook />
              <MdOutlineRule />
              <MdNotificationsActive />
            </div>
          </section>

          {isLoading && <p className="center">Loading notifications...</p>}

          {partnerMissing && (
            <section className="notification-setup-card">
              <div>
                <h2>Finish notification setup</h2>
                <p>
                  Notifications need an admin profile before channels can be saved. This name is private and helps us
                  attach notification settings to your account.
                </p>
              </div>
              <form onSubmit={handleCreateProfile}>
                <InputField
                  id="partnerName"
                  label="Profile name"
                  onChange={(event) => {
                    setPartnerName(event.target.value)
                    setProfileMessage('')
                  }}
                  placeholder="Company or account name"
                  required
                  value={partnerName}
                />
                <label className="notification-field">
                  <span>Country</span>
                  <CountrySelect countryCode={partnerCountry} setCountryCode={setPartnerCountry} type="onlySelect" />
                </label>
                {profileMessage && <p className="red center">{profileMessage}</p>}
                <button className="button-action" disabled={createProfile.isLoading} type="submit">
                  {createProfile.isLoading ? 'Saving...' : 'Finish setup'}
                </button>
              </form>
            </section>
          )}

          {tokenRequired && (
            <section className="notification-status warning">
              <strong>Session expired.</strong>
              <span>Please sign in again to manage notifications.</span>
            </section>
          )}

          {notificationDataUnavailable && !partnerMissing && !tokenRequired && (
            <section className="notification-status warning">
              <strong>Could not load saved notifications.</strong>
              <span>{errorText(error, 'Please try again later.')}</span>
            </section>
          )}

          {!notificationDataUnavailable && (
            <>
              <section className="admin-notification-section">
                <div className="admin-notification-section-header">
                  <div>
                    <h2>Notification channels</h2>
                    <p>Saved destinations for alerts.</p>
                  </div>
                  {channels.length > 0 && !showChannelForm && <AddChannelButton onClick={() => openAddChannel()} />}
                </div>

                {renderChannelForm()}

                {channels.length > 0 && (
                  <div className="notification-card-grid">
                    {channels.map((channel) => (
                      <ChannelCard
                        channel={channel}
                        deleting={deleteChannel.isLoading && channelToDelete?.id === channel.id}
                        editing={updateChannel.isLoading && editingChannel?.id === channel.id}
                        key={channel.id}
                        onDelete={setChannelToDelete}
                        onEdit={openEditChannel}
                      />
                    ))}
                  </div>
                )}
              </section>

              {channels.length > 0 && (
                <section className="admin-notification-section">
                  <div className="admin-notification-section-header">
                    <div>
                      <h2>Notification rules</h2>
                      <p>Rules listen for events and send matching alerts to a channel.</p>
                    </div>
                    <button className="button-action thin" onClick={openAddRule} type="button">
                      Add rule
                    </button>
                  </div>

                  {renderRuleForm()}

                  {rules.length === 0 ? (
                    <div className="notification-empty-state">
                      <h2>No notification rules yet</h2>
                      <p>Add a rule for one of your channels.</p>
                    </div>
                  ) : (
                    <div className="notification-rule-list">
                      {rules.map((rule) => (
                        <RuleCard
                          deleting={deleteRule.isLoading && ruleToDelete?.id === rule.id}
                          key={rule.id}
                          loadingExecutions={ruleExecutions.isLoading && executionsRule?.id === rule.id}
                          onDelete={setRuleToDelete}
                          onEdit={openEditRule}
                          onExecutions={openExecutions}
                          rule={rule}
                        />
                      ))}
                    </div>
                  )}
                </section>
              )}
            </>
          )}

          <Dialog
            isOpen={!!channelToDelete}
            onClose={() => setChannelToDelete(null)}
            size="small"
            title="Delete channel"
          >
            <div className="notification-delete-confirm">
              <div className="notification-delete-confirm-icon" aria-hidden="true">
                <MdWarningAmber className="notification-delete-confirm-icon-svg" />
              </div>
              <div>
                <p className="notification-delete-confirm-text">
                  Delete <strong>{channelToDelete?.name || getNotificationChannelLabel(channelToDelete?.type)}</strong>?
                </p>
                <p className="notification-delete-confirm-note">
                  This saved destination will be removed from your account. Rules using this channel will stop sending
                  alerts.
                </p>
                <div className="notification-delete-confirm-target">
                  <span className="notification-delete-confirm-label">Channel</span>
                  <strong className="notification-delete-confirm-name">
                    {channelToDelete?.name || getNotificationChannelLabel(channelToDelete?.type)}
                  </strong>
                </div>
              </div>
            </div>
            {deleteChannel.error && (
              <p className="red">{deleteChannel.error?.response?.data?.error || deleteChannel.error?.message}</p>
            )}
            <div className="notification-dialog-actions notification-dialog-actions-end">
              <button className="button-action thin secondary" onClick={() => setChannelToDelete(null)} type="button">
                Cancel
              </button>
              <button
                className="button-action thin warning"
                disabled={deleteChannel.isLoading}
                onClick={handleDeleteChannel}
                type="button"
              >
                {deleteChannel.isLoading ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </Dialog>

          <Dialog
            isOpen={!!ruleToDelete}
            onClose={() => setRuleToDelete(null)}
            size="small"
            title="Delete rule"
          >
            <div className="notification-delete-confirm">
              <div className="notification-delete-confirm-icon" aria-hidden="true">
                <MdWarningAmber className="notification-delete-confirm-icon-svg" />
              </div>
              <div>
                <p className="notification-delete-confirm-text">
                  Delete <strong>{ruleToDelete?.name || `Rule #${ruleToDelete?.id}`}</strong>?
                </p>
                <p className="notification-delete-confirm-note">
                  This listener rule will be removed. Matching events will no longer send this notification.
                </p>
                <div className="notification-delete-confirm-target">
                  <span className="notification-delete-confirm-label">Rule</span>
                  <strong className="notification-delete-confirm-name">{ruleToDelete?.name || `Rule #${ruleToDelete?.id}`}</strong>
                </div>
              </div>
            </div>
            {deleteRule.error && <p className="red">{deleteRule.error?.response?.data?.error || deleteRule.error?.message}</p>}
            <div className="notification-dialog-actions notification-dialog-actions-end">
              <button className="button-action thin secondary" onClick={() => setRuleToDelete(null)} type="button">
                Cancel
              </button>
              <button
                className="button-action thin warning"
                disabled={deleteRule.isLoading}
                onClick={handleDeleteRule}
                type="button"
              >
                {deleteRule.isLoading ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </Dialog>

          <Dialog
            isOpen={!!executionsRule}
            onClose={() => setExecutionsRule(null)}
            size="large"
            title={`Executions: ${executionsRule?.name || executionsRule?.event || ''}`}
          >
            {ruleExecutions.isLoading ? (
              <p>Loading...</p>
            ) : ruleExecutions.error ? (
              <p className="red">{ruleExecutions.error?.response?.data?.error || ruleExecutions.error?.message}</p>
            ) : (
              <pre className="notification-executions-json">{JSON.stringify(ruleExecutions.data || {}, null, 2)}</pre>
            )}
          </Dialog>
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

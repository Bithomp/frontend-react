import { useTranslation } from 'next-i18next'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import Link from 'next/link'
import { Fragment, useEffect, useMemo, useState } from 'react'
import Select from 'react-select'
import { FaDiscord, FaEnvelope, FaSlack } from 'react-icons/fa'
import { FaXTwitter } from 'react-icons/fa6'
import { MdHistory, MdNotificationsActive, MdOutlineRule, MdWarningAmber, MdWebhook } from 'react-icons/md'

import AddChannelButton from '@/components/Admin/notifications/AddChannelButton'
import InputField from '@/components/Admin/notifications/InputField'
import ChannelCard from '@/components/Admin/notifications/ChannelCard'
import RuleCard from '@/components/Admin/notifications/RuleCard'
import SubscriptionManager from '@/components/Admin/subscriptions/SubscriptionManager'
import NotificationsBotSubscription from '@/components/Admin/subscriptions/NotificationsBot'
import AdminTabs from '@/components/Tabs/AdminTabs'
import Dialog from '@/components/UI/Dialog'
import CountrySelect from '@/components/UI/CountrySelect'
import AddressInput from '@/components/UI/AddressInput'
import TokenSelector from '@/components/UI/TokenSelector'
import { axiosAdmin } from '@/utils/axios'
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
import { explorerName, isAddressValid, nativeCurrency, timestampExpired, webSiteName, xahauNetwork } from '@/utils'
import {
  getNotificationFilterFields,
  getNotificationEventDescription,
  getNotificationEventOptions,
  getNotificationTxTypeOptions,
  NOTIFICATION_ACTION_TYPES,
  NOTIFICATION_EVENT_TYPES,
  NOTIFICATION_FIAT_CURRENCY_OPTIONS,
  NOTIFICATION_NUMBER_OPERATOR_OPTIONS,
  NOTIFICATION_TX_TYPE_OPERATOR_OPTIONS,
  normalizeNotificationEvent,
  notificationEventSupports
} from '@/utils/notificationRules'
import { DEFAULT_ALERT_PLAN_TIER, getAlertPlanForPackage } from '@/utils/notificationPlans'
import { fullDateAndTime, shortHash } from '@/utils/format'

const notificationExecutionsDialogCss = `
  .notification-executions-dialog {
    width: min(100%, 980px);
  }

  .notification-executions,
  .notification-executions-empty {
    display: grid;
    gap: 12px;
  }

  .notification-executions-count {
    margin: -4px 0 0;
    color: var(--text-secondary);
    font-size: 13px;
    font-weight: 700;
    text-align: right;
  }

  .notification-executions-list {
    display: grid;
    gap: 8px;
  }

  .notification-execution-item {
    display: grid;
    gap: 8px;
    padding: 10px 12px;
    border: 1px solid color-mix(in srgb, var(--accent-link) 18%, var(--button-additional));
    border-left: 3px solid color-mix(in srgb, var(--accent-link) 62%, var(--button-additional));
    border-radius: 10px;
    background: color-mix(in srgb, var(--accent-link) 5%, var(--card-bg));
  }

  .notification-execution-item-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }

  .notification-execution-item-header strong {
    display: inline-flex;
    align-items: center;
    min-height: 22px;
    padding: 2px 8px;
    border-radius: 999px;
    color: var(--text-main);
    background: color-mix(in srgb, var(--text-secondary) 14%, transparent);
    font-size: 13px;
    font-weight: 800;
    line-height: 1;
  }

  .notification-execution-item-header strong.success {
    color: var(--green);
    background: color-mix(in srgb, var(--green) 13%, transparent);
  }

  .notification-execution-item-header strong.error {
    color: var(--red);
    background: color-mix(in srgb, var(--red) 13%, transparent);
  }

  .notification-execution-item-header span {
    color: var(--text-secondary);
    font-size: 12px;
    white-space: nowrap;
  }

  .notification-execution-fields {
    display: grid;
    grid-template-columns: minmax(72px, 0.45fr) minmax(150px, 0.85fr) minmax(260px, 1.4fr);
    gap: 6px;
    margin: 0;
  }

  .notification-execution-field {
    display: grid;
    align-content: start;
    gap: 3px;
    min-width: 0;
    padding: 7px 8px;
    border: 1px solid color-mix(in srgb, var(--button-additional) 56%, transparent);
    border-radius: 8px;
    background: color-mix(in srgb, var(--background-main) 82%, var(--accent-link) 4%);
  }

  .notification-execution-field > span:first-child {
    color: var(--text-secondary);
    font-size: 10px;
    font-weight: 800;
    letter-spacing: 0;
    text-transform: none;
  }

  .notification-execution-field > span:first-child:empty {
    display: none;
  }

  .notification-execution-field > .notification-execution-field-value {
    min-width: 0;
    color: var(--text-main);
    font-size: 14px;
    font-weight: 650;
    line-height: 1.22;
    letter-spacing: 0;
    text-transform: none;
    overflow-wrap: anywhere;
  }

  .notification-execution-link {
    color: var(--accent-link);
    font-size: 14px;
    font-weight: 650;
    line-height: 1.2;
    text-decoration: underline;
    text-underline-offset: 2px;
    letter-spacing: 0;
    text-transform: none !important;
  }

  .notification-execution-link.muted {
    color: color-mix(in srgb, var(--accent-link) 72%, var(--text-secondary));
  }

  .notification-execution-link-pair {
    display: grid;
    grid-template-columns: max-content minmax(0, 1fr);
    align-items: center;
    gap: 4px 8px;
    letter-spacing: 0;
    text-transform: none;
  }

  .notification-execution-mini-label {
    color: var(--text-secondary);
    font-size: 10px;
    font-weight: 800;
    letter-spacing: 0;
    text-transform: none;
  }

  .notification-execution-nested {
    display: grid;
    gap: 6px;
    margin: 0;
  }

  .notification-execution-nested > div,
  .notification-execution-nested-row {
    display: grid;
    grid-template-columns: minmax(74px, 0.34fr) minmax(0, 1fr);
    gap: 8px;
  }

  .notification-execution-nested-row > span {
    color: var(--text-secondary);
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0;
    text-transform: none;
  }

  .notification-execution-nested-value {
    min-width: 0;
    font-weight: 600;
    overflow-wrap: anywhere;
  }

  @media only screen and (max-width: 700px) {
    .notification-execution-fields,
    .notification-execution-field,
    .notification-execution-nested > div {
      grid-template-columns: 1fr;
    }

    .notification-execution-item-header {
      align-items: flex-start;
      flex-direction: column;
    }

    .notification-executions-count {
      text-align: left;
    }
  }
`

export const getServerSideProps = async (context) => {
  const { locale } = context
  return {
    props: {
      ...(await serverSideTranslations(locale, ['common', 'admin']))
    }
  }
}

const initialChannelForm = {
  name: '',
}

const defaultRuleName = (t, index = 1) => t('notifications.default-rule-name', { index })
const defaultRuleEvent = NOTIFICATION_EVENT_TYPES.BALANCE_CHANGE

const initialRuleForm = {
  connectionId: '',
  enabled: true,
  event: defaultRuleEvent,
  externalUrl: true,
  filters: {},
  fiatCurrency: 'usd',
  name: '',
  xrpCafeURL: false
}

const notificationsSubscriptionHref = '#alerts-subscription'

const setupGuides = [
  {
    type: NOTIFICATION_CHANNEL_TYPES.EMAIL,
    icon: FaEnvelope,
    title: 'Email',
    description: `Use the mailbox that should receive ${explorerName} alerts.`,
    steps: [],
    fromEmail: `noreply@${webSiteName}`
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
    steps: ['Slack app directory', 'Incoming Webhooks', 'Add to workspace', 'Copy Webhook URL'],
    portalHref: 'https://api.slack.com/apps',
    portalLabel: 'Open Slack API apps',
    guideHref: '/admin/notifications/slack-guide'
  },
  {
    type: NOTIFICATION_CHANNEL_TYPES.TWITTER,
    icon: FaXTwitter,
    title: 'X / Twitter',
    description:
      'Use the Consumer Key, Consumer Key Secret, Access Token, and Access Token Secret from the X Dev Console app.',
    steps: ['X Dev Console', 'App permissions', 'Keys and tokens', 'X credits'],
    portalHref: 'https://console.x.com/onboarding',
    portalLabel: 'Open X Dev Console',
    guideHref: '/admin/notifications/x-guide'
  }
]

const apiErrorMessages = {
  'errors.connection.has_listeners': 'notifications.errors.connection-has-listeners',
  'errors.connection.no_package': 'notifications.errors.connection-no-package',
  'errors.connection.settings_required': 'notifications.errors.connection-settings-required-short',
  'errors.listener.action_required': 'notifications.errors.action-required',
  'errors.listener.event_invalid': 'notifications.errors.event-invalid',
  'errors.listener.event_required': 'notifications.errors.event-required',
  'errors.listener.name_required': 'notifications.errors.rule-name-required'
}

const errorText = (error, fallback, t) => {
  const code = error?.response?.data?.error
  return (apiErrorMessages[code] && t(apiErrorMessages[code])) || code || error?.message || fallback
}

const listenerConnectionId = (listener) => listener?.channel?.id || listener?.partnerConnectionID || ''

const isFilled = (value) => value !== undefined && value !== null && String(value).trim() !== ''

const enabledBoolean = (value) => value !== false && value !== 0 && value !== '0' && value !== 'false'
const formEnabledBoolean = (value) => value === true

const filterValue = (filters, key) => filters?.[key] || {}

const filterLabel = (field, t) =>
  t(`notifications.filters.${field.key}`, {
    defaultValue: field.label,
    nativeCurrency
  })

const ruleKey = (key, fiatCurrency = 'usd') => key.replace('{fiatCurrency}', fiatCurrency || 'usd')

const activePackage = (packages, type) =>
  packages.find((item) => item.type === type && !(item.expiredAt && timestampExpired(item.expiredAt))) || null

const alertPlanLimitText = (plan, t) =>
  t('notifications.plan-limit', {
    plan: t(`plans.${plan.tier}`, { defaultValue: plan.label }),
    channels: t('notifications.limit.channels', { count: plan.connections }),
    rules: t('notifications.limit.rules', { count: plan.listeners })
  })

const notificationChannelLabel = (type, t) =>
  t(`notifications.channel-type.${type}`, { defaultValue: getNotificationChannelLabel(type) })

const showAlertPlanUpgrade = (plan, activeBotPackage) =>
  !activeBotPackage || (plan.tier === DEFAULT_ALERT_PLAN_TIER && !plan.hasMetadataLimits)

const firstRuleOperator = (rule) =>
  NOTIFICATION_NUMBER_OPERATOR_OPTIONS.find((option) => Object.prototype.hasOwnProperty.call(rule || {}, option.value))?.value

const parseRuleFilters = (event, rules = {}, fiatCurrency = 'usd') => {
  const filters = {}
  const fields = getNotificationFilterFields(event)

  fields.forEach((field) => {
    const key = ruleKey(field.ruleKey || field.key, fiatCurrency)
    const rule = rules[key]

    if (field.type === 'address' || field.type === 'text') {
      if (rule && Object.prototype.hasOwnProperty.call(rule, '$eq') && rule.$eq !== null) {
        filters[field.key] = { value: String(rule.$eq) }
      }
      return
    }

    if (field.type === 'number') {
      const operator = firstRuleOperator(rule)
      if (operator) {
        filters[field.key] = { operator, value: String(rule[operator]) }
      }
      return
    }

    if (field.type === 'txType') {
      if (rule?.$eq) {
        filters[field.key] = { operator: '$eq', value: String(rule.$eq) }
      } else if (Array.isArray(rule?.$in)) {
        filters[field.key] = { operator: '$in', values: rule.$in }
      } else if (Array.isArray(rule?.$nin)) {
        filters[field.key] = { operator: '$nin', values: rule.$nin }
      }
      return
    }

    if (field.type === 'token') {
      const currencyKey = field.currencyKey || 'currency'
      const issuerKey = field.issuerKey || 'currency_issuer'
      if (rules[currencyKey]?.$eq) {
        filters[field.key] = {
          value: {
            currency: String(rules[currencyKey].$eq),
            issuer: rules[issuerKey]?.$eq || undefined
          }
        }
      }
      return
    }

    if (field.type === 'boolean') {
      if (rule && typeof rule.$eq === 'boolean') {
        filters[field.key] = { value: String(rule.$eq) }
      }
      return
    }

    if (field.type === 'destination') {
      if (rule?.$eq === null) {
        filters.destination = { mode: 'none' }
      } else if (isFilled(rule?.$eq)) {
        filters.destination = { mode: 'specific', value: String(rule.$eq) }
      } else if (rules.known_broker?.$eq === true) {
        filters.destination = { mode: 'knownBroker' }
      } else if (
        Array.isArray(rules.$or) &&
        rules.$or.some((item) => item?.destination?.$eq === null) &&
        rules.$or.some((item) => item?.known_broker?.$eq === true)
      ) {
        filters.destination = { mode: 'noneOrKnownBroker' }
      }
    }
  })

  return filters
}

const buildRuleSettings = (formData) => {
  const rules = {}
  const filters = formData.filters || {}
  const fields = getNotificationFilterFields(formData.event)

  fields.forEach((field) => {
    const filter = filterValue(filters, field.key)
    const key = ruleKey(field.ruleKey || field.key, formData.fiatCurrency)

    if (field.type === 'address' || field.type === 'text') {
      if (isFilled(filter.value)) {
        rules[key] = { $eq: String(filter.value).trim() }
      }
      return
    }

    if (field.type === 'txType') {
      if ((filter.operator || '$eq') === '$eq' && isFilled(filter.value)) {
        rules[key] = { $eq: filter.value }
      } else if ((filter.operator === '$in' || filter.operator === '$nin') && filter.values?.length > 0) {
        rules[key] = { [filter.operator]: filter.values }
      }
      return
    }

    if (field.type === 'number') {
      if (isFilled(filter.value)) {
        rules[key] = { [field.exactOnly ? '$eq' : filter.operator || '$gte']: Number(filter.value) }
      }
      return
    }

    if (field.type === 'token') {
      if (filter.value?.currency) {
        const currencyKey = field.currencyKey || 'currency'
        const issuerKey = field.issuerKey || 'currency_issuer'
        rules[currencyKey] = { $eq: filter.value.currency }
        if (filter.value.issuer) {
          rules[issuerKey] = { $eq: filter.value.issuer }
        }
      }
      return
    }

    if (field.type === 'boolean') {
      if (filter.value === 'true' || filter.value === 'false') {
        rules[key] = { $eq: filter.value === 'true' }
      }
      return
    }

    if (field.type === 'destination') {
      const mode = filter.mode || 'any'
      if (mode === 'specific' && isFilled(filter.value)) {
        rules.destination = { $eq: String(filter.value).trim() }
      } else if (mode === 'none') {
        rules.destination = { $eq: null }
      } else if (mode === 'knownBroker') {
        rules.known_broker = { $eq: true }
      } else if (mode === 'noneOrKnownBroker') {
        rules.$or = [{ destination: { $eq: null } }, { known_broker: { $eq: true } }]
      }
    }
  })

  const settings = {
    rules,
    fiatCurrency: formData.fiatCurrency || 'usd'
  }

  if (notificationEventSupports(formData.event, 'externalUrl')) {
    settings.externalUrl = !!formData.externalUrl
  }

  if (notificationEventSupports(formData.event, 'xrpCafeURL')) {
    settings.xrpCafeURL = !!formData.xrpCafeURL
  }

  return settings
}

export default function Notifications({
  sessionToken,
  openEmailLogin,
  setSignRequest,
  setProExpire,
  setSubscriptionExpired
}) {
  const { t } = useTranslation('admin')
  const booleanFilterOptions = [
    { value: 'any', label: t('common.any') },
    { value: 'true', label: t('common.yes') },
    { value: 'false', label: t('common.no') }
  ]
  const destinationFilterOptions = [
    { value: 'any', label: t('notifications.destination.any') },
    { value: 'specific', label: t('notifications.destination.specific') },
    { value: 'none', label: t('notifications.destination.none') }
  ]
  const brokerDestinationFilterOptions = [
    ...destinationFilterOptions,
    { value: 'knownBroker', label: t('notifications.destination.known-broker') },
    { value: 'noneOrKnownBroker', label: t('notifications.destination.none-or-known-broker') }
  ]
  const numberOperatorOptions = NOTIFICATION_NUMBER_OPERATOR_OPTIONS.map((option) => ({
    ...option,
    label: t(`notifications.number-operators.${option.value}`, { defaultValue: option.label })
  }))
  const txTypeOperatorOptions = NOTIFICATION_TX_TYPE_OPERATOR_OPTIONS.map((option) => ({
    ...option,
    label: t(`notifications.tx-type-operators.${option.value}`, { defaultValue: option.label })
  }))
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
  const [notificationPackages, setNotificationPackages] = useState([])
  const [loadingNotificationPrerequisites, setLoadingNotificationPrerequisites] = useState(false)
  const [notificationPrerequisitesLoaded, setNotificationPrerequisitesLoaded] = useState(false)

  const selectedChannel = useMemo(() => NOTIFICATION_CHANNELS[channelType], [channelType])
  const selectedChannelFields = selectedChannel?.fields || []
  const selectedGuide = useMemo(() => setupGuides.find((guide) => guide.type === channelType), [channelType])
  const ruleChannelOptions = useMemo(
    () =>
      channels.map((channel) => ({
        value: channel.id,
        label: channel.name || notificationChannelLabel(channel.type, t)
      })),
    [channels, t]
  )
  const selectedRuleChannelOption = useMemo(
    () => ruleChannelOptions.find((option) => String(option.value) === String(ruleFormData.connectionId)) || null,
    [ruleChannelOptions, ruleFormData.connectionId]
  )
  const notificationEventOptions = useMemo(
    () =>
      getNotificationEventOptions({ xahau: xahauNetwork }).map((option) => ({
        ...option,
        label: t(`notifications.events.${option.value}.label`, { defaultValue: option.label }),
        description: t(`notifications.events.${option.value}.description`, { defaultValue: option.description }),
        group: t(`notifications.event-groups.${option.group}`, { defaultValue: option.group })
      })),
    [t]
  )
  const notificationTxTypeOptions = useMemo(() => getNotificationTxTypeOptions({ xahau: xahauNetwork }), [])
  const selectedFiatCurrencyOption = useMemo(
    () => NOTIFICATION_FIAT_CURRENCY_OPTIONS.find((option) => option.value === ruleFormData.fiatCurrency) || null,
    [ruleFormData.fiatCurrency]
  )
  const savingChannel = createChannel.isLoading || updateChannel.isLoading
  const savingRule = createRule.isLoading || updateRule.isLoading
  const notificationErrorCode = error?.response?.data?.error
  const partnerMissing = notificationErrorCode === 'errors.partner.not_found'
  const tokenRequired = notificationErrorCode === 'errors.token.required'
  const notificationDataUnavailable = !!error
  const activeBotPackage = activePackage(notificationPackages, 'bot')
  const alertPlan = getAlertPlanForPackage(activeBotPackage)
  const notificationLimitsReady = notificationPrerequisitesLoaded && !loadingNotificationPrerequisites
  const channelLimitReached = channels.length >= alertPlan.connections
  const ruleLimitReached = rules.length >= alertPlan.listeners
  const canShowAlertPlanUpgrade = showAlertPlanUpgrade(alertPlan, activeBotPackage)
  const unsupportedChannelTypeMessage = () =>
    t('notifications.errors.unsupported-channel-type', {
      defaultValue: 'This channel type is no longer supported for editing.'
    })

  useEffect(() => {
    if (!sessionToken) return

    const loadNotificationPrerequisites = async () => {
      setLoadingNotificationPrerequisites(true)
      try {
        const packagesResponse = await axiosAdmin.get('partner/packages').catch(() => null)
        setNotificationPackages(Array.isArray(packagesResponse?.data?.packages) ? packagesResponse.data.packages : [])
      } finally {
        setNotificationPrerequisitesLoaded(true)
        setLoadingNotificationPrerequisites(false)
      }
    }

    loadNotificationPrerequisites()
  }, [sessionToken])

  const openAddChannel = (type = NOTIFICATION_CHANNEL_TYPES.EMAIL) => {
    if (notificationLimitsReady && channelLimitReached) {
      setFormMessage(`${t('notifications.channel-limit-reached')} ${alertPlanLimitText(alertPlan, t)}`)
      setShowChannelForm(false)
      return
    }
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

  const firstChannelId = () => channels[0]?.id || ''

  const openAddRule = () => {
    if (notificationLimitsReady && ruleLimitReached) {
      setRuleFormMessage(`${t('notifications.rule-limit-reached')} ${alertPlanLimitText(alertPlan, t)}`)
      setShowRuleForm(false)
      return
    }

    const event = notificationEventOptions[0]?.value || defaultRuleEvent
    setEditingRule(null)
    setRuleFormData({
      ...initialRuleForm,
      connectionId: firstChannelId(),
      event,
      name: defaultRuleName(t, rules.length + 1)
    })
    setRuleFormErrors({})
    setRuleFormMessage('')
    setShowRuleForm(true)
  }

  const openEditRule = (rule) => {
    const ruleSettings = rule.settings || {}
    const event = normalizeNotificationEvent(rule.event) || NOTIFICATION_EVENT_TYPES.BALANCE_CHANGE
    const enabled = enabledBoolean(rule.enabled)
    setEditingRule(rule)
    setRuleFormData({
      connectionId: listenerConnectionId(rule),
      enabled,
      event,
      externalUrl: ruleSettings.externalUrl !== false,
      filters: parseRuleFilters(event, ruleSettings.rules, ruleSettings.fiatCurrency || 'usd'),
      fiatCurrency: ruleSettings.fiatCurrency || 'usd',
      name: rule.name || '',
      xrpCafeURL: !!ruleSettings.xrpCafeURL
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
    const { name, type, value, checked } = event.target
    setRuleFormData((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }))
    setRuleFormErrors((prev) => ({ ...prev, [name]: '' }))
    setRuleFormMessage('')
  }

  const handleRuleFilterChange = (key, nextFilter) => {
    setRuleFormData((prev) => ({
      ...prev,
      filters: {
        ...prev.filters,
        [key]: {
          ...prev.filters?.[key],
          ...nextFilter
        }
      }
    }))
    setRuleFormErrors((prev) => ({ ...prev, [key]: '' }))
    setRuleFormMessage('')
  }

  const handleRuleBooleanToggle = (name) => {
    setRuleFormData((prev) => ({
      ...prev,
      [name]: name === 'enabled' ? !formEnabledBoolean(prev[name]) : !Boolean(prev[name])
    }))
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
    let message = ''
    if (!editingChannel && notificationLimitsReady && channelLimitReached) {
      message = `${t('notifications.channel-limit-reached')} ${alertPlanLimitText(alertPlan, t)}`
    }
    if (!formData.name?.trim()) {
      errors.name = t('notifications.errors.channel-name-required')
    }

    if (!selectedChannel) {
      message = unsupportedChannelTypeMessage()
    }

    selectedChannelFields.forEach((field) => {
      const value = formData[field.id]?.trim()
      if (field.required && !value) {
        errors[field.id] = t('notifications.errors.field-required', { field: t(`notifications.fields.${field.id}`, { defaultValue: field.label }) })
      } else if (value && field.validate) {
        const validation = field.validate(value)
        if (validation !== true) {
          errors[field.id] = t(`notifications.errors.invalid-${field.id}`, { defaultValue: validation })
        }
      }
    })

    setFormErrors(errors)
    setFormMessage(message)
    return Object.keys(errors).length === 0 && !message
  }

  const validateRuleForm = () => {
    const errors = {}
    let message = ''
    if (!editingRule && notificationLimitsReady && ruleLimitReached) {
      message = `${t('notifications.rule-limit-reached')} ${alertPlanLimitText(alertPlan, t)}`
    }
    const selectedRuleChannel = channels.find((channel) => String(channel.id) === String(ruleFormData.connectionId))
    if (!ruleFormData.connectionId || !selectedRuleChannel) {
      errors.connectionId = t('notifications.errors.choose-channel')
    }
    if (!ruleFormData.name?.trim()) {
      errors.name = t('notifications.errors.rule-name-required')
    }
    if (!notificationEventOptions.some((option) => option.value === ruleFormData.event)) {
      errors.event = t('notifications.errors.event-invalid-short')
    }

    getNotificationFilterFields(ruleFormData.event).forEach((field) => {
      const filter = filterValue(ruleFormData.filters, field.key)
      if (field.required && !isFilled(filter.value)) {
        errors[field.key] = t('notifications.errors.choose-field', { field: filterLabel(field, t).toLowerCase() })
      }
      if (field.type === 'address' && isFilled(filter.value) && !isAddressValid(filter.value)) {
        errors[field.key] = t('notifications.errors.valid-address')
      }
      if (field.type === 'number' && isFilled(filter.value) && !Number.isFinite(Number(filter.value))) {
        errors[field.key] = t('notifications.errors.valid-number')
      }
      if (field.type === 'txType') {
        const operator = filter.operator || '$eq'
        if (operator === '$eq' && isFilled(filter.value) && !notificationTxTypeOptions.some((option) => option.value === filter.value)) {
          errors[field.key] = t('notifications.errors.tx-type-supported')
        }
        if (
          (operator === '$in' || operator === '$nin') &&
          filter.values?.some((value) => !notificationTxTypeOptions.some((option) => option.value === value))
        ) {
          errors[field.key] = t('notifications.errors.tx-types-supported')
        }
      }
      if (field.type === 'destination' && filter.mode === 'specific' && !isAddressValid(filter.value)) {
        errors[field.key] = t('notifications.errors.valid-destination')
      }
    })

    setRuleFormErrors(errors)
    setRuleFormMessage(message)
    return Object.keys(errors).length === 0 && !message
  }

  const handleCreateProfile = async (event) => {
    event.preventDefault()
    setProfileMessage('')
    if (!partnerName.trim()) {
      setProfileMessage(t('notifications.errors.profile-name-required'))
      return
    }
    if (!partnerCountry) {
      setProfileMessage(t('notifications.errors.country-required'))
      return
    }

    try {
      await createProfile.mutate({ name: partnerName.trim(), country: partnerCountry })
      await refetch()
    } catch (error) {
      setProfileMessage(errorText(error, t('notifications.errors.setup-failed'), t))
    }
  }

  const handleSaveChannel = async (event) => {
    event.preventDefault()
    setFormMessage('')
    if (!validateChannelForm()) return
    if (!selectedChannel) return

    const payload = {
      type: channelType,
      name: formData.name.trim(),
      settings: {}
    }

    selectedChannelFields.forEach((field) => {
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
      setFormMessage(errorText(error, t('notifications.errors.save-channel-failed'), t))
    }
  }

  const handleSaveRule = async (event) => {
    event.preventDefault()
    setRuleFormMessage('')
    if (!validateRuleForm()) return

    const payload = {
      action: NOTIFICATION_ACTION_TYPES.NOTIFICATION,
      enabled: formEnabledBoolean(ruleFormData.enabled),
      event: ruleFormData.event,
      name: ruleFormData.name.trim(),
      settings: buildRuleSettings(ruleFormData)
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
      setRuleFormMessage(errorText(error, t('notifications.errors.save-rule-failed'), t))
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

    if (!editingChannel && notificationLimitsReady && channelLimitReached) {
      return renderChannelLimitNotice()
    }

    const channelNamePlaceholder = t(`notifications.channel-name-placeholder-by-type.${channelType}`)

    return (
      <form className="notification-form" onSubmit={handleSaveChannel}>
        <div className="notification-form-grid">
          {renderChannelTypePicker({ disabled: !!editingChannel, labelKey: 'notifications.channel-type-label' })}
          {renderSelectedChannelGuide()}
          {!selectedChannel && <p className="red notification-field-wide">{unsupportedChannelTypeMessage()}</p>}
          <InputField
            className={channelType === NOTIFICATION_CHANNEL_TYPES.TWITTER ? 'notification-field-wide' : ''}
            error={formErrors.name}
            helpText={t('notifications.channel-name-help')}
            id="name"
            label={t('notifications.channel-name')}
            onChange={handleInputChange}
            placeholder={channelNamePlaceholder}
            required
            value={formData.name || ''}
          />
          {selectedChannelFields.map((field) => (
            <InputField
              error={formErrors[field.id]}
              helpText={t(`notifications.field-help.${field.id}`, { defaultValue: field.helpText })}
              id={field.id}
              inputProps={field.inputProps}
              key={field.id}
              label={t(`notifications.fields.${field.id}`, { defaultValue: field.label })}
              onChange={handleInputChange}
              placeholder={t(`notifications.field-placeholder.${field.id}`, { defaultValue: field.placeholder })}
              required={field.required}
              type={field.type}
              value={formData[field.id] || ''}
            />
          ))}
        </div>
        {formMessage && <p className="red center">{formMessage}</p>}
        <div className="notification-form-actions">
          <button className="button-action" disabled={savingChannel || !selectedChannel} type="submit">
            {savingChannel
              ? t('common.saving')
              : editingChannel
                ? t('notifications.actions.save-channel')
                : t('notifications.actions.add-channel')}
          </button>
          {(channels.length > 0 || editingChannel) && (
            <button className="button-action thin secondary" onClick={closeChannelForm} type="button">
              {t('button.cancel')}
            </button>
          )}
        </div>
      </form>
    )
  }

  const renderChannelTypePicker = ({ disabled = false, labelKey = 'notifications.available-channel-types' } = {}) => (
    <div className="notification-channel-picker">
      <span>{t(labelKey)}</span>
      <div className="notification-channel-type-grid">
        {setupGuides.map((guide) => {
          const Icon = guide.icon
          const active = !disabled && guide.type === channelType
          return (
            <button
              aria-pressed={active}
              className={`notification-channel-type-button${active ? ' active' : ''}`}
              disabled={disabled}
              key={guide.type}
              onClick={() => handleTypeChange(guide.type)}
              type="button"
            >
              <Icon />
              <strong>{t(`notifications.guides.${guide.type}.title`, { defaultValue: guide.title })}</strong>
            </button>
          )
        })}
      </div>
    </div>
  )

  const renderSelectedChannelGuide = ({ showWithoutSteps = false } = {}) => {
    if (!selectedGuide) return null
    const selectedGuideHasSteps = selectedGuide.steps.length > 0
    if (!showWithoutSteps && !selectedGuideHasSteps && !selectedGuide.fromEmail) return null

    return (
      <div className={`notification-selected-guide${selectedGuideHasSteps ? '' : ' no-steps'}`}>
        <div>
          <strong>{t(`notifications.guides.${selectedGuide.type}.title`, { defaultValue: selectedGuide.title })}</strong>
          <p>
            {t(`notifications.guides.${selectedGuide.type}.description`, {
              defaultValue: selectedGuide.description,
              explorerName
            })}
          </p>
          {selectedGuide.fromEmail && (
            <p className="orange">
              {t('notifications.email-from-notice', {
                defaultValue: `For security: our alert emails are only ever sent from {{fromEmail}}. Never click links in emails claiming to be from us that arrive from a different address.`,
                fromEmail: selectedGuide.fromEmail
              })}
            </p>
          )}
        </div>
        {selectedGuideHasSteps && (
          <div>
            <ol>
              {selectedGuide.steps.map((step, index) => (
                <li key={step}>
                  {t(`notifications.guides.${selectedGuide.type}.steps.${index}`, { defaultValue: step })}
                </li>
              ))}
            </ol>
            {selectedGuide.portalHref && (
              <a
                href={selectedGuide.portalHref}
                className="notification-guide-link"
                target="_blank"
                rel="noreferrer"
              >
                {t(`notifications.guides.${selectedGuide.type}.portal-link`, {
                  defaultValue: selectedGuide.portalLabel
                })}
              </a>
            )}
            {selectedGuide.guideHref && (
              <Link href={selectedGuide.guideHref} className="notification-guide-link">
                {t('notifications.detailed-setup-guide')}
              </Link>
            )}
          </div>
        )}
      </div>
    )
  }

  const renderChannelLimitNotice = () => (
    <div className="notification-limit-notice">
      <div className="notification-limit-summary">
        <strong>{t('notifications.channel-limit-reached')}</strong>
        <span>
          {alertPlanLimitText(alertPlan, t)}{' '}
          {canShowAlertPlanUpgrade && (
            <Link href={notificationsSubscriptionHref}>{t('notifications.upgrade-add-channels')}</Link>
          )}
        </span>
      </div>
      {renderChannelTypePicker({ disabled: true })}
    </div>
  )

  const renderRuleFilterField = (field) => {
    const filter = filterValue(ruleFormData.filters, field.key)
    const fieldClassName = `notification-field${field.wide ? ' notification-field-wide' : ''}`

    if (field.type === 'address') {
      return (
        <div className={`${fieldClassName} notification-address-field`} key={field.key}>
          <AddressInput
            hideButton={true}
            placeholder={t('notifications.enter-address-username')}
            rawData={{ address: filter.value || '' }}
            setInnerValue={(value) => handleRuleFilterChange(field.key, { value })}
            setValue={(value) => handleRuleFilterChange(field.key, { value })}
            title={`${filterLabel(field, t)}${field.required ? ' *' : ''}`}
            type="address"
          />
          {field.required && <small>{t('notifications.required-for-rule')}</small>}
          {field.helpText && <small>{t(`notifications.field-help.${field.key}`, { defaultValue: field.helpText })}</small>}
          {ruleFormErrors[field.key] && <strong>{ruleFormErrors[field.key]}</strong>}
        </div>
      )
    }

    if (field.type === 'number') {
      const selectedOperator =
        numberOperatorOptions.find((option) => option.value === (filter.operator || '$gte')) || numberOperatorOptions[0]
      return (
        <div className={fieldClassName} key={field.key}>
          <span>
            {filterLabel(field, t)}
            {field.required ? ' *' : ''}
          </span>
          <div className={`notification-filter-number${field.exactOnly ? ' exact' : ''}`}>
            {!field.exactOnly && (
              <Select
                className="simple-select"
                classNamePrefix="react-select"
                instanceId={`notification-rule-${field.key}-operator`}
                isSearchable={false}
                onChange={(option) => handleRuleFilterChange(field.key, { operator: option?.value || '$gte' })}
                options={numberOperatorOptions}
                value={selectedOperator}
              />
            )}
            <input
              className="input-text"
              inputMode="decimal"
              name={field.key}
              onChange={(event) => handleRuleFilterChange(field.key, { value: event.target.value })}
              placeholder="0"
              type="number"
              value={filter.value || ''}
            />
          </div>
          {field.helpText && <small>{t(`notifications.field-help.${field.key}`, { defaultValue: field.helpText })}</small>}
          {ruleFormErrors[field.key] && <strong>{ruleFormErrors[field.key]}</strong>}
        </div>
      )
    }

    if (field.type === 'txType') {
      const selectedOperator =
        txTypeOperatorOptions.find((option) => option.value === (filter.operator || '$eq')) || txTypeOperatorOptions[0]
      const isMulti = selectedOperator.value === '$in' || selectedOperator.value === '$nin'
      const selectedTxType = notificationTxTypeOptions.find((option) => option.value === filter.value) || null
      const selectedTxTypes = notificationTxTypeOptions.filter((option) => filter.values?.includes(option.value))

      return (
        <div className={fieldClassName} key={field.key}>
          <span>{filterLabel(field, t)}</span>
          <div className="notification-filter-tx-type">
            <Select
              className="simple-select"
              classNamePrefix="react-select"
              instanceId="notification-rule-tx-type-operator"
              isSearchable={false}
              onChange={(option) =>
                handleRuleFilterChange(field.key, {
                  operator: option?.value || '$eq',
                  value: '',
                  values: []
                })
              }
              options={txTypeOperatorOptions}
              value={selectedOperator}
            />
            <Select
              className="simple-select notification-tx-type-values"
              classNamePrefix="react-select"
              instanceId="notification-rule-tx-type"
              isClearable={true}
              isMulti={isMulti}
              isSearchable={true}
              onChange={(option) => {
                if (isMulti) {
                  handleRuleFilterChange(field.key, {
                    value: '',
                    values: Array.isArray(option) ? option.map((item) => item.value) : []
                  })
                } else {
                  handleRuleFilterChange(field.key, { value: option?.value || '', values: [] })
                }
              }}
              options={notificationTxTypeOptions}
              placeholder={isMulti ? t('notifications.choose-tx-types') : t('notifications.any-tx-type')}
              value={isMulti ? selectedTxTypes : selectedTxType}
            />
          </div>
          {ruleFormErrors[field.key] && <strong>{ruleFormErrors[field.key]}</strong>}
        </div>
      )
    }

    if (field.type === 'token') {
      return (
        <div className={`${fieldClassName} notification-token-field`} key={field.key}>
          <span>
            {filterLabel(field, t)}
            {field.required ? ' *' : ''}
          </span>
          <TokenSelector
            value={filter.value || {}}
            onChange={(value) => handleRuleFilterChange(field.key, { value })}
          />
          <small>{t('notifications.choose-token', { nativeCurrency })}</small>
        </div>
      )
    }

    if (field.type === 'destination') {
      const options = field.includeKnownBroker ? brokerDestinationFilterOptions : destinationFilterOptions
      const selectedOption = options.find((option) => option.value === (filter.mode || 'any')) || options[0]
      return (
        <div className="notification-field notification-address-field" key={field.key}>
          <span>
            {filterLabel(field, t)}
            {field.required ? ' *' : ''}
          </span>
          <Select
            className="simple-select"
            classNamePrefix="react-select"
            instanceId="notification-rule-destination-mode"
            isSearchable={false}
            onChange={(option) =>
              handleRuleFilterChange(field.key, {
                mode: option?.value || 'any',
                value: option?.value === 'specific' ? filter.value || '' : ''
              })
            }
            options={options}
            value={selectedOption}
          />
          {(filter.mode || 'any') === 'specific' && (
            <AddressInput
              hideButton={true}
              placeholder={t('notifications.enter-destination')}
              rawData={{ address: filter.value || '' }}
              setInnerValue={(value) => handleRuleFilterChange(field.key, { value })}
              setValue={(value) => handleRuleFilterChange(field.key, { value })}
              title={t('notifications.destination-address')}
              type="address"
            />
          )}
          {ruleFormErrors[field.key] && <strong>{ruleFormErrors[field.key]}</strong>}
        </div>
      )
    }

    if (field.type === 'boolean') {
      const selectedOption = booleanFilterOptions.find((option) => option.value === (filter.value || 'any')) || booleanFilterOptions[0]
      return (
        <label className="notification-field" key={field.key}>
          <span>
            {filterLabel(field, t)}
            {field.required ? ' *' : ''}
          </span>
          <Select
            className="simple-select"
            classNamePrefix="react-select"
            instanceId={`notification-rule-${field.key}`}
            isSearchable={false}
            onChange={(option) => handleRuleFilterChange(field.key, { value: option?.value || 'any' })}
            options={booleanFilterOptions}
            value={selectedOption}
          />
        </label>
      )
    }

    return (
      <label className={fieldClassName} key={field.key}>
        <span>
          {filterLabel(field, t)}
          {field.required ? ' *' : ''}
        </span>
        <input
          className="input-text"
          name={field.key}
          onChange={(event) => handleRuleFilterChange(field.key, { value: event.target.value })}
          placeholder={field.placeholder?.replace('{nativeCurrency}', nativeCurrency) || filterLabel(field, t)}
          type="text"
          value={filter.value || ''}
        />
        {field.helpText && <small>{t(`notifications.field-help.${field.key}`, { defaultValue: field.helpText })}</small>}
        {ruleFormErrors[field.key] && <strong>{ruleFormErrors[field.key]}</strong>}
      </label>
    )
  }

  const renderRuleForm = () => {
    if (!showRuleForm) return null

    if (!editingRule && notificationLimitsReady && ruleLimitReached) {
      return (
        <div className="notification-limit-notice">
          <strong>{t('notifications.rule-limit-reached')}</strong>
          <span>
            {alertPlanLimitText(alertPlan, t)}{' '}
            {canShowAlertPlanUpgrade && (
              <Link href={notificationsSubscriptionHref}>{t('notifications.upgrade-add-rules')}</Link>
            )}
          </span>
        </div>
      )
    }

    const ruleFilterFields = getNotificationFilterFields(ruleFormData.event)

    return (
      <form className="notification-form" onSubmit={handleSaveRule}>
        <div className="notification-form-grid">
          <div className="notification-rule-requirement">
            <strong>
              {t('notifications.alerts-plan', {
                plan: t(`plans.${alertPlan.tier}`, { defaultValue: alertPlan.label })
              })}
            </strong>
            <span>
              {alertPlanLimitText(alertPlan, t)}{' '}
              {canShowAlertPlanUpgrade && (
                <Link href={notificationsSubscriptionHref}>{t('notifications.upgrade-more')}</Link>
              )}
            </span>
          </div>
          <div className="notification-rule-event-picker">
            <span>{t('notifications.event')}</span>
            <div className="notification-rule-event-grid">
              {notificationEventOptions.map((option) => {
                const active = option.value === ruleFormData.event
                return (
                  <button
                    aria-pressed={active}
                    className={`notification-rule-event-button${active ? ' active' : ''}`}
                    key={option.value}
                    onClick={() => {
                      setRuleFormData((prev) => ({
                        ...prev,
                        connectionId: prev.connectionId || firstChannelId(),
                        event: option.value,
                        externalUrl: notificationEventSupports(option.value, 'externalUrl') ? prev.externalUrl : false,
                        filters: {},
                        xrpCafeURL: notificationEventSupports(option.value, 'xrpCafeURL') ? prev.xrpCafeURL : false
                      }))
                      setRuleFormErrors((prev) => ({ ...prev, event: '' }))
                      setRuleFormMessage('')
                    }}
                    type="button"
                  >
                    <span>{option.group}</span>
                    <strong>{option.label}</strong>
                    <small>{option.description}</small>
                  </button>
                )
              })}
            </div>
            {ruleFormErrors.event && <strong>{ruleFormErrors.event}</strong>}
          </div>
          <label className="notification-field">
            <span>{t('notifications.channel')}</span>
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
              placeholder={t('notifications.choose-channel')}
              value={selectedRuleChannelOption}
            />
            {ruleFormErrors.connectionId && <strong>{ruleFormErrors.connectionId}</strong>}
          </label>
          <InputField
            error={ruleFormErrors.name}
            helpText={t('notifications.rule-name-help')}
            id="name"
            label={t('notifications.rule-name')}
            onChange={handleRuleInputChange}
            placeholder={t('notifications.rule-name-placeholder')}
            required
            value={ruleFormData.name}
          />
          {ruleFilterFields.length > 0 && (
            <div className="notification-rule-filter-panel">
              <div className="notification-rule-filter-header">
                <strong>{t('notifications.filters-title')}</strong>
                <span>{t('notifications.filters-help')}</span>
              </div>
              <div className="notification-rule-filter-grid">
                {ruleFilterFields.map((field) => renderRuleFilterField(field))}
              </div>
            </div>
          )}
          <label className="notification-field">
            <span>{t('notifications.fiat-currency')}</span>
            <Select
              className="simple-select"
              classNamePrefix="react-select"
              instanceId="notification-rule-fiat-currency"
              isSearchable={false}
              onChange={(option) => {
                setRuleFormData((prev) => ({ ...prev, fiatCurrency: option?.value || 'usd' }))
                setRuleFormMessage('')
              }}
              options={NOTIFICATION_FIAT_CURRENCY_OPTIONS}
              placeholder={t('notifications.choose-currency')}
              value={selectedFiatCurrencyOption}
            />
            <small>{t('notifications.fiat-help')}</small>
          </label>
          <div className="notification-toggle-card">
            <button
              aria-label={t('notifications.toggle-rule-enabled')}
              aria-pressed={formEnabledBoolean(ruleFormData.enabled)}
              className={`notification-toggle-control${formEnabledBoolean(ruleFormData.enabled) ? ' active' : ''}`}
              onClick={() => handleRuleBooleanToggle('enabled')}
              type="button"
            />
            <span className="notification-toggle-copy">
              <strong>{t('status.enabled')}</strong>
              <small>{t('notifications.enabled-help')}</small>
            </span>
          </div>
          {notificationEventSupports(ruleFormData.event, 'externalUrl') && (
            <div className="notification-toggle-card">
              <button
                aria-label={t('notifications.toggle-external-links')}
                aria-pressed={!!ruleFormData.externalUrl}
                className={`notification-toggle-control${ruleFormData.externalUrl ? ' active' : ''}`}
                onClick={() => handleRuleBooleanToggle('externalUrl')}
                type="button"
              />
              <span className="notification-toggle-copy">
                <strong>{t('notifications.include-external-links')}</strong>
                <small>{t('notifications.external-links-help')}</small>
              </span>
            </div>
          )}
          {notificationEventSupports(ruleFormData.event, 'xrpCafeURL') && (
            <div className="notification-toggle-card">
              <button
                aria-label={t('notifications.toggle-xrp-cafe')}
                aria-pressed={!!ruleFormData.xrpCafeURL}
                className={`notification-toggle-control${ruleFormData.xrpCafeURL ? ' active' : ''}`}
                onClick={() => handleRuleBooleanToggle('xrpCafeURL')}
                type="button"
              />
              <span className="notification-toggle-copy">
                <strong>{t('notifications.include-xrp-cafe')}</strong>
                <small>{t('notifications.xrp-cafe-help')}</small>
              </span>
            </div>
          )}
          <div className="notification-rule-summary">
            <strong>{ruleFormData.name || t('notifications.new-rule')}</strong>
            <span>
              {t(`notifications.events.${ruleFormData.event}.description`, {
                defaultValue: getNotificationEventDescription(ruleFormData.event)
              })}
            </span>
          </div>
        </div>
        {ruleFormMessage && <p className="red center">{ruleFormMessage}</p>}
        <div className="notification-form-actions">
          <button className="button-action" disabled={savingRule} type="submit">
            {savingRule
              ? t('common.saving')
              : editingRule
                ? t('notifications.actions.save-rule')
                : t('notifications.actions.add-rule')}
          </button>
          <button className="button-action thin secondary" onClick={closeRuleForm} type="button">
            {t('button.cancel')}
          </button>
        </div>
      </form>
    )
  }

  const executionFieldLabel = (key) => {
    const labels = {
      id: 'ID',
      createdAt: t('table.created', { ns: 'admin' }),
      created_at: t('table.created', { ns: 'admin' }),
      updatedAt: t('notifications.executions.pushed'),
      updated_at: t('notifications.executions.pushed'),
      status: t('table.status', { ns: 'admin' }),
      txHash: '',
      tx_hash: ''
    }

    if (key in labels) return labels[key]
    return key.replace(/_/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2')
  }

  const executionStatusClass = (status) => {
    const normalizedStatus = String(status || '').toLowerCase()
    if (normalizedStatus === 'success' || normalizedStatus === 'ok') return 'success'
    if (normalizedStatus === 'failed' || normalizedStatus === 'error') return 'error'
    return ''
  }

  const renderExecutionValue = (key, value) => {
    if (value === null || typeof value === 'undefined') return t('common.none', { ns: 'admin' })

    if (key === 'createdAt' || key === 'created_at' || key === 'updatedAt' || key === 'updated_at') {
      return fullDateAndTime(value)
    }

    if (key === 'txHash' || key === 'tx_hash') {
      if (!value) return t('common.none', { ns: 'admin' })

      const [txHash, address] = String(value).split(':')
      if (address) {
        return (
          <span className="notification-execution-link-pair">
            <span className="notification-execution-mini-label">{t('table.transaction', { ns: 'admin' })}</span>
            <Link className="notification-execution-link" href={`/tx/${txHash}`} title={txHash}>
              {shortHash(txHash, 6)}
            </Link>
            <span className="notification-execution-mini-label">{t('table.address', { ns: 'admin' })}</span>
            <Link className="notification-execution-link muted" href={`/account/${address}`} title={address}>
              {shortHash(address, 6)}
            </Link>
          </span>
        )
      }

      return (
        <Link className="notification-execution-link" href={`/tx/${txHash}`} title={txHash}>
          {shortHash(txHash, 10)}
        </Link>
      )
    }

    if (typeof value === 'boolean') return value ? t('common.yes', { ns: 'admin' }) : t('common.no', { ns: 'admin' })
    if (Array.isArray(value)) {
      if (value.length === 0) return t('common.none', { ns: 'admin' })
      return (
        <div className="notification-execution-nested">
          {value.map((item, index) => (
            <div key={index}>{typeof item === 'object' ? renderExecutionValue(`${key}-${index}`, item) : String(item)}</div>
          ))}
        </div>
      )
    }
    if (typeof value === 'object') {
      const entries = Object.entries(value).filter(([, itemValue]) => itemValue !== undefined && itemValue !== null)
      if (entries.length === 0) return t('common.none', { ns: 'admin' })
      return (
        <div className="notification-execution-nested">
          {entries.map(([itemKey, itemValue]) => (
            <div className="notification-execution-nested-row" key={itemKey}>
              <span>{executionFieldLabel(itemKey)}</span>
              <span className="notification-execution-nested-value">{renderExecutionValue(itemKey, itemValue)}</span>
            </div>
          ))}
        </div>
      )
    }

    return String(value)
  }

  const renderExecutionFields = (execution) => {
    const entries = Object.entries(execution || {}).filter(
      ([key, value]) =>
        key !== 'result' &&
        key !== 'status' &&
        key !== 'createdAt' &&
        key !== 'created_at' &&
        value !== undefined &&
        value !== null
    )

    return (
      <div className="notification-execution-fields">
        {entries.map(([key, value]) => (
          <div className="notification-execution-field" key={key}>
            <span>{executionFieldLabel(key)}</span>
            <span className="notification-execution-field-value">{renderExecutionValue(key, value)}</span>
          </div>
        ))}
      </div>
    )
  }

  const renderExecutionsCount = (count, total) => (
    <p className="notification-executions-count">
      {t('notifications.executions.shown-count', { count, total })}
    </p>
  )

  const renderExecutionsDialogContent = () => {
    if (ruleExecutions.isLoading) {
      return (
        <div className="notification-executions-empty notification-executions-empty-loading">
          <div className="notification-executions-empty-icon" aria-hidden="true">
            <span className="loader" />
          </div>
          <h3>{t('notifications.executions.none-title')}</h3>
          <p>{t('notifications.executions.loading-text')}</p>
          {renderExecutionsCount(0, 0)}
        </div>
      )
    }

    if (ruleExecutions.error) {
      return <p className="red">{ruleExecutions.error?.response?.data?.error || ruleExecutions.error?.message}</p>
    }

    const data = ruleExecutions.data || {}
    const executions = Array.isArray(data.executions) ? data.executions : []
    const total = data.total ?? executions.length
    const count = data.count ?? executions.length

    if (executions.length === 0) {
      return (
        <div className="notification-executions-empty">
          <div className="notification-executions-empty-icon" aria-hidden="true">
            <MdHistory />
          </div>
          <h3>{t('notifications.executions.none-title')}</h3>
          <p>{t('notifications.executions.none-text')}</p>
          {renderExecutionsCount(count, total)}
        </div>
      )
    }

    return (
      <div className="notification-executions">
        {renderExecutionsCount(count, total)}
        <div className="notification-executions-list">
          {executions.map((execution, index) => (
            <article className="notification-execution-item" key={execution.id || execution.createdAt || index}>
              <div className="notification-execution-item-header">
                <strong className={executionStatusClass(execution.status)}>
                  {execution.status || t('notifications.executions.number', { id: execution.id || index + 1 })}
                </strong>
                {(execution.createdAt || execution.created_at) && (
                  <span>{fullDateAndTime(execution.createdAt || execution.created_at)}</span>
                )}
              </div>
              {renderExecutionFields(execution)}
            </article>
          ))}
        </div>
      </div>
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
              <p className="notification-eyebrow">{t('notifications.eyebrow', { explorerName })}</p>
              <h2>{t('tabs.alerts')}</h2>
              <p>{t('notifications.hero-text')}</p>
            </div>
            <div className="notification-hero-visual" aria-hidden="true">
              <MdWebhook />
              <MdOutlineRule />
              <MdNotificationsActive />
            </div>
          </section>

          {!isLoading && !partnerMissing && !tokenRequired && (
            <SubscriptionManager
              id="alerts-subscription"
              openEmailLogin={openEmailLogin}
              packageType="bot"
              PlanComponent={NotificationsBotSubscription}
              sessionToken={sessionToken}
              setProExpire={setProExpire}
              setSignRequest={setSignRequest}
              setSubscriptionExpired={setSubscriptionExpired}
              title={t('tabs.alerts-bot')}
            />
          )}

          {isLoading && <p className="center">{t('notifications.loading-alerts')}</p>}

          {partnerMissing && (
            <section className="notification-setup-card">
              <div>
                <h2>{t('notifications.finish-setup')}</h2>
                <p>{t('notifications.finish-setup-text')}</p>
              </div>
              <form onSubmit={handleCreateProfile}>
                <InputField
                  id="partnerName"
                  label={t('notifications.profile-name')}
                  onChange={(event) => {
                    setPartnerName(event.target.value)
                    setProfileMessage('')
                  }}
                  placeholder={t('notifications.profile-name-placeholder')}
                  required
                  value={partnerName}
                />
                <label className="notification-field">
                  <span>{t('table.country')}</span>
                  <CountrySelect countryCode={partnerCountry} setCountryCode={setPartnerCountry} type="onlySelect" />
                </label>
                {profileMessage && <p className="red center">{profileMessage}</p>}
                <button className="button-action" disabled={createProfile.isLoading} type="submit">
                  {createProfile.isLoading ? t('common.saving') : t('notifications.finish-setup')}
                </button>
              </form>
            </section>
          )}

          {tokenRequired && (
            <section className="notification-status warning">
              <strong>{t('notifications.session-expired')}</strong>
              <span>{t('notifications.sign-in-again')}</span>
            </section>
          )}

          {notificationDataUnavailable && !partnerMissing && !tokenRequired && (
            <section className="notification-status warning">
              <strong>{t('notifications.load-failed')}</strong>
              <span>{errorText(error, t('common.try-again-later'), t)}</span>
            </section>
          )}

          {!notificationDataUnavailable && (
            <>
              <section className="admin-notification-section">
                <div className="admin-notification-section-header">
                  <div>
                    <h2>{t('notifications.channels.title')}</h2>
                    <p>{t('notifications.channels.subtitle')}</p>
                  </div>
                  {channels.length > 0 &&
                    notificationLimitsReady &&
                    !showChannelForm &&
                    (channelLimitReached ? (
                      canShowAlertPlanUpgrade ? (
                        <Link href={notificationsSubscriptionHref} className="button-action thin">
                          {t('notifications.upgrade-plan')}
                        </Link>
                      ) : null
                    ) : (
                      <AddChannelButton onClick={() => openAddChannel()} />
                    ))}
                </div>

                {channels.length > 0 && notificationLimitsReady && channelLimitReached && !showChannelForm && (
                  renderChannelLimitNotice()
                )}

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
                      <h2>{t('notifications.rules.title')}</h2>
                      <p>{t('notifications.rules.subtitle')}</p>
                    </div>
                    {notificationLimitsReady && ruleLimitReached && !editingRule ? (
                      canShowAlertPlanUpgrade ? (
                        <Link href={notificationsSubscriptionHref} className="button-action thin">
                          {t('notifications.upgrade-plan')}
                        </Link>
                      ) : (
                        <button className="button-action thin" disabled type="button">
                          {t('notifications.limit-reached')}
                        </button>
                      )
                    ) : (
                      <button className="button-action thin" onClick={openAddRule} type="button">
                        {t('notifications.actions.add-rule')}
                      </button>
                    )}
                  </div>

                  {notificationLimitsReady && ruleLimitReached && !showRuleForm && !editingRule && (
                    <div className="notification-limit-notice">
                      <strong>{t('notifications.rule-limit-reached')}</strong>
                      <span>
                        {alertPlanLimitText(alertPlan, t)}{' '}
                        {canShowAlertPlanUpgrade && (
                          <Link href={notificationsSubscriptionHref}>{t('notifications.upgrade-add-rules')}</Link>
                        )}
                      </span>
                    </div>
                  )}

                  {!editingRule && renderRuleForm()}

                  {rules.length === 0 ? (
                    <div className="notification-empty-state">
                      <h2>{t('notifications.no-rules-title')}</h2>
                      <p>{t('notifications.no-rules-text')}</p>
                    </div>
                  ) : (
                    <div className="notification-rule-list">
                      {rules.map((rule) => (
                        <Fragment key={rule.id}>
                          <RuleCard
                            deleting={deleteRule.isLoading && ruleToDelete?.id === rule.id}
                            loadingExecutions={ruleExecutions.isLoading && executionsRule?.id === rule.id}
                            onDelete={setRuleToDelete}
                            onEdit={openEditRule}
                            onExecutions={openExecutions}
                            rule={rule}
                          />
                          {String(editingRule?.id) === String(rule.id) && renderRuleForm()}
                        </Fragment>
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
            title={t('notifications.delete-channel')}
          >
            <div className="notification-delete-confirm">
              <div className="notification-delete-confirm-icon" aria-hidden="true">
                <MdWarningAmber className="notification-delete-confirm-icon-svg" />
              </div>
              <div>
                <p className="notification-delete-confirm-text">
                  {t('notifications.delete-question')}{' '}
                  <strong>{channelToDelete?.name || notificationChannelLabel(channelToDelete?.type, t)}</strong>?
                </p>
                <p className="notification-delete-confirm-note">{t('notifications.delete-channel-note')}</p>
                <div className="notification-delete-confirm-target">
                  <span className="notification-delete-confirm-label">{t('notifications.channel')}</span>
                  <strong className="notification-delete-confirm-name">
                    {channelToDelete?.name || notificationChannelLabel(channelToDelete?.type, t)}
                  </strong>
                </div>
              </div>
            </div>
            {deleteChannel.error && (
              <p className="red">{errorText(deleteChannel.error, t('notifications.errors.delete-channel-failed'), t)}</p>
            )}
            <div className="notification-dialog-actions notification-dialog-actions-end">
              <button className="button-action thin secondary" onClick={() => setChannelToDelete(null)} type="button">
                {t('button.cancel')}
              </button>
              <button
                className="button-action thin warning"
                disabled={deleteChannel.isLoading}
                onClick={handleDeleteChannel}
                type="button"
              >
                {deleteChannel.isLoading ? t('common.deleting') : t('button.delete')}
              </button>
            </div>
          </Dialog>

          <Dialog
            isOpen={!!ruleToDelete}
            onClose={() => setRuleToDelete(null)}
            size="small"
            title={t('notifications.delete-rule')}
          >
            <div className="notification-delete-confirm">
              <div className="notification-delete-confirm-icon" aria-hidden="true">
                <MdWarningAmber className="notification-delete-confirm-icon-svg" />
              </div>
              <div>
                <p className="notification-delete-confirm-text">
                  {t('notifications.delete-question')} <strong>{ruleToDelete?.name || t('notifications.rule-number', { id: ruleToDelete?.id })}</strong>?
                </p>
                <p className="notification-delete-confirm-note">{t('notifications.delete-rule-note')}</p>
                <div className="notification-delete-confirm-target">
                  <span className="notification-delete-confirm-label">{t('notifications.rule')}</span>
                  <strong className="notification-delete-confirm-name">
                    {ruleToDelete?.name || t('notifications.rule-number', { id: ruleToDelete?.id })}
                  </strong>
                </div>
              </div>
            </div>
            {deleteRule.error && <p className="red">{deleteRule.error?.response?.data?.error || deleteRule.error?.message}</p>}
            <div className="notification-dialog-actions notification-dialog-actions-end">
              <button className="button-action thin secondary" onClick={() => setRuleToDelete(null)} type="button">
                {t('button.cancel')}
              </button>
              <button
                className="button-action thin warning"
                disabled={deleteRule.isLoading}
                onClick={handleDeleteRule}
                type="button"
              >
                {deleteRule.isLoading ? t('common.deleting') : t('button.delete')}
              </button>
            </div>
          </Dialog>

          <Dialog
            isOpen={!!executionsRule}
            onClose={() => setExecutionsRule(null)}
            size="large"
            title={t('notifications.executions.title', { name: executionsRule?.name || executionsRule?.event || '' })}
          >
            <div className="notification-executions-dialog">
              {renderExecutionsDialogContent()}
              <style>{notificationExecutionsDialogCss}</style>
            </div>
          </Dialog>
        </>
      ) : (
        <>
          <br />
          <div className="center">
            <div style={{ maxWidth: '440px', margin: 'auto' }}>
              <p>{t('notifications.guest.rules', { explorerName })}</p>
              <p>{t('notifications.guest.channels')}</p>
            </div>
            <br />
            <center>
              <button className="button-action" onClick={() => openEmailLogin()}>
                {t('button.register-sign-in')}
              </button>
            </center>
          </div>
        </>
      )}
    </main>
  )
}

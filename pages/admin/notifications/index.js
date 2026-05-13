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
import { explorerName, isAddressValid, nativeCurrency, timestampExpired, xahauNetwork } from '@/utils'
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
const defaultRuleEvent = xahauNetwork ? NOTIFICATION_EVENT_TYPES.URITOKEN_SELL : NOTIFICATION_EVENT_TYPES.NFTOKEN_SALE

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
    description: `Use the mailbox that should receive ${explorerName} alerts. No webhook setup is required.`,
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
      'Use the API Key, API Key Secret, Access Token, and Access Token Secret from the X Developer Portal app.',
    steps: ['Developer Portal', 'Project app', 'Read and write permissions', 'Keys and tokens'],
    portalHref: 'https://developer.twitter.com/en/portal/dashboard',
    portalLabel: 'Open X Developer Portal',
    guideHref: '/admin/notifications/x-guide'
  }
]

const apiErrorMessages = {
  'errors.connection.has_listeners': 'notifications.errors.connection-has-listeners',
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
const isBalanceChangeEvent = (event) => normalizeNotificationEvent(event) === NOTIFICATION_EVENT_TYPES.BALANCE_CHANGE
const channelSupportsEvent = (channel, event) => {
  if (!channel) return false
  if (isBalanceChangeEvent(event)) return channel.type === NOTIFICATION_CHANNEL_TYPES.EMAIL
  return channel.type !== NOTIFICATION_CHANNEL_TYPES.EMAIL
}

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
    channels: plan.connections,
    rules: plan.listeners
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

    if (field.type === 'proAddress') {
      if (rule && Object.prototype.hasOwnProperty.call(rule, '$eq') && rule.$eq !== null) {
        filters[field.key] = { value: String(rule.$eq) }
      }
      return
    }

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

    if (field.type === 'proAddress') {
      if (isFilled(filter.value)) {
        rules[key] = { $eq: String(filter.value).trim() }
      }
      return
    }

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
  const [proAddresses, setProAddresses] = useState([])
  const [notificationPackages, setNotificationPackages] = useState([])
  const [loadingNotificationPrerequisites, setLoadingNotificationPrerequisites] = useState(false)
  const [notificationPrerequisitesLoaded, setNotificationPrerequisitesLoaded] = useState(false)

  const selectedChannel = useMemo(() => NOTIFICATION_CHANNELS[channelType], [channelType])
  const selectedGuide = useMemo(() => setupGuides.find((guide) => guide.type === channelType), [channelType])
  const ruleChannelOptions = useMemo(
    () =>
      channels
        .filter((channel) => channelSupportsEvent(channel, ruleFormData.event))
        .map((channel) => ({
          value: channel.id,
          label: channel.name || notificationChannelLabel(channel.type, t)
        })),
    [channels, ruleFormData.event, t]
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
  const activeProPackage = activePackage(notificationPackages, 'bithomp_pro')
  const activeBotPackage = activePackage(notificationPackages, 'bot')
  const alertPlan = getAlertPlanForPackage(activeBotPackage)
  const notificationLimitsReady = notificationPrerequisitesLoaded && !loadingNotificationPrerequisites
  const channelLimitReached = channels.length >= alertPlan.connections
  const ruleLimitReached = rules.length >= alertPlan.listeners
  const canShowAlertPlanUpgrade = showAlertPlanUpgrade(alertPlan, activeBotPackage)
  const hasActiveProSubscription = !!activeProPackage
  const balanceHistoryAddressOptions = useMemo(
    () =>
      proAddresses
        .filter((item) => item?.address && item?.crawler && item.crawler.status !== 'paused')
        .map((item) => ({
          value: item.address,
          label: item.name ? `${item.name} - ${item.address}` : item.address,
          status: item.crawler?.status
        })),
    [proAddresses]
  )

  useEffect(() => {
    if (!sessionToken) return

    const loadNotificationPrerequisites = async () => {
      setLoadingNotificationPrerequisites(true)
      try {
        const [addressesResponse, packagesResponse] = await Promise.allSettled([
          axiosAdmin.get('user/addresses'),
          axiosAdmin.get('partner/packages')
        ])

        if (addressesResponse.status === 'fulfilled') {
          setProAddresses(Array.isArray(addressesResponse.value?.data?.addresses) ? addressesResponse.value.data.addresses : [])
        }

        if (packagesResponse.status === 'fulfilled') {
          setNotificationPackages(
            Array.isArray(packagesResponse.value?.data?.packages) ? packagesResponse.value.data.packages : []
          )
        }
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

  const firstChannelForEvent = (event) => channels.find((channel) => channelSupportsEvent(channel, event))?.id || ''

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
      connectionId: firstChannelForEvent(event),
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

    selectedChannel.fields.forEach((field) => {
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
    if (!ruleFormData.connectionId) {
      errors.connectionId = t('notifications.errors.choose-channel')
    } else if (!channelSupportsEvent(selectedRuleChannel, ruleFormData.event)) {
      errors.connectionId = isBalanceChangeEvent(ruleFormData.event)
        ? t('notifications.errors.balance-email-only')
        : t('notifications.errors.email-balance-only')
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
      if (field.type === 'proAddress') {
        if (!hasActiveProSubscription) {
          errors[field.key] = t('notifications.errors.pro-required')
        } else if (balanceHistoryAddressOptions.length === 0) {
          errors[field.key] = t('notifications.errors.enable-history-first')
        } else if (isFilled(filter.value) && !balanceHistoryAddressOptions.some((option) => option.value === filter.value)) {
          errors[field.key] = t('notifications.errors.choose-history-address')
        }
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
      return (
        <div className="notification-limit-notice">
          <strong>{t('notifications.channel-limit-reached')}</strong>
          <span>
            {alertPlanLimitText(alertPlan, t)}{' '}
            {canShowAlertPlanUpgrade && (
              <Link href={notificationsSubscriptionHref}>{t('notifications.upgrade-add-channels')}</Link>
            )}
          </span>
        </div>
      )
    }

    return (
      <form className="notification-form" onSubmit={handleSaveChannel}>
        <div className="notification-form-grid">
          <div className="notification-channel-picker">
            <span>{t('notifications.channel-type-label')}</span>
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
                    <strong>{t(`notifications.guides.${guide.type}.title`, { defaultValue: guide.title })}</strong>
                  </button>
                )
              })}
            </div>
          </div>
          {selectedGuide && selectedGuide.steps.length > 0 && (
            <div className="notification-selected-guide">
              <div>
                <strong>{t(`notifications.guides.${selectedGuide.type}.title`, { defaultValue: selectedGuide.title })}</strong>
                <p>{t(`notifications.guides.${selectedGuide.type}.description`, { defaultValue: selectedGuide.description })}</p>
              </div>
              {selectedGuide.steps.length > 0 && (
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
          )}
          <InputField
            className={channelType === NOTIFICATION_CHANNEL_TYPES.TWITTER ? 'notification-field-wide' : ''}
            error={formErrors.name}
            helpText={t('notifications.channel-name-help')}
            id="name"
            label={t('notifications.channel-name')}
            onChange={handleInputChange}
            placeholder={t('notifications.channel-name-placeholder')}
            required
            value={formData.name || ''}
          />
          {selectedChannel.fields.map((field) => (
            <InputField
              error={formErrors[field.id]}
              helpText={t(`notifications.field-help.${field.id}`, { defaultValue: field.helpText })}
              id={field.id}
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
          <button className="button-action" disabled={savingChannel} type="submit">
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

  const renderRuleFilterField = (field) => {
    const filter = filterValue(ruleFormData.filters, field.key)
    const fieldClassName = `notification-field${field.wide ? ' notification-field-wide' : ''}`

    if (field.type === 'proAddress') {
      const selectedOption = balanceHistoryAddressOptions.find((option) => option.value === filter.value) || null
      return (
        <div className={fieldClassName} key={field.key}>
          <span>
            {filterLabel(field, t)}
            {field.required ? ' *' : ''}
          </span>
          <Select
            className="simple-select"
            classNamePrefix="react-select"
            instanceId={`notification-rule-${field.key}`}
            isDisabled={
              loadingNotificationPrerequisites ||
              (notificationPrerequisitesLoaded && !hasActiveProSubscription) ||
              balanceHistoryAddressOptions.length === 0
            }
            isSearchable={true}
            onChange={(option) => handleRuleFilterChange(field.key, { value: option?.value || '' })}
            options={balanceHistoryAddressOptions}
            placeholder={loadingNotificationPrerequisites ? t('notifications.loading-addresses') : t('notifications.choose-address')}
            value={selectedOption}
          />
          {notificationPrerequisitesLoaded && !hasActiveProSubscription && (
            <small>
              {t('notifications.pro-required-before')}{' '}
              <Link href="/admin#bithomp-pro-subscription">Bithomp Pro</Link>.
            </small>
          )}
          {notificationPrerequisitesLoaded &&
            hasActiveProSubscription &&
            balanceHistoryAddressOptions.length === 0 && (
            <small>
              {t('notifications.enable-history-before')}{' '}
              <Link href="/admin/pro">{t('tabs.my-addresses')}</Link> {t('notifications.enable-history-after')}.
            </small>
          )}
          {ruleFormErrors[field.key] && <strong>{ruleFormErrors[field.key]}</strong>}
        </div>
      )
    }

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
                      const connectionId = channelSupportsEvent(
                        channels.find((channel) => String(channel.id) === String(ruleFormData.connectionId)),
                        option.value
                      )
                        ? ruleFormData.connectionId
                        : firstChannelForEvent(option.value)
                      setRuleFormData((prev) => ({
                        ...prev,
                        connectionId,
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
            <small>
              {isBalanceChangeEvent(ruleFormData.event)
                ? t('notifications.balance-email-note')
                : t('notifications.email-balance-note')}
            </small>
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

  const renderExecutionsDialogContent = () => {
    if (ruleExecutions.isLoading) {
      return (
        <div className="notification-executions-empty notification-executions-empty-loading">
          <div className="notification-executions-empty-icon" aria-hidden="true">
            <span className="loader" />
          </div>
          <h3>{t('notifications.executions.none-title')}</h3>
          <p>{t('notifications.executions.loading-text')}</p>
          <div className="notification-executions-stats">
            <span>
              <small>{t('table.total')}</small>
              <strong>0</strong>
            </span>
            <span>
              <small>{t('notifications.executions.loaded')}</small>
              <strong>0</strong>
            </span>
          </div>
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
          <div className="notification-executions-stats">
            <span>
              <small>{t('table.total')}</small>
              <strong>{total}</strong>
            </span>
            <span>
              <small>{t('notifications.executions.loaded')}</small>
              <strong>{count}</strong>
            </span>
          </div>
        </div>
      )
    }

    return (
      <div className="notification-executions">
        <div className="notification-executions-stats">
          <span>
            <small>{t('table.total')}</small>
            <strong>{total}</strong>
          </span>
          <span>
            <small>{t('notifications.executions.loaded')}</small>
            <strong>{count}</strong>
          </span>
        </div>
        <div className="notification-executions-list">
          {executions.map((execution, index) => (
            <article className="notification-execution-item" key={execution.id || execution.createdAt || index}>
              <div className="notification-execution-item-header">
                <strong>
                  {execution.status || execution.result || t('notifications.executions.number', { id: execution.id || index + 1 })}
                </strong>
                {(execution.createdAt || execution.created_at) && <span>{execution.createdAt || execution.created_at}</span>}
              </div>
              <pre className="notification-executions-json">{JSON.stringify(execution, null, 2)}</pre>
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
                      ) : (
                        <button className="button-action thin" disabled type="button">
                          {t('notifications.limit-reached')}
                        </button>
                      )
                    ) : (
                      <AddChannelButton onClick={() => openAddChannel()} />
                    ))}
                </div>

                {channels.length > 0 && notificationLimitsReady && channelLimitReached && !showChannelForm && (
                  <div className="notification-limit-notice">
                    <strong>{t('notifications.channel-limit-reached')}</strong>
                    <span>
                      {alertPlanLimitText(alertPlan, t)}{' '}
                      {canShowAlertPlanUpgrade && (
                        <Link href={notificationsSubscriptionHref}>{t('notifications.upgrade-add-channels')}</Link>
                      )}
                    </span>
                  </div>
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
            <div className="notification-executions-dialog">{renderExecutionsDialogContent()}</div>
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

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
import { DEFAULT_ALERT_PLAN_TIER, getAlertPlan, getAlertPlanTier } from '@/utils/notificationPlans'

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

const defaultRuleName = (index = 1) => `Rule ${index}`
const defaultRuleEvent = xahauNetwork ? NOTIFICATION_EVENT_TYPES.URITOKEN_SELL : NOTIFICATION_EVENT_TYPES.NFTOKEN_SALE

const initialRuleForm = {
  connectionId: '',
  enabled: true,
  event: defaultRuleEvent,
  externalUrl: true,
  filters: {},
  fiatCurrency: 'usd',
  name: defaultRuleName(),
  xrpCafeURL: false
}

const notificationsSubscriptionHref = '/admin/subscriptions?tab=notifications'

const booleanFilterOptions = [
  { value: 'any', label: 'Any' },
  { value: 'true', label: 'Yes' },
  { value: 'false', label: 'No' }
]

const destinationFilterOptions = [
  { value: 'any', label: 'Any destination' },
  { value: 'specific', label: 'Specific address' },
  { value: 'none', label: 'No destination' }
]

const brokerDestinationFilterOptions = [
  ...destinationFilterOptions,
  { value: 'knownBroker', label: 'Known broker' },
  { value: 'noneOrKnownBroker', label: 'No destination or known broker' }
]

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
    steps: ['Slack app directory', 'Incoming Webhooks', 'Add to workspace', 'Copy Webhook URL']
  },
  {
    type: NOTIFICATION_CHANNEL_TYPES.TWITTER,
    icon: FaXTwitter,
    title: 'X / Twitter',
    description:
      'Use the API Key, API Key Secret, Access Token, and Access Token Secret from the X Developer Portal app.',
    steps: ['Developer Portal', 'Project app', 'Read and write permissions', 'Keys and tokens'],
    guideHref: '/admin/notifications/x-guide'
  }
]

const apiErrorMessages = {
  'errors.connection.has_listeners': 'To delete this channel, first delete the rules using it or move them to another channel.',
  'errors.connection.settings_required': 'Enter the required channel settings.',
  'errors.listener.action_required': 'Choose what this rule should do.',
  'errors.listener.event_invalid': 'Choose a supported event type.',
  'errors.listener.event_required': 'Choose an event type.',
  'errors.listener.name_required': 'Enter a rule name.'
}

const errorText = (error, fallback) => {
  const code = error?.response?.data?.error
  return apiErrorMessages[code] || code || error?.message || fallback
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

const filterLabel = (field) => field.label.replace('{nativeCurrency}', nativeCurrency)

const ruleKey = (key, fiatCurrency = 'usd') => key.replace('{fiatCurrency}', fiatCurrency || 'usd')

const activePackage = (packages, type) =>
  packages.find((item) => item.type === type && !(item.expiredAt && timestampExpired(item.expiredAt))) || null

const alertPlanLimitText = (plan) =>
  `${plan.label} allows ${plan.connections} channel${plan.connections === 1 ? '' : 's'} and ${plan.listeners} rule${
    plan.listeners === 1 ? '' : 's'
  }.`

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
          label: channel.name || getNotificationChannelLabel(channel.type)
        })),
    [channels, ruleFormData.event]
  )
  const selectedRuleChannelOption = useMemo(
    () => ruleChannelOptions.find((option) => String(option.value) === String(ruleFormData.connectionId)) || null,
    [ruleChannelOptions, ruleFormData.connectionId]
  )
  const notificationEventOptions = useMemo(() => getNotificationEventOptions({ xahau: xahauNetwork }), [])
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
  const alertPlanTier = getAlertPlanTier(activeBotPackage?.tier || DEFAULT_ALERT_PLAN_TIER)
  const alertPlan = getAlertPlan(alertPlanTier)
  const channelLimitReached = channels.length >= alertPlan.connections
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
    if (channelLimitReached) {
      setFormMessage(`Channel limit reached. ${alertPlanLimitText(alertPlan)}`)
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
    const event = notificationEventOptions[0]?.value || defaultRuleEvent
    setEditingRule(null)
    setRuleFormData({
      ...initialRuleForm,
      connectionId: firstChannelForEvent(event),
      event,
      name: defaultRuleName(rules.length + 1)
    })
    setRuleFormErrors({})
    setRuleFormMessage(rules.length >= alertPlan.listeners ? `Rule limit reached. ${alertPlanLimitText(alertPlan)}` : '')
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
    if (!editingChannel && channels.length >= alertPlan.connections) {
      message = `Channel limit reached. ${alertPlanLimitText(alertPlan)}`
    }
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
    setFormMessage(message)
    return Object.keys(errors).length === 0 && !message
  }

  const validateRuleForm = () => {
    const errors = {}
    let message = ''
    if (!editingRule && rules.length >= alertPlan.listeners) {
      message = `Rule limit reached. ${alertPlanLimitText(alertPlan)}`
    }
    const selectedRuleChannel = channels.find((channel) => String(channel.id) === String(ruleFormData.connectionId))
    if (!ruleFormData.connectionId) {
      errors.connectionId = 'Choose a channel.'
    } else if (!channelSupportsEvent(selectedRuleChannel, ruleFormData.event)) {
      errors.connectionId = isBalanceChangeEvent(ruleFormData.event)
        ? 'Balance change alerts can only use an Email channel.'
        : 'Email channels can only be used for balance change alerts.'
    }
    if (!ruleFormData.name?.trim()) {
      errors.name = 'Enter a rule name.'
    }
    if (!notificationEventOptions.some((option) => option.value === ruleFormData.event)) {
      errors.event = 'Choose a supported event.'
    }

    getNotificationFilterFields(ruleFormData.event).forEach((field) => {
      const filter = filterValue(ruleFormData.filters, field.key)
      if (field.required && !isFilled(filter.value)) {
        errors[field.key] = `Choose ${filterLabel(field).toLowerCase()}.`
      }
      if (field.type === 'proAddress') {
        if (!hasActiveProSubscription) {
          errors[field.key] = 'Bithomp Pro subscription is required.'
        } else if (balanceHistoryAddressOptions.length === 0) {
          errors[field.key] = 'Enable balance history for a verified address first.'
        } else if (isFilled(filter.value) && !balanceHistoryAddressOptions.some((option) => option.value === filter.value)) {
          errors[field.key] = 'Choose an address with enabled balance history.'
        }
      }
      if (field.type === 'address' && isFilled(filter.value) && !isAddressValid(filter.value)) {
        errors[field.key] = 'Choose a valid address.'
      }
      if (field.type === 'number' && isFilled(filter.value) && !Number.isFinite(Number(filter.value))) {
        errors[field.key] = 'Enter a valid number.'
      }
      if (field.type === 'txType') {
        const operator = filter.operator || '$eq'
        if (operator === '$eq' && isFilled(filter.value) && !notificationTxTypeOptions.some((option) => option.value === filter.value)) {
          errors[field.key] = 'Choose a supported transaction type.'
        }
        if (
          (operator === '$in' || operator === '$nin') &&
          filter.values?.some((value) => !notificationTxTypeOptions.some((option) => option.value === value))
        ) {
          errors[field.key] = 'Choose supported transaction types.'
        }
      }
      if (field.type === 'destination' && filter.mode === 'specific' && !isAddressValid(filter.value)) {
        errors[field.key] = 'Choose a valid destination address.'
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
                <div>
                  <ol>
                    {selectedGuide.steps.map((step) => (
                      <li key={step}>{step}</li>
                    ))}
                  </ol>
                  {selectedGuide.guideHref && (
                    <Link href={selectedGuide.guideHref} className="notification-guide-link">
                      Detailed setup guide
                    </Link>
                  )}
                </div>
              )}
            </div>
          )}
          <InputField
            className={channelType === NOTIFICATION_CHANNEL_TYPES.TWITTER ? 'notification-field-wide' : ''}
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

  const renderRuleFilterField = (field) => {
    const filter = filterValue(ruleFormData.filters, field.key)
    const fieldClassName = `notification-field${field.wide ? ' notification-field-wide' : ''}`

    if (field.type === 'proAddress') {
      const selectedOption = balanceHistoryAddressOptions.find((option) => option.value === filter.value) || null
      return (
        <div className={fieldClassName} key={field.key}>
          <span>
            {filterLabel(field)}
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
            placeholder={loadingNotificationPrerequisites ? 'Loading addresses...' : 'Choose address'}
            value={selectedOption}
          />
          {notificationPrerequisitesLoaded && !hasActiveProSubscription && (
            <small>
              Balance change alerts require an active{' '}
              <Link href="/admin/subscriptions?tab=pro">Bithomp Pro subscription</Link>.
            </small>
          )}
          {notificationPrerequisitesLoaded &&
            hasActiveProSubscription &&
            balanceHistoryAddressOptions.length === 0 && (
            <small>
              Connect an address and enable balance history in <Link href="/admin/pro">My addresses</Link> first.
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
            placeholder="Enter address or username"
            rawData={{ address: filter.value || '' }}
            setInnerValue={(value) => handleRuleFilterChange(field.key, { value })}
            setValue={(value) => handleRuleFilterChange(field.key, { value })}
            title={`${filterLabel(field)}${field.required ? ' *' : ''}`}
            type="address"
          />
          {field.required && <small>Required for this rule.</small>}
          {field.helpText && <small>{field.helpText}</small>}
          {ruleFormErrors[field.key] && <strong>{ruleFormErrors[field.key]}</strong>}
        </div>
      )
    }

    if (field.type === 'number') {
      const selectedOperator =
        NOTIFICATION_NUMBER_OPERATOR_OPTIONS.find((option) => option.value === (filter.operator || '$gte')) ||
        NOTIFICATION_NUMBER_OPERATOR_OPTIONS[0]
      return (
        <div className={fieldClassName} key={field.key}>
          <span>
            {filterLabel(field)}
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
                options={NOTIFICATION_NUMBER_OPERATOR_OPTIONS}
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
          {field.helpText && <small>{field.helpText}</small>}
          {ruleFormErrors[field.key] && <strong>{ruleFormErrors[field.key]}</strong>}
        </div>
      )
    }

    if (field.type === 'txType') {
      const selectedOperator =
        NOTIFICATION_TX_TYPE_OPERATOR_OPTIONS.find((option) => option.value === (filter.operator || '$eq')) ||
        NOTIFICATION_TX_TYPE_OPERATOR_OPTIONS[0]
      const isMulti = selectedOperator.value === '$in' || selectedOperator.value === '$nin'
      const selectedTxType = notificationTxTypeOptions.find((option) => option.value === filter.value) || null
      const selectedTxTypes = notificationTxTypeOptions.filter((option) => filter.values?.includes(option.value))

      return (
        <div className={fieldClassName} key={field.key}>
          <span>{filterLabel(field)}</span>
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
              options={NOTIFICATION_TX_TYPE_OPERATOR_OPTIONS}
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
              placeholder={isMulti ? 'Choose transaction types' : 'Any transaction type'}
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
            {filterLabel(field)}
            {field.required ? ' *' : ''}
          </span>
          <TokenSelector
            value={filter.value || {}}
            onChange={(value) => handleRuleFilterChange(field.key, { value })}
          />
          <small>Choose {nativeCurrency} or an issued token.</small>
        </div>
      )
    }

    if (field.type === 'destination') {
      const options = field.includeKnownBroker ? brokerDestinationFilterOptions : destinationFilterOptions
      const selectedOption = options.find((option) => option.value === (filter.mode || 'any')) || options[0]
      return (
        <div className="notification-field notification-address-field" key={field.key}>
          <span>
            {filterLabel(field)}
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
              placeholder="Enter destination address or username"
              rawData={{ address: filter.value || '' }}
              setInnerValue={(value) => handleRuleFilterChange(field.key, { value })}
              setValue={(value) => handleRuleFilterChange(field.key, { value })}
              title="Destination address"
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
            {filterLabel(field)}
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
          {filterLabel(field)}
          {field.required ? ' *' : ''}
        </span>
        <input
          className="input-text"
          name={field.key}
          onChange={(event) => handleRuleFilterChange(field.key, { value: event.target.value })}
          placeholder={field.placeholder?.replace('{nativeCurrency}', nativeCurrency) || filterLabel(field)}
          type="text"
          value={filter.value || ''}
        />
        {field.helpText && <small>{field.helpText}</small>}
        {ruleFormErrors[field.key] && <strong>{ruleFormErrors[field.key]}</strong>}
      </label>
    )
  }

  const renderRuleForm = () => {
    if (!showRuleForm) return null
    const ruleFilterFields = getNotificationFilterFields(ruleFormData.event)

    return (
      <form className="notification-form" onSubmit={handleSaveRule}>
        <div className="notification-form-grid">
          <div className="notification-rule-requirement">
            <strong>{alertPlan.label} alerts plan</strong>
            <span>
              {alertPlanLimitText(alertPlan)}{' '}
              {alertPlanTier === DEFAULT_ALERT_PLAN_TIER && (
                <Link href={notificationsSubscriptionHref}>Upgrade for more alert channels and rules.</Link>
              )}
            </span>
          </div>
          <div className="notification-rule-event-picker">
            <span>Event</span>
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
            <small>
              {isBalanceChangeEvent(ruleFormData.event)
                ? 'Balance change alerts are sent by Email.'
                : 'Email channels are only available for balance change alerts.'}
            </small>
            {ruleFormErrors.connectionId && <strong>{ruleFormErrors.connectionId}</strong>}
          </label>
          <InputField
            error={ruleFormErrors.name}
            helpText="A short name shown only in your notification settings."
            id="name"
            label="Rule name"
            onChange={handleRuleInputChange}
            placeholder="High-value NFT sales"
            required
            value={ruleFormData.name}
          />
          {ruleFilterFields.length > 0 && (
            <div className="notification-rule-filter-panel">
              <div className="notification-rule-filter-header">
                <strong>Filters</strong>
                <span>Leave optional fields empty to match any value.</span>
              </div>
              <div className="notification-rule-filter-grid">
                {ruleFilterFields.map((field) => renderRuleFilterField(field))}
              </div>
            </div>
          )}
          <label className="notification-field">
            <span>Fiat currency</span>
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
              placeholder="Choose currency"
              value={selectedFiatCurrencyOption}
            />
            <small>Used for fiat values in notification text.</small>
          </label>
          <div className="notification-toggle-card">
            <button
              aria-label="Toggle rule enabled"
              aria-pressed={formEnabledBoolean(ruleFormData.enabled)}
              className={`notification-toggle-control${formEnabledBoolean(ruleFormData.enabled) ? ' active' : ''}`}
              onClick={() => handleRuleBooleanToggle('enabled')}
              type="button"
            />
            <span className="notification-toggle-copy">
              <strong>Enabled</strong>
              <small>Start sending matching alerts as soon as this rule is saved.</small>
            </span>
          </div>
          {notificationEventSupports(ruleFormData.event, 'externalUrl') && (
            <div className="notification-toggle-card">
              <button
                aria-label="Toggle external NFT links"
                aria-pressed={!!ruleFormData.externalUrl}
                className={`notification-toggle-control${ruleFormData.externalUrl ? ' active' : ''}`}
                onClick={() => handleRuleBooleanToggle('externalUrl')}
                type="button"
              />
              <span className="notification-toggle-copy">
                <strong>Include external NFT links</strong>
                <small>Add marketplace or media links when the event payload includes them.</small>
              </span>
            </div>
          )}
          {notificationEventSupports(ruleFormData.event, 'xrpCafeURL') && (
            <div className="notification-toggle-card">
              <button
                aria-label="Toggle XRP Cafe link"
                aria-pressed={!!ruleFormData.xrpCafeURL}
                className={`notification-toggle-control${ruleFormData.xrpCafeURL ? ' active' : ''}`}
                onClick={() => handleRuleBooleanToggle('xrpCafeURL')}
                type="button"
              />
              <span className="notification-toggle-copy">
                <strong>Include XRP Cafe link</strong>
                <small>Add an XRP Cafe URL for NFT alerts.</small>
              </span>
            </div>
          )}
          <div className="notification-rule-summary">
            <strong>{ruleFormData.name || 'New notification rule'}</strong>
            <span>{getNotificationEventDescription(ruleFormData.event)}</span>
          </div>
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

  const renderExecutionsDialogContent = () => {
    if (ruleExecutions.isLoading) {
      return (
        <div className="notification-executions-empty notification-executions-empty-loading">
          <div className="notification-executions-empty-icon" aria-hidden="true">
            <span className="loader" />
          </div>
          <h3>No executions yet</h3>
          <p>Checking recent delivery attempts for this rule.</p>
          <div className="notification-executions-stats">
            <span>
              <small>Total</small>
              <strong>0</strong>
            </span>
            <span>
              <small>Loaded</small>
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
          <h3>No executions yet</h3>
          <p>This rule has not matched any events yet, so no notifications have been sent.</p>
          <div className="notification-executions-stats">
            <span>
              <small>Total</small>
              <strong>{total}</strong>
            </span>
            <span>
              <small>Loaded</small>
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
            <small>Total</small>
            <strong>{total}</strong>
          </span>
          <span>
            <small>Loaded</small>
            <strong>{count}</strong>
          </span>
        </div>
        <div className="notification-executions-list">
          {executions.map((execution, index) => (
            <article className="notification-execution-item" key={execution.id || execution.createdAt || index}>
              <div className="notification-execution-item-header">
                <strong>{execution.status || execution.result || `Execution #${execution.id || index + 1}`}</strong>
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
              <p className="notification-eyebrow">{explorerName} alerts</p>
              <h2>Alerts</h2>
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

          {isLoading && <p className="center">Loading alerts...</p>}

          {partnerMissing && (
            <section className="notification-setup-card">
              <div>
                <h2>Finish alerts setup</h2>
                <p>
                  Alerts need an admin profile before channels can be saved. This name is private and helps us attach
                  alert settings to your account.
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
              <span>Please sign in again to manage alerts.</span>
            </section>
          )}

          {notificationDataUnavailable && !partnerMissing && !tokenRequired && (
            <section className="notification-status warning">
              <strong>Could not load saved alerts.</strong>
              <span>{errorText(error, 'Please try again later.')}</span>
            </section>
          )}

          {!notificationDataUnavailable && (
            <>
              <section className="admin-notification-section">
                <div className="admin-notification-section-header">
                  <div>
                    <h2>Alert channels</h2>
                    <p>Saved destinations for alerts.</p>
                  </div>
                  {channels.length > 0 &&
                    !showChannelForm &&
                    (channelLimitReached ? (
                      <Link href={notificationsSubscriptionHref} className="button-action thin">
                        Upgrade plan
                      </Link>
                    ) : (
                      <AddChannelButton onClick={() => openAddChannel()} />
                    ))}
                </div>

                {channels.length > 0 && channelLimitReached && !showChannelForm && (
                  <div className="notification-limit-notice">
                    <strong>Channel limit reached.</strong>
                    <span>
                      {alertPlanLimitText(alertPlan)}{' '}
                      <Link href={notificationsSubscriptionHref}>Choose a paid alerts plan to add more channels.</Link>
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
                      <h2>Alert rules</h2>
                      <p>Rules listen for events and send matching alerts to a channel.</p>
                    </div>
                    <button className="button-action thin" onClick={openAddRule} type="button">
                      Add rule
                    </button>
                  </div>

                  {!editingRule && renderRuleForm()}

                  {rules.length === 0 ? (
                    <div className="notification-empty-state">
                      <h2>No alert rules yet</h2>
                      <p>Add a rule for one of your channels.</p>
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
                  This saved destination will be removed from your account. Delete or move its rules before deleting the
                  channel.
                </p>
                <div className="notification-delete-confirm-target">
                  <span className="notification-delete-confirm-label">Channel</span>
                  <strong className="notification-delete-confirm-name">
                    {channelToDelete?.name || getNotificationChannelLabel(channelToDelete?.type)}
                  </strong>
                </div>
              </div>
            </div>
            {deleteChannel.error && <p className="red">{errorText(deleteChannel.error, 'Could not delete channel.')}</p>}
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
            <div className="notification-executions-dialog">{renderExecutionsDialogContent()}</div>
          </Dialog>
        </>
      ) : (
        <>
          <br />
          <div className="center">
            <div style={{ maxWidth: '440px', margin: 'auto' }}>
              <p>Set up custom alert rules for {explorerName} events.</p>
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

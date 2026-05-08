export const NOTIFICATION_ACTION_TYPES = Object.freeze({
  NOTIFICATION: 'notification'
})

export const NOTIFICATION_EVENT_TYPES = Object.freeze({
  NFTOKEN_SALE: 'nftoken_sale',
  NFTOKEN_CREATE_SELL_OFFER: 'nftoken_create_sell_offer',
  URITOKEN_SELL: 'uritoken_sell',
  URITOKEN_CREATE_SELL_OFFER: 'uritoken_create_sell_offer',
  BALANCE_CHANGE: 'balances_change'
})

export const NOTIFICATION_EVENT_OPTIONS = [
  {
    value: NOTIFICATION_EVENT_TYPES.NFTOKEN_SALE,
    label: 'NFT sale',
    description: 'When an NFT sale is detected.',
    group: 'NFT',
    networks: ['xrpl']
  },
  {
    value: NOTIFICATION_EVENT_TYPES.NFTOKEN_CREATE_SELL_OFFER,
    label: 'NFT sell offer',
    description: 'When a new NFT sell offer is created.',
    group: 'NFT',
    networks: ['xrpl']
  },
  {
    value: NOTIFICATION_EVENT_TYPES.URITOKEN_SELL,
    label: 'NFT sale',
    description: 'When an NFT sale is detected.',
    group: 'NFT',
    networks: ['xahau']
  },
  {
    value: NOTIFICATION_EVENT_TYPES.URITOKEN_CREATE_SELL_OFFER,
    label: 'NFT sell offer',
    description: 'When a new NFT sell offer is created.',
    group: 'NFT',
    networks: ['xahau']
  },
  {
    value: NOTIFICATION_EVENT_TYPES.BALANCE_CHANGE,
    label: 'Balance change',
    description: 'When a watched Pro address balance changes.',
    group: 'Account',
    networks: ['xrpl', 'xahau']
  }
]

export const NOTIFICATION_FIAT_CURRENCY_OPTIONS = [
  { value: 'usd', label: 'USD' },
  { value: 'eur', label: 'EUR' }
]

export const NOTIFICATION_NUMBER_OPERATOR_OPTIONS = [
  { value: '$gte', label: 'At least' },
  { value: '$lte', label: 'At most' },
  { value: '$gt', label: 'More than' },
  { value: '$lt', label: 'Less than' },
  { value: '$eq', label: 'Exactly' }
]

export const NOTIFICATION_TX_TYPE_OPERATOR_OPTIONS = [
  { value: '$eq', label: 'Is' },
  { value: '$in', label: 'Include' },
  { value: '$nin', label: 'Exclude' }
]

export const NOTIFICATION_TX_TYPE_OPTIONS = [
  'AccountDelete',
  'AccountSet',
  'AMMBid',
  'AMMCreate',
  'AMMDelete',
  'AMMDeposit',
  'AMMVote',
  'AMMWithdraw',
  'CheckCancel',
  'CheckCash',
  'CheckCreate',
  'Clawback',
  'DepositPreauth',
  'EscrowCancel',
  'EscrowCreate',
  'EscrowFinish',
  'NFTokenAcceptOffer',
  'NFTokenBurn',
  'NFTokenCancelOffer',
  'NFTokenCreateOffer',
  'NFTokenMint',
  'OfferCancel',
  'OfferCreate',
  'Payment',
  'PaymentChannelClaim',
  'PaymentChannelCreate',
  'PaymentChannelFund',
  'SetRegularKey',
  'SignerListSet',
  'TicketCreate',
  'TrustSet',
  'URITokenBurn',
  'URITokenBuy',
  'URITokenCancelSellOffer',
  'URITokenCreateSellOffer',
  'URITokenMint'
].map((type) => ({ value: type, label: type }))

const balanceChangeFilterFields = [
  { key: 'address', label: 'Address', type: 'proAddress', required: true },
  { key: 'tx_type', label: 'Transaction type', type: 'txType' }
]

const sharedOfferFilters = [
  { key: 'issuer', label: 'Issuer', type: 'address' },
  { key: 'account', label: 'Seller account', type: 'address' },
  { key: 'destination', label: 'Destination', type: 'destination' },
  { key: 'amount', label: 'Amount', type: 'number' },
  { key: 'token', label: 'Token', type: 'token' }
]

export const NOTIFICATION_FILTER_FIELDS = {
  [NOTIFICATION_EVENT_TYPES.BALANCE_CHANGE]: balanceChangeFilterFields,
  [NOTIFICATION_EVENT_TYPES.NFTOKEN_SALE]: [
    { key: 'issuer', label: 'Issuer', type: 'address' },
    { key: 'taxon', label: 'Taxon', type: 'number', exactOnly: true },
    { key: 'price', label: 'Price in {nativeCurrency}', type: 'number' },
    { key: 'price_usd', label: 'Price in USD', type: 'number' }
  ],
  [NOTIFICATION_EVENT_TYPES.NFTOKEN_CREATE_SELL_OFFER]: [
    ...sharedOfferFilters.slice(0, 3).map((field) =>
      field.key === 'destination' ? { ...field, includeKnownBroker: true } : field
    ),
    { key: 'known_broker', label: 'Known broker', type: 'boolean' },
    ...sharedOfferFilters.slice(3)
  ],
  [NOTIFICATION_EVENT_TYPES.URITOKEN_SELL]: [
    { key: 'issuer', label: 'Issuer', type: 'address' },
    { key: 'price', label: 'Price in {nativeCurrency}', type: 'number' },
    { key: 'price_usd', label: 'Price in USD', type: 'number' }
  ],
  [NOTIFICATION_EVENT_TYPES.URITOKEN_CREATE_SELL_OFFER]: sharedOfferFilters
}

const EXTERNAL_URL_EVENTS = new Set([
  NOTIFICATION_EVENT_TYPES.NFTOKEN_SALE,
  NOTIFICATION_EVENT_TYPES.NFTOKEN_CREATE_SELL_OFFER,
  NOTIFICATION_EVENT_TYPES.URITOKEN_SELL,
  NOTIFICATION_EVENT_TYPES.URITOKEN_CREATE_SELL_OFFER
])

const XRP_CAFE_EVENTS = new Set([
  NOTIFICATION_EVENT_TYPES.NFTOKEN_SALE,
  NOTIFICATION_EVENT_TYPES.NFTOKEN_CREATE_SELL_OFFER
])

export const notificationEventSupports = (event, setting) => {
  event = normalizeNotificationEvent(event)
  if (setting === 'externalUrl') return EXTERNAL_URL_EVENTS.has(event)
  if (setting === 'xrpCafeURL') return XRP_CAFE_EVENTS.has(event)
  if (setting === 'fiatCurrency') return !!event
  return false
}

export const getNotificationEventOptions = ({ xahau = false } = {}) => {
  const network = xahau ? 'xahau' : 'xrpl'
  return NOTIFICATION_EVENT_OPTIONS.filter((option) => option.networks.includes(network))
}

const legacyEventMap = {
  balance_change: NOTIFICATION_EVENT_TYPES.BALANCE_CHANGE,
  uritoken_sale: NOTIFICATION_EVENT_TYPES.URITOKEN_SELL
}

export const normalizeNotificationEvent = (event) => legacyEventMap[event] || event

export const getNotificationFilterFields = (event) => NOTIFICATION_FILTER_FIELDS[normalizeNotificationEvent(event)] || []

export const getNotificationEventOption = (event) =>
  NOTIFICATION_EVENT_OPTIONS.find((option) => option.value === normalizeNotificationEvent(event)) || null

export const getNotificationEventLabel = (event) => getNotificationEventOption(event)?.label || event || 'Event'

export const getNotificationEventDescription = (event) => getNotificationEventOption(event)?.description || ''

export const getNotificationFiatCurrencyLabel = (currency) =>
  NOTIFICATION_FIAT_CURRENCY_OPTIONS.find((option) => option.value === currency)?.label || currency?.toUpperCase() || ''

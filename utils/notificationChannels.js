export const NOTIFICATION_CHANNEL_TYPES = Object.freeze({
  EMAIL: 'email',
  SLACK: 'slack_webhook',
  DISCORD: 'discord_webhook',
  TWITTER: 'twitter_api'
})

export const NOTIFICATION_CHANNELS = {
  [NOTIFICATION_CHANNEL_TYPES.SLACK]: {
    label: 'Slack',
    fields: [
      {
        id: 'webhook',
        label: 'Webhook URL',
        placeholder: 'https://hooks.slack.com/services/...',
        helpText: 'Slack Incoming Webhook URL.',
        required: true,
        validate: (value) => isValidUrl(value) || 'Enter a valid Slack webhook URL.'
      }
    ]
  },
  [NOTIFICATION_CHANNEL_TYPES.DISCORD]: {
    label: 'Discord',
    fields: [
      {
        id: 'webhook',
        label: 'Webhook URL',
        placeholder: 'https://discord.com/api/webhooks/...',
        helpText: 'Discord webhook URL.',
        required: true,
        validate: (value) => isValidUrl(value) || 'Enter a valid Discord webhook URL.'
      },
      {
        id: 'username',
        label: 'Bot username',
        placeholder: 'Bithomp Bot',
        helpText: 'Name shown by the Discord bot.',
        required: true
      }
    ]
  },
  [NOTIFICATION_CHANNEL_TYPES.EMAIL]: {
    label: 'Email',
    fields: [
      {
        id: 'email',
        label: 'Email address',
        type: 'email',
        placeholder: 'name@example.com',
        helpText: 'Address that should receive alerts.',
        required: true,
        validate: (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) || 'Enter a valid email address.'
      }
    ]
  },
  [NOTIFICATION_CHANNEL_TYPES.TWITTER]: {
    label: 'X / Twitter',
    helpText: 'Use the API key pair and access token pair from your X Developer Portal app.',
    fields: [
      {
        id: 'consumer_key',
        label: 'API Key',
        placeholder: 'API Key from X',
        helpText: 'Shown in X as API Key. This is the Consumer key used by the API.',
        required: true
      },
      {
        id: 'consumer_secret',
        label: 'API Key Secret',
        placeholder: 'API Key Secret from X',
        helpText: 'Shown once together with the API Key. This is the Consumer secret.',
        type: 'password',
        required: true
      },
      {
        id: 'access_token_key',
        label: 'Access Token',
        placeholder: 'Access Token from X',
        helpText: 'Generate this in Keys and tokens after the app has Read and write permissions.',
        required: true
      },
      {
        id: 'access_token_secret',
        label: 'Access Token Secret',
        placeholder: 'Access Token Secret from X',
        helpText: 'Generate this together with Access Token and keep it private.',
        type: 'password',
        required: true
      }
    ]
  }
}

export const getNotificationChannelLabel = (type) => NOTIFICATION_CHANNELS[type]?.label || type || 'Channel'

const isValidUrl = (value) => {
  try {
    const url = new URL(value)
    return url.protocol === 'https:' || url.protocol === 'http:'
  } catch {
    return false
  }
}

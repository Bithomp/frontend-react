import { z } from 'zod'

export const NOTIFICATION_CHANNEL_TYPES = Object.freeze({
  EMAIL: 'email',
  SLACK: 'slack_webhook',
  DISCORD: 'discord_webhook',
  TWITTER: 'twitter_api',
})

const slackNotificationChannelSchema = z.object({
  name: z.string().min(1),
  webhook: z.string().url(),
})

const discordNotificationChannelSchema = z.object({
  name: z.string().min(1),
  webhook: z.string().url(),
  username: z.string(),
})

const emailNotificationChannelSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
})

const twitterNotificationChannelSchema = z.object({
  name: z.string().min(1),
  consumer_key: z.string().min(1),
  consumer_secret: z.string().min(1),
  access_token_key: z.string().min(1),
  access_token_secret: z.string().min(1),
})

export const NOTIFICATION_CHANNELS = {
  [NOTIFICATION_CHANNEL_TYPES.SLACK]: {
    schema: slackNotificationChannelSchema,
    fields: [
      {
        id: 'webhook',
        label: 'Webhook URL',
        placeholder: 'https://hooks.slack.com/services/...',
        helpText: 'Enter the Slack Incoming Webhook URL.',
        required: true
      }
    ]
  },
  [NOTIFICATION_CHANNEL_TYPES.DISCORD]: {
    schema: discordNotificationChannelSchema,
    fields: [
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
    ]
  },
  [NOTIFICATION_CHANNEL_TYPES.EMAIL]: {
    schema: emailNotificationChannelSchema,
    fields: [
      {
        id: 'email',
        label: 'Email Address',
        type: 'email',
        placeholder: 'your-email@example.com',
        helpText: 'The email address to send notifications to.',
        required: true
      }
    ]
  },
  [NOTIFICATION_CHANNEL_TYPES.TWITTER]: {
    schema: twitterNotificationChannelSchema,
    fields: [
      { id: 'consumer_key', label: 'Consumer Key', required: true },
      { id: 'consumer_secret', label: 'Consumer Secret', type: 'password', required: true },
      { id: 'access_token_key', label: 'Access Token Key', required: true },
      { id: 'access_token_secret', label: 'Access Token Secret', type: 'password', required: true }
    ],
    helpText: "Your Twitter application's credentials."
  }
} 
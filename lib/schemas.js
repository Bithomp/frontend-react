import { z } from 'zod'

export const slackNotificationChannelSchema = z.object({
  name: z.string().min(1),
  webhook: z.string().url(),
})

export const discordNotificationChannelSchema = z.object({
  name: z.string().min(1),
  webhook: z.string().url(),
  username: z.string(),
})

export const emailNotificationChannelSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
})

export const twitterNotificationChannelSchema = z.object({
  name: z.string().min(1),
  consumer_key: z.string(),
  consumer_secret: z.string(),
  access_token_key: z.string(),
  access_token_secret: z.string(),
})
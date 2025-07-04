import React from 'react'

import { FaSlack, FaDiscord, FaEnvelope } from 'react-icons/fa'
import { FaXTwitter } from 'react-icons/fa6'

import Card from '@/components/UI/Card'

const iconMap = {
  slack_webhook: FaSlack,
  discord_webhook: FaDiscord,
  twitter_api: FaXTwitter,
  email_webhook: FaEnvelope
}

const ChannelSpecificDetails = ({ channel }) => {
  if (!channel.settings) {
    return null
  }
  switch (channel.type) {
    case 'slack_webhook':
      return (
        <div className="text-sm text-gray-600 dark:text-gray-400 mb-2 flex items-center gap-1 w-full">
          <span className="inline-block text-xs font-bold truncate max-w-xs">{channel.settings.webhook || 'N/A'}</span>
        </div>
      )
    case 'discord_webhook':
      return (
        <div className="text-sm text-gray-600 dark:text-gray-400 mb-2 w-full">
          <div className="flex items-center gap-1">
            <span className="inline-block text-xs font-bold truncate max-w-xs">
              {channel.settings.webhook || 'N/A'}
            </span>
          </div>
          <div className="flex items-center gap-1">
            Username:{' '}
            <span className="inline-block text-xs font-bold truncate max-w-xs">
              {channel.settings.username || 'N/A'}
            </span>
          </div>
        </div>
      )
    case 'email_webhook':
      return (
        <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
          <div className="flex items-center gap-1">
            Webhook:{' '}
            <span className="inline-block text-xs font-bold truncate max-w-xs">
              {channel.settings.webhook || 'N/A'}
            </span>
          </div>
        </div>
      )
    case 'twitter_api':
      return (
        <div className="text-sm text-gray-600 dark:text-gray-400 mb-2 w-full">
          <div className="flex items-center gap-1">
            Consumer key:{' '}
            <span className="inline-block text-xs font-mono truncate max-w-xs">
              {channel.settings.consumer_key ? channel.settings.consumer_key.slice(-8) : 'N/A'}
            </span>
          </div>
          <div className="flex items-center gap-1">
            Consumer secret:{' '}
            <span className="inline-block text-xs font-mono truncate max-w-xs">
              {channel.settings.consumer_secret ? channel.settings.consumer_secret.slice(-8) : 'N/A'}
            </span>
          </div>
          <div className="flex items-center gap-1">
            Access token key:{' '}
            <span className="inline-block text-xs font-mono truncate max-w-xs">
              {channel.settings.access_token_key ? channel.settings.access_token_key.slice(-8) : 'N/A'}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <span>Access token secret:</span>
            <span className="inline-block text-xs font-mono truncate max-w-xs">
              {channel.settings.access_token_secret ? channel.settings.access_token_secret.slice(-8) : 'N/A'}
            </span>
          </div>
        </div>
      )
    default:
      return null
  }
}

export default function ChannelCard({ channel }) {
  return (
    <Card className="flex flex-col justify-between">
      <div className="font-bold text-lg mb-2 capitalize flex items-center gap-2 w-full">
        {channel.type &&
          iconMap[channel.type] &&
          React.createElement(iconMap[channel.type], {
            className: 'inline-block w-4 h-4 text-gray-600 dark:text-gray-400'
          })}{' '}
        {channel.name || `Channel #${channel.id}`}
      </div>
      <ChannelSpecificDetails channel={channel} />
      <div className="text-sm text-gray-600 dark:text-gray-400 mb-2 w-full">
        Used in {channel.rules.length} {channel.rules.length === 1 ? 'rule' : 'rules'}
      </div>
    </Card>
  )
}

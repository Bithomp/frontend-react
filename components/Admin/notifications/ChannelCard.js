import React from 'react'

import { FaDiscord, FaEnvelope, FaSlack } from 'react-icons/fa'
import { FaXTwitter } from 'react-icons/fa6'
import { MdDelete, MdEdit } from 'react-icons/md'

import Card from '@/components/UI/Card'
import { getNotificationChannelLabel, NOTIFICATION_CHANNEL_TYPES } from '@/utils/notificationChannels'

const iconMap = {
  [NOTIFICATION_CHANNEL_TYPES.SLACK]: FaSlack,
  [NOTIFICATION_CHANNEL_TYPES.DISCORD]: FaDiscord,
  [NOTIFICATION_CHANNEL_TYPES.TWITTER]: FaXTwitter,
  [NOTIFICATION_CHANNEL_TYPES.EMAIL]: FaEnvelope
}

const DetailRow = ({ label, value, mono = false }) => (
  <div className="notification-card-detail-row">
    <span>{label}</span>
    <strong className={mono ? 'mono' : ''}>{value || 'N/A'}</strong>
  </div>
)

const ChannelSpecificDetails = ({ channel }) => {
  if (!channel.settings) {
    return null
  }
  switch (channel.type) {
    case NOTIFICATION_CHANNEL_TYPES.SLACK:
      return (
        <div className="notification-card-details">
          <DetailRow label="Webhook" mono value={channel.settings.webhook} />
        </div>
      )
    case NOTIFICATION_CHANNEL_TYPES.DISCORD:
      return (
        <div className="notification-card-details">
          <DetailRow label="Webhook" mono value={channel.settings.webhook} />
          <DetailRow label="Bot username" value={channel.settings.username} />
        </div>
      )
    case NOTIFICATION_CHANNEL_TYPES.EMAIL:
      return (
        <div className="notification-card-details">
          <DetailRow label="Email address" mono value={channel.settings.email || channel.settings.webhook} />
        </div>
      )
    case NOTIFICATION_CHANNEL_TYPES.TWITTER:
      return (
        <div className="notification-card-details">
          <DetailRow
            label="Consumer key"
            mono
            value={channel.settings.consumer_key ? `...${channel.settings.consumer_key.slice(-8)}` : ''}
          />
          <DetailRow
            label="Access token"
            mono
            value={channel.settings.access_token_key ? `...${channel.settings.access_token_key.slice(-8)}` : ''}
          />
        </div>
      )
    default:
      return null
  }
}

export default function ChannelCard({ channel, deleting, editing, onDelete, onEdit }) {
  const Icon = channel.type ? iconMap[channel.type] : null

  return (
    <Card className="notification-card notification-channel-card">
      <div className="notification-card-header">
        <div className="notification-card-title">
          <span className="notification-channel-icon">
            {Icon &&
              React.createElement(Icon, {
                'aria-hidden': true
              })}
          </span>
          <div>
            <strong>{channel.name || `Channel #${channel.id}`}</strong>
            <span className="notification-channel-type">{getNotificationChannelLabel(channel.type)}</span>
          </div>
        </div>
        <div className="notification-card-actions">
          {onEdit && (
            <button
              aria-label="Edit notification channel"
              className="icon-button"
              disabled={editing}
              onClick={() => onEdit(channel)}
              type="button"
            >
              <MdEdit />
            </button>
          )}
          {onDelete && (
            <button
              aria-label="Delete notification channel"
              className="icon-button notification-delete-button"
              disabled={deleting}
              onClick={() => onDelete(channel)}
              type="button"
            >
              <MdDelete />
            </button>
          )}
        </div>
      </div>
      <ChannelSpecificDetails channel={channel} />
      <div className="notification-card-usage">
        <span>{channel.rules.length === 1 ? '1 rule connected' : `${channel.rules.length} rules connected`}</span>
      </div>
    </Card>
  )
}

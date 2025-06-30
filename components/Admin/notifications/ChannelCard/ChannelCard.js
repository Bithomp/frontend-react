import React, { useState } from 'react'

import { FaDiscord, FaEnvelope, FaSlack } from 'react-icons/fa'
import { FaXTwitter } from 'react-icons/fa6'

import Card from '@/components/UI/Card'
import { useDeleteNotificationChannel } from '@/hooks/useNotifications'
import { NOTIFICATION_CHANNEL_TYPES } from '@/lib/notificationChannels'

import ChannelDeleteDialog from './ChannelDeleteDialog'
import ChannelSpecificDetails from './ChannelSpecificDetails'

const iconMap = {
  [NOTIFICATION_CHANNEL_TYPES.SLACK]: FaSlack,
  [NOTIFICATION_CHANNEL_TYPES.DISCORD]: FaDiscord,
  [NOTIFICATION_CHANNEL_TYPES.TWITTER]: FaXTwitter,
  [NOTIFICATION_CHANNEL_TYPES.EMAIL]: FaEnvelope
}

export default function ChannelCard({ channel }) {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const deleteChannel = useDeleteNotificationChannel()

  const handleDelete = async () => {
    await deleteChannel.mutate(channel.id)
    setIsDeleteDialogOpen(false)
  }

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
      <div className="flex justify-start">
        <button className="btn btn-error" onClick={() => setIsDeleteDialogOpen(true)}>
          Delete
        </button>
      </div>
      <ChannelDeleteDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onDelete={handleDelete}
      />
    </Card>
  )
}

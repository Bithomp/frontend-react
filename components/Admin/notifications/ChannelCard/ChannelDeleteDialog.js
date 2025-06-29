import Dialog from '@/components/UI/Dialog'

export default function ChannelDeleteDialog({ isOpen, onClose, onDelete }) {
  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Delete channel"
    >
      <div className="text-gray-600 dark:text-gray-400 mb-4">
        Are you sure you want to delete this channel? This action cannot be undone.
      </div>
      <div className="flex justify-end gap-2">
        <button className="btn btn-secondary" onClick={onClose}>
          Cancel
        </button>
        <button className="btn btn-error" onClick={onDelete}>
          Delete
        </button>
      </div>
    </Dialog>
  )
}

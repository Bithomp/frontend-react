import Image from 'next/image'

export default function EmptyState({ action, title, description, showImage = false }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4">
      {showImage && (
        <div className="w-48 h-48 relative mb-6">
          <Image src="/images/empty-state.svg" alt="No notifications" layout="fill" objectFit="contain" />
        </div>
      )}
      <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-2">{title}</h2>
      <p className="text-gray-600 dark:text-gray-400">{description}</p>
      {action}
    </div>
  )
}

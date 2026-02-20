import { useTranslation } from 'next-i18next'
import Image from 'next/image'

export default function ErrorState() {
  const { t } = useTranslation('admin')

  return (
    <div className="flex flex-col items-center justify-center py-12 px-4">
      <div className="w-48 h-48 relative mb-6">
        <Image src="/images/error-state.svg" alt="Error" layout="fill" objectFit="contain" />
      </div>
      <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
        {t('notifications.error.title', 'Error loading notifications')}
      </h2>
      <p className="text-gray-600 dark:text-gray-400 text-center max-w-md mb-6">
        {t('notifications.error.description', 'Please try again later.')}
      </p>
    </div>
  )
}

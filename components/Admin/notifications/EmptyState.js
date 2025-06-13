import { useTranslation } from 'next-i18next'
import Image from 'next/image'

export default function EmptyState() {
    const { t } = useTranslation('admin')

    return (
        <div className="flex flex-col items-center justify-center py-12 px-4">
            <div className="w-48 h-48 relative mb-6">
                <Image
                    src="/images/empty-state.svg"
                    alt="No notifications"
                    layout="fill"
                    objectFit="contain"
                />
            </div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">
                {t('notifications.empty.title', 'No notification rules or channels yet')}
            </h2>
        </div>
    )
}

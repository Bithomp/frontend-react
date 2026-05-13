import { FaPlus } from 'react-icons/fa6'
import { useTranslation } from 'next-i18next'

export default function AddChannelButton({ onClick }) {
  const { t } = useTranslation('admin')

  return (
    <button className="button-action thin" onClick={onClick} type="button">
      <FaPlus />
      {t('notifications.actions.add-channel')}
    </button>
  )
}

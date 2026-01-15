import Link from 'next/link'
import { FaPlus } from 'react-icons/fa'

export default function AddChannelButton() {
  return (
    <Link href="/admin/notifications/add-channel" className="btn btn-primary">
      <button className="btn btn-primary">
        <FaPlus />
        Add channel
      </button>
    </Link>
  )
}

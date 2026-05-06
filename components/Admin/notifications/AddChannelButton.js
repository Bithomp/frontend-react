import { FaPlus } from 'react-icons/fa6'

export default function AddChannelButton({ onClick }) {
  return (
    <button className="button-action thin" onClick={onClick} type="button">
      <FaPlus />
      Add channel
    </button>
  )
}


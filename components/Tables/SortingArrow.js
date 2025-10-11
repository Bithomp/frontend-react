import { FaLongArrowAltDown, FaLongArrowAltUp } from 'react-icons/fa'

export default function SortingArrow({ sortKey, currentSort, onClick, canSortBothWays = false }) {
  const isActive = currentSort.key === sortKey
  const isDescending = currentSort.direction === 'descending'

  let arrowIcon
  let arrowClass = 'link green inline-flex items-center'

  if (canSortBothWays) {
    arrowIcon = (
      <span className="inline-flex items-center">
        <FaLongArrowAltUp className={isActive && !isDescending ? 'orange' : ''} />
        <FaLongArrowAltDown className={isActive && isDescending ? 'orange ml-[-6px]' : 'ml-[-6px]'} />
      </span>
    )
  } else {
    if (isActive) {
      arrowClass = 'link orange inline-flex items-center'
    }
    arrowIcon = <FaLongArrowAltDown />
  }

  return (
    <b className={arrowClass} onClick={onClick}>
      {arrowIcon}
    </b>
  )
}

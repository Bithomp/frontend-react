import { BsFilter } from 'react-icons/bs'
import { IoMdClose } from 'react-icons/io'

export default function LeftFilters({ children, filtersHide, setFiltersHide }) {
  const toggleFilters = () => {
    setFiltersHide(!filtersHide)
  }

  return (
    <div className="filters">
      <div className="filters__box">
        <button className="filters__toggle" onClick={() => toggleFilters()}>
          <BsFilter />
        </button>
        <div className="filters__wrap">
          <div className="filters-head">
            {children[0]}
            <button className="filters__close" onClick={() => toggleFilters()}>
              <IoMdClose />
            </button>
          </div>
          <div className="filters-body">{children[1]}</div>
        </div>
      </div>
    </div>
  )
}

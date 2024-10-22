import { useEffect, useState } from 'react'
import { BsFilter } from 'react-icons/bs'
import { IoMdClose } from 'react-icons/io'
import { CSVLink } from 'react-csv'
import { useTranslation } from 'next-i18next'

import DownloadIcon from '../../public/images/download.svg'

export default function LeftFilters({
  children,
  filtersHide,
  setFiltersHide,
  data,
  csvHeaders,
  count,
  hasMore,
  total,
  onlyCsv
}) {
  const { t } = useTranslation()

  const [rendered, setRendered] = useState(false)
  const [dateAndTimeNow, setDateAndTimeNow] = useState('')

  useEffect(() => {
    const date = new Date(Date.now()).toLocaleDateString([], { year: 'numeric', month: 'short', day: '2-digit' })
    const time = new Date(Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
    setDateAndTimeNow(date + ' at ' + time)
    setRendered(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const toggleFilters = () => {
    if (setFiltersHide) {
      setFiltersHide(!filtersHide)
    }
  }

  const CsvButton = () => {
    if (!rendered) return ''
    return (
      <CSVLink
        data={data}
        headers={csvHeaders}
        filename={'export ' + dateAndTimeNow + '.csv'}
        className={'button-action thin narrow' + (!(data?.length > 0) ? ' disabled' : '')}
      >
        <DownloadIcon /> CSV
      </CSVLink>
    )
  }

  return (
    <>
      {onlyCsv ? (
        <div className="filters-onlyCsv">
          <CsvButton />
        </div>
      ) : (
        <div className="filters">
          <div className="filters__box">
            <button className="filters__toggle" onClick={() => toggleFilters()}>
              <BsFilter />
            </button>
            <div className="filters__wrap">
              <div className="filters-head">
                <span className="filter-header-title">
                  {count
                    ? '1-' +
                      count +
                      (total ? ' ' + t('general.of') + ' ' + total : hasMore ? ' ' + t('general.of-many') : '')
                    : ''}
                </span>
                <CsvButton />
                <button className="filters__close" onClick={() => toggleFilters()}>
                  <IoMdClose />
                </button>
              </div>
              <div className="filters-body">{children}</div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

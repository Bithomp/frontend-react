import { useEffect } from 'react'
import { BsFilter } from 'react-icons/bs'
import { IoMdClose } from 'react-icons/io'
import { useTranslation } from 'next-i18next'

import { useWidth } from '../../utils'
import CsvExportButton from './CsvExportButton'

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
  const width = useWidth()

  // Prevent body scroll when filters are open
  useEffect(() => {
    if (filtersHide && width > 0 && width <= 1300) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }

    return () => {
      document.body.style.overflow = ''
    }
  }, [filtersHide, width])

  const toggleFilters = () => {
    if (setFiltersHide) {
      setFiltersHide(!filtersHide)
    }
  }

  const CsvButton = () => {
    return (
      <CsvExportButton
        data={data}
        headers={csvHeaders}
        style={{ height: 34, display: 'flex', alignItems: 'center', padding: '0 12px', gap: 5, marginTop: -2 }}
      />
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
            <button className="filters-toggle" onClick={toggleFilters}>
              <BsFilter className="filters-icon" />
              <span className="filters-text">{t('general.filters')}</span>
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

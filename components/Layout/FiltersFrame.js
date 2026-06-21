import { Children, useState, useEffect } from 'react'
import { useTranslation } from 'next-i18next'
import { useRouter } from 'next/router'

import SimpleSelect from '../UI/SimpleSelect'
import LeftFilters from './LeftFilters'
import ViewTogggle from '../UI/ViewToggle'

import { TbArrowsSort } from 'react-icons/tb'
import { IoMdClose } from 'react-icons/io'
import { FaFilter } from 'react-icons/fa'
import { setTabParams, useWidth } from '../../utils'
import CurrencySelect from '../UI/CurrencySelect'
import { TablePagination } from '@mui/material'
import { capitalize, shortHash } from '../../utils/format'
import CsvExportButton from './CsvExportButton'

// Filter Indicator Component
function FilterIndicator({ filters }) {
  const { t } = useTranslation()
  // Check if any filters are active
  const activeFilters = Object.entries(filters || {}).filter(
    ([, value]) => value && value !== '' && value !== null && value !== undefined
  )

  if (activeFilters.length === 0) {
    return null
  }

  const renderFilterValue = (key, value) => {
    const valueText = String(value)
    const displayValue = valueText.length > 24 ? shortHash(valueText) : valueText
    return capitalize(key) + ': ' + displayValue
  }

  return (
    <div className="filters-indicator center mb-2">
      <span className="filters-indicator__summary">
        <FaFilter />
        <span>
          {t('general.filters')}:{' '}
          {activeFilters.map(([key, value], index) => (
            <span key={key}>
              {index > 0 ? ' · ' : ''}
              {renderFilterValue(key, value)}
            </span>
          ))}
        </span>
      </span>
    </div>
  )
}

export default function FiltersFrame({
  children,
  order,
  setOrder,
  orderList,
  activeView,
  setActiveView,
  count,
  total,
  hasMore,
  data,
  csvHeaders,
  contentStyle,
  filtersHide,
  setFiltersHide,
  setSelectedCurrency,
  selectedCurrency,
  page,
  setPage,
  rowsPerPage,
  setRowsPerPage,
  onlyCsv,
  filters,
  navExtra,
  withoutLeftFilters,
  showCsvInNav
}) {
  const { t } = useTranslation()
  const router = useRouter()
  const width = useWidth()

  const [sortMenuOpen, setSortMenuOpen] = useState(false)

  const hideMobileSortMenu = (value) => {
    setOrder(value)
    setSortMenuOpen(false)
  }

  const viewList = [
    { value: 'tiles', label: t('tabs.tiles') },
    { value: 'list', label: t('tabs.list') }
  ]

  useEffect(() => {
    if (!activeView) return
    let queryAddList = []
    let queryRemoveList = []
    let tabsToSet = [
      {
        tabList: viewList,
        tab: activeView,
        defaultTab: 'tiles',
        setTab: setActiveView,
        paramName: 'view'
      }
    ]
    setTabParams(router, tabsToSet, queryAddList, queryRemoveList)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeView])

  const handleChangePage = (event, newPage) => {
    setPage(newPage)
  }

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10))
    setPage(0)
  }

  const childList = Children.toArray(children)

  if (!children || (!withoutLeftFilters && childList.length < 2) || (withoutLeftFilters && childList.length < 1)) {
    return null
  }

  let rowsPerPageOptions = [10, 25]
  const steps = [50, 100, 250, 500, 1000]

  for (let i = 0; i < steps.length; i++) {
    if (steps[i] > total) {
      rowsPerPageOptions.push({ label: 'All', value: -1 })
      break
    } else {
      rowsPerPageOptions.push(steps[i])
    }
  }

  const renderPagination = ({ compact = false } = {}) => (
    <TablePagination
      labelRowsPerPage={compact ? 'Rows' : 'Rows per page'}
      component="div"
      count={total}
      page={page}
      onPageChange={handleChangePage}
      rowsPerPage={rowsPerPage}
      onRowsPerPageChange={handleChangeRowsPerPage}
      rowsPerPageOptions={compact ? [] : rowsPerPageOptions}
    />
  )

  if (onlyCsv) {
    contentStyle = contentStyle || {}
    contentStyle.margin = width > 1300 ? '80px 0 25px 0' : '63px 0 25px 0'
    contentStyle.width = '100%'
  }

  return (
    <div
      className={`content-cols${sortMenuOpen ? ' is-sort-menu-open' : ''}${filtersHide ? ' is-filters-hide' : ''}${
        withoutLeftFilters ? ' is-without-left-filters' : ''
      }`}
    >
      {(orderList || activeView || page) && (
        <div className="filters-nav">
          <div className="filters-nav__wrap">
            {rowsPerPage && (width >= 920 || width <= 440) ? (
              <>{renderPagination({ compact: width <= 440 })}</>
            ) : (
              ''
            )}

            {navExtra ? <div className="filters-nav__extra">{navExtra}</div> : null}

            {showCsvInNav && csvHeaders ? (
              <CsvExportButton data={data || []} headers={csvHeaders} className="filters-nav__csv" />
            ) : null}

            {orderList && (
              <>
                <SimpleSelect value={order} setValue={setOrder} optionsList={orderList} className="dropdown--desktop" />
                <button className="dropdown-btn" onClick={() => setSortMenuOpen(!sortMenuOpen)}>
                  <TbArrowsSort />
                </button>
              </>
            )}
            {selectedCurrency && width > 480 && (
              <CurrencySelect setSelectedCurrency={setSelectedCurrency} selectedCurrency={selectedCurrency} />
            )}
            {activeView && (
              <ViewTogggle viewList={viewList} activeView={activeView} setActiveView={setActiveView} name="view" />
            )}

            {rowsPerPage && width < 920 && width > 440 ? (
              <>
                <div style={{ flexBasis: '100%', height: 0 }}></div>
                {renderPagination()}
              </>
            ) : (
              ''
            )}
          </div>
        </div>
      )}
      {orderList && (
        <div className="dropdown--mobile">
          <div className="dropdown__head">
            <span>{t('general.sort-by')}</span>
            <button onClick={() => setSortMenuOpen(false)}>
              <IoMdClose />
            </button>
          </div>
          <ul>
            {orderList?.map((item, i) => (
              <li
                key={i}
                style={{ fontWeight: item.value === order ? 'bold' : 'normal' }}
                onClick={() => hideMobileSortMenu(item.value)}
                suppressHydrationWarning
              >
                {item.label}
              </li>
            ))}
          </ul>
        </div>
      )}
      {!withoutLeftFilters && (
        <LeftFilters
          filtersHide={filtersHide}
          setFiltersHide={setFiltersHide}
          count={count}
          total={total}
          hasMore={hasMore}
          data={data || []}
          csvHeaders={csvHeaders}
          onlyCsv={onlyCsv}
        >
          {childList[0]}
        </LeftFilters>
      )}

      <div className="content-text" style={contentStyle}>
        {/* Filter Indicator */}
        {filters && (width > 1300 ? filtersHide : !filtersHide) && <FilterIndicator filters={filters} />}
        {withoutLeftFilters ? childList[0] : childList[1]}
        {rowsPerPage && width > 0 && width <= 800 && (
          <div className="filters-pagination-bottom">{renderPagination({ compact: true })}</div>
        )}
      </div>
    </div>
  )
}

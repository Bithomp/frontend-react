import { useState, useEffect } from 'react'
import { useTranslation } from 'next-i18next'
import { useRouter } from 'next/router'

import SimpleSelect from '../UI/SimpleSelect'
import LeftFilters from './LeftFilters'
import ViewTogggle from '../UI/ViewToggle'

import { TbArrowsSort } from 'react-icons/tb'
import { IoMdClose } from 'react-icons/io'
import { setTabParams, useWidth } from '../../utils'
import CurrencySelect from '../UI/CurrencySelect'
import { TablePagination } from '@mui/material'

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
  setRowsPerPage
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

  if (!children || children.length < 2) return null

  let rowsPerPageOptions = [10, 25, { label: 'All', value: -1 }]
  const steps = [50, 100, 250, 500, 1000]

  for (let i = 0; i < steps.length; i++) {
    if (steps[i] > total) {
      break
    } else {
      rowsPerPageOptions.push(steps[i])
    }
  }

  return (
    <div className={`content-cols${sortMenuOpen ? ' is-sort-menu-open' : ''}${filtersHide ? ' is-filters-hide' : ''}`}>
      {(orderList || activeView || page) && (
        <div className="filters-nav">
          <div className="filters-nav__wrap">
            {rowsPerPage && (width >= 920 || width <= 440) ? (
              <>
                <TablePagination
                  labelRowsPerPage={width <= 440 ? 'Rows' : 'Rows per page'}
                  component="div"
                  count={total}
                  page={page}
                  onPageChange={handleChangePage}
                  rowsPerPage={rowsPerPage}
                  onRowsPerPageChange={handleChangeRowsPerPage}
                  rowsPerPageOptions={width <= 440 ? [] : rowsPerPageOptions}
                />
              </>
            ) : (
              ''
            )}

            {orderList && (
              <>
                <SimpleSelect value={order} setValue={setOrder} optionsList={orderList} />
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
                <TablePagination
                  labelRowsPerPage="Rows per page"
                  component="div"
                  count={total}
                  page={page}
                  onPageChange={handleChangePage}
                  rowsPerPage={rowsPerPage}
                  onRowsPerPageChange={handleChangeRowsPerPage}
                  rowsPerPageOptions={rowsPerPageOptions}
                />
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
              >
                {item.label}
              </li>
            ))}
          </ul>
        </div>
      )}
      <LeftFilters
        filtersHide={filtersHide}
        setFiltersHide={setFiltersHide}
        count={count}
        total={total}
        hasMore={hasMore}
        data={data || []}
        csvHeaders={csvHeaders}
      >
        {children[0]}
      </LeftFilters>
      <div className="content-text" style={contentStyle}>
        {children[1]}
      </div>
    </div>
  )
}

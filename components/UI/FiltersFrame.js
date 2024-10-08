import { useState, useEffect } from 'react'
import { useTranslation } from 'next-i18next'
import { useRouter } from 'next/router'

import SimpleSelect from './SimpleSelect'
import LeftFilters from './LeftFilters'
import ViewTogggle from './ViewToggle'

import { TbArrowsSort } from 'react-icons/tb'
import { IoMdClose } from 'react-icons/io'
import { setTabParams, useWidth } from '../../utils'
import CurrencySelect from './CurrencySelect'

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
  Content,
  contentStyle,
  setFiltersHideP,
  setSelectedCurrency,
  selectedCurrency
}) {
  const { t } = useTranslation()
  const router = useRouter()
  const width = useWidth()

  const [sortMenuOpen, setSortMenuOpen] = useState(false)
  const [filtersHide, setFiltersHide] = useState(false)

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

  return (
    <div className={`content-cols${sortMenuOpen ? ' is-sort-menu-open' : ''}${filtersHide ? ' is-filters-hide' : ''}`}>
      {(orderList || activeView) && (
        <div className="filters-nav">
          <div className="filters-nav__wrap">
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
        setFiltersHide={(value) => {
          setFiltersHide(value)
          if (setFiltersHideP) setFiltersHideP(value)
        }}
        count={count}
        total={total}
        hasMore={hasMore}
        data={data || []}
        csvHeaders={csvHeaders}
      >
        {children}
      </LeftFilters>
      <div className="content-text" style={contentStyle}>
        <Content filtersHide={filtersHide} />
      </div>
    </div>
  )
}

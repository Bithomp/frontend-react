import { useTranslation } from 'next-i18next'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import axios from 'axios'
import InfiniteScroll from 'react-infinite-scroll-component'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'

import { IoMdClose } from 'react-icons/io'
import { TbArrowsSort } from 'react-icons/tb'

import { stripText, isAddressOrUsername, setTabParams, useWidth, xahauNetwork, nativeCurrency } from '../utils'
import { getIsSsrMobile } from '../utils/mobile'
import { isValidTaxon, nftThumbnail, nftNameLink } from '../utils/nft'
import {
  amountFormat,
  convertedAmount,
  nftLink,
  usernameOrAddress,
  timeOrDate,
  fullDateAndTime,
  niceNumber,
  shortHash,
  shortNiceNumber
} from '../utils/format'

import SEO from '../components/SEO'
import Tiles from '../components/Tiles'
import RadioOptions from '../components/UI/RadioOptions'
import FormInput from '../components/UI/FormInput'
import CheckBox from '../components/UI/CheckBox'
import ViewTogggle from '../components/UI/ViewToggle'
import SimpleSelect from '../components/UI/SimpleSelect'
import DateAndTimeRange from '../components/UI/DateAndTimeRange'
import AddressInput from '../components/UI/AddressInput'
import LeftFilters from '../components/UI/LeftFilters'
import NftTabs from '../components/NftTabs'

import LinkIcon from '../public/images/link.svg'

export const getServerSideProps = async (context) => {
  const { query, locale } = context
  const {
    collection,
    order,
    view,
    sale,
    currency,
    currencyIssuer,
    issuer,
    taxon,
    period,
    sortCurrency,
    marketplace,
    buyer,
    seller,
    search,
    includeWithoutMediaData
  } = query
  //key added to re-render page when the same route is called with different params
  return {
    props: {
      key: Math.random(),
      collectionQuery: collection || '',
      orderQuery: order || 'priceHigh',
      view: view || 'tiles',
      sale: sale || 'primaryAndSecondary',
      currency: currency || '',
      currencyIssuer: currencyIssuer || '',
      issuerQuery: issuer || '',
      taxonQuery: taxon || '',
      periodQuery: period || (xahauNetwork ? 'year' : 'week'),
      sortCurrencyQuery: sortCurrency || '',
      marketplace: marketplace || '',
      buyerQuery: buyer || '',
      sellerQuery: seller || '',
      searchQuery: search || '',
      includeWithoutMediaDataQuery: includeWithoutMediaData || false,
      isSsrMobile: getIsSsrMobile(context),
      ...(await serverSideTranslations(locale, ['common', 'nft-sort', 'popups']))
    }
  }
}

export default function NftSales({
  collectionQuery,
  orderQuery,
  view,
  sale,
  currency,
  currencyIssuer,
  issuerQuery,
  taxonQuery,
  periodQuery,
  sortCurrencyQuery,
  selectedCurrency,
  marketplace,
  account,
  buyerQuery,
  sellerQuery,
  searchQuery,
  includeWithoutMediaDataQuery
}) {
  const { t } = useTranslation(['common', 'nft-sort'])
  const router = useRouter()
  const windowWidth = useWidth()

  const [data, setData] = useState(null)
  const [sales, setSales] = useState([])
  const [activeView, setActiveView] = useState(view)
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [saleTab, setSaleTab] = useState(sale)
  const [issuer, setIssuer] = useState(issuerQuery)
  const [taxon, setTaxon] = useState(taxonQuery)
  const [period, setPeriod] = useState(periodQuery)
  const [order, setOrder] = useState(orderQuery)
  const [hasMore, setHasMore] = useState('first')
  const [buyer, setBuyer] = useState(buyerQuery)
  const [seller, setSeller] = useState(sellerQuery)
  const [filtersHide, setFiltersHide] = useState(false)
  const [nftCount, setNftCount] = useState(null)
  const [search, setSearch] = useState(searchQuery)
  const [includeWithoutMediaData, setIncludeWithoutMediaData] = useState(includeWithoutMediaDataQuery)
  const [sortMenuOpen, setSortMenuOpen] = useState(false)
  const [saleTabList, setSaleTabList] = useState([
    {
      value: 'primaryAndSecondary',
      label: t('tabs.primaryAndSecondary-sales')
    },
    {
      value: 'secondary',
      label: t('tabs.secondary-sales')
    },
    {
      value: 'primary',
      label: t('tabs.primary-sales')
    }
  ])
  const [issuerTaxonUrlPart, setIssuerTaxonUrlPart] = useState('?view=' + activeView)
  const [collectionUrlPart, setCollectionUrlPart] = useState(collectionQuery ? '&collection=' + collectionQuery : '')

  const controller = new AbortController()

  const sortCurrency = sortCurrencyQuery.toLowerCase() || selectedCurrency

  const orderList = [
    { value: 'priceHigh', label: t('dropdown.priceHigh', { ns: 'nft-sort' }) },
    { value: 'priceLow', label: t('dropdown.priceLow', { ns: 'nft-sort' }) },
    { value: 'soldNew', label: t('dropdown.soldNew', { ns: 'nft-sort' }) },
    { value: 'soldOld', label: t('dropdown.soldOld', { ns: 'nft-sort' }) }
  ]

  useEffect(() => {
    updateSaleTabList({})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const viewList = [
    { value: 'tiles', label: t('tabs.tiles') },
    { value: 'list', label: t('tabs.list') }
  ]

  const updateSaleTabList = (total) => {
    setSaleTabList([
      {
        value: 'primaryAndSecondary',
        label:
          t('tabs.primaryAndSecondary-sales') +
          (total?.secondary || total?.primary
            ? ' (' + shortNiceNumber(total.secondary + total.primary, 0, 0) + ')'
            : '')
      },
      {
        value: 'secondary',
        label:
          t('tabs.secondary-sales') +
          (total?.secondary || total?.secondary === 0 ? ' (' + shortNiceNumber(total.secondary, 0, 0) + ')' : '')
      },
      {
        value: 'primary',
        label:
          t('tabs.primary-sales') +
          (total?.primary || total?.primary === 0 ? ' (' + shortNiceNumber(total.primary, 0, 0) + ')' : '')
      }
    ])
  }

  const checkApi = async (options) => {
    if (!period || !sortCurrency) return

    let marker = hasMore
    let salesData = sales

    updateSaleTabList({})

    if (options?.restart) {
      marker = 'first'
      setHasMore('first')
      setData(null)
      setSales([])
      salesData = []
      setLoading(true)
    }

    if (!marker || (marker === 'first' && salesData.length)) {
      return
    }

    let markerUrlPart = marker && marker !== 'first' ? '&marker=' + marker : ''
    let periodUrlPart = period ? '&period=' + period : ''
    let marketplaceUrlPart = marketplace ? '&marketplace=' + marketplace : ''
    let buyerUrlPart = buyer ? '&buyer=' + buyer : ''
    let sellerUrlPart = seller ? '&seller=' + seller : ''
    let searchPart = ''
    let hasImagePart = !includeWithoutMediaData ? '&hasImage=true' : ''
    let issuerTaxonUrlPart = ''
    let collectionUrlPart = collectionQuery ? '&collection=' + collectionQuery : ''

    if (issuer) {
      issuerTaxonUrlPart = '&issuer=' + issuer
      if (isValidTaxon(taxon)) {
        issuerTaxonUrlPart += '&taxon=' + taxon
      }
    }

    if (marker === 'first') {
      setLoading(true)
    }

    if (search) {
      searchPart = '&search=' + encodeURIComponent(search) + '&searchLocations=metadata.name'
      //'&searchLocations=metadata.name,metadata.description'
      if (search.length < 3) {
        setErrorMessage(t('error-api.search is too short'))
        setLoading(false)
        return
      }
    }

    let nftTypeName = xahauNetwork ? 'uritoken' : 'nft'

    const response = await axios(
      'v2/' +
        nftTypeName +
        '-sales?order=' +
        order +
        currencyUrlPart() +
        '&saleType=' +
        saleTab +
        issuerTaxonUrlPart +
        collectionUrlPart +
        periodUrlPart +
        markerUrlPart +
        '&convertCurrencies=' +
        sortCurrency +
        '&sortCurrency=' +
        sortCurrency +
        marketplaceUrlPart +
        buyerUrlPart +
        sellerUrlPart +
        searchPart +
        hasImagePart,
      {
        signal: controller.signal
      }
    ).catch((error) => {
      if (error && error.message !== 'canceled') {
        setErrorMessage(t('error.' + error.message))
        setLoading(false)
      }
    })

    const newdata = response?.data

    if (newdata) {
      setLoading(false)
      setData(newdata)
      if (newdata.total?.secondary || newdata.total?.primary) {
        updateSaleTabList(newdata.total)
      }

      if (newdata.issuer) {
        setIssuer(newdata.issuer)
      }

      if (newdata.buyer) {
        setBuyer(newdata.buyer)
      }

      if (newdata.seller) {
        setSeller(newdata.seller)
      }

      if (newdata.sales) {
        if (newdata.sales.length > 0) {
          //for CSV export
          for (let i = 0; i < newdata.sales.length; i++) {
            newdata.sales[i].localDate = fullDateAndTime(newdata.sales[i].acceptedAt, null, { asText: true })
            newdata.sales[i].amountInConvertCurrency = niceNumber(
              newdata.sales[i].amountInConvertCurrencies[sortCurrency],
              2
            )
            newdata.sales[i].amountFormated = amountFormat(newdata.sales[i].amount, { minFractionDigist: 2 })
            newdata.sales[i].nftId = newdata.sales[i].nftoken.nftokenID || newdata.sales[i].nftoken.uriTokenID
          }

          setErrorMessage('')
          if (newdata.marker) {
            setHasMore(newdata.marker)
          } else {
            setHasMore(false)
          }
          setSales([...salesData, ...newdata.sales])
        } else {
          if (marker === 'first') {
            setErrorMessage(t('general.no-data'))
          } else {
            setHasMore(false)
          }
        }
      } else {
        if (newdata.error) {
          setErrorMessage(t('error-api.' + newdata.error))
        } else {
          setErrorMessage('Error')
          console.log(newdata)
        }
      }

      setNftCount((newdata.sales?.length || 0) + salesData.length)
    }
  }

  useEffect(() => {
    if (sortCurrency) {
      checkApi({ restart: true })
    }

    return () => {
      if (controller) {
        controller.abort()
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saleTab, issuer, taxon, order, sortCurrency, period, buyer, seller, search, includeWithoutMediaData])

  useEffect(() => {
    let queryAddList = []
    let queryRemoveList = []

    if (data) {
      setIssuerTaxonUrlPart(
        '?view=' +
          activeView +
          '&issuer=' +
          usernameOrAddress(data, 'issuer') +
          (isValidTaxon(data.taxon) ? '&taxon=' + data.taxon : '')
      )
      setCollectionUrlPart(data.collection ? '&collection=' + data.collection : '')
    }

    if (isAddressOrUsername(data?.issuer)) {
      queryAddList.push({
        name: 'issuer',
        value: usernameOrAddress(data, 'issuer')
      })
      if (isValidTaxon(data?.taxon)) {
        queryAddList.push({ name: 'taxon', value: data.taxon })
      } else {
        queryRemoveList.push('taxon')
      }
    } else {
      queryRemoveList.push('issuer')
      queryRemoveList.push('taxon')
    }

    if (isAddressOrUsername(data?.buyer)) {
      queryAddList.push({
        name: 'buyer',
        value: usernameOrAddress(data, 'buyer')
      })
    } else {
      queryRemoveList.push('buyer')
    }

    if (isAddressOrUsername(data?.seller)) {
      queryAddList.push({
        name: 'seller',
        value: usernameOrAddress(data, 'seller')
      })
    } else {
      queryRemoveList.push('seller')
    }

    if (!currency || (currency.toLowerCase() !== 'xrp' && !isAddressOrUsername(currencyIssuer))) {
      queryRemoveList.push('currency')
      queryRemoveList.push('currencyIssuer')
    }

    if (data?.search) {
      queryAddList.push({
        name: 'search',
        value: data.search
      })
    } else {
      queryRemoveList.push('search')
    }

    if (includeWithoutMediaData) {
      queryAddList.push({
        name: 'includeWithoutMediaData',
        value: true
      })
    } else {
      queryRemoveList.push('includeWithoutMediaData')
    }

    setTabParams(
      router,
      [
        {
          tabList: saleTabList,
          tab: saleTab,
          defaultTab: 'primaryAndSecondary',
          setTab: setSaleTab,
          paramName: 'sale'
        },
        {
          tabList: viewList,
          tab: activeView,
          defaultTab: 'tiles',
          setTab: setActiveView,
          paramName: 'view'
        },
        {
          tabList: orderList,
          tab: order,
          defaultTab: 'priceHigh',
          setTab: setOrder,
          paramName: 'order'
        }
      ],
      queryAddList,
      queryRemoveList
    )

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeView, saleTab, data, currency, currencyIssuer, period, includeWithoutMediaData])

  const checkIssuerValue = (e) => {
    if (isAddressOrUsername(e)) {
      setIssuer(e)
      if (!isValidTaxon(taxon)) {
        setTaxon('')
      }
    } else {
      setIssuer('')
      setTaxon('')
    }
  }

  const checkBuyerValue = (e) => {
    setBuyer(isAddressOrUsername(e) ? e : '')
  }

  const checkSellerValue = (e) => {
    setSeller(isAddressOrUsername(e) ? e : '')
  }

  const onTaxonInput = (value) => {
    if (isValidTaxon(value) && issuer) {
      setTaxon(value)
    } else {
      setTaxon('')
    }
  }

  const currencyUrlPart = () => {
    if (!currency) return ''

    if (currency.toLowerCase() === nativeCurrency.toLowerCase()) {
      return '&currency=' + nativeCurrency.toLowerCase()
    } else {
      if (isAddressOrUsername(currencyIssuer)) {
        return '&currency=' + stripText(currency) + '&currencyIssuer=' + stripText(currencyIssuer)
      }
    }
    return ''
  }

  let csvHeaders = [
    { label: t('table.accepted'), key: 'localDate' },
    { label: t('table.amount') + ' (' + sortCurrency + ')', key: 'amountInConvertCurrency' },
    { label: t('table.amount'), key: 'amountFormated' },
    { label: t('table.name'), key: 'nftoken.metadata.name' },
    { label: t('table.taxon'), key: 'nftoken.nftokenTaxon' },
    { label: t('table.serial'), key: 'nftoken.sequence' },
    { label: 'NFT ID', key: 'nftId' },
    { label: t('table.uri'), key: 'nftoken.url' },
    { label: t('table.transaction'), key: 'acceptedTxHash' },
    { label: t('table.buyer'), key: 'buyer' },
    { label: t('table.seller'), key: 'seller' },
    { label: t('table.broker'), key: 'broker' },
    { label: t('table.sales'), key: 'saleType' },
    { label: t('table.marketplace'), key: 'marketplace' }
  ]

  const hideMobileSortMenu = (value) => {
    setOrder(value)
    setSortMenuOpen(false)
  }

  return (
    <>
      <SEO
        title={
          'NFT ' +
          (saleTab === 'secondary' ? t('tabs.secondary-sales') : '') +
          (saleTab === 'primary' ? t('tabs.primary-sales') : '') +
          (issuer ? ' ' + issuer : issuerQuery) +
          (buyer ? ' ' + t('tabs.buyer') + ': ' + buyer : buyerQuery) +
          (seller ? ' ' + t('tabs.seller') + ': ' + seller : sellerQuery) +
          (isValidTaxon(taxon) ? ' ' + taxon : taxonQuery) +
          (currency ? ' ' + currency : '') +
          (currencyIssuer ? ' ' + currencyIssuer : '') +
          (activeView === 'list' ? ' ' + t('tabs.list') : '') +
          (period ? ' ' + period : '') +
          (search || searchQuery ? ', ' + t('table.name') + ': ' + (search || searchQuery) : '')
        }
        description={issuer || issuerQuery || search || t('nft-sales.header')}
      />

      <h1 className="center">{t('nft-sales.header')}</h1>
      <NftTabs tab="nft-sales" url={'/nft-explorer?view=' + activeView + issuerTaxonUrlPart + collectionUrlPart} />

      <div
        className={`content-cols${sortMenuOpen ? ' is-sort-menu-open' : ''}${filtersHide ? ' is-filters-hide' : ''}`}
      >
        <div className="filters-nav">
          <div className="filters-nav__wrap">
            <SimpleSelect value={order} setValue={setOrder} optionsList={orderList} />
            <button className="dropdown-btn" onClick={() => setSortMenuOpen(!sortMenuOpen)}>
              <TbArrowsSort />
            </button>
            <ViewTogggle viewList={viewList} activeView={activeView} setActiveView={setActiveView} />
          </div>
        </div>
        <div className="dropdown--mobile">
          <div className="dropdown__head">
            <span>{t('heading', { ns: 'nft-sort' })}</span>
            <button onClick={() => setSortMenuOpen(false)}>
              <IoMdClose />
            </button>
          </div>
          <ul>
            {orderList.map((item, i) => (
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
        <LeftFilters
          filtersHide={filtersHide}
          setFiltersHide={setFiltersHide}
          count={nftCount}
          hasMore={hasMore}
          data={data?.sales || []}
          csvHeaders={csvHeaders}
        >
          <AddressInput
            title={t('table.issuer')}
            placeholder={t('nfts.search-by-issuer')}
            setValue={checkIssuerValue}
            rawData={data}
            type="issuer"
          />
          {!xahauNetwork && (
            <FormInput
              title={t('table.taxon')}
              placeholder={t('nfts.search-by-taxon')}
              setValue={onTaxonInput}
              disabled={issuer ? false : true}
              defaultValue={data?.taxon}
            />
          )}
          <AddressInput
            title={t('table.buyer')}
            placeholder={t('nfts.search-by-buyer')}
            setValue={checkBuyerValue}
            rawData={data}
            type="buyer"
          />
          <AddressInput
            title={t('table.seller')}
            placeholder={t('nfts.search-by-seller')}
            setValue={checkSellerValue}
            rawData={data}
            type="seller"
          />
          <FormInput
            title={t('table.name')}
            placeholder={t('nfts.search-by-name')}
            setValue={setSearch}
            defaultValue={data?.search}
          />

          <div>
            {t('table.period')}
            <DateAndTimeRange
              period={period}
              setPeriod={setPeriod}
              defaultPeriod={periodQuery}
              minDate="nft"
              radio={true}
            />
          </div>

          <div>
            {t('table.sales')}
            <RadioOptions tabList={saleTabList} tab={saleTab} setTab={setSaleTab} name="sale" />
          </div>

          <div className="filters-check-box">
            <CheckBox checked={includeWithoutMediaData} setChecked={setIncludeWithoutMediaData} outline>
              {t('table.text.include-without-media-data')}
            </CheckBox>
          </div>
        </LeftFilters>
        <div className="content-text">
          <InfiniteScroll
            dataLength={sales.length}
            next={checkApi}
            hasMore={hasMore}
            loader={!errorMessage && <p className="center">{t('nft-sales.load-more')}</p>}
            endMessage={<p className="center">{t('nft-sales.end')}</p>}
            height={!filtersHide ? '1300px' : '100vh'}
          >
            {activeView === 'list' && (
              <>
                {windowWidth > 720 ? (
                  <table className="table-large table-large--without-border">
                    <thead>
                      <tr>
                        <th className="center">{t('table.index')}</th>
                        <th className="center">{t('table.sold')}</th>
                        <th>
                          {t('table.amount')} ({sortCurrency?.toUpperCase()})
                        </th>
                        <th>{t('table.amount')}</th>
                        <th>NFT</th>
                        {!xahauNetwork && (
                          <>
                            <th className="center">{t('table.taxon')}</th>
                            <th className="center">{t('table.serial')}</th>
                          </>
                        )}
                        <th>{t('table.transaction')}</th>
                        {saleTab !== 'primary' && <th className="right">{t('table.seller')}</th>}
                        <th className="right">{t('table.buyer')}</th>
                        {!issuer && <th className="right">{t('table.issuer')}</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {loading ? (
                        <tr className="center">
                          <td colSpan="100">
                            <span className="waiting"></span>
                            <br />
                            {t('general.loading')}
                            <br />
                          </td>
                        </tr>
                      ) : (
                        <>
                          {!errorMessage && sales.length ? (
                            sales.map((nft, i) => (
                              <tr key={i}>
                                <td className="center">{i + 1}</td>
                                <td className="center">{timeOrDate(nft.acceptedAt)}</td>
                                <td>{convertedAmount(nft, sortCurrency)}</td>
                                <td>{amountFormat(nft.amount, { tooltip: 'right' })}</td>
                                <td>
                                  {nftThumbnail(nft.nftoken)} {nftNameLink(nft.nftoken)}
                                </td>
                                {!xahauNetwork && (
                                  <>
                                    <td className="center">{nft.nftoken.nftokenTaxon}</td>
                                    <td className="center">{nft.nftoken.sequence}</td>
                                  </>
                                )}
                                <td className="center">
                                  <a href={'/explorer/' + nft.acceptedTxHash}>
                                    <LinkIcon />
                                  </a>
                                </td>
                                {saleTab !== 'primary' && (
                                  <td className="right">{nftLink(nft, 'seller', { address: 'short' })}</td>
                                )}
                                <td className="right">{nftLink(nft, 'buyer', { address: 'short' })}</td>
                                {!issuer && (
                                  <td className="right">{nftLink(nft.nftoken, 'issuer', { address: 'short' })}</td>
                                )}
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan="100" className="center orange bold">
                                {errorMessage}
                              </td>
                            </tr>
                          )}
                        </>
                      )}
                    </tbody>
                  </table>
                ) : (
                  <table className="table-mobile">
                    <tbody>
                      {loading ? (
                        <tr className="center">
                          <td colSpan="100">
                            <span className="waiting"></span>
                            <br />
                            {t('general.loading')}
                          </td>
                        </tr>
                      ) : (
                        <>
                          {!errorMessage && sales.length ? (
                            sales.map((nft, i) => (
                              <tr key={i}>
                                <td className="center">
                                  {i + 1}
                                  <br />
                                  <br />
                                  {nftThumbnail(nft.nftoken)}
                                </td>
                                <td>
                                  <div>NFT: {nftNameLink(nft.nftoken)}</div>
                                  <div>
                                    {t('table.sold')}: {timeOrDate(nft.acceptedAt)}
                                  </div>
                                  <div>
                                    {t('table.amount')}: {amountFormat(nft.amount, { tooltip: 'right' })} (≈
                                    {convertedAmount(nft, sortCurrency)})
                                  </div>
                                  {!xahauNetwork && (
                                    <>
                                      <div>
                                        {t('table.taxon')}: {nft.nftoken.nftokenTaxon}
                                      </div>
                                      <div>
                                        {t('table.serial')}: {nft.nftoken.sequence}
                                      </div>
                                    </>
                                  )}
                                  <div>
                                    {t('table.transaction')}:{' '}
                                    <a href={'/explorer/' + nft.acceptedTxHash}>
                                      {shortHash(nft.acceptedTxHash)} <LinkIcon />
                                    </a>
                                  </div>
                                  {saleTab !== 'primary' && (
                                    <div>
                                      {t('table.seller')}: {nftLink(nft, 'seller', { address: 'short' })}
                                    </div>
                                  )}
                                  <div>
                                    {t('table.buyer')}: {nftLink(nft, 'buyer', { address: 'short' })}
                                  </div>
                                  {!issuer && (
                                    <div>
                                      {t('table.issuer')}: {nftLink(nft.nftoken, 'issuer', { address: 'short' })}
                                    </div>
                                  )}
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan="100" className="center orange bold">
                                {errorMessage}
                              </td>
                            </tr>
                          )}
                        </>
                      )}
                    </tbody>
                  </table>
                )}
              </>
            )}
            {activeView === 'tiles' && (
              <>
                {loading ? (
                  <div className="center" style={{ marginTop: '20px' }}>
                    <span className="waiting"></span>
                    <br />
                    {t('general.loading')}
                  </div>
                ) : (
                  <>
                    {errorMessage ? (
                      <div className="center orange bold">{errorMessage}</div>
                    ) : (
                      <Tiles nftList={sales} type={order} convertCurrency={sortCurrency} account={account} />
                    )}
                  </>
                )}
              </>
            )}
          </InfiniteScroll>
        </div>
      </div>
    </>
  )
}

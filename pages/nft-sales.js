import { useTranslation } from 'next-i18next'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import axios from 'axios'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'

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
  shortNiceNumber,
  niceCurrency,
  addressUsernameOrServiceLink
} from '../utils/format'

import SEO from '../components/SEO'
import Tiles from '../components/Tiles'
import RadioOptions from '../components/UI/RadioOptions'
import FormInput from '../components/UI/FormInput'
import CheckBox from '../components/UI/CheckBox'
import DateAndTimeRange from '../components/UI/DateAndTimeRange'
import AddressInput from '../components/UI/AddressInput'
import NftTabs from '../components/Tabs/NftTabs'

import LinkIcon from '../public/images/link.svg'
import FiltersFrame from '../components/Layout/FiltersFrame'
import InfiniteScrolling from '../components/Layout/InfiniteScrolling'

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
  includeWithoutMediaDataQuery,
  subscriptionExpired,
  sessionToken,
  signOutPro
}) {
  const { t } = useTranslation()
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
  const [nftCount, setNftCount] = useState(null)
  const [search, setSearch] = useState(searchQuery)
  const [includeWithoutMediaData, setIncludeWithoutMediaData] = useState(includeWithoutMediaDataQuery)
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
  const [filtersHide, setFiltersHide] = useState(false)

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

    if (isAddressOrUsername(issuerQuery)) {
      setIssuer(issuerQuery)
    }

    if (isAddressOrUsername(buyerQuery)) {
      setBuyer(buyerQuery)
    }

    if (isAddressOrUsername(sellerQuery)) {
      setSeller(sellerQuery)
    }

    if (view) {
      setActiveView(view)
    }

    if (sale) {
      setSaleTab(sale)
    }

    if (taxonQuery) {
      setTaxon(taxonQuery)
    }

    if (periodQuery) {
      setPeriod(periodQuery)
    }

    if (orderQuery) {
      setOrder(orderQuery)
    }

    if (searchQuery) {
      setSearch(searchQuery)
    }

    if (includeWithoutMediaDataQuery) {
      setIncludeWithoutMediaData(includeWithoutMediaDataQuery)
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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

  const hasActiveFilters = () => {
    return !!(
      issuer ||
      taxon ||
      buyer ||
      seller ||
      search ||
      (period && period !== 'all') ||
      (saleTab !== 'primaryAndSecondary') ||
      !includeWithoutMediaData ||
      currency ||
      currencyIssuer
    )
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
    } else if (marker && marker !== 'first') {
      // do not load more if there is no session token or if Bithomp Pro is expired
      if (!sessionToken || (sessionToken && subscriptionExpired)) {
        return
      }
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
            newdata.sales[i].nftId = newdata.sales[i].nftoken.nftokenID
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
            setErrorMessage(
              t('general.no-data') + " " + (hasActiveFilters()  ? t('general.change-filters') : "" )
            )
          } else {
            setHasMore(false)
          }
        }
      } else {
        if (newdata.error) {
          if (newdata.error === 'This endpoint/query is available only within bithomp pro subscription') {
            // user logged out...
            signOutPro()
          } else {
            setErrorMessage(t('error-api.' + newdata.error))
          }
        } else {
          setErrorMessage('Error')
          console.log(newdata)
        }
      }

      setNftCount((newdata.sales?.length || 0) + salesData.length)
    }
  }

  useEffect(() => {
    let queryAddList = []
    let queryRemoveList = []

    if (isAddressOrUsername(issuer)) {
      queryAddList.push({
        name: 'issuer',
        value: issuer
      })
      if (isValidTaxon(taxon)) {
        queryAddList.push({ name: 'taxon', value: taxon })
      } else {
        queryRemoveList.push('taxon')
      }
    } else {
      queryRemoveList.push('issuer')
      queryRemoveList.push('taxon')
    }

    if (isAddressOrUsername(buyer)) {
      queryAddList.push({
        name: 'buyer',
        value: buyer
      })
    } else {
      queryRemoveList.push('buyer')
    }

    if (isAddressOrUsername(seller)) {
      queryAddList.push({
        name: 'seller',
        value: seller
      })
    } else {
      queryRemoveList.push('seller')
    }

    if (search) {
      queryAddList.push({
        name: 'search',
        value: search
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

    if (!currency || (currency.toLowerCase() !== 'xrp' && !isAddressOrUsername(currencyIssuer))) {
      queryRemoveList.push('currency')
      queryRemoveList.push('currencyIssuer')
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

    if (sortCurrency) {
      checkApi({ restart: true })
    }

    return () => {
      if (controller) {
        controller.abort()
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    saleTab,
    issuer,
    taxon,
    order,
    sortCurrency,
    period,
    buyer,
    seller,
    search,
    includeWithoutMediaData,
    currency,
    currencyIssuer
  ])

  useEffect(() => {
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

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeView, data])

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

  return (
    <>
      <SEO
        title={
          t('nft-sales.header') +
          (saleTab === 'secondary' ? t('tabs.secondary-sales') : '') +
          (saleTab === 'primary' ? t('tabs.primary-sales') : '') +
          (issuerQuery ? ' ' + t('table.issuer') + ': ' + issuerQuery : '') +
          (buyerQuery ? ' ' + t('table.buyer') + ': ' + buyerQuery : '') +
          (sellerQuery ? ' ' + t('table.seller') + ': ' + sellerQuery : '') +
          (isValidTaxon(taxonQuery) ? ' ' + taxonQuery : '') +
          (currency ? ' ' + currency : '') +
          (currencyIssuer ? ' ' + currencyIssuer : '') +
          (activeView === 'list' ? ' ' + t('tabs.list') : '') +
          (periodQuery ? ' ' + periodQuery : '') +
          (searchQuery ? ', ' + t('table.name') + ': ' + searchQuery : '')
        }
        images={[
          {
            width: 1200,
            height: 630,
            file: 'previews/1200x630/nft-sales.png'
          },
          {
            width: 630,
            height: 630,
            file: 'previews/630x630/nft-sales.png'
          }
        ]}
      />

      <h1 className="center">
        {t('nft-sales.header')}
        {data?.issuer ? <>, {addressUsernameOrServiceLink(data, 'issuer', { short: true })}</> : ''}
      </h1>
      <NftTabs tab="nft-sales" url={'/nft-explorer?view=' + activeView + issuerTaxonUrlPart + collectionUrlPart} />

      <FiltersFrame
        order={order}
        setOrder={setOrder}
        orderList={orderList}
        activeView={activeView}
        setActiveView={setActiveView}
        count={nftCount}
        hasMore={hasMore}
        data={data?.sales || []}
        csvHeaders={csvHeaders}
        filtersHide={filtersHide}
        setFiltersHide={setFiltersHide}
      >
        <>
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
              defaultValue={issuer ? data?.taxon : ''}
              key={issuer || 'empty'}
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

          {currencyIssuer && currency && (
            <>
              <FormInput
                title={t('table.currency')}
                defaultValue={niceCurrency(currency)}
                disabled={true}
                hideButton={true}
              />
              <FormInput
                title={t('table.currency-issuer')}
                defaultValue={currencyIssuer}
                disabled={true}
                hideButton={true}
              />
            </>
          )}

          <div className="filters-check-box">
            <CheckBox checked={includeWithoutMediaData} setChecked={setIncludeWithoutMediaData} outline>
              {t('table.text.include-without-media-data')}
            </CheckBox>
          </div>
        </>
        <>
          <InfiniteScrolling
            dataLength={sales.length}
            loadMore={checkApi}
            hasMore={hasMore} 
            errorMessage={errorMessage}
            subscriptionExpired={subscriptionExpired}
            sessionToken={sessionToken}
            endMessage={t('nft-sales.end')}
            loadMoreMessage={t('nft-sales.load-more')}
            noSessionTokenMessage={t('nfts.change-filters')}
            height={!filtersHide ? '1300px' : '100vh'}
          >
            {activeView === 'list' && (
              <>
                {windowWidth > 720 ? (
                  <table className="table-large no-border">
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
          </InfiniteScrolling>
        </>
      </FiltersFrame>
    </>
  )
}

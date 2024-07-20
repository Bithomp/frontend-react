import { useTranslation } from 'next-i18next'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import axios from 'axios'
import { CSVLink } from "react-csv"
import InfiniteScroll from 'react-infinite-scroll-component'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import Link from 'next/link'

import RadioOptions from '../components/UI/RadioOptions'
import FormInput from '../components/UI/FormInput'
import CheckBox from '../components/UI/CheckBox'
import ViewTogggle from '../components/UI/ViewToggle'
import SimpleSelect from '../components/UI/SimpleSelect'

import { IoMdClose } from "react-icons/io";
import { BsFilter } from "react-icons/bs";
import { TbArrowsSort } from "react-icons/tb";

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
  shortHash
} from '../utils/format'

export const getServerSideProps = async (context) => {
  const { query, locale } = context
  const {
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
    includeWithoutMediaData,
  } = query
  //key added to re-render page when the same route is called with different params
  return {
    props: {
      key: Math.random(),
      orderQuery: order || "priceHigh",
      view: view || "tiles",
      sale: sale || "all",
      currency: currency || "",
      currencyIssuer: currencyIssuer || "",
      issuerQuery: issuer || "",
      taxonQuery: taxon || "",
      periodQuery: period || (xahauNetwork ? "year" : "week"),
      sortCurrencyQuery: sortCurrency || "",
      marketplace: marketplace || "",
      buyerQuery: buyer || "",
      sellerQuery: seller || "",
      searchQuery: search || "",
      includeWithoutMediaDataQuery: includeWithoutMediaData || false,
      isSsrMobile: getIsSsrMobile(context),
      ...(await serverSideTranslations(locale, ['common', 'nft-sort', 'popups'])),
    },
  }
}

import SEO from '../components/SEO'
import Tiles from '../components/Tiles'
import DateAndTimeRange from '../components/UI/DateAndTimeRange'

import LinkIcon from "../public/images/link.svg"
import DownloadIcon from "../public/images/download.svg"
import AddressInput from '../components/UI/AddressInput'

export default function NftSales({
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

  const [rendered, setRendered] = useState(false)
  const [data, setData] = useState(null)
  const [sales, setSales] = useState([])
  const [activeView, setActiveView] = useState(view)
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")
  const [saleTab, setSaleTab] = useState(sale)
  const [issuer, setIssuer] = useState(issuerQuery)
  const [taxon, setTaxon] = useState(taxonQuery)
  const [total, setTotal] = useState({})
  const [period, setPeriod] = useState(periodQuery)
  const [order, setOrder] = useState(orderQuery)
  const [hasMore, setHasMore] = useState("first")
  const [buyer, setBuyer] = useState(buyerQuery)
  const [seller, setSeller] = useState(sellerQuery)
  const [filtersHide, setFiltersHide] = useState(false)
  const [nftCount, setNftCount] = useState(null)
  const [dateAndTimeNow, setDateAndTimeNow] = useState('')
  const [search, setSearch] = useState(searchQuery)
  const [includeWithoutMediaData, setIncludeWithoutMediaData] = useState(includeWithoutMediaDataQuery)
  const [sortMenuOpen, setSortMenuOpen] = useState(false)

  const controller = new AbortController()

  const sortCurrency = sortCurrencyQuery.toLowerCase() || selectedCurrency

  const orderList = [
    { value: 'priceHigh', label: t("dropdown.priceHigh", { ns: "nft-sort" }) },
    { value: 'priceLow', label: t("dropdown.priceLow", { ns: "nft-sort" }) },
    { value: 'soldNew', label: t("dropdown.soldNew", { ns: "nft-sort" }) },
    { value: 'soldOld', label: t("dropdown.soldOld", { ns: "nft-sort" }) }
  ]

  useEffect(() => {
    const date = new Date(Date.now()).toLocaleDateString([], { year: 'numeric', month: 'short', day: '2-digit' })
    const time = new Date(Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
    setDateAndTimeNow(date + ' at ' + time)
    setRendered(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const viewList = [
    { value: 'tiles', label: t("tabs.tiles") },
    { value: 'list', label: t("tabs.list") }
  ]

  const saleTabList = [
    { value: 'all', label: t("tabs.primaryAndSecondary-sales") },
    { value: 'secondary', label: (t("tabs.secondary-sales") + (total?.secondary ? (" (" + total.secondary + ")") : "")) },
    { value: 'primary', label: (t("tabs.primary-sales") + (total?.primary ? (" (" + total.primary + ")") : "")) }
  ]

  const checkApi = async (options) => {
    if (!period || !sortCurrency) return

    let marker = hasMore
    let salesData = sales

    if (options?.restart) {
      marker = "first"
      setHasMore("first")
      setData(null)
      setSales([])
      salesData = []
      setLoading(true)
    }

    if (!marker || (marker === "first" && salesData.length)) {
      return
    }

    let markerUrlPart = marker && marker !== "first" ? "&marker=" + marker : ""
    let periodUrlPart = period ? '&period=' + period : ''
    let marketplaceUrlPart = marketplace ? '&marketplace=' + marketplace : ''
    let buyerUrlPart = buyer ? '&buyer=' + buyer : ''
    let sellerUrlPart = seller ? '&seller=' + seller : ''
    let searchPart = ''
    let hasImagePart = !includeWithoutMediaData ? '&hasImage=true' : ''
    let collectionUrlPart = ''

    if (issuer) {
      collectionUrlPart = '&issuer=' + issuer
      if (isValidTaxon(taxon)) {
        collectionUrlPart += '&taxon=' + taxon
      }
    }

    if (marker === "first") {
      setLoading(true)
    }

    if (search) {
      searchPart = '&search=' + encodeURIComponent(search) + '&searchLocations=metadata.name'
      //'&searchLocations=metadata.name,metadata.description'
      if (search.length < 3) {
        setErrorMessage(t("error-api.search is too short"))
        setLoading(false)
        return
      }
    }

    let nftTypeName = xahauNetwork ? 'uritoken' : 'nft'

    const response = await axios(
      'v2/' + nftTypeName + '-sales?order=' + order + currencyUrlPart() + '&saleType=' + saleTab + collectionUrlPart + periodUrlPart + markerUrlPart
      + "&convertCurrencies=" + sortCurrency + "&sortCurrency=" + sortCurrency + marketplaceUrlPart + buyerUrlPart + sellerUrlPart + searchPart + hasImagePart,
      {
        signal: controller.signal
      }
    ).catch(error => {
      setErrorMessage(t("error." + error.message))
    })

    const newdata = response?.data
    setLoading(false)
    setTotal({})

    if (newdata) {
      setData(newdata)
      if (newdata.total?.secondary) {
        setTotal(newdata.total)
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
            newdata.sales[i].amountInConvertCurrency = niceNumber(newdata.sales[i].amountInConvertCurrencies[sortCurrency], 2)
            newdata.sales[i].amountFormated = amountFormat(newdata.sales[i].amount, { minFractionDigist: 2 })
            newdata.sales[i].nftId = newdata.sales[i].nftoken.nftokenID || newdata.sales[i].nftoken.uriTokenID
          }

          setErrorMessage("")
          if (newdata.marker) {
            setHasMore(newdata.marker)
          } else {
            setHasMore(false)
          }
          setSales([...salesData, ...newdata.sales])
        } else {
          if (marker === 'first') {
            setErrorMessage(t("general.no-data"))
          } else {
            setHasMore(false)
          }
        }
      } else {
        if (newdata.error) {
          setErrorMessage(t("error-api." + newdata.error))
        } else {
          setErrorMessage("Error")
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
    includeWithoutMediaData
  ])

  useEffect(() => {
    let queryAddList = []
    let queryRemoveList = []
    if (isAddressOrUsername(data?.issuer)) {
      queryAddList.push({
        name: "issuer",
        value: usernameOrAddress(data, 'issuer')
      })
      if (isValidTaxon(data?.taxon)) {
        queryAddList.push({ name: "taxon", value: data.taxon })
      } else {
        queryRemoveList.push("taxon")
      }
    } else {
      queryRemoveList.push("issuer")
      queryRemoveList.push("taxon")
    }

    if (isAddressOrUsername(data?.buyer)) {
      queryAddList.push({
        name: "buyer",
        value: usernameOrAddress(data, 'buyer')
      })
    } else {
      queryRemoveList.push("buyer")
    }

    if (isAddressOrUsername(data?.seller)) {
      queryAddList.push({
        name: "seller",
        value: usernameOrAddress(data, 'seller')
      })
    } else {
      queryRemoveList.push("seller")
    }

    if (!currency || (currency.toLowerCase() !== 'xrp' && !isAddressOrUsername(currencyIssuer))) {
      queryRemoveList.push("currency")
      queryRemoveList.push("currencyIssuer")
    }

    if (data?.search) {
      queryAddList.push({
        name: "search",
        value: data.search
      })
    } else {
      queryRemoveList.push("search")
    }

    if (includeWithoutMediaData) {
      queryAddList.push({
        name: "includeWithoutMediaData",
        value: true
      })
    } else {
      queryRemoveList.push("includeWithoutMediaData")
    }

    setTabParams(router, [
      {
        tabList: saleTabList,
        tab: saleTab,
        defaultTab: "all",
        setTab: setSaleTab,
        paramName: "sale"
      },
      {
        tabList: viewList,
        tab: activeView,
        defaultTab: "tiles",
        setTab: setActiveView,
        paramName: "view"
      },
      {
        tabList: orderList,
        tab: order,
        defaultTab: "priceHigh",
        setTab: setOrder,
        paramName: "order"
      }
    ],
      queryAddList,
      queryRemoveList
    )

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeView, saleTab, data, currency, currencyIssuer, period, includeWithoutMediaData])

  const checkIssuerValue = e => {
    if (isAddressOrUsername(e)) {
      setIssuer(e)
      if (!isValidTaxon(taxon)) {
        setTaxon("")
      }
    } else {
      setIssuer("")
      setTaxon("")
    }
  }

  const checkBuyerValue = e => {
    setBuyer(isAddressOrUsername(e) ? e : "");
  };

  const checkSellerValue = e => {
    setSeller(isAddressOrUsername(e) ? e : "");
  };

  const onTaxonInput = value => {
    if (isValidTaxon(value) && issuer) {
      setTaxon(value)
    } else {
      setTaxon("")
    }
  }

  const issuerTaxonUrlPart = (data && issuer) ? ("&issuer=" + usernameOrAddress(data, 'issuer') + (isValidTaxon(taxon) ? ("&taxon=" + taxon) : "")) : "";

  const currencyUrlPart = () => {
    if (!currency) return ""

    if (currency.toLowerCase() === nativeCurrency.toLowerCase()) {
      return "&currency=" + nativeCurrency.toLowerCase()
    } else {
      if (isAddressOrUsername(currencyIssuer)) {
        return '&currency=' + stripText(currency) + "&currencyIssuer=" + stripText(currencyIssuer);
      }
    }
    return ""
  }

  let csvHeaders = [
    { label: t("table.accepted"), key: "localDate" },
    { label: (t("table.amount") + " (" + sortCurrency + ")"), key: "amountInConvertCurrency" },
    { label: t("table.amount"), key: "amountFormated" },
    { label: t("table.name"), key: "nftoken.metadata.name" },
    { label: t("table.taxon"), key: "nftoken.nftokenTaxon" },
    { label: t("table.serial"), key: "nftoken.sequence" },
    { label: "NFT ID", key: "nftId" },
    { label: t("table.uri"), key: "nftoken.url" },
    { label: t("table.transaction"), key: "acceptedTxHash" },
    { label: t("table.buyer"), key: "buyer" },
    { label: t("table.seller"), key: "seller" },
    { label: t("table.broker"), key: "broker" },
    { label: t("table.sales"), key: "saleType" },
    { label: t("table.marketplace"), key: "marketplace" }
  ]

  const toggleFilters = () => {
    setFiltersHide(!filtersHide)
  }

  useEffect(() => {
    // disable nft scrolling when filters are open on mobile/tablet
    document.body.style.overflow = window.matchMedia("(max-width: 1300px)").matches && filtersHide ? "hidden" : "";
  }, [filtersHide]);

  const hideMobileSortMenu = (value) => {
    setOrder(value)
    setSortMenuOpen(false)
  }

  return <>
    <SEO
      title={
        'NFT '
        + (saleTab === 'secondary' ? t("tabs.secondary-sales") : "")
        + (saleTab === 'primary' ? t("tabs.primary-sales") : "")
        + (issuer ? (" " + issuer) : issuerQuery)
        + (buyer ? (" " + t("tabs.buyer") + ": " + buyer) : buyerQuery)
        + (seller ? (" " + t("tabs.seller") + ": " + seller) : sellerQuery)
        + (isValidTaxon(taxon) ? (" " + taxon) : taxonQuery)
        + (currency ? (" " + currency) : "")
        + (currencyIssuer ? (" " + currencyIssuer) : "")
        + (activeView === "list" ? (" " + t("tabs.list")) : "")
        + (period ? (" " + period) : "")
        + (search || searchQuery ? (", " + t("table.name") + ": " + (search || searchQuery)) : "")
      }
      description={issuer || issuerQuery || search || t("nft-sales.header")}
    />

    <h1 className="center">{t("nft-sales.header")}</h1>
    <p className='center'>
      <Link href={"/nft-explorer?view=" + activeView + issuerTaxonUrlPart}>{t("nft-explorer.header")}</Link>
    </p>

    <div className={`content-cols${sortMenuOpen ? ' is-sort-menu-open' : ''}${filtersHide ? ' is-filters-hide' : ''}`}>
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
        <div className='dropdown__head'>
          <span>{t("heading", { ns: "nft-sort" })}</span>
          <button onClick={() => setSortMenuOpen(false)}><IoMdClose /></button>
        </div>
        <ul>
          {orderList.map((item, i) =>
            <li
              key={i}
              style={{ fontWeight: item.value === order ? 'bold' : 'normal' }}
              onClick={() => hideMobileSortMenu(item.value)}>{item.label}</li>
          )}
        </ul>
      </div>
      <div className="filters">
        <div className="filters__box">
          <button className='filters__toggle' onClick={() => toggleFilters()}>
            <BsFilter />
          </button>
          <div className="filters__wrap">
            <div className="filters__head">
              <span>{t("general.loaded")}: <i>{nftCount}</i></span>
              {rendered &&
                <CSVLink
                  data={data?.sales || []}
                  headers={csvHeaders}
                  filename={'nft sales export ' + dateAndTimeNow + '.csv'}
                  className={'button-action thin narrow' + (!(data && data.sales?.length > 0) ? ' disabled' : '')}
                >
                  <DownloadIcon /> CSV
                </CSVLink>
              }
              <button className='filters__close' onClick={() => toggleFilters()}><IoMdClose /></button>
            </div>
            <AddressInput
              title={t("table.issuer")}
              placeholder={t("nfts.search-by-issuer")}
              setValue={checkIssuerValue}
              rawData={data}
              type='issuer'
            />
            {!xahauNetwork &&
              <FormInput
                title={t("table.taxon")}
                placeholder={t("nfts.search-by-taxon")}
                setValue={onTaxonInput}
                disabled={issuer ? false : true}
                defaultValue={data?.taxon}
              />
            }
            <AddressInput
              title={t("table.buyer")}
              placeholder={t("nfts.search-by-buyer")}
              setValue={checkBuyerValue}
              rawData={data}
              type='buyer'
            />
            <AddressInput
              title={t("table.seller")}
              placeholder={t("nfts.search-by-seller")}
              setValue={checkSellerValue}
              rawData={data}
              type='seller'
            />
            <FormInput
              title={t("table.name")}
              placeholder={t("nfts.search-by-name")}
              setValue={setSearch}
              defaultValue={data?.search}
            />

            <div>
              {t("table.period")}
              <DateAndTimeRange
                period={period}
                setPeriod={setPeriod}
                defaultPeriod={periodQuery}
                minDate="nft"
                radio={true}
              />
            </div>

            <div>
              {t("table.sales")}
              <RadioOptions tabList={saleTabList} tab={saleTab} setTab={setSaleTab} name='sale' />
            </div>

            <div className='filters-check-box'>
              <CheckBox checked={includeWithoutMediaData} setChecked={setIncludeWithoutMediaData} outline>
                {t("table.text.include-without-media-data")}
              </CheckBox>
            </div>
          </div>
        </div>
      </div>
      <div className="content-text" style={{ minHeight: "480px" }} id="scrollableDiv">
        <InfiniteScroll
          scrollableTarget={windowWidth > 1300 ? "scrollableDiv" : null} // filters.css line 58, when filters open - then scrollable, otherwise not
          dataLength={sales.length}
          next={checkApi}
          hasMore={hasMore}
          loader={!errorMessage &&
            <p className="center">{t("nft-sales.load-more")}</p>
          }
          endMessage={<p className="center">{t("nft-sales.end")}</p>}
        >
          {activeView === "list" &&
            <>
              {windowWidth > 720 ?
                <table className="table-large table-large--without-border">
                  <thead>
                    <tr>
                      <th className='center'>{t("table.index")}</th>
                      <th className='center'>{t("table.sold")}</th>
                      <th>{t("table.amount")} ({sortCurrency?.toUpperCase()})</th>
                      <th>{t("table.amount")}</th>
                      <th>NFT</th>
                      {!xahauNetwork &&
                        <>
                          <th className='center'>{t("table.taxon")}</th>
                          <th className='center'>{t("table.serial")}</th>
                        </>
                      }
                      <th>{t("table.transaction")}</th>
                      {saleTab !== "primary" && <th className='right'>{t("table.seller")}</th>}
                      <th className='right'>{t("table.buyer")}</th>
                      {!issuer && <th className='right'>{t("table.issuer")}</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {loading ?
                      <tr className='center'>
                        <td colSpan="100">
                          <span className="waiting"></span>
                          <br />{t("general.loading")}<br />
                        </td>
                      </tr>
                      :
                      <>
                        {!errorMessage && sales.length ?
                          sales.map((nft, i) =>
                            <tr key={i}>
                              <td className='center'>{i + 1}</td>
                              <td className='center'>{timeOrDate(nft.acceptedAt)}</td>
                              <td>{convertedAmount(nft, sortCurrency)}</td>
                              <td>{amountFormat(nft.amount, { tooltip: 'right' })}</td>
                              <td>{nftThumbnail(nft.nftoken)} {nftNameLink(nft.nftoken)}</td>
                              {!xahauNetwork &&
                                <>
                                  <td className='center'>{nft.nftoken.nftokenTaxon}</td>
                                  <td className='center'>{nft.nftoken.sequence}</td>
                                </>
                              }
                              <td className='center'><a href={"/explorer/" + nft.acceptedTxHash}><LinkIcon /></a></td>
                              {saleTab !== "primary" && <td className='right'>{nftLink(nft, 'seller', { address: 'short' })}</td>}
                              <td className='right'>{nftLink(nft, 'buyer', { address: 'short' })}</td>
                              {!issuer && <td className='right'>{nftLink(nft.nftoken, 'issuer', { address: 'short' })}</td>}
                            </tr>
                          )
                          :
                          <tr><td colSpan="100" className='center orange bold'>{errorMessage}</td></tr>
                        }
                      </>
                    }
                  </tbody>
                </table>
                :
                <table className="table-mobile">
                  <tbody>
                    {loading ?
                      <tr className='center'>
                        <td colSpan="100">
                          <span className="waiting"></span>
                          <br />{t("general.loading")}
                        </td>
                      </tr>
                      :
                      <>
                        {!errorMessage && sales.length ?
                          sales.map((nft, i) =>
                            <tr key={i}>
                              <td className="center">
                                {i + 1}<br /><br />
                                {nftThumbnail(nft.nftoken)}
                              </td>
                              <td>
                                <div>NFT: {nftNameLink(nft.nftoken)}</div>
                                <div>{t("table.sold")}: {timeOrDate(nft.acceptedAt)}</div>
                                <div>{t("table.amount")}: {amountFormat(nft.amount, { tooltip: 'right' })} (≈{convertedAmount(nft, sortCurrency)})</div>
                                {!xahauNetwork &&
                                  <>
                                    <div>{t("table.taxon")}: {nft.nftoken.nftokenTaxon}</div>
                                    <div>{t("table.serial")}: {nft.nftoken.sequence}</div>
                                  </>
                                }
                                <div>{t("table.transaction")}: <a href={"/explorer/" + nft.acceptedTxHash}>{shortHash(nft.acceptedTxHash)} <LinkIcon /></a></div>
                                {saleTab !== "primary" && <div>{t("table.seller")}: {nftLink(nft, 'seller', { address: 'short' })}</div>}
                                <div>{t("table.buyer")}: {nftLink(nft, 'buyer', { address: 'short' })}</div>
                                {!issuer && <div>{t("table.issuer")}: {nftLink(nft.nftoken, 'issuer', { address: 'short' })}</div>}
                              </td>
                            </tr>
                          )
                          :
                          <tr><td colSpan="100" className='center orange bold'>{errorMessage}</td></tr>
                        }
                      </>
                    }
                  </tbody>
                </table>
              }
            </>
          }
          {activeView === "tiles" &&
            <>
              {loading ?
                <div className='center' style={{ marginTop: "20px" }}>
                  <span className="waiting"></span>
                  <br />{t("general.loading")}
                </div>
                :
                <>
                  {errorMessage ?
                    <div className='center orange bold'>{errorMessage}</div>
                    :
                    <Tiles nftList={sales} type={order} convertCurrency={sortCurrency} account={account} />
                  }
                </>
              }
            </>
          }
        </InfiniteScroll>
      </div>
    </div>
  </>
}

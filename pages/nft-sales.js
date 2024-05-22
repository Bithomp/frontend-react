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

import { IoMdClose } from "react-icons/io";
import { BsFilter } from "react-icons/bs";

import { stripText, isAddressOrUsername, setTabParams, useWidth } from '../utils'
import { isValidTaxon, nftThumbnail, nftNameLink } from '../utils/nft'
import {
  amountFormat,
  convertedAmount,
  nftLink,
  usernameOrAddress,
  timeOrDate,
  fullDateAndTime,
  niceNumber
} from '../utils/format'

export const getServerSideProps = async ({ query, locale }) => {
  const {
    view,
    sale,
    list,
    currency,
    currencyIssuer,
    issuer,
    taxon,
    period,
    sortCurrency,
    marketplace,
    buyer,
    seller,
    search
  } = query
  //key added to re-render page when the same route is called with different params
  return {
    props: {
      key: Math.random(),
      view: view || "tiles",
      sale: sale || "all",
      list: list || "top",
      currency: currency || "",
      currencyIssuer: currencyIssuer || "",
      issuerQuery: issuer || "",
      taxonQuery: taxon || "",
      periodQuery: period || "week",
      sortCurrencyQuery: sortCurrency || "",
      marketplace: marketplace || "",
      buyerQuery: buyer || "",
      sellerQuery: seller || "",
      searchQuery: search || "",
      ...(await serverSideTranslations(locale, ['common'])),
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
  view,
  sale,
  list,
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
  searchQuery
}) {
  const { t } = useTranslation()
  const router = useRouter()
  const windowWidth = useWidth()

  const [rendered, setRendered] = useState(false)
  const [data, setData] = useState(null)
  const [sales, setSales] = useState([])
  const [viewTab, setViewTab] = useState(view)
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")
  const [saleTab, setSaleTab] = useState(sale)
  const [issuer, setIssuer] = useState(issuerQuery)
  const [taxon, setTaxon] = useState(taxonQuery)
  const [total, setTotal] = useState({})
  const [period, setPeriod] = useState(periodQuery)
  const [pageTab, setPageTab] = useState(list)
  const [hasMore, setHasMore] = useState("first")
  const [buyer, setBuyer] = useState(buyerQuery)
  const [seller, setSeller] = useState(sellerQuery)
  const [filtersHide, setFiltersHide] = useState(false)
  const [nftCount, setNftCount] = useState(null)
  const [dateAndTimeNow, setDateAndTimeNow] = useState('')
  const [search, setSearch] = useState(searchQuery)

  const controller = new AbortController()

  const sortCurrency = sortCurrencyQuery.toLowerCase() || selectedCurrency

  useEffect(() => {
    const date = new Date(Date.now()).toLocaleDateString([], { year: 'numeric', month: 'short', day: '2-digit' })
    const time = new Date(Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
    setDateAndTimeNow(date + ' at ' + time)
    setRendered(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const viewTabList = [
    { value: 'tiles', label: t("tabs.tiles") },
    { value: 'list', label: t("tabs.list") }
  ]

  const saleTabList = [
    { value: 'all', label: t("tabs.primaryAndSecondary-sales") },
    { value: 'secondary', label: (t("tabs.secondary-sales") + (total?.secondary ? (" (" + total.secondary + ")") : "")) },
    { value: 'primary', label: (t("tabs.primary-sales") + (total?.primary ? (" (" + total.primary + ")") : "")) }
  ]

  const pageTabList = [
    { value: 'top', label: t("tabs.top-sales") },
    { value: 'last', label: t("tabs.latest-sales") }
  ]

  const checkApi = async (options) => {
    if (!period || !sortCurrency) return

    let marker = hasMore
    let salesData = sales
    let markerUrlPart = ''
    let periodUrlPart = ''
    let marketplaceUrlPart = ''
    let buyerUrlPart = ''
    let sellerUrlPart = ''
    let searchPart = ''

    if (options?.restart) {
      marker = "first"
      setHasMore("first")
      setData(null)
      setSales([])
      salesData = []
      setLoading(true)
      scrollTop()
    }

    if (!marker || (marker === "first" && salesData.length)) {
      return;
    }

    if (marketplace) {
      marketplaceUrlPart = '&marketplace=' + marketplace
    }

    if (period) {
      periodUrlPart = '&period=' + period
    }

    let collectionUrlPart = ''
    if (issuer) {
      collectionUrlPart = '&issuer=' + issuer
      if (taxon) {
        collectionUrlPart += '&taxon=' + taxon
      }
    }

    if (buyer) {
      buyerUrlPart += '&buyer=' + buyer
    }
    if (seller) {
      sellerUrlPart += '&seller=' + seller
    }

    let loadList = "topSold"
    if (pageTab === 'last') {
      loadList = "lastSold"
    }

    if (marker && marker !== "first") {
      markerUrlPart = "&marker=" + marker
    }
    if (marker === "first") {
      setLoading(true)
    }

    if (search) {
      searchPart = '&search=' + search + '&searchLocations=metadata.name'
      //'&searchLocations=metadata.name,metadata.description'
      if (search.length < 3) {
        setErrorMessage(t("error-api.search is too short"))
        setLoading(false)
        return
      }
    }

    const response = await axios(
      'v2/nft-sales?list=' + loadList + currencyUrlPart() + '&saleType=' + saleTab + collectionUrlPart + periodUrlPart + markerUrlPart
      + "&convertCurrencies=" + sortCurrency + "&sortCurrency=" + sortCurrency + marketplaceUrlPart + buyerUrlPart + sellerUrlPart + searchPart,
      {
        signal: controller.signal
      }
    ).catch(error => {
      setErrorMessage(t("error." + error.message))
    })

    const newdata = response?.data
    setLoading(false)

    if (newdata) {
      setData(newdata)
      if (newdata.issuer || newdata.owner) {
        setTotal(newdata.total)
      } else {
        setTotal({})
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
            newdata.sales[i].localDate = fullDateAndTime(newdata.sales[i].acceptedAt)
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

      setNftCount(newdata.sales.length + salesData.length);
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
  }, [saleTab, issuer, taxon, pageTab, sortCurrency, period, buyer, seller, search])

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

    setTabParams(router, [
      {
        tabList: saleTabList,
        tab: saleTab,
        defaultTab: "all",
        setTab: setSaleTab,
        paramName: "sale"
      },
      {
        tabList: viewTabList,
        tab: viewTab,
        defaultTab: "tiles",
        setTab: setViewTab,
        paramName: "view"
      },
      {
        tabList: pageTabList,
        tab: pageTab,
        defaultTab: "top",
        setTab: setPageTab,
        paramName: "list"
      }
    ],
      queryAddList,
      queryRemoveList
    )

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewTab, saleTab, data, currency, currencyIssuer, pageTab, period])

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

  const issuerTaxonUrlPart = (data && issuer) ? ("&issuer=" + usernameOrAddress(data, 'issuer') + (taxon ? ("&taxon=" + taxon) : "")) : "";

  const currencyUrlPart = () => {
    if (!currency) return ""

    if (currency.toLowerCase() === 'xrp') {
      return "&currency=xrp";
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
    filtersHide
      ? document.body.classList.add('is-filters-hide')
      : document.body.classList.remove('is-filters-hide');
  }, [filtersHide]);

  const scrollTop = () => {
    if (window) {
      window.scrollTo({
        top: 0
      })
    }
  }

  return <>
    <SEO
      title={
        'NFT '
        + (saleTab === 'secondary' ? t("tabs.secondary-sales") : "")
        + (saleTab === 'primary' ? t("tabs.primary-sales") : "")
        + " " + (list === "top" ? t("tabs.top-sales") : t("tabs.latest-sales"))
        + (issuer ? (" " + issuer) : issuerQuery)
        + (buyer ? (" " + t("tabs.buyer") + ": " + buyer) : buyerQuery)
        + (seller ? (" " + t("tabs.seller") + ": " + seller) : sellerQuery)
        + (taxon ? (" " + taxon) : taxonQuery)
        + (currency ? (" " + currency) : "")
        + (currencyIssuer ? (" " + currencyIssuer) : "")
        + (viewTab === "list" ? (" " + t("tabs.list")) : "")
        + (period ? (" " + period) : "")
        + (search || searchQuery ? (", " + t("table.name") + ": " + (search || searchQuery)) : "")
      }
      description={issuer || issuerQuery || search || t("nft-sales.header")}
    />

    <h1 className="center">{t("nft-sales.header")}</h1>
    <p className='center'>
      <Link href={"/nft-explorer?view=" + viewTab + issuerTaxonUrlPart}>{t("nft-explorer.header")}</Link>
    </p>

    <div className="content-cols">
      <div className="filters">
        <div className="filters__box">
          <button className='filters__toggle' onClick={() => toggleFilters()}>
            <BsFilter />
          </button>
          <div className="filters__wrap">
            <div className="filters__head">
              <span>{t("table.result")}: <i>{nftCount}</i></span>
              {rendered &&
                <CSVLink
                  data={data ? data.sales : []}
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
            <FormInput
              title={t("table.taxon")}
              placeholder={t("nfts.search-by-taxon")}
              setValue={onTaxonInput}
              disabled={issuer ? false : true}
              defaultValue={data?.taxon}
            />
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

            {windowWidth < 720 && <br />}
            {t("table.period")}
            {windowWidth < 720 && <br />}

            <DateAndTimeRange
              period={period}
              setPeriod={setPeriod}
              defaultPeriod={periodQuery}
              minDate="nft"
              radio={true}
            />

            <div>
              {t("table.view")}
              <RadioOptions tabList={pageTabList} tab={pageTab} setTab={setPageTab} name='page' />
            </div>

            <div>
              {t("table.view")}
              <RadioOptions tabList={viewTabList} tab={viewTab} setTab={setViewTab} name='view' />
            </div>

            <div>
              {t("table.view")}
              <RadioOptions tabList={saleTabList} tab={saleTab} setTab={setSaleTab} name='sale' />
            </div>
          </div>
        </div>
      </div>
      <div className="content-text" style={{ minHeight: "480px" }}>

        <InfiniteScroll
          dataLength={sales.length}
          next={checkApi}
          hasMore={hasMore}
          loader={!errorMessage &&
            <p className="center">{t("nft-sales.load-more")}</p>
          }
          endMessage={<p className="center">{t("nft-sales.end")}</p>}
        >
          {viewTab === "list" &&
            <table className="table-large table-large--without-border">
              <thead>
                <tr>
                  <th className='center'>{t("table.index")}</th>
                  <th className='center'>{t("table.sold")}</th>
                  <th>{t("table.amount")} ({sortCurrency?.toUpperCase()})</th>
                  <th>{t("table.amount")}</th>
                  <th>NFT</th>
                  <th className='center hide-on-mobile'>{t("table.taxon")}</th>
                  <th className='center hide-on-mobile'>{t("table.serial")}</th>
                  <th className='hide-on-mobile'>{t("table.transaction")}</th>
                  {saleTab !== "primary" && <th className='hide-on-mobile right'>{t("table.seller")}</th>}
                  <th className='hide-on-mobile right'>{t("table.buyer")}</th>
                  {!issuer && <th className='hide-on-mobile right'>{t("table.issuer")}</th>}
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
                          <td className='center hide-on-mobile'>{nft.nftoken.nftokenTaxon}</td>
                          <td className='center hide-on-mobile'>{nft.nftoken.sequence}</td>
                          <td className='center hide-on-mobile'><a href={"/explorer/" + nft.acceptedTxHash}><LinkIcon /></a></td>
                          {saleTab !== "primary" && <td className='right hide-on-mobile'>{nftLink(nft, 'seller', { address: 'short' })}</td>}
                          <td className='right hide-on-mobile'>{nftLink(nft, 'buyer', { address: 'short' })}</td>
                          {!issuer && <td className='right hide-on-mobile'>{nftLink(nft.nftoken, 'issuer', { address: 'short' })}</td>}
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
          {viewTab === "tiles" &&
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
                    <Tiles nftList={sales} type={pageTab} convertCurrency={sortCurrency} account={account} />
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

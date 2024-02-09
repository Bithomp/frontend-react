import { useTranslation } from 'next-i18next'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import axios from 'axios'
import { CSVLink } from "react-csv"
import InfiniteScroll from 'react-infinite-scroll-component'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import Link from 'next/link'

import { stripText, isAddressOrUsername, setTabParams, useWidth } from '../utils'
import { isValidTaxon, nftThumbnail, nftNameLink } from '../utils/nft'
import {
  amountFormat,
  convertedAmount,
  nftLink,
  userOrServiceLink,
  usernameOrAddress,
  timeOrDate
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
    marketplace
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
      periodNameQuery: period || "week",
      sortCurrencyQuery: sortCurrency || "",
      marketplace: marketplace || "",
      ...(await serverSideTranslations(locale, ['common'])),
    },
  }
}

import SEO from '../components/SEO'
import Tabs from '../components/Tabs'
import Tiles from '../components/Tiles'
import DateAndTimeRange from '../components/UI/DateAndTimeRange'

import LinkIcon from "../public/images/link.svg"
import DownloadIcon from "../public/images/download.svg"

export default function NftSales({
  view,
  sale,
  list,
  currency,
  currencyIssuer,
  issuerQuery,
  taxonQuery,
  periodNameQuery,
  sortCurrencyQuery,
  selectedCurrency,
  marketplace,
  account
}) {
  const { t } = useTranslation()
  const router = useRouter()
  const windowWidth = useWidth()

  const [rendered, setRendered] = useState(false)
  const [data, setData] = useState(null);
  const [sales, setSales] = useState([]);
  const [viewTab, setViewTab] = useState(view)
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")
  const [saleTab, setSaleTab] = useState(sale)
  const [issuer, setIssuer] = useState(issuerQuery)
  const [taxon, setTaxon] = useState(taxonQuery)
  const [issuerInput, setIssuerInput] = useState(issuerQuery)
  const [taxonInput, setTaxonInput] = useState(taxonQuery)
  const [total, setTotal] = useState({})
  const [period, setPeriod] = useState("")
  const [pageTab, setPageTab] = useState(list)
  const [hasMore, setHasMore] = useState("first")
  const [dateAndTimeNow, setDateAndTimeNow] = useState('')

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
    if (!period) return

    let marker = hasMore;
    let salesData = sales;
    let markerUrlPart = '';
    let periodUrlPart = '';
    let marketplaceUrlPart = '';

    if (options?.restart) {
      marker = "first";
      setHasMore("first");
      setData(null);
      setSales([]);
      salesData = [];
      setLoading(true);
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

    const response = await axios(
      'v2/nft-sales?list=' + loadList + currencyUrlPart() + '&saleType=' + saleTab + collectionUrlPart + periodUrlPart + markerUrlPart
      + "&convertCurrencies=" + sortCurrency + "&sortCurrency=" + sortCurrency + marketplaceUrlPart
    ).catch(error => {
      setErrorMessage(t("error." + error.message))
    })

    const newdata = response.data
    setLoading(false)

    if (newdata) {
      setData(newdata)
      if (newdata.issuer || newdata.owner) {
        setTotal(newdata.total)
      } else {
        setTotal({})
      }

      if (newdata.issuer) {
        setIssuerInput(newdata.issuer)
      }

      if (newdata.sales) {
        if (newdata.sales.length > 0) {
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
    }
  }

  useEffect(() => {
    if (sortCurrency) {
      checkApi({ restart: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saleTab, issuer, taxon, pageTab, sortCurrency, period])

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

    if (period) {
      queryAddList.push({ name: "period", value: period })
    }

    if (!currency || (currency.toLowerCase() !== 'xrp' && !isAddressOrUsername(currencyIssuer))) {
      queryRemoveList.push("currency")
      queryRemoveList.push("currencyIssuer")
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

  const searchClick = () => {
    if (isAddressOrUsername(issuerInput)) {
      setIssuer(issuerInput);
      if (isValidTaxon(taxonInput)) {
        setTaxon(taxonInput);
      } else {
        setTaxonInput("");
        setTaxon("");
      }
    } else {
      setIssuerInput("");
      setIssuer("");
      setTaxonInput("");
      setTaxon("");
    }
  }

  const enterPress = e => {
    if (e.key === 'Enter') {
      searchClick();
    }
  }

  const onTaxonInput = (e) => {
    if (!/^\d+$/.test(e.key)) {
      e.preventDefault();
    }
    enterPress(e);
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
    { label: t("table.accepted"), key: "acceptedAt" },
    { label: (t("table.amount") + " (" + sortCurrency + ")"), key: "amountInConvertCurrencies." + sortCurrency },
    { label: (t("table.amount") + " (drops)"), key: "amount" },
    { label: t("table.name"), key: "nftoken.metadata.name" },
    { label: t("table.taxon"), key: "nftoken.nftokenTaxon" },
    { label: t("table.serial"), key: "nftoken.sequence" },
    { label: "NFT", key: "nftoken.nftokenID" },
    { label: "NFT", key: "nftoken.uriTokenID" },
    { label: t("table.transaction"), key: "acceptedTxHash" },
    { label: t("table.buyer"), key: "buyer" },
    { label: t("table.seller"), key: "seller" },
    { label: t("table.broker"), key: "broker" },
    { label: t("table.sales"), key: "saleType" },
    { label: t("table.marketplace"), key: "marketplace" }
  ]

  return <>
    <SEO
      title={
        'NFT '
        + (saleTab === 'secondary' ? t("tabs.secondary-sales") : "")
        + (saleTab === 'primary' ? t("tabs.primary-sales") : "")
        + " " + (list === "top" ? t("tabs.top-sales") : t("tabs.latest-sales"))
        + (issuer ? (" " + issuer) : issuerQuery)
        + (taxon ? (" " + taxon) : taxonQuery)
        + (currency ? (" " + currency) : "")
        + (currencyIssuer ? (" " + currencyIssuer) : "")
        + (viewTab === "list" ? (" " + t("tabs.list")) : "")
        + (period ? (" " + period) : "")
      }
    />
    <div className="content-text" style={{ minHeight: "480px" }}>
      <h1 className="center">{t("nft-sales.header")}</h1>
      <p className='center'>
        <Link href={"/nft-explorer?view=" + viewTab + issuerTaxonUrlPart}>{t("nft-explorer.header")}</Link>
      </p>
      <div className='center'>
        <span className='halv'>
          <span className='input-title'>
            {t("table.issuer")} {userOrServiceLink(data, 'issuer')}
          </span>
          <input
            placeholder={t("nfts.search-by-issuer")}
            value={issuerInput}
            onChange={(e) => { setIssuerInput(e.target.value) }}
            onKeyPress={enterPress}
            className="input-text"
            spellCheck="false"
            maxLength="35"
          />
        </span>
        <span className='halv'>
          <span className='input-title'>
            {t("table.taxon")}
          </span>
          <input
            placeholder={t("nfts.search-by-taxon")}
            value={taxonInput}
            onChange={(e) => { setTaxonInput(e.target.value) }}
            onKeyPress={onTaxonInput}
            className="input-text"
            spellCheck="false"
            maxLength="35"
            disabled={issuerInput ? false : true}
          />
        </span>
      </div>
      <p className="center" style={{ marginBottom: "20px" }}>
        <input type="button" className="button-action" value={t("button.search")} onClick={searchClick} />
      </p>
      <div className='tabs-inline'>

        {windowWidth < 720 && <br />}
        {t("table.period")}
        {windowWidth < 720 && <br />}

        <DateAndTimeRange
          period={period}
          setPeriod={setPeriod}
          defaultPeriodName={periodNameQuery}
          minDate="nft"
          tabs={true}
        />

        <br />

        <Tabs tabList={pageTabList} tab={pageTab} setTab={setPageTab} name="page" />
        <Tabs tabList={viewTabList} tab={viewTab} setTab={setViewTab} name="view" />
        <Tabs tabList={saleTabList} tab={saleTab} setTab={setSaleTab} name="sale" />
        {rendered &&
          <CSVLink
            data={sales}
            headers={csvHeaders}
            filename={'nft sales export ' + dateAndTimeNow + '.csv'}
            className={'button-action thin narrow' + (sales.length === 0 ? ' disabled' : '')}
            style={{ marginBottom: "15px" }}
            href="#"
          >
            <DownloadIcon /> CSV
          </CSVLink>
        }
      </div>

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
          <table className="table-large">
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
    </div >
  </>
}

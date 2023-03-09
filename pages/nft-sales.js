import { useTranslation } from 'next-i18next'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import axios from 'axios'
import { CSVLink } from "react-csv"
import InfiniteScroll from 'react-infinite-scroll-component'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'

import { stripText, isAddressOrUsername, setTabParams, addAndRemoveQueryParams } from '../utils'
import { isValidTaxon, nftThumbnail, nftNameLink } from '../utils/nft'
import { amountFormat, nftLink, userOrServiceLink, usernameOrAddress, timeOrDate } from '../utils/format'

export const getServerSideProps = async ({ query, locale }) => {
  const { view, sale, list, currency, currencyIssuer, issuer, taxon, period } = query
  return {
    props: {
      view: view || "tiles",
      sale: sale || "all",
      list: list || "top",
      currency: currency || "xrp",
      currencyIssuer: currencyIssuer || "",
      issuerQuery: issuer || "",
      taxonQuery: taxon || "",
      period: period || "all",
      ...(await serverSideTranslations(locale, ['common'])),
    },
  }
}

import SEO from '../components/SEO'
import Tabs from '../components/Tabs'
import Tiles from '../components/Tiles'

import LinkIcon from "../public/images/link.svg"

export default function NftSales({ view, sale, list, currency, currencyIssuer, issuerQuery, taxonQuery, period }) {
  const { t } = useTranslation();
  const router = useRouter()

  const [data, setData] = useState(null);
  const [sales, setSales] = useState([]);
  const [viewTab, setViewTab] = useState(view);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [saleTab, setSaleTab] = useState(sale);
  const [issuer, setIssuer] = useState(issuerQuery);
  const [taxon, setTaxon] = useState(taxonQuery);
  const [issuerInput, setIssuerInput] = useState(issuerQuery);
  const [taxonInput, setTaxonInput] = useState(taxonQuery);
  const [total, setTotal] = useState({});
  const [periodTab, setPeriodTab] = useState(period);
  const [pageTab, setPageTab] = useState(list);
  const [hasMore, setHasMore] = useState("first");
  const [dateAndTimeNow, setDateAndTimeNow] = useState('')
  const [rendered, setRendered] = useState(false)

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
  ];

  const saleTabList = [
    { value: 'all', label: t("tabs.all-sales") },
    { value: 'secondary', label: (t("tabs.secondary-sales") + (total?.secondary ? (" (" + total.secondary + ")") : "")) },
    { value: 'primary', label: (t("tabs.primary-sales") + (total?.primary ? (" (" + total.primary + ")") : "")) }
  ];

  const pageTabList = [
    { value: 'top', label: t("tabs.top-sales") },
    { value: 'last', label: t("tabs.latest-sales") }
  ];

  const periodTabList = [
    { value: 'all', label: t("tabs.all-time") },
    //{ value: 'year', label: t("tabs.year") },
    { value: 'month', label: t("tabs.month") },
    { value: 'week', label: t("tabs.week") },
    { value: 'day', label: t("tabs.day") }
  ];

  const checkApi = async (options) => {
    let marker = hasMore;
    let salesData = sales;
    let markerUrlPart = '';
    let periodUrlPart = '';

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

    if (periodTab) {
      periodUrlPart = '&period=' + periodTab;
    }

    let collectionUrlPart = '';
    if (issuer) {
      collectionUrlPart = '&issuer=' + issuer;
      if (taxon) {
        collectionUrlPart += '&taxon=' + taxon;
      }
    }

    let loadList = "topSold";
    if (pageTab === 'last') {
      loadList = "lastSold";
    }

    if (marker && marker !== "first") {
      markerUrlPart = "&marker=" + marker;
    }
    if (marker === "first") {
      setLoading(true);
    }

    const response = await axios('v2/nft-sales?list=' + loadList + currencyUrlPart() + '&saleType=' + saleTab + collectionUrlPart + periodUrlPart + markerUrlPart).catch(error => {
      setErrorMessage(t("error." + error.message));
    });

    const newdata = response.data;
    setLoading(false);

    if (newdata) {
      setData(newdata);
      if (newdata.issuer || newdata.owner) {
        setTotal(newdata.total);
      } else {
        setTotal({});
      }

      if (newdata.issuer) {
        setIssuerInput(newdata.issuer);
      }

      if (newdata.sales) {
        if (newdata.sales.length > 0) {
          setErrorMessage("");
          if (newdata.marker) {
            setHasMore(newdata.marker);
          } else {
            setHasMore(false);
          }
          setSales([...salesData, ...newdata.sales]);
        } else {
          if (marker === 'first') {
            setErrorMessage(t("general.no-data"));
          } else {
            setHasMore(false);
          }
        }
      } else {
        if (newdata.error) {
          setErrorMessage(t("error-api." + newdata.error))
        } else {
          setErrorMessage("Error");
          console.log(newdata);
        }
      }
    }
  }

  useEffect(() => {
    checkApi({ restart: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saleTab, issuer, taxon, periodTab, pageTab]);

  useEffect(() => {
    let queryAddList = [];
    let queryRemoveList = [];
    if (isAddressOrUsername(data?.issuer)) {
      queryAddList.push({
        name: "issuer",
        value: usernameOrAddress(data, 'issuer')
      })
      if (isValidTaxon(data?.taxon)) {
        queryAddList.push({ name: "taxon", value: data.taxon })
      } else {
        queryRemoveList.push("taxon");
      }
    } else {
      queryRemoveList.push("issuer");
      queryRemoveList.push("taxon");
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
        tabList: periodTabList,
        tab: periodTab,
        defaultTab: "all",
        setTab: setPeriodTab,
        paramName: "period"
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

    addAndRemoveQueryParams(router, queryAddList, queryRemoveList)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewTab, saleTab, data, periodTab, currency, currencyIssuer, pageTab]);

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
    if (!currency) {
      if (pageTab === 'last') return "";
      if (pageTab === 'top') return "&currency=xrp";
    }

    if (currency.toLowerCase() === 'xrp') {
      return "&currency=xrp";
    } else {
      if (isAddressOrUsername(currencyIssuer)) {
        return '&currency=' + stripText(currency) + "&currencyIssuer=" + stripText(currencyIssuer);
      }
    }
    return "";
  }

  let csvHeaders = [
    { label: t("table.accepted"), key: "acceptedAt" },
    { label: (t("table.amount") + " (drops)"), key: "amount" },
    { label: t("table.name"), key: "nftoken.metadata.name" },
    { label: t("table.taxon"), key: "nftoken.nftokenTaxon" },
    { label: t("table.serial"), key: "nftoken.sequence" },
    { label: "NFT", key: "nftoken.nftokenID" },
    { label: t("table.transaction"), key: "acceptedTxHash" },
    { label: t("table.buyer"), key: "buyer" },
    { label: t("table.seller"), key: "seller" },
    { label: t("table.broker"), key: "broker" },
    { label: t("table.sales"), key: "saleType" }
  ];

  return <>
    <SEO title={t("nft-sales.header")} />
    <div className="content-text" style={{ minHeight: "480px" }}>
      <h2 className="center">{t("nft-sales.header") + " "}</h2>
      <p className='center'><a href={"/nft-explorer?view=" + viewTab + issuerTaxonUrlPart}>{t("nft-explorer.header")}</a></p>
      <div className='center'>
        <span className='halv'>
          <span className='input-title'>{t("table.issuer")} {userOrServiceLink(data, 'issuer')}</span>
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
          <span className='input-title'>{t("table.taxon")}</span>
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
        <Tabs tabList={pageTabList} tab={pageTab} setTab={setPageTab} name="page" />
        <Tabs tabList={viewTabList} tab={viewTab} setTab={setViewTab} name="view" />
        <Tabs tabList={periodTabList} tab={periodTab} setTab={setPeriodTab} name="period" />
        <Tabs tabList={saleTabList} tab={saleTab} setTab={setSaleTab} name="sale" />
        {rendered &&
          < CSVLink
            data={sales}
            headers={csvHeaders}
            filename={'nft sales export ' + dateAndTimeNow + '.csv'}
            className={'button-action thin narrow' + (sales.length === 0 ? ' disabled' : '')}
            style={{ marginBottom: "15px" }}
            href="#"
          >
            ⇩ CSV
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
                  <Tiles nftList={sales} type={pageTab} />
                }
              </>
            }
          </>
        }
      </InfiniteScroll>
    </div >
  </>;
};

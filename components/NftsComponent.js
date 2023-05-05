import { useTranslation } from 'next-i18next'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { CSVLink } from "react-csv"
import axios from 'axios'
import InfiniteScroll from 'react-infinite-scroll-component'
import Link from 'next/link'

import { isAddressOrUsername, setTabParams, addQueryParams, removeQueryParams } from '../utils';
import { isValidTaxon, nftThumbnail, nftNameLink, bestSellOffer, mpUrl } from '../utils/nft';
import { nftLink, usernameOrAddress, userOrServiceLink, amountFormat } from '../utils/format';

import SEO from './SEO';
import SearchBlock from './Layout/SearchBlock';
import Tabs from './Tabs';
import Tiles from './Tiles';
import IssuerSelect from './UI/IssuerSelect';

export default function NftsComponent({ 
  view, 
  list, 
  saleDestination, 
  saleCurrency, 
  saleCurrencyIssuer, 
  searchQuery, 
  issuerQuery, 
  ownerQuery, 
  taxonQuery,
  nftExplorer
}) {
  const { t } = useTranslation();
  const router = useRouter()
  const { id } = router.query

  const [rendered, setRendered] = useState(false)
  const [data, setData] = useState([]);
  const [rawData, setRawData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState("first");
  const [errorMessage, setErrorMessage] = useState("");
  const [viewTab, setViewTab] = useState(view);
  const [listTab, setListTab] = useState(list);
  const [saleDestinationTab, setSaleDestinationTab] = useState(saleDestination);
  const [search, setSearch] = useState(searchQuery);
  const [filteredData, setFilteredData] = useState([]);
  const [userData, setUserData] = useState({});
  const [issuersList, setIssuersList] = useState([]);
  const [issuer, setIssuer] = useState(issuerQuery);
  const [owner, setOwner] = useState(ownerQuery);
  const [taxon, setTaxon] = useState(taxonQuery)
  const [issuerInput, setIssuerInput] = useState(issuerQuery);
  const [ownerInput, setOwnerInput] = useState(ownerQuery);
  const [taxonInput, setTaxonInput] = useState(taxonQuery);

  useEffect(() => {
    setRendered(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const viewTabList = [
    { value: 'tiles', label: t("tabs.tiles") },
    { value: 'list', label: t("tabs.list") }
  ];

  const listTabList = [
    { value: 'nfts', label: t("tabs.all") },
    { value: 'onSale', label: t("tabs.onSale") }
  ];

  const saleDestinationTabList = [
    { value: 'publicAndKnownBrokers', label: t("tabs.publicAndKnownBrokers") },
    { value: 'public', label: t("tabs.public") }
  ];

  const checkApi = async (options) => {
    let marker = hasMore;
    let nftsData = data;
    if (options?.restart) {
      marker = "first";
      setHasMore("first");
      setLoading(true);
      setData([]);
      nftsData = [];
    }

    if (!(isAddressOrUsername(id) || isAddressOrUsername(issuer) || isAddressOrUsername(owner)) || !marker || (marker === "first" && nftsData.length)) {
      return;
    }

    let listUrlPart = '?list=nfts';
    let ownerUrlPart = '';
    let collectionUrlPart = '';
    let markerUrlPart = '';

    if (listTab === 'onSale') {
      //order: "offerCreatedNew", "offerCreatedOld", "priceLow", "priceHigh"
      //destination: "public", "knownBrokers", "publicAndKnownBrokers", "all"
      listUrlPart = '?list=onSale&destination=' + saleDestinationTab + '&order=priceLow';
      if (saleCurrencyIssuer && saleCurrency) {
        listUrlPart = listUrlPart + '&currency=' + saleCurrency + '&currencyIssuer=' + saleCurrencyIssuer;
      } else {
        listUrlPart = listUrlPart + '&currency=xrp';
      }
    }

    if (id || owner) {
      ownerUrlPart = '&owner=' + (id || owner);
      const issuersJson = await axios('v2/nft-issuers?owner=' + (id || owner)).catch(error => {
        console.log(t("error." + error.message))
      });
      if (issuersJson?.data?.issuers) {
        setIssuersList(issuersJson.data.issuers);
      }
    }

    if (issuer) {
      collectionUrlPart = '&issuer=' + issuer;
      if (taxon) {
        collectionUrlPart += '&taxon=' + taxon;
      }
    }

    if (marker && marker !== "first") {
      markerUrlPart = "&marker=" + marker;
    }
    if (marker === "first") {
      setLoading(true);
    }
    const response = await axios('v2/nfts' + listUrlPart + ownerUrlPart + collectionUrlPart + markerUrlPart).catch(error => {
      setErrorMessage(t("error." + error.message))
    });

    setLoading(false);
    const newdata = response?.data;
    if (newdata) {
      setRawData(newdata);
      if (newdata.owner || newdata.issuer) {

        if (newdata.issuer) {
          setIssuerInput(newdata.issuer);
        }

        if (newdata.owner) {
          setOwnerInput(newdata.owner);
          setUserData({
            username: newdata.ownerDetails?.username,
            service: newdata.ownerDetails?.service,
            address: newdata.owner
          });
        }

        if (newdata.nfts?.length > 0) {
          setErrorMessage("");
          if (newdata.marker) {
            setHasMore(newdata.marker);
          } else {
            setHasMore(false);
          }
          setData([...nftsData, ...newdata.nfts]);
        } else {
          if (marker === 'first') {
            setErrorMessage(t("nfts.no-nfts"));
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
    if (id || issuer || owner) {
      checkApi({ restart: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [issuer, taxon, owner, listTab, saleDestinationTab]);

  useEffect(() => {
    let queryAddList = [];
    let queryRemoveList = [];
    if (nftExplorer) {
      if (isAddressOrUsername(rawData?.owner)) {
        queryAddList.push({
          name: "owner",
          value: usernameOrAddress(rawData, 'owner')
        })
      } else {
        queryRemoveList.push("owner");
      }
    }

    if (isAddressOrUsername(rawData?.issuer)) {
      queryAddList.push({
        name: "issuer",
        value: usernameOrAddress(rawData, 'issuer')
      })
      if (isValidTaxon(rawData?.taxon)) {
        queryAddList.push({
          name: "taxon",
          value: rawData.taxon
        })
      } else {
        queryRemoveList.push("taxon")
      }
    } else {
      queryRemoveList.push("issuer")
      queryRemoveList.push("taxon")
    }

    let tabsToSet = [
      {
        tabList: listTabList,
        tab: listTab,
        defaultTab: "nfts",
        setTab: setListTab,
        paramName: "list"
      },
      {
        tabList: viewTabList,
        tab: viewTab,
        defaultTab: "tiles",
        setTab: setViewTab,
        paramName: "view"
      }
    ]

    if (listTab === 'onSale') {
      tabsToSet.push({
        tabList: saleDestinationTabList,
        tab: saleDestinationTab,
        defaultTab: "publicAndKnownBrokers",
        setTab: setSaleDestinationTab,
        paramName: "saleDestination"
      })
    } else {
      queryRemoveList.push("saleDestination");
      queryRemoveList.push("saleCurrency");
      queryRemoveList.push("saleCurrencyIssuer");
    }

    setTabParams(router, tabsToSet, queryAddList, queryRemoveList)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewTab, rawData, listTab, saleDestinationTab]);

  const onSearchChange = (e) => {
    let searchName = e.target.value;
    setSearch(searchName);
    if (searchName) {
      addQueryParams(router, [
        {
          name: "search",
          value: searchName
        }
      ])
    } else {
      removeQueryParams(router, ["search"])
    }
  }

  useEffect(() => {
    if (search) {
      const name = search.toLocaleLowerCase();
      setFilteredData(data.filter(nft => nft.metadata?.name?.toString().toLocaleLowerCase().includes(name)));
    } else {
      setFilteredData(data);
    }
  }, [data, search]);

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
    if (isAddressOrUsername(ownerInput)) {
      setOwner(ownerInput);
    } else {
      setOwnerInput("");
      setOwner("");
    }
  }

  const enterPress = e => {
    if (e.key === 'Enter') {
      searchClick()
    }
  }

  const onTaxonInput = e => {
    if (!/^\d+$/.test(e.key)) {
      e.preventDefault()
    }
    enterPress(e)
  }

  const issuerTaxonUrlPart = "?view=" + viewTab + (rawData ? ("&issuer=" + usernameOrAddress(rawData, 'issuer') + (rawData.taxon ? ("&taxon=" + rawData.taxon) : "")) : "");

  const contextStyle = { minHeight: "480px" };
  if (!nftExplorer) {
    contextStyle.marginTop = "20px";
  }

  /*
  {
    "issuer": "rJxrRzDLjdUiahyLUESuPPR6ucBCUWoMfw",
    "issuerDetails": {
      "username": "3DAPES",
      "service": "3DAPES"
    },
    "nfts": [
      {
        "flags": {
          "burnable": false,
          "onlyXRP": true,
          "trustLine": false,
          "transferable": true
        },
        "issuer": "rJxrRzDLjdUiahyLUESuPPR6ucBCUWoMfw",
        "nftokenID": "000A2134C4E16036D649C037D2DE7C58780DE1D985EEB9860003062600000000",
        "nftokenTaxon": 200637,
        "transferFee": 8500,
        "sequence": 0,
        "owner": "rw5ZYt7SecZ44QLe8Tz6dSYMRuLa8LHv6S",
        "uri": "68747470733A2F2F697066732E696F2F697066732F6261667962656963323779736F376C656C6534786277767464706F6E77716C6C766A68793667717A6C74666E673271357A6869717A61786F7A6B6D2F6D657461646174612E6A736F6E",
        "url": "https://cloudflare-ipfs.com/ipfs/bafybeic27yso7lele4xbwvtdponwqllvjhy6gqzltfng2q5zhiqzaxozkm/metadata.json",
        "nftSerial": 0,
        "issuerDetails": {
          "username": "3DAPES",
          "service": "3DAPES"
        },
        "ownerDetails": {
          "username": null,
          "service": null
        },
        "metadata": {
          "name": "Genesis Mint #001 - αlpha Ωmega"
        }
      },
  */

  const priceData = sellOffers => {
    if (!sellOffers) return "";
    const best = bestSellOffer(sellOffers);
    if (best) {
      if (mpUrl(best)) {
        return amountFormat(best.amount, { tooltip: 'right' }) + " " + t("nft.on") + " " + best.destinationDetails.service;
      } else {
        return amountFormat(best.amount, { tooltip: 'right' });
      }
    };
    return "Private offer"; //shouldn't be the case
  }

  let csvHeaders = [
    { label: "NFT ID", key: "nftokenID" },
    { label: t("table.issuer"), key: "issuer" },
    { label: t("table.taxon"), key: "nftokenTaxon" },
    { label: t("table.serial"), key: "sequence" },
    { label: t("table.name"), key: "metadata.name" }
  ];
  if (nftExplorer) {
    csvHeaders.push({ label: t("table.owner"), key: "owner" })
  }

  return <>
    {nftExplorer ?
      <SEO 
        title={t("nft-explorer.header") + (issuerQuery ? (" " + issuerQuery) : "")} 
      />
      :
      <>
        <SEO 
          title={t("nfts.header") + (id ? (" " + id) : "")}
        />
        <SearchBlock
          searchPlaceholderText={t("explorer.enter-address")}
          tab="nfts"
          userData={userData}
        />
      </>
    }

    <div className="content-text" style={contextStyle}>
      {nftExplorer && <>
        <h2 className='center'>{t("nft-explorer.header") + " "}</h2>
        <p className='center'>
          <Link href={"/nft-sales" + issuerTaxonUrlPart} style={{ marginRight: "5px" }}>{t("nft-sales.header")}</Link>
        </p>
        <div className='center'>
          <span className='halv'>
            <span className='input-title'>{t("table.issuer")} {userOrServiceLink(rawData, 'issuer')}</span>
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
        <div className='center'>
          <span className='halv'>
            <span className='input-title'>{t("table.owner")} {userOrServiceLink(rawData, 'owner')}</span>
            <input
              placeholder={t("nfts.search-by-owner")}
              value={ownerInput}
              onChange={(e) => { setOwnerInput(e.target.value) }}
              onKeyPress={enterPress}
              className="input-text"
              spellCheck="false"
              maxLength="35"
            />
          </span>
          <span className='halv'>
            <span className='input-title'>{t("table.name")}</span>
            <input
              placeholder={t("nfts.search-by-name")}
              value={search}
              onChange={onSearchChange}
              className="input-text"
              spellCheck="false"
              maxLength="18"
              disabled={(id || ownerInput || issuerInput) ? false : true}
            />
          </span>
        </div>
        <p className="center" style={{ marginBottom: "20px" }}>
          <input type="button" className="button-action" value={t("button.search")} onClick={searchClick} />
        </p>
      </>}
      <div className='tabs-inline'>
        <Tabs tabList={viewTabList} tab={viewTab} setTab={setViewTab} name='view' />
        <Tabs tabList={listTabList} tab={listTab} setTab={setListTab} name='saleType' />
        {listTab === 'onSale' &&
          <Tabs tabList={saleDestinationTabList} tab={saleDestinationTab} setTab={setSaleDestinationTab} name='saleDestination' />
        }
        {rendered &&
          <CSVLink
            data={data || []}
            headers={csvHeaders}
            filename='nfts_export.csv'
            className={'button-action thin narrow' + (!(data && data.length > 0) ? ' disabled' : '')}
          >
            ⇩ CSV
          </CSVLink>
        }
      </div>
      {(id || issuer || owner) ?
        <InfiniteScroll
          dataLength={filteredData.length}
          next={checkApi}
          hasMore={hasMore}
          loader={!errorMessage &&
            <p className="center">{t("nfts.load-more")}</p>
          }
          endMessage={<p className="center">{t("nfts.end")}</p>}
        // below props only if you need pull down functionality
        //refreshFunction={this.refresh}
        //pullDownToRefresh
        //pullDownToRefreshThreshold={50}
        //</>pullDownToRefreshContent={
        //  <h3 style={{ textAlign: 'center' }}>&#8595; Pull down to refresh</h3>
        //}
        //releaseToRefreshContent={
        //  <h3 style={{ textAlign: 'center' }}>&#8593; Release to refresh</h3>
        //}
        >
          {!nftExplorer &&
            <div className='center' style={{ marginBottom: "10px" }}>
              {rendered &&
                <IssuerSelect
                  issuersList={issuersList}
                  selectedIssuer={issuer}
                  setSelectedIssuer={setIssuer}
                />
              }
              <input
                placeholder={t("nfts.search-by-name")}
                value={search}
                onChange={onSearchChange}
                className="input-text halv"
                spellCheck="false"
                maxLength="18"
              />
            </div>
          }

          {viewTab === "list" &&
            <table className="table-large">
              <thead>
                <tr>
                  <th className='center'>{t("table.index")}</th>
                  <th>NFT</th>
                  <th className='center'>{t("table.serial")}</th>
                  {!taxon && <th className='center'>{t("table.taxon")}</th>}
                  {!issuer && <th className='center'>{t("table.issuer")}</th>}
                  {(!id && !owner) && <th className='right'>{t("table.owner")}</th>}
                  {listTab === 'onSale' && <th className='right'>{t("table.price")}</th>}
                </tr>
              </thead>
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
                    {!errorMessage ? filteredData.map((nft, i) =>
                      <tr key={nft.nftokenID}>
                        <td className="center">{i + 1}</td>
                        <td>{nftThumbnail(nft)} {nftNameLink(nft)}</td>
                        <td className='center'>{nft.sequence}</td>
                        {!taxon && <td className='center'>{nft.nftokenTaxon}</td>}
                        {!issuer && <td className='center'>{nftLink(nft, 'issuer')}</td>}
                        {(!id && !owner) && <td className='right'>{nftLink(nft, 'owner', { address: 'short' })}</td>}
                        {listTab === 'onSale' && <td className='right'>{priceData(nft.sellOffers)}</td>}
                      </tr>)
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
                    <Tiles nftList={filteredData} type={listTab === 'onSale' ? 'onSale' : 'name'} />
                  }
                </>
              }
            </>
          }
        </InfiniteScroll>
        :
        <>
          {!nftExplorer &&
            <>
              <h2 className='center'>{t("nfts.header")}</h2>
              <p className='center'>
                {t("nfts.desc")}
              </p>
            </>
          }
        </>
      }
    </div>
  </>;
};

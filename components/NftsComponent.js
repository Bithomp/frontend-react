import { useTranslation } from 'next-i18next'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { CSVLink } from "react-csv"
import axios from 'axios'
import InfiniteScroll from 'react-infinite-scroll-component'
import Link from 'next/link'

import { IoMdClose } from "react-icons/io";
import { BsFilter } from "react-icons/bs";

import { isAddressOrUsername, setTabParams, useWidth, xahauNetwork, capitalizeFirstLetter } from '../utils'
import {
  isValidTaxon,
  nftThumbnail,
  nftNameLink,
  bestNftOffer,
  mpUrl,
  partnerMarketplaces
} from '../utils/nft'
import {
  nftLink,
  usernameOrAddress,
  amountFormat,
  timeOrDate,
  fullDateAndTime
} from '../utils/format'

import SEO from './SEO'
import SearchBlock from './Layout/SearchBlock'
import Tiles from './Tiles'
import IssuerSelect from './UI/IssuerSelect'
import CheckBox from './UI/CheckBox'
import DateAndTimeRange from './UI/DateAndTimeRange'

import DownloadIcon from "../public/images/download.svg"
import RadioOptions from './UI/RadioOptions'
import FormInput from './UI/FormInput'
import AddressInput from './UI/AddressInput'
import ViewTogggle from './UI/ViewToggle'

export default function NftsComponent({
  listNftsOrder,
  view,
  list,
  saleDestination,
  saleCurrency,
  saleCurrencyIssuer,
  searchQuery,
  issuerQuery,
  ownerQuery,
  taxonQuery,
  serialQuery,
  nftExplorer,
  mintedByMarketplace,
  mintedPeriodQuery,
  burnedPeriod,
  includeBurnedQuery,
  includeWithoutMediaDataQuery,
  id,
  account
}) {
  const { t } = useTranslation()
  const router = useRouter()
  const windowWidth = useWidth()

  const [rendered, setRendered] = useState(false)
  const [data, setData] = useState([])
  const [rawData, setRawData] = useState(null)
  const [filtersHide, setFiltersHide] = useState(false)
  const [loading, setLoading] = useState(false)
  const [hasMore, setHasMore] = useState("first")
  const [errorMessage, setErrorMessage] = useState("")
  const [listNftsOrderTab, setListNftsOrderTab] = useState(listNftsOrder)
  const [activeView, setActiveView] = useState(view)
  const [listTab, setListTab] = useState(list)
  const [saleDestinationTab, setSaleDestinationTab] = useState(saleDestination)
  const [userData, setUserData] = useState({})
  const [issuersList, setIssuersList] = useState([])
  const [issuer, setIssuer] = useState(issuerQuery)
  const [owner, setOwner] = useState(ownerQuery)
  const [taxon, setTaxon] = useState(taxonQuery)
  const [search, setSearch] = useState(searchQuery)
  const [includeBurned, setIncludeBurned] = useState(includeBurnedQuery)
  const [includeWithoutMediaData, setIncludeWithoutMediaData] = useState(includeWithoutMediaDataQuery)
  const [mintedPeriod, setMintedPeriod] = useState(mintedPeriodQuery)
  const [csvHeaders, setCsvHeaders] = useState([])
  const [nftCount, setNftCount] = useState(null)

  const controller = new AbortController()

  let csvHeadersConst = [
    { label: "NFT ID", key: "nftokenID" },
    { label: t("table.issuer"), key: "issuer" },
    { label: t("table.taxon"), key: "nftokenTaxon" },
    { label: t("table.serial"), key: "sequence" },
    { label: t("table.name"), key: "metadata.name" },
    { label: t("table.uri"), key: "url" }
  ]

  if (nftExplorer) {
    csvHeadersConst.push({ label: t("table.owner"), key: "owner" })
  }

  useEffect(() => {
    setRendered(true)
  }, [])

  const viewList = [
    { value: 'tiles', label: t("tabs.tiles") },
    { value: 'list', label: t("tabs.list") }
  ]

  const listTabList = [
    { value: 'nfts', label: t("tabs.all") },
    { value: 'onSale', label: t("tabs.onSale") }
  ]

  const saleDestinationTabList = [
    { value: 'buyNow', label: t("tabs.buyNow") },
    { value: 'publicAndKnownBrokers', label: t("tabs.publicAndKnownBrokers") }
  ]

  const listNftsOrderTabList = [
    { value: 'mintedNew', label: t("tabs.mintedNew") },
    { value: 'mintedOld', label: t("tabs.mintedOld") }
  ]

  const checkApi = async (options) => {
    if (nftExplorer && !mintedPeriod && listTab !== 'onSale') return
    if (!nftExplorer && !id && !owner) return

    let marker = hasMore;
    let nftsData = data;
    if (options?.restart) {
      marker = "first"
      setHasMore("first")
      setLoading(true)
      setData([])
      nftsData = []
      scrollTop()
    }

    // it seems not nessary anylonger, we just need to keep the structure of URI with "?"
    let listUrlPart = '?list=' + (xahauNetwork ? 'uritokens' : 'nfts')

    let ownerUrlPart = ''
    let collectionUrlPart = ''
    let markerUrlPart = ''
    let searchPart = ''
    let serialPart = ''
    let mintAndBurnPart = ''
    let orderPart = ''
    let includeBurnedPart = includeBurned ? '&includeDeleted=true' : ''
    let hasImagePart = !includeWithoutMediaData ? '&hasImage=true' : ''

    if (listTab === 'onSale') {
      //order: "offerCreatedNew", "offerCreatedOld", "priceLow", "priceHigh"
      //destination: "public", "knownBrokers", "publicAndKnownBrokers", "all", "buyNow"
      listUrlPart = '?list=onSale&destination=' + saleDestinationTab
      orderPart = '&order=priceLow'
      if (saleCurrencyIssuer && saleCurrency) {
        listUrlPart = listUrlPart + '&currency=' + saleCurrency + '&currencyIssuer=' + saleCurrencyIssuer
      } else {
        listUrlPart = listUrlPart + '&currency=xrp'
      }
    } else {
      orderPart = '&order=' + listNftsOrderTab
    }

    if (mintedByMarketplace) {
      mintAndBurnPart += '&mintedByMarketplace=' + mintedByMarketplace
    }

    if (burnedPeriod) {
      mintAndBurnPart += '&deletedAt=' + burnedPeriod
    }
    if (mintedPeriod) {
      mintAndBurnPart += '&issuedAt=' + mintedPeriod
    }

    const newOwner = id || owner
    if (newOwner) {
      ownerUrlPart = '&owner=' + newOwner
      if (rawData?.owner !== newOwner && rawData?.ownerDetails?.username?.toLowerCase() !== newOwner.toLowerCase()) {
        const issuersJson = await axios('v2/' + (xahauNetwork ? 'uritoken' : 'nft') + '-issuers?owner=' + newOwner).catch(error => {
          console.log(t("error." + error.message))
        })
        if (issuersJson?.data?.issuers) {
          setIssuersList(issuersJson.data.issuers)
        }
      }
    }

    if (issuer) {
      collectionUrlPart = '&issuer=' + issuer
      if (isValidTaxon(taxon)) {
        collectionUrlPart += '&taxon=' + taxon
      }
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

    if (serialQuery.match(/^-?\d+$/) && !xahauNetwork) {
      serialPart = '&serial=' + serialQuery
    }

    if (marker && marker !== "first") {
      markerUrlPart = "&marker=" + marker
    }
    if (marker === "first") {
      setLoading(true)
    }

    if (!ownerUrlPart && !collectionUrlPart && !searchPart && !serialPart && !mintAndBurnPart) {
      // reverse and show only with meta
      // on the first load when no params
      if (listTab === 'onSale') {
        orderPart = '&order=offerCreatedNew'
      }
    }

    const response = await axios(
      'v2/' + (xahauNetwork ? 'uritokens' : 'nfts') + listUrlPart + ownerUrlPart + collectionUrlPart + markerUrlPart +
      searchPart + serialPart + mintAndBurnPart + orderPart + hasImagePart + includeBurnedPart,
      {
        signal: controller.signal
      }
    ).catch(error => {
      setErrorMessage(t("error." + error.message))
    })

    setLoading(false)
    const newdata = response?.data

    if (newdata) {
      setRawData(newdata)
      if (newdata.error) {
        setErrorMessage(t("error-api." + newdata.error))
      } else {
        if (newdata.issuer) {
          if (isValidTaxon(newdata.taxon)) {
            setTaxon(newdata.taxon)
          } else {
            setTaxon("")
          }
        }

        if (newdata.owner) {
          setUserData({
            username: newdata.ownerDetails?.username,
            service: newdata.ownerDetails?.service,
            address: newdata.owner
          })
        } else {
          setUserData({})
        }

        let nftList = newdata.nfts
        if (xahauNetwork) {
          nftList = newdata.uritokens
        }

        let csvHeadersNew = []
        let keys = []
        let attributes = []
        let attributesHeaders = []

        //for CSV export
        if (nftList?.length > 0) {
          for (let i = 0; i < nftList.length; i++) {
            if (nftList[i].metadata) {
              Object.keys(nftList[i].metadata).forEach(function (key) {
                //remove escapes to fix the export
                //according to the CSV specs, to include double quotes within a string that is already quoted, you need to use two double quotes ("")
                if (typeof nftList[i].metadata[key] === 'string') {
                  nftList[i].metadata[key] = nftList[i].metadata[key].replace(/"/g, '""')
                }
                if (!keys.includes(key) && key.toLowerCase() !== 'name' && typeof nftList[i].metadata[key] === 'string') {
                  keys.push(key)
                  csvHeadersNew.push({ label: capitalizeFirstLetter(key), key: "metadata." + key })
                }
                if (key.toLowerCase() === "attributes") {
                  Object.keys(nftList[i].metadata[key]).forEach(function (attribute) {
                    //remove escapes for the export
                    if (typeof nftList[i].metadata[key][attribute]?.value === 'string') {
                      nftList[i].metadata[key][attribute] = nftList[i].metadata[key][attribute].value.replace(/"/g, '""')
                    }
                    if (!attributes.includes(attribute)) {
                      attributes.push(attribute)
                      attributesHeaders.push({ label: "Attribute " + nftList[i].metadata[key][attribute].trait_type, key: "metadata.attributes." + attribute + ".value" })
                    }
                  })
                }
              })
            }
          }
        }

        setCsvHeaders(csvHeadersConst.concat(csvHeadersNew).concat(attributesHeaders))
        const count = nftsData?.length + (nftList?.length || 0)
        setNftCount(count)

        if (nftList?.length > 0) {
          setErrorMessage("")
          if (newdata.marker) {
            setHasMore(newdata.marker)
          } else {
            setHasMore(false)
          }
          setData([...nftsData, ...nftList])
        } else {
          if (marker === 'first') {
            setErrorMessage(t("nfts.no-nfts"))
          } else {
            setHasMore(false)
          }
        }
      }
    }
  }

  const scrollTop = () => {
    if (window) {
      window.scrollTo({
        top: 0
      })
    }
  }

  useEffect(() => {
    checkApi({ restart: true })

    return () => {
      if (controller) {
        controller.abort()
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, issuer, taxon, owner, listTab, saleDestinationTab, search, includeBurned, includeWithoutMediaData, listNftsOrderTab, mintedPeriod])

  useEffect(() => {
    let queryAddList = [];
    let queryRemoveList = [];

    if (rawData) {
      if (nftExplorer) {
        if (isAddressOrUsername(rawData.owner)) {
          queryAddList.push({
            name: "owner",
            value: usernameOrAddress(rawData, 'owner')
          })
        } else {
          queryRemoveList.push("owner")
        }
      }

      if (isAddressOrUsername(rawData.issuer)) {
        queryAddList.push({
          name: "issuer",
          value: usernameOrAddress(rawData, 'issuer')
        })
        if (isValidTaxon(rawData.taxon)) {
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

      if (rawData?.search) {
        queryAddList.push({
          name: "search",
          value: rawData.search
        })
      } else {
        queryRemoveList.push("search")
      }
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
        tabList: viewList,
        tab: activeView,
        defaultTab: "tiles",
        setTab: setActiveView,
        paramName: "view"
      }
    ]

    if (listTab === 'onSale') {
      tabsToSet.push({
        tabList: saleDestinationTabList,
        tab: saleDestinationTab,
        defaultTab: "buyNow",
        setTab: setSaleDestinationTab,
        paramName: "saleDestination"
      })
      queryRemoveList.push("listNftsOrder")
    } else {
      queryRemoveList.push("saleDestination")
      queryRemoveList.push("saleCurrency")
      queryRemoveList.push("saleCurrencyIssuer")

      tabsToSet.push({
        tabList: listNftsOrderTabList,
        tab: listNftsOrderTab,
        defaultTab: "mintedNew",
        setTab: setListNftsOrderTab,
        paramName: "listNftsOrder"
      })
    }

    if (includeBurned) {
      queryAddList.push({
        name: "includeBurned",
        value: true
      })
    } else {
      queryRemoveList.push("includeBurned")
    }

    if (includeWithoutMediaData) {
      queryAddList.push({
        name: "includeWithoutMediaData",
        value: true
      })
    } else {
      queryRemoveList.push("includeWithoutMediaData")
    }

    setTabParams(router, tabsToSet, queryAddList, queryRemoveList)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeView, listNftsOrderTab, rawData, listTab, saleDestinationTab, includeBurned, includeWithoutMediaData])

  const onTaxonInput = value => {
    if (/^\d+$/.test(value) && issuer && isValidTaxon(value)) {
      setTaxon(value);
    } else {
      setTaxon("");
    }
  };

  const onIssuerSearch = value => {
    if (!value) {
      setTaxon("");
    }
    setIssuer(value);
  }

  const toggleFilters = () => {
    setFiltersHide(!filtersHide)
  }

  useEffect(() => {
    filtersHide
      ? document.body.classList.add('is-filters-hide')
      : document.body.classList.remove('is-filters-hide');
  }, [filtersHide]);

  const issuerTaxonUrlPart = "?view=" + activeView + (rawData ? ("&issuer=" + usernameOrAddress(rawData, 'issuer') + (isValidTaxon(rawData.taxon) ? ("&taxon=" + rawData.taxon) : "")) : "");

  const contextStyle = { minHeight: "480px" }
  if (!nftExplorer) {
    contextStyle.marginTop = "20px"
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
    if (!sellOffers) return ""
    const best = bestNftOffer(sellOffers, account, 'sell')
    if (best) {
      if (mpUrl(best) && !partnerMarketplaces[best?.destination]) {
        return t("nfts.amount-on-service", { amount: amountFormat(best.amount, { tooltip: 'right' }), service: best.destinationDetails.service })
      } else {
        return amountFormat(best.amount, { tooltip: 'right' })
      }
    }
    return t("table.text.private-offer") //shouldn't be the case
  }

  return <>
    {nftExplorer ?
      <SEO
        title={
          t("nft-explorer.header") +
          ((issuer || issuerQuery) ? (" " + (issuer || issuerQuery)) : "") +
          (isValidTaxon(taxon || taxonQuery) ? (" " + (taxon || taxonQuery)) : "") +
          (owner || ownerQuery ? (", " + t("table.owner") + ": " + (owner || ownerQuery)) : "") +
          (activeView === "list" ? (" " + t("tabs.list")) : "") +
          (listTab === "onSale" ? (" " + t("tabs.onSale")) : "") +
          (listTab === "onSale" && saleDestinationTab === "buyNow" ? (", " + t("tabs.buyNow")) : "") +
          (search || searchQuery ? (", " + t("table.name") + ": " + (search || searchQuery)) : "") +
          (burnedPeriod ? (", " + t("table.burn-period") + ": " + burnedPeriod) : "") +
          (listNftsOrderTab ? (", " + t("tabs." + listNftsOrderTab)) : "")
        }
        description={issuer || issuerQuery || search || t("nft-explorer.header")}
      />
      :
      <>
        <SEO
          title={t("nfts.header") + (id ? (" " + id) : "")}
          description={t("nfts.desc") + (id ? (": " + id) : "")}
        />
        <SearchBlock
          searchPlaceholderText={t("explorer.enter-address")}
          tab="nfts"
          userData={userData}
        />
      </>
    }

    {nftExplorer &&
      <>
        <h1 className='center'>{t("nft-explorer.header") + " "}</h1>
        <p className='center'>
          <Link href={"/nft-sales" + issuerTaxonUrlPart}>{t("nft-sales.header")}</Link>
        </p>
      </>
    }
    <div className="content-cols">
      <div className="filters-nav">
        <ViewTogggle viewList={viewList} activeView={activeView} setActiveView={setActiveView} name='view' />
      </div>
      <div className="filters">
        <div className="filters__box">
          <button className='filters__toggle' onClick={() => toggleFilters()}>
            <BsFilter />
          </button>
          <div className="filters__wrap">
            <div className="filters__head">
              <span>{nftCount !== null ? t("general.loaded") + ":" : ''} <i>{nftCount}</i></span>
              {rendered &&
                <CSVLink
                  data={data || []}
                  headers={csvHeaders}
                  filename='nfts_export.csv'
                  className={'button-action thin narrow' + (!(data && data.length > 0) ? ' disabled' : '')}
                >
                  <DownloadIcon /> CSV
                </CSVLink>
              }
              <button className='filters__close' onClick={() => toggleFilters()}>
                <IoMdClose />
              </button>
            </div>
            {nftExplorer &&
              <>
                <AddressInput
                  title={t("table.issuer")}
                  placeholder={t("nfts.search-by-issuer")}
                  setValue={onIssuerSearch}
                  rawData={rawData}
                  type='issuer'
                />
                {!xahauNetwork &&
                  <>
                    <FormInput
                      title={t("table.taxon")}
                      placeholder={t("nfts.search-by-taxon")}
                      setValue={onTaxonInput}
                      defaultValue={rawData?.taxon}
                      disabled={issuer ? false : true}
                    />
                  </>
                }
                <AddressInput
                  title={t("table.owner")}
                  placeholder={t("nfts.search-by-owner")}
                  setValue={setOwner}
                  rawData={rawData}
                  type='owner'
                />
                <FormInput
                  title={t("table.name")}
                  placeholder={t("nfts.search-by-name")}
                  setValue={setSearch}
                  defaultValue={rawData?.search}
                />
              </>
            }

            {listTab === 'nfts' &&
              <div>
                {t("table.mints")}
                <RadioOptions
                  tabList={listNftsOrderTabList}
                  tab={listNftsOrderTab}
                  setTab={setListNftsOrderTab}
                  name='listNftsOrder'
                />
                {nftExplorer && <>
                  <span style={{ marginRight: "10px" }}>
                    {t("table.mint-period")}
                  </span>
                  <DateAndTimeRange
                    periodQueryName="mintedPeriod"
                    period={mintedPeriod}
                    setPeriod={setMintedPeriod}
                    defaultPeriod={mintedPeriod}
                    minDate="nft"
                    style={{ marginTop: "10px", display: "inline-block" }}
                  />
                </>
                }
              </div>
            }

            {(!burnedPeriod && !xahauNetwork) &&
              <div>
                {t("general.search")}
                <RadioOptions tabList={listTabList} tab={listTab} setTab={setListTab} name='saleType' />
              </div>
            }

            {(!burnedPeriod && !xahauNetwork) && listTab === 'onSale' &&
              <div>
                {t("table.on-sale")}
                <RadioOptions tabList={saleDestinationTabList} tab={saleDestinationTab} setTab={setSaleDestinationTab} name='saleDestination' />
              </div>
            }

            <div>
              {!burnedPeriod && listTab !== 'onSale' &&
                <div className='filters-check-box'>
                  <CheckBox checked={includeBurned} setChecked={setIncludeBurned} outline>
                    {t("table.text.include-burned-nfts")}
                  </CheckBox>
                </div>
              }
              <div className='filters-check-box'>
                <CheckBox checked={includeWithoutMediaData} setChecked={setIncludeWithoutMediaData} outline>
                  {t("table.text.include-without-media-data")}
                </CheckBox>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="content-text" style={contextStyle}>

        {/* if accoun't nft explorer and there is no owner or id, ask to provide an address */}
        {(!nftExplorer && !(id || owner)) ?
          <div className='center' style={{ marginTop: "20px" }}>
            {t("nfts.desc")}
          </div>
          :
          <InfiniteScroll
            dataLength={data?.length}
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
            {!nftExplorer && (id || owner) && issuersList?.length > 0 &&
              <div className='center' style={{ marginBottom: "10px" }}>
                {rendered &&
                  <IssuerSelect
                    issuersList={issuersList}
                    selectedIssuer={issuer}
                    setSelectedIssuer={setIssuer}
                  />
                }
              </div>
            }

            {activeView === "list" &&
              <>
                {windowWidth > 500 ?
                  <table className="table-large table-large--without-border">
                    <thead>
                      <tr>
                        <th className='center'>{t("table.index")}</th>
                        <th>NFT</th>
                        <th className='right'>{t("table.minted")}</th>
                        {!xahauNetwork && <th className='right'>{t("table.serial")}</th>}
                        {(!isValidTaxon(taxon) && !xahauNetwork) && <th className='right'>{t("table.taxon")}</th>}
                        {!issuer && <th className='right'>{t("table.issuer")}</th>}
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
                          {!errorMessage ? data.map((nft, i) =>
                            <tr key={nft.nftokenID || nft.uriTokenID}>
                              <td className="center">{i + 1}</td>
                              <td>{nftThumbnail(nft)} {nftNameLink(nft)}</td>
                              <td className='right'>{timeOrDate(nft.issuedAt)}</td>
                              {!xahauNetwork && <td className='right'>{nft.sequence}</td>}
                              {(!isValidTaxon(taxon) && !xahauNetwork) && <td className='right'>{nft.nftokenTaxon}</td>}
                              {!issuer && <td className='right'>{nftLink(nft, 'issuer', { address: 'short' })}</td>}
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
                          {!errorMessage ? data.map((nft, i) =>
                            <tr key={nft.nftokenID || nft.uriTokenID}>
                              <td className="center">
                                {i + 1}<br /><br />
                                {nftThumbnail(nft)}
                              </td>
                              <td>
                                <div className='brake'>NFT: {nftNameLink(nft)}</div>
                                <div>{t("table.minted")}: {fullDateAndTime(nft.issuedAt)}</div>
                                {!xahauNetwork && <>{t("table.serial")}: {nft.sequence}<br /></>}
                                {(!isValidTaxon(taxon) && !xahauNetwork) && <>{t("table.taxon")}: {nft.nftokenTaxon}<br /></>}
                                {!issuer && <>{t("table.issuer")}: {nftLink(nft, 'issuer', { address: 'short' })}<br /></>}
                                {(!id && !owner) && <>{t("table.owner")}: {nftLink(nft, 'owner', { address: 'short' })}<br /></>}
                                {listTab === 'onSale' && <>{t("table.price")}: {priceData(nft.sellOffers)}<br /></>}
                              </td>
                            </tr>)
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
                      <Tiles nftList={data} type={listTab === 'onSale' ? 'onSale' : 'name'} account={account} />
                    }
                  </>
                }
              </>
            }
          </InfiniteScroll>
        }
      </div>
    </div>

  </>
}
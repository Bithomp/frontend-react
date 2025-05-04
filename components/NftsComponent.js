import { useTranslation } from 'next-i18next'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import axios from 'axios'

import {
  isAddressOrUsername,
  setTabParams,
  useWidth,
  xahauNetwork,
  periodDescription,
  decode,
  nativeCurrency
} from '../utils'
import { isValidTaxon, nftThumbnail, nftNameLink, ipfsUrl, nftPriceData } from '../utils/nft'
import { nftLink, usernameOrAddress, timeOrDate, fullDateAndTime, niceCurrency, capitalize } from '../utils/format'

import SEO from './SEO'
import SearchBlock from './Layout/SearchBlock'
import Tiles from './Tiles'
import IssuerSelect from './UI/IssuerSelect'
import CheckBox from './UI/CheckBox'
import DateAndTimeRange from './UI/DateAndTimeRange'

import RadioOptions from './UI/RadioOptions'
import FormInput from './UI/FormInput'
import AddressInput from './UI/AddressInput'
import NftTabs from './Tabs/NftTabs'
import FiltersFrame from './Layout/FiltersFrame'
import InfiniteScrolling from './Layout/InfiniteScrolling'

export default function NftsComponent({
  collectionQuery,
  orderQuery,
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
  burnedPeriodQuery,
  includeBurnedQuery,
  includeWithoutMediaDataQuery,
  id,
  account,
  subscriptionExpired,
  sessionToken,
  signOutPro
}) {
  const { t } = useTranslation()
  const router = useRouter()
  const windowWidth = useWidth()

  const orderNftsList = [
    { value: 'mintedNew', label: t('dropdown.mintedNew', { ns: 'nft-sort' }) },
    { value: 'mintedOld', label: t('dropdown.mintedOld', { ns: 'nft-sort' }) },
    { value: 'rating', label: t('dropdown.rating', { ns: 'nft-sort' }) }
  ]

  const orderOnSaleList = [
    { value: 'priceLow', label: t('dropdown.priceLow', { ns: 'nft-sort' }) },
    { value: 'priceHigh', label: t('dropdown.priceHigh', { ns: 'nft-sort' }) },
    { value: 'offerCreatedNew', label: t('dropdown.offerCreatedNew', { ns: 'nft-sort' }) },
    { value: 'offerCreatedOld', label: t('dropdown.offerCreatedOld', { ns: 'nft-sort' }) }
  ]

  const [rendered, setRendered] = useState(false)
  const [data, setData] = useState([])
  const [rawData, setRawData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [hasMore, setHasMore] = useState('first')
  const [errorMessage, setErrorMessage] = useState('')
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
  const [burnedPeriod, setBurnedPeriod] = useState(burnedPeriodQuery)
  const [csvHeaders, setCsvHeaders] = useState([])
  const [nftCount, setNftCount] = useState(null)
  const [currentOrderList, setCurrentOrderList] = useState(listTab !== 'onSale' ? orderNftsList : orderOnSaleList)
  const [order, setOrder] = useState(orderQuery)
  const [issuerTaxonUrlPart, setIssuerTaxonUrlPart] = useState('?view=' + activeView)
  const [collectionUrlPart, setCollectionUrlPart] = useState(collectionQuery ? '&collection=' + collectionQuery : '')
  const [filtersHide, setFiltersHide] = useState(false)

  const controller = new AbortController()

  let csvHeadersConst = [
    { label: 'NFT ID', key: 'nftokenID' },
    { label: t('table.issuer'), key: 'issuer' },
    { label: t('table.taxon'), key: 'nftokenTaxon' },
    { label: t('table.serial'), key: 'sequence' },
    { label: t('table.name'), key: 'metadata.name' },
    { label: t('table.uri'), key: 'uriDecoded' },
    { label: 'CID', key: 'cid' }
  ]

  if (nftExplorer) {
    csvHeadersConst.push({ label: t('table.owner'), key: 'owner' })
  }

  useEffect(() => {
    setRendered(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const listTabList = [
    { value: 'nfts', label: t('tabs.all') },
    { value: 'onSale', label: t('tabs.onSale', { nativeCurrency }) }
  ]

  let saleDestinationTabList = []

  if (xahauNetwork) {
    saleDestinationTabList = [
      { value: 'public', label: t('tabs.buyNow') },
      { value: 'all', label: t('tabs.all') }
    ]
  } else {
    saleDestinationTabList = [
      { value: 'buyNow', label: t('tabs.buyNow') },
      { value: 'publicAndKnownBrokers', label: t('tabs.publicAndKnownBrokers') }
    ]
  }

  const checkApi = async (options) => {
    if (nftExplorer && !mintedPeriod && listTab !== 'onSale') return
    if (!nftExplorer && !id && !owner) return
    if (!order) return
    if (listTab === 'onSale') {
      let supportedOrder = false
      for (let index = 0; index < orderOnSaleList.length; index++) {
        if (order === orderOnSaleList[index].value) {
          supportedOrder = true
          break
        }
      }
      if (!supportedOrder) return
    } else if (listTab === 'nfts') {
      let supportedOrder = false
      for (let index = 0; index < orderNftsList.length; index++) {
        if (order === orderNftsList[index].value) {
          supportedOrder = true
          break
        }
      }
      if (!supportedOrder) return
    }

    let marker = hasMore
    let nftsData = data
    if (options?.restart) {
      marker = 'first'
      setHasMore('first')
      setLoading(true)
      setData([])
      nftsData = []
    } else if (marker && marker !== 'first') {
      // do not load more if there is no session token or if Bithomp Pro is expired
      if (!sessionToken || (sessionToken && subscriptionExpired)) {
        return
      }
    }

    // it seems not nessary anylonger, we just need to keep the structure of URI with "?"
    let listUrlPart = '?list=' + (xahauNetwork ? 'uritokens' : 'nfts')

    let ownerUrlPart = ''
    let issuerTaxonUrlPart = ''
    let markerUrlPart = ''
    let searchPart = ''
    let serialPart = ''
    let mintAndBurnPart = ''
    let orderPart = ''
    let includeBurnedPart = includeBurned ? '&includeDeleted=true' : ''
    let hasImagePart = !includeWithoutMediaData ? '&hasImage=true' : ''
    let collectionUrlPart = collectionQuery ? '&collection=' + collectionQuery : ''

    if (listTab === 'onSale') {
      //destination: "public", "knownBrokers", "publicAndKnownBrokers", "all", "buyNow"
      listUrlPart = '?list=onSale&destination=' + saleDestinationTab
      if (saleCurrencyIssuer && saleCurrency) {
        listUrlPart = listUrlPart + '&currency=' + saleCurrency + '&currencyIssuer=' + saleCurrencyIssuer
      } else {
        listUrlPart = listUrlPart + '&currency=' + nativeCurrency?.toLowerCase()
      }
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
        const issuersJson = await axios(
          'v2/' + (xahauNetwork ? 'uritoken' : 'nft') + '-issuers?owner=' + newOwner + '&limit=200'
        ).catch((error) => {
          console.log(t('error.' + error.message))
        })
        if (issuersJson?.data?.issuers) {
          setIssuersList(issuersJson.data.issuers)
        }
      }
    }

    if (issuer) {
      issuerTaxonUrlPart = '&issuer=' + issuer
      if (isValidTaxon(taxon)) {
        issuerTaxonUrlPart += '&taxon=' + taxon
      }
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

    if (serialQuery.match(/^-?\d+$/) && !xahauNetwork) {
      serialPart = '&serial=' + serialQuery
    }

    if (marker && marker !== 'first') {
      markerUrlPart = '&marker=' + marker
    }
    if (marker === 'first') {
      setLoading(true)
    }

    if (!ownerUrlPart && !issuerTaxonUrlPart && !collectionUrlPart && !searchPart && !serialPart && !mintAndBurnPart) {
      // reverse and show only with meta
      // on the first load when no params
      if (listTab === 'onSale') {
        orderPart = '&order=offerCreatedNew'
      }
    }

    orderPart = '&order=' + order

    const response = await axios(
      'v2/' +
        (xahauNetwork ? 'uritokens' : 'nfts') +
        listUrlPart +
        ownerUrlPart +
        issuerTaxonUrlPart +
        collectionUrlPart +
        markerUrlPart +
        searchPart +
        serialPart +
        mintAndBurnPart +
        orderPart +
        hasImagePart +
        includeBurnedPart,
      {
        signal: controller.signal
      }
    ).catch((error) => {
      if (error) {
        if (error && error.message !== 'canceled') {
          setErrorMessage(t('error.' + error.message))
          setLoading(false)
        }
      }
    })

    const newdata = response?.data

    if (newdata) {
      setLoading(false)
      setRawData(newdata)
      if (newdata.error) {
        if (newdata.error === 'This endpoint/query is available only within bithomp pro subscription') {
          // user logged out...
          signOutPro()
        } else {
          setErrorMessage(t('error-api.' + newdata.error))
        }
      } else {
        if (newdata.issuer) {
          if (isValidTaxon(newdata.taxon)) {
            setTaxon(newdata.taxon)
          } else {
            setTaxon('')
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
            nftList[i].cid = ipfsUrl(nftList[i].url, 'cid')
            nftList[i].uriDecoded = decode(nftList[i].uri)
            if (typeof nftList[i].uriDecoded === 'string') {
              nftList[i].uriDecoded = nftList[i].uriDecoded.replace(/"/g, '""')
            }
            if (nftList[i].metadata) {
              nftList[i].metadata.attributesExport = {}
              Object.keys(nftList[i].metadata).forEach(function (key) {
                //remove escapes to fix the export
                //according to the CSV specs, to include double quotes within a string that is already quoted, you need to use two double quotes ("")
                if (typeof nftList[i].metadata[key] === 'string') {
                  nftList[i].metadata[key] = nftList[i].metadata[key].replace(/"/g, '""')
                }
                if (
                  !keys.includes(key) &&
                  key.toLowerCase() !== 'name' &&
                  nftList[i].metadata[key] &&
                  typeof nftList[i].metadata[key] === 'string'
                ) {
                  keys.push(key)
                  csvHeadersNew.push({ label: capitalize(key), key: 'metadata.' + key })
                }

                if (
                  ['image', 'video', 'animation', '3dmodel'].includes(key.toLowerCase().replace('_url', '')) &&
                  nftList[i].metadata[key]
                ) {
                  if (!keys.includes(key + 'Cid')) {
                    keys.push(key + 'Cid')
                    csvHeadersNew.push({ label: capitalize(key) + ' CID', key: 'metadata.' + key + 'Cid' })
                  }
                  nftList[i].metadata[key + 'Cid'] = ipfsUrl(nftList[i].metadata[key], 'cid')
                }

                if (key.toLowerCase() === 'attributes' && nftList[i].metadata[key]) {
                  Object.keys(nftList[i].metadata[key]).forEach(function (attribute) {
                    if (nftList[i].metadata[key][attribute].trait_type) {
                      let traitType = nftList[i].metadata[key][attribute]?.trait_type?.toString()
                      let traitValue = nftList[i].metadata[key][attribute]?.value?.toString()
                      traitType = traitType?.replace(/"/g, '""')
                      traitValue = traitValue?.replace(/"/g, '""')
                      nftList[i].metadata.attributesExport[traitType] = traitValue
                      if (!attributes.includes(traitType)) {
                        attributes.push(traitType)
                        attributesHeaders.push({
                          label: 'Attribute ' + traitType,
                          key: 'metadata.attributesExport.' + traitType
                        })
                      }
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
          setErrorMessage('')
          if (newdata.marker) {
            setHasMore(newdata.marker)
          } else {
            setHasMore(false)
          }
          setData([...nftsData, ...nftList])
        } else {
          if (marker === 'first') {
            setErrorMessage(t('nfts.no-nfts'))
          } else {
            setHasMore(false)
          }
        }
      }
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
  }, [
    id,
    issuer,
    taxon,
    owner,
    order,
    saleDestinationTab,
    search,
    includeBurned,
    includeWithoutMediaData,
    mintedPeriod,
    burnedPeriod
  ])

  useEffect(() => {
    let queryAddList = []
    let queryRemoveList = []

    if (rawData) {
      setIssuerTaxonUrlPart(
        '?view=' +
          activeView +
          '&issuer=' +
          usernameOrAddress(rawData, 'issuer') +
          (isValidTaxon(rawData.taxon) ? '&taxon=' + rawData.taxon : '')
      )

      setCollectionUrlPart(rawData.collection ? '&collection=' + rawData.collection : '')

      if (nftExplorer) {
        if (isAddressOrUsername(rawData.owner)) {
          queryAddList.push({
            name: 'owner',
            value: usernameOrAddress(rawData, 'owner')
          })
        } else {
          queryRemoveList.push('owner')
        }
      }

      if (isAddressOrUsername(rawData.issuer)) {
        queryAddList.push({
          name: 'issuer',
          value: usernameOrAddress(rawData, 'issuer')
        })
        if (isValidTaxon(rawData.taxon)) {
          queryAddList.push({
            name: 'taxon',
            value: rawData.taxon
          })
        } else {
          queryRemoveList.push('taxon')
        }
      } else {
        queryRemoveList.push('issuer')
        queryRemoveList.push('taxon')
      }

      if (rawData?.search) {
        queryAddList.push({
          name: 'search',
          value: rawData.search
        })
      } else {
        queryRemoveList.push('search')
      }
    }

    let tabsToSet = [
      {
        tabList: listTabList,
        tab: listTab,
        defaultTab: 'nfts',
        setTab: setListTab,
        paramName: 'list'
      }
    ]

    if (listTab === 'onSale') {
      tabsToSet.push({
        tabList: saleDestinationTabList,
        tab: saleDestinationTab,
        defaultTab: xahauNetwork ? 'public' : 'buyNow',
        setTab: setSaleDestinationTab,
        paramName: 'saleDestination'
      })
      tabsToSet.push({
        tabList: orderOnSaleList,
        tab: order,
        defaultTab: 'priceLow',
        setTab: setOrder,
        paramName: 'order'
      })
    } else {
      queryRemoveList.push('saleDestination')
      queryRemoveList.push('saleCurrency')
      queryRemoveList.push('saleCurrencyIssuer')
      tabsToSet.push({
        tabList: orderNftsList,
        tab: order,
        defaultTab: 'mintedNew',
        setTab: setOrder,
        paramName: 'order'
      })
    }

    if (includeBurned) {
      queryAddList.push({
        name: 'includeBurned',
        value: true
      })
    } else {
      queryRemoveList.push('includeBurned')
    }

    if (includeWithoutMediaData) {
      queryAddList.push({
        name: 'includeWithoutMediaData',
        value: true
      })
    } else {
      queryRemoveList.push('includeWithoutMediaData')
    }

    setTabParams(router, tabsToSet, queryAddList, queryRemoveList)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order, rawData, listTab, saleDestinationTab, includeBurned, includeWithoutMediaData])

  const onTaxonInput = (value) => {
    if (/^\d+$/.test(value) && issuer && isValidTaxon(value)) {
      setTaxon(value)
    } else {
      setTaxon('')
    }
  }

  const onIssuerSearch = (value) => {
    if (!value) {
      setTaxon('')
    }
    setIssuer(value)
  }

  useEffect(() => {
    const actualList = listTab !== 'onSale' ? orderNftsList : orderOnSaleList
    setCurrentOrderList(actualList)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listTab])

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
        "url": "https://ipfs.io/ipfs/bafybeic27yso7lele4xbwvtdponwqllvjhy6gqzltfng2q5zhiqzaxozkm/metadata.json",
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

  return (
    <>
      {nftExplorer ? (
        <SEO
          title={
            t('nft-explorer.header') +
            (issuerQuery ? ' ' + issuerQuery : '') +
            (isValidTaxon(taxonQuery) ? ' ' + taxonQuery : '') +
            (ownerQuery ? ', ' + t('table.owner') + ': ' + ownerQuery : '') +
            (activeView === 'list' ? ' ' + t('tabs.list') : '') +
            (listTab === 'onSale' ? ' ' + t('tabs.onSale', { nativeCurrency }) : '') +
            (listTab === 'onSale' && (saleDestinationTab === 'buyNow' || saleDestinationTab === 'public')
              ? ', ' + t('tabs.buyNow')
              : '') +
            (searchQuery ? ', ' + t('table.name') + ': ' + searchQuery : '') +
            (burnedPeriod ? ', ' + t('table.burn-period') + ': ' + burnedPeriod : '') +
            (order ? ', ' + t('dropdown.' + order, { ns: 'nft-sort' }) : '') +
            (includeBurned ? ', ' + t('table.text.include-burned-nfts') : '') +
            (includeWithoutMediaData ? ', ' + t('table.text.include-without-media-data') : '')
          }
          description={
            (issuerQuery || searchQuery || t('nft-explorer.header')) +
            (rendered && mintedPeriod ? ', ' + t('table.mint-period') + ': ' + periodDescription(mintedPeriod) : '')
          }
          images={[
            {
              width: 1200,
              height: 630,
              file: 'previews/1200x630/nft-explorer.png'
            },
            {
              width: 630,
              height: 630,
              file: 'previews/630x630/nft-explorer.png'
            }
          ]}
        />
      ) : (
        <>
          <SEO title={t('nfts.header') + (id ? ' ' + id : '')} description={t('nfts.desc') + (id ? ': ' + id : '')} />
          <SearchBlock searchPlaceholderText={t('explorer.enter-address')} tab="nfts" userData={userData} />
        </>
      )}

      {nftExplorer && (
        <>
          <h1 className="center">{t('nft-explorer.header') + ' '}</h1>
          <NftTabs tab="nft-explorer" url={'/nft-sales' + issuerTaxonUrlPart + collectionUrlPart} />
        </>
      )}

      <FiltersFrame
        order={order}
        setOrder={setOrder}
        orderList={currentOrderList}
        activeView={activeView}
        setActiveView={setActiveView}
        count={nftCount}
        hasMore={hasMore}
        data={data || []}
        csvHeaders={csvHeaders}
        filtersHide={filtersHide}
        setFiltersHide={setFiltersHide}
      >
        <>
          {!burnedPeriod && (
            <div>
              {t('general.search')}
              <RadioOptions tabList={listTabList} tab={listTab} setTab={setListTab} name="saleType" />
            </div>
          )}
          {!burnedPeriod && listTab === 'onSale' && (
            <div>
              {t('table.on-sale')}
              <RadioOptions
                tabList={saleDestinationTabList}
                tab={saleDestinationTab}
                setTab={setSaleDestinationTab}
                name="saleDestination"
              />
              {saleCurrencyIssuer && saleCurrency && (
                <>
                  <FormInput
                    title={t('table.currency')}
                    defaultValue={niceCurrency(saleCurrency)}
                    disabled={true}
                    hideButton={true}
                  />
                  <FormInput
                    title={t('table.currency-issuer')}
                    defaultValue={saleCurrencyIssuer}
                    disabled={true}
                    hideButton={true}
                  />
                </>
              )}
            </div>
          )}
          {nftExplorer && (
            <>
              {mintedByMarketplace && (
                <FormInput
                  title={t('table.marketplace')}
                  defaultValue={mintedByMarketplace}
                  disabled={true}
                  hideButton={true}
                />
              )}
              {collectionQuery && (
                <FormInput
                  title={t('table.collection')}
                  defaultValue={collectionQuery}
                  disabled={true}
                  hideButton={true}
                />
              )}
              {serialQuery && (
                <FormInput title={t('table.serial')} defaultValue={serialQuery} disabled={true} hideButton={true} />
              )}
              <AddressInput
                title={t('table.issuer')}
                placeholder={t('nfts.search-by-issuer')}
                setValue={onIssuerSearch}
                rawData={rawData || { issuer: issuerQuery }}
                type="issuer"
              />
              {!xahauNetwork && (
                <FormInput
                  title={t('table.taxon')}
                  placeholder={t('nfts.search-by-taxon')}
                  setValue={onTaxonInput}
                  disabled={issuer ? false : true}
                  defaultValue={issuer ? rawData?.taxon : ''}
                  key={issuer || 'empty'}
                />
              )}
              <AddressInput
                title={t('table.owner')}
                placeholder={t('nfts.search-by-owner')}
                setValue={setOwner}
                rawData={rawData || { owner: ownerQuery }}
                type="owner"
              />
              <FormInput
                title={t('table.name')}
                placeholder={t('nfts.search-by-name')}
                setValue={setSearch}
                defaultValue={rawData?.search}
              />

              {listTab === 'nfts' && (
                <div>
                  {t('table.mint-period')}
                  <DateAndTimeRange
                    periodQueryName="mintedPeriod"
                    period={mintedPeriod}
                    setPeriod={setMintedPeriod}
                    defaultPeriod={mintedPeriodQuery}
                    minDate="nft"
                    radio={true}
                  />
                </div>
              )}
            </>
          )}
          {!nftExplorer && rendered && (
            <div>
              <span style={{ display: 'inline-block', paddingBottom: '5px' }}>{t('table.issuer')}</span>
              <IssuerSelect
                issuersList={issuersList}
                selectedIssuer={issuer}
                setSelectedIssuer={setIssuer}
                disabled={!(id || owner) || issuersList?.length < 1}
              />
            </div>
          )}
          <div>
            {listTab !== 'onSale' && (
              <>
                {t('table.text.include-burned-nfts')}
                <RadioOptions
                  tabList={[
                    { value: 'existing', label: t('tabs.existing') },
                    { value: 'all', label: t('tabs.all') },
                    { value: 'burned', label: t('tabs.burned') }
                  ]}
                  tab={burnedPeriod ? 'burned' : includeBurned ? 'all' : 'existing'}
                  setTab={(tab) => {
                    if (tab === 'burned') {
                      setBurnedPeriod('all')
                    } else if (tab === 'all') {
                      setIncludeBurned(true)
                      setBurnedPeriod(null)
                    } else {
                      setIncludeBurned(false)
                      setBurnedPeriod(null)
                    }
                  }}
                  name="ExistingAndBurnedTabs"
                />
              </>
            )}
            {burnedPeriod && (
              <div>
                {t('table.burn-period')}
                <DateAndTimeRange
                  periodQueryName="burnedPeriod"
                  period={burnedPeriod}
                  setPeriod={setBurnedPeriod}
                  defaultPeriod={burnedPeriodQuery}
                  minDate="nft"
                  radio={true}
                  name="burnedPeriod"
                />
              </div>
            )}

            <div className="filters-check-box">
              <CheckBox checked={includeWithoutMediaData} setChecked={setIncludeWithoutMediaData} outline>
                {t('table.text.include-without-media-data')}
              </CheckBox>
            </div>
          </div>
        </>
        <>
          {/* if accoun't nft explorer and there is no owner or id, ask to provide an address */}
          {!nftExplorer && !(id || owner) ? (
            <div className="center" style={{ marginTop: '20px' }}>
              {t('nfts.desc')}
            </div>
          ) : (
            <InfiniteScrolling
              dataLength={data?.length}
              loadMore={checkApi}
              hasMore={hasMore}
              errorMessage={errorMessage}
              subscriptionExpired={subscriptionExpired}
              sessionToken={sessionToken}
              endMessage={t('nfts.end')}
              loadMoreMessage={t('nfts.load-more')}
              //height={!filtersHide ? '1300px' : '100vh'}
            >
              {activeView === 'list' && (
                <>
                  {windowWidth > 500 ? (
                    <table className="table-large no-border">
                      <thead>
                        <tr>
                          <th className="center">{t('table.index')}</th>
                          <th>NFT</th>
                          {order !== 'offerCreatedNew' && order !== 'offerCreatedOld' && (
                            <th className="right">{t('table.minted')}</th>
                          )}
                          {!xahauNetwork && <th className="right">{t('table.serial')}</th>}
                          {!isValidTaxon(taxon) && !xahauNetwork && <th className="right">{t('table.taxon')}</th>}
                          {!issuer && <th className="right">{t('table.issuer')}</th>}
                          {!id && !owner && <th className="right">{t('table.owner')}</th>}
                          {listTab === 'onSale' && <th className="right">{t('table.price')}</th>}
                        </tr>
                      </thead>
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
                            {!errorMessage ? (
                              data.map((nft, i) => (
                                <tr key={nft.nftokenID}>
                                  <td className="center">{i + 1}</td>
                                  <td>
                                    {nftThumbnail(nft)} {nftNameLink(nft)}
                                  </td>
                                  {order !== 'offerCreatedNew' && order !== 'offerCreatedOld' && (
                                    <td className="right">{timeOrDate(nft.issuedAt)}</td>
                                  )}
                                  {!xahauNetwork && <td className="right">{nft.sequence}</td>}
                                  {!isValidTaxon(taxon) && !xahauNetwork && (
                                    <td className="right">{nft.nftokenTaxon}</td>
                                  )}
                                  {!issuer && <td className="right">{nftLink(nft, 'issuer', { address: 'short' })}</td>}
                                  {!id && !owner && (
                                    <td className="right">{nftLink(nft, 'owner', { address: 'short' })}</td>
                                  )}
                                  {listTab === 'onSale' && (
                                    <td className="right">{nftPriceData(t, nft.sellOffers, account?.address)}</td>
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
                            {!errorMessage ? (
                              data.map((nft, i) => (
                                <tr key={nft.nftokenID}>
                                  <td className="center">
                                    {i + 1}
                                    <br />
                                    <br />
                                    {nftThumbnail(nft)}
                                  </td>
                                  <td>
                                    <div className="brake">NFT: {nftNameLink(nft)}</div>
                                    {order !== 'offerCreatedNew' && order !== 'offerCreatedOld' && (
                                      <div>
                                        {t('table.minted')}: {fullDateAndTime(nft.issuedAt)}
                                      </div>
                                    )}
                                    {!xahauNetwork && (
                                      <>
                                        {t('table.serial')}: {nft.sequence}
                                        <br />
                                      </>
                                    )}
                                    {!isValidTaxon(taxon) && !xahauNetwork && (
                                      <>
                                        {t('table.taxon')}: {nft.nftokenTaxon}
                                        <br />
                                      </>
                                    )}
                                    {!issuer && (
                                      <>
                                        {t('table.issuer')}: {nftLink(nft, 'issuer', { address: 'short' })}
                                        <br />
                                      </>
                                    )}
                                    {!id && !owner && (
                                      <>
                                        {t('table.owner')}: {nftLink(nft, 'owner', { address: 'short' })}
                                        <br />
                                      </>
                                    )}
                                    {listTab === 'onSale' && (
                                      <>
                                        {t('table.price')}: {nftPriceData(t, nft.sellOffers, account?.address)}
                                        <br />
                                      </>
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
                        <Tiles nftList={data} type={listTab === 'onSale' ? 'onSale' : 'name'} account={account} />
                      )}
                    </>
                  )}
                </>
              )}
            </InfiniteScrolling>
          )}
        </>
      </FiltersFrame>
    </>
  )
}

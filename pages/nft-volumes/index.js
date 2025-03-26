import { useTranslation, Trans } from 'next-i18next'
import { useState, useEffect } from 'react'
import axios from 'axios'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { useRouter } from 'next/router'
import InfiniteScroll from 'react-infinite-scroll-component'
import Link from 'next/link'

import { getIsSsrMobile } from '../../utils/mobile'

import {
  setTabParams,
  stripText,
  isAddressOrUsername,
  useWidth,
  chartSpan,
  xahauNetwork,
  nativeCurrency,
  explorerName
} from '../../utils'

export const getServerSideProps = async (context) => {
  const { query, locale } = context
  const { period, sale, list, currency, currencyIssuer, sortCurrency, extendedStats } = query
  return {
    props: {
      extendedStatsQuery: extendedStats || true,
      periodQuery: period || 'month',
      sale: sale || 'secondary',
      list: list || (xahauNetwork ? 'issuers' : 'collections'),
      currency: currency || '',
      currencyIssuer: currencyIssuer || '',
      sortCurrency: sortCurrency || '',
      isSsrMobile: getIsSsrMobile(context),
      ...(await serverSideTranslations(locale, ['common', 'nft-volumes']))
    }
  }
}

import SEO from '../../components/SEO'
import Tabs from '../../components/Tabs'
import CheckBox from '../../components/UI/CheckBox'
import DateAndTimeRange from '../../components/UI/DateAndTimeRange'
import SimpleChart from '../../components/SimpleChart'

import {
  amountFormat,
  shortNiceNumber,
  addressUsernameOrServiceLink,
  usernameOrAddress,
  percentFormat,
  niceNumber,
  niceCurrency
} from '../../utils/format'

import LinkIcon from '../../public/images/link.svg'
import RadioOptions from '../../components/UI/RadioOptions'
import FormInput from '../../components/UI/FormInput'
import { collectionThumbnail } from '../../utils/nft'
import FiltersFrame from '../../components/Layout/FiltersFrame'

export default function NftVolumes({
  extendedStatsQuery,
  periodQuery,
  sale,
  list,
  currency,
  currencyIssuer,
  selectedCurrency,
  sortCurrency,
  subscriptionExpired,
  sessionToken
}) {
  const { t } = useTranslation()
  const router = useRouter()
  const windowWidth = useWidth()

  const [data, setData] = useState([])
  const [rawData, setRawData] = useState({})
  const [rawDataSummary, setRawDataSummary] = useState(null)
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  const [period, setPeriod] = useState(periodQuery)
  const [saleTab, setSaleTab] = useState(sale)
  const [listTab, setListTab] = useState(list)
  const [currencyTab, setCurrencyTab] = useState(currency?.toUpperCase())
  const [sortConfig, setSortConfig] = useState({})
  const [extendedStats, setExtendedStats] = useState(extendedStatsQuery)
  const [chartIssuers, setChartIssuers] = useState([])
  const [chartVolumes, setChartVolumes] = useState([])
  const [loadingChart, setLoadingChart] = useState(false)
  const [filtersHide, setFiltersHide] = useState(false)
  const [hasMore, setHasMore] = useState('first')
  const [csvHeaders, setCsvHeaders] = useState([])

  useEffect(() => {
    setListTab(list)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [list])

  const convertCurrency = sortCurrency || selectedCurrency

  const listTabList = [
    { value: 'marketplaces', label: t('tabs.marketplaces') },
    { value: 'currencies', label: t('tabs.currencies') },
    { value: 'issuers', label: t('tabs.issuers') }
  ]
  if (!xahauNetwork) {
    //We don't have yet collections on xahau, also there are no brokers there
    listTabList.unshift({ value: 'collections', label: t('tabs.collections') })
    listTabList.push({ value: 'brokers', label: t('tabs.brokers') })
  }
  listTabList.push({ value: 'charts', label: t('tabs.charts') })

  const saleTabList = [
    { value: 'primaryAndSecondary', label: t('tabs.primaryAndSecondary-sales') },
    { value: 'secondary', label: t('tabs.secondary-sales') },
    { value: 'primary', label: t('tabs.primary-sales') }
  ]

  const currencyTabList = [
    { value: '', label: t('tabs.all-tokens') },
    { value: nativeCurrency, label: t('tabs.native-currency-only', { nativeCurrency }) }
  ]

  const controller = new AbortController()

  const checkApi = async () => {
    if (!period || !listTab || !convertCurrency) return

    const constCsvHeaders = [
      { label: t('table.sales'), key: 'sales' },
      { label: t('table.volume') + ' (' + convertCurrency?.toUpperCase() + ')', key: 'volumeInConvertCurrency' }
    ]

    if (listTab === 'issuers') {
      setCsvHeaders([
        { label: t('table.issuer'), key: 'issuer' },
        { label: t('table.name'), key: 'issuerDetails.service' },
        { label: t('table.username'), key: 'issuerDetails.username' },
        ...constCsvHeaders
      ])
    } else if (listTab === 'marketplaces') {
      setCsvHeaders([
        { label: t('table.marketplace'), key: 'marketplace' },
        { label: t('table.minted'), key: 'nftokens.minted' },
        { label: t('table.burned'), key: 'nftokens.burned' },
        ...constCsvHeaders
      ])
    } else if (listTab === 'brokers') {
      setCsvHeaders([
        { label: t('table.broker'), key: 'broker' },
        { label: t('table.name'), key: 'brokerDetails.service' },
        { label: t('table.username'), key: 'brokerDetails.username' },
        ...constCsvHeaders
      ])
    } else if (listTab === 'currencies') {
      setCsvHeaders([{ label: t('table.amount'), key: 'amount' }, ...constCsvHeaders])
    } else if (listTab === 'collections') {
      let headers = [
        { label: t('table.name'), key: 'collectionDetails.name' },
        { label: t('table.collection-family'), key: 'collectionDetails.family' },
        { label: t('table.description'), key: 'collectionDetails.description' },
        { label: t('table.issuer'), key: 'collectionDetails.issuer' }
      ]
      if (!xahauNetwork) {
        headers.push({ label: t('table.taxon'), key: 'collectionDetails.taxon' })
      }
      setCsvHeaders([...headers, ...constCsvHeaders])
    }

    const oldListTab = rawData?.list
    const oldConvertCurrency = rawData?.sortCurrency
    const oldPeriod = rawData?.period
    const oldSaleType = rawData?.saleType
      ? rawData.saleType === 'all'
        ? 'primaryAndSecondary'
        : rawData.saleType
      : false
    const oldCurrency = rawData?.currency
    //const oldCurrencyIssuer = rawData?.currencyIssuer
    const oldExtendedStats = rawData?.statistics && rawData?.floorPrice
    const loadMoreRequest =
      hasMore !== 'first' &&
      (listTab ? oldListTab === listTab : !oldListTab) &&
      (convertCurrency ? oldConvertCurrency === convertCurrency : !oldConvertCurrency) &&
      (period ? oldPeriod === period : !oldPeriod) &&
      (saleTab ? oldSaleType === saleTab : !oldSaleType) &&
      (currencyTab ? oldCurrency === currencyTab : !oldCurrency) &&
      //(currencyIssuer ? oldCurrencyIssuer === currencyIssuer : !oldCurrencyIssuer) &&
      (extendedStats ? oldExtendedStats === extendedStats : !oldExtendedStats)

    // do not load more if there is no session token or if Bithomp Pro is expired
    if (loadMoreRequest && (!sessionToken || (sessionToken && subscriptionExpired))) {
      return
    }

    let marker = hasMore

    let markerPart = ''
    if (loadMoreRequest) {
      markerPart = '&marker=' + rawData?.marker
    } else {
      marker = 'first'
      setHasMore('first')
    }

    let currencyUrlPart = ''
    if (listTab !== 'currencies') {
      if (currency && currencyIssuer) {
        currencyUrlPart = '&currency=' + stripText(currency) + '&currencyIssuer=' + stripText(currencyIssuer)
      } else if (currencyTab === nativeCurrency) {
        currencyUrlPart = '&currency=' + nativeCurrency
      }
    }

    // get the chart data
    setLoadingChart(true)
    setChartIssuers([])
    setChartVolumes([])

    if (listTab === 'charts') {
      const chartDataResponse = await axios
        .get(
          'v2/' +
            (xahauNetwork ? 'uritoken' : 'nft') +
            '-sales-chart?span=' +
            chartSpan(period) +
            '&period=' +
            period +
            '&saleType=' +
            (saleTab === 'primaryAndSecondary' ? 'all' : saleTab) +
            currencyUrlPart +
            '&convertCurrencies=' +
            convertCurrency
        )
        .catch((error) => {
          if (error && error.message !== 'canceled') {
            console.log(error)
          }
          setLoadingChart(false)
        })
      setLoadingChart(false)

      if (chartDataResponse?.data?.chart?.length > 0) {
        const issuersData = chartDataResponse.data.chart.map((item) => {
          return [item.time, item.sales]
        })
        const volumesData = chartDataResponse.data.chart.map((item) => {
          return [item.time, item.amountInConvertCurrencies[convertCurrency]]
        })
        setChartIssuers(issuersData)
        setChartVolumes(volumesData)
      }
      return
    }
    // end getting the chart data

    let apiUrl =
      'v2/' +
      (xahauNetwork ? 'uritoken' : 'nft') +
      '-volumes-extended?list=' +
      listTab +
      '&convertCurrencies=' +
      convertCurrency +
      '&sortCurrency=' +
      convertCurrency

    if ((listTab === 'issuers' || listTab === 'collections') && extendedStats) {
      apiUrl += '&floorPrice=true&statistics=true'
    }

    apiUrl += currencyUrlPart

    if (!markerPart) {
      setLoading(true)
    }
    setRawData({})

    const response = await axios
      .get(
        apiUrl +
          '&period=' +
          period +
          '&saleType=' +
          (saleTab === 'primaryAndSecondary' ? 'all' : saleTab) +
          markerPart,
        {
          signal: controller.signal
        }
      )
      .catch((error) => {
        if (error && error.message !== 'canceled') {
          setErrorMessage(t('error.' + error.message))
          setLoading(false) //keep here for fast tab clickers
        }
      })
    const newdata = response?.data

    if (newdata) {
      setRawData(newdata)

      if (newdata?.summary) {
        setRawDataSummary(newdata.summary)
      }
      const summary = newdata?.summary || rawDataSummary

      setLoading(false) //keep here for fast tab clickers
      if (newdata[listTab]) {
        let list = newdata[listTab]
        if (list.length > 0) {
          //for CSV export
          for (let i = 0; i < list.length; i++) {
            list[i].volumeInConvertCurrency = niceNumber(list[i].volumesInConvertCurrencies[convertCurrency], 2)
            if (listTab === 'currencies') {
              list[i].amount = amountFormat(list[i]?.volumes[0].amount, {
                maxFractionDigits: 2
              })
            }
            if (listTab === 'collections' && list[i].collectionDetails) {
              list[i].collectionDetails.family = list[i].collectionDetails?.family?.replace(/"/g, '""')
              list[i].collectionDetails.description = list[i].collectionDetails?.description?.replace(/"/g, '""')
              list[i].collectionDetails.name = collectionNameText(list[i])
            }
          }

          setErrorMessage('')
          if (newdata.marker) {
            setHasMore(newdata.marker)
          } else {
            setHasMore(false)
          }
          if (listTab === 'brokers' && summary) {
            const sumAllVolumes = summary.all.volumes
            const sumBrokersVolumes = summary.brokers.volumes
            let sumAllNoBroker = []

            for (let i = 0; i < sumAllVolumes.length; i++) {
              let foundCurrency = false
              for (let j = 0; j < sumBrokersVolumes.length; j++) {
                if (
                  sumAllVolumes[i].amount.currency === sumBrokersVolumes[j].amount.currency &&
                  sumAllVolumes[i].amount.issuer === sumBrokersVolumes[j].amount.issuer
                ) {
                  foundCurrency = true
                  let noBrokerObj = {
                    sales: sumAllVolumes[i].sales - sumBrokersVolumes[j].sales,
                    amountInConvertCurrencies: {}
                  }
                  if (sumAllVolumes[i].amount.currency) {
                    noBrokerObj.amount = {
                      currency: sumAllVolumes[i].amount.currency,
                      issuer: sumAllVolumes[i].amount.issuer,
                      value: sumAllVolumes[i].amount.value - sumBrokersVolumes[j].amount.value
                    }
                  } else {
                    noBrokerObj.amount = sumAllVolumes[i].amount - sumBrokersVolumes[j].amount
                  }
                  noBrokerObj.amountInConvertCurrencies[convertCurrency] =
                    sumAllVolumes[i].amountInConvertCurrencies[convertCurrency] -
                    sumBrokersVolumes[j].amountInConvertCurrencies[convertCurrency]
                  if (noBrokerObj.sales > 0) {
                    sumAllNoBroker.push(noBrokerObj)
                  }
                }
              }
              if (!foundCurrency) {
                sumAllNoBroker.push(sumAllVolumes[i])
              }
            }

            sumAllNoBroker = sumAllNoBroker.sort(function (a, b) {
              if (
                a.amountInConvertCurrencies[convertCurrency] === '' ||
                a.amountInConvertCurrencies[convertCurrency] === null
              )
                return 1
              if (
                b.amountInConvertCurrencies[convertCurrency] === '' ||
                b.amountInConvertCurrencies[convertCurrency] === null
              )
                return -1
              if (a.amountInConvertCurrencies[convertCurrency] === b.amountInConvertCurrencies[convertCurrency])
                return 0
              return parseFloat(a.amountInConvertCurrencies[convertCurrency]) <
                parseFloat(b.amountInConvertCurrencies[convertCurrency])
                ? 1
                : -1
            })

            let volumesInConvertCurrencies = {}
            volumesInConvertCurrencies[convertCurrency] =
              summary.all.volumesInConvertCurrencies[convertCurrency] -
              summary.brokers.volumesInConvertCurrencies[convertCurrency]

            list.push({
              broker: 'no broker',
              sales: summary.all.sales - summary.brokers.sales,
              volumes: sumAllNoBroker,
              volumesInConvertCurrencies
            })
          }

          list = list.sort(function (a, b) {
            if (a.volumesInConvertCurrencies[convertCurrency] === null) return 1
            if (b.volumesInConvertCurrencies[convertCurrency] === null) return -1
            if (a.volumesInConvertCurrencies[convertCurrency] === b.volumesInConvertCurrencies[convertCurrency])
              return 0
            return parseFloat(a.volumesInConvertCurrencies[convertCurrency]) <
              parseFloat(b.volumesInConvertCurrencies[convertCurrency])
              ? 1
              : -1
          })

          setData(list)

          if (!loadMoreRequest) {
            setData(list)
          } else {
            setData([...data, ...list])
          }
        } else {
          setErrorMessage(t('general.no-data'))
        }
      } else {
        if (marker === 'first') {
          setErrorMessage(t('general.no-data'))
        } else {
          setHasMore(false)
        }
        if (newdata.error) {
          setErrorMessage(newdata.error)
        } else {
          setErrorMessage('Error')
          console.log(newdata)
        }
      }
    }
  }

  /*
    //marketplaces
    {
      "list": "marketplaces",
      "period": "all",
      "convertCurrencies": ["usd","xrp"],
      "saleType": "all",
      "summary": {
        "all": {
          "nftokens": {
            "minted": 1230,
            "mintedAndBurned": 1287,
            "burned": 10000
          },
          "marketplaces": {
            "nftokens": {
              "minted": 123,
              "mintedAndBurned": 12,
              "burned": 1000
            },
          }
        }
      },
      "marketplaces": [
        {
          "marketplace": "onchainmarketplace.net",
          "volumes":[
            {
              "amount": {
                "currency": "MRM",
                "issuer": "rNjQ9HZYiBk1WhuscDkmJRSc3gbrBqqAaQ",
                "value": "6400000000"
              },
              "sales": 32,
              "amountInConvertCurrencies": {
                "usd":"199.74774512928965207933856",
                "xrp":"514.011896390483742716"
              }
            }
          ],
          "nftokens": {
            "minted": 12,
            "mintedAndBurned": 1,
            "burned": 10
          },
        }
      ]
    }

  //issuers 
  {
    "list": "issuers",
    "period": "week",
    "convertCurrencies": [
      "usd"
    ],
    "sortCurrency": "usd",
    "saleType": "all",
    "floorPrice": true,
    "marker": "72B5607D00000001",
    "issuers": [
      {
        "floorPrices": [{
          "open": {
            "amount": "1999000000"
          },
          "private": {
            "amount": "925000000",
            "destination": "rpZqTPC8GvrSvEfFsUuHkmPCg29GdQuXhC",
            "destinationDetails": {
              "username": null,
              "service": "bidds"
            }
          }
        }],
        "issuer": "rpbjkoncKiv1LkPWShzZksqYPzKXmUhTW7",
        "issuerDetails": {
          "username": "XPUNKS",
          "service": "XPUNKS"
        },
        "sales": 27,
        "statistics": {
          "buyers": 34,
          "tradedNfts": 91,
          "owners": 243,
          "nfts": 1521
        },
        "volumesInConvertCurrencies": {
          "usd": "16286.165762001945844042528272138513981158549648"
        },
        "volumes": [
          {
            "amount": "24429175000",
            "sales": 21,
            "amountInConvertCurrencies": {
              "usd": "11517.57666125"
            }
          }
        ]
      }
    ]
  }
  */

  useEffect(() => {
    if (windowWidth > 1300 && !filtersHide) {
      setLoadingChart('refresh')
      const timeoutId = setTimeout(() => {
        setLoadingChart(false)
      }, 1)
      return () => clearTimeout(timeoutId)
    }
  }, [filtersHide, windowWidth])

  useEffect(() => {
    if (!convertCurrency) return
    checkApi()

    let queryAddList = []
    let queryRemoveList = []
    const tabsToSet = [
      {
        tabList: listTabList,
        tab: listTab,
        defaultTab: xahauNetwork ? 'issuers' : 'collections',
        setTab: setListTab,
        paramName: 'list'
      },
      {
        tabList: saleTabList,
        tab: saleTab,
        defaultTab: 'secondary',
        setTab: setSaleTab,
        paramName: 'sale'
      }
    ]
    if (
      !currencyTab ||
      (currencyTab.toUpperCase() !== nativeCurrency && !isAddressOrUsername(currencyIssuer)) ||
      listTab === 'currencies'
    ) {
      queryRemoveList = ['currency', 'currencyIssuer']
    }

    if (currencyTab === '') {
      queryRemoveList = ['currency', 'currencyIssuer']
    } else if (currencyTab === nativeCurrency) {
      queryAddList.push({
        name: 'currency',
        value: nativeCurrency
      })
    }

    if (!extendedStats) {
      queryAddList.push({
        name: 'extendedStats',
        value: false
      })
    } else {
      queryRemoveList.push('extendedStats')
    }

    setTabParams(router, tabsToSet, queryAddList, queryRemoveList)

    setSortConfig({})

    return () => {
      controller.abort()
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saleTab, period, listTab, currencyIssuer, convertCurrency, extendedStats, currencyTab])

  const urlParams = (volume, options) => {
    let urlPart = '?period=' + period + '&sale=' + (saleTab === 'primaryAndSecondary' ? 'all' : saleTab)
    if (volume?.volumes && volume?.volumes.length === 1 && !options?.excludeCurrency) {
      if (volume.volumes[0].amount.currency) {
        urlPart =
          urlPart +
          '&currency=' +
          volume.volumes[0].amount.currency +
          '&currencyIssuer=' +
          volume.volumes[0].amount.issuer
      } else {
        urlPart = urlPart + '&currency=' + nativeCurrency
      }
    }
    if (!options?.excludeIssuer) {
      if (volume?.issuer) {
        urlPart = urlPart + '&issuer=' + usernameOrAddress(volume, 'issuer')
      } else if (nonSologenic(volume)) {
        urlPart =
          urlPart +
          '&issuer=' +
          usernameOrAddress(volume.collectionDetails, 'issuer') +
          '&taxon=' +
          volume.collectionDetails.taxon
      } else if (volume?.collection) {
        urlPart = urlPart + '&collection=' + volume.collection
      }
    }
    if (volume?.marketplace) {
      urlPart += '&marketplace=' + volume.marketplace
    }
    return urlPart + '&includeWithoutMediaData=true'
  }

  const nftExplorerLink = (data, options = {}) => {
    if (!data) return ''
    const { onSale, text } = options
    let params = '?includeWithoutMediaData=true'
    if (data.marketplace) {
      params += '&includeBurned=true&mintedByMarketplace=' + data.marketplace + '&mintedPeriod=' + period
    } else if (
      data.collectionDetails?.issuer &&
      (data.collectionDetails?.taxon || data.collectionDetails?.taxon === 0)
    ) {
      params +=
        '&issuer=' + usernameOrAddress(data.collectionDetails, 'issuer') + '&taxon=' + data.collectionDetails.taxon
    } else if (data.issuer) {
      params += '&issuer=' + usernameOrAddress(data, 'issuer')
    } else if (data.collection) {
      params += '&collection=' + data.collection
    } else {
      return ''
    }
    return <Link href={'/nft-explorer' + params + (onSale ? '&list=onSale' : '')}>{text || <LinkIcon />}</Link>
  }

  const nftDistributionLink = (data) => {
    if (!data) return ''
    let params = '?issuer='
    if (data.collectionDetails?.issuer && (data.collectionDetails?.taxon || data.collectionDetails?.taxon === 0)) {
      params += usernameOrAddress(data.collectionDetails, 'issuer') + '&taxon=' + data.collectionDetails.taxon
    } else if (data.issuer) {
      params += usernameOrAddress(data, 'issuer')
    } else {
      return ''
    }
    return (
      <Link href={'/nft-distribution/' + params}>
        <LinkIcon />
      </Link>
    )
  }

  const nftSalesLink = (data) => {
    if (!data) return ''
    return (
      <>
        {' '}
        <Link href={'/nft-sales' + urlParams(data)}>
          <LinkIcon />
        </Link>
      </>
    )
  }

  const nftVolumesLink = (data) => {
    if (!data || xahauNetwork) return ''
    if (data.issuer) {
      return (
        <>
          {' '}
          <Link
            href={
              '/nft-volumes/' +
              usernameOrAddress(data, 'issuer') +
              urlParams(data, { excludeIssuer: true, excludeCurrency: true })
            }
          >
            <LinkIcon />
          </Link>
        </>
      )
    }
  }

  const sortTable = (key) => {
    if (!data || !data[0] || !(data[0][key] || data[0].volumesInConvertCurrencies[convertCurrency])) return
    let direction = 'descending'
    let sortA = 1
    let sortB = -1

    if (sortConfig.key === key && sortConfig.direction === direction) {
      direction = 'ascending'
      sortA = -1
      sortB = 1
    }
    setSortConfig({ key, direction })
    if (key === 'amount') {
      setData(
        data.sort(function (a, b) {
          if (
            a.volumesInConvertCurrencies[convertCurrency] === '' ||
            a.volumesInConvertCurrencies[convertCurrency] === null
          )
            return 1
          if (
            b.volumesInConvertCurrencies[convertCurrency] === '' ||
            b.volumesInConvertCurrencies[convertCurrency] === null
          )
            return -1
          if (a.volumesInConvertCurrencies[convertCurrency] === b.volumesInConvertCurrencies[convertCurrency]) return 0
          return parseFloat(a.volumesInConvertCurrencies[convertCurrency]) <
            parseFloat(b.volumesInConvertCurrencies[convertCurrency])
            ? sortA
            : sortB
        })
      )
    } else if (sortConfig.key?.includes('.')) {
      const keys = sortConfig.key.split('.')
      setData(
        data.sort(function (a, b) {
          return parseFloat(a[keys[0]]?.[keys[1]]) < parseFloat(b[keys[0]]?.[keys[1]]) ? sortA : sortB
        })
      )
    } else {
      setData(data.sort((a, b) => (parseFloat(a[key]) < parseFloat(b[key]) ? sortA : sortB)))
    }
  }

  const bestFloor = (priceFloor) => {
    if (!priceFloor) return {}
    let open = null
    let priv = null

    if (priceFloor.open?.amount?.value) {
      open = Number(priceFloor.open.amount.value)
    } else if (priceFloor.open?.amount) {
      open = Number(priceFloor.open.amount)
    }

    if (priceFloor.private?.amount?.value) {
      priv = Number(priceFloor.private.amount.value)
    } else if (priceFloor.private?.amount) {
      priv = Number(priceFloor.private.amount)
    }

    if (!open && !priv) return {}

    let floor = priceFloor.private?.amount
    let priceColor = 'orange'
    let service = priceFloor.private?.destinationDetails.service || 'Private market'
    if (open && priv) {
      if (open <= priv) {
        floor = priceFloor.open?.amount
        priceColor = ''
        service = ''
      }
    } else if (open) {
      floor = priceFloor.open?.amount
      priceColor = ''
      service = ''
    }
    return {
      floor,
      priceColor,
      service
    }
  }

  const trWithPriceAndMarketPlace = (j, priceFloor) => {
    const { floor, service } = bestFloor(priceFloor)
    if (!floor) return
    return (
      <tr key={j}>
        {/* <td className='center'>{j + 1}</td> */}
        <td className="right">{amountFormat(floor, { maxFractionDigits: 2 })}</td>
        <td className="right">{service}</td>
      </tr>
    )
  }

  const showFloor = (volume) => {
    const floorPrices = volume.floorPrices
    if (!floorPrices || floorPrices.length < 1) return ''
    let priceFloor = floorPrices[0]

    const { floor, priceColor } = bestFloor(priceFloor)

    let output = amountFormat(floor, { tooltip: 'left', maxFractionDigits: 2 })
    if (output && priceColor === 'orange') {
      let tableWithFloors = (
        <table
          className={windowWidth > 1000 ? 'tooltiptext left table-large shrink' : 'table-mobile'}
          style={
            windowWidth > 1000
              ? { width: '300px', transition: 'none' }
              : { width: 'calc(100% - 22px)', margin: '10px 0' }
          }
        >
          <thead>
            <tr>
              {/* <th className='center'>{t("table.index")}</th> */}
              <th className="right">{t('table.price')}</th>
              <th className="right">{t('table.marketplace')}</th>
            </tr>
          </thead>
          <tbody>{floorPrices.map((vol, j) => trWithPriceAndMarketPlace(j, vol))}</tbody>
        </table>
      )
      if (windowWidth > 1000) {
        output = (
          <span className={'tooltip ' + priceColor}>
            {output}
            {tableWithFloors}
          </span>
        )
      } else {
        return (
          <>
            {output}
            {nftExplorerLink(volume, { onSale: true })}
            {tableWithFloors}
          </>
        )
      }
    }
    if (output) {
      return (
        <>
          {output} {nftExplorerLink(volume, { onSale: true })}
        </>
      )
    } else {
      return ''
    }
  }

  const handleClick = async (url) => {
    // Wait for route change before do anything
    await router.push(url)
    // Reload after routing
    router.reload()
  }

  const chartDivStyle =
    windowWidth > 600
      ? { flexGrow: 0, flexBasis: 'calc(60% - 20px)' }
      : { width: '100%', marginLeft: 0, marginRight: '10px' }

  const collectionNameText = (data) => {
    if (data.collectionDetails?.name) return data.collectionDetails.name.replace(/"/g, '""')
    if (!data?.collectionDetails?.issuerDetails) return data.collection
    const { service, username } = data.collectionDetails.issuerDetails
    if (service || username) {
      return service || username // + ' (' + data.collectionDetails.taxon + ')'
    }
    return data.collection
  }

  const collectionName = (data, type) => {
    if (!data?.collection) return ''
    if (!data.collectionDetails) return data.collection
    const { name, family, description, issuer, taxon } = data.collectionDetails

    if (type === 'mobile') {
      return (
        <>
          {family && (
            <p>
              {t('table.collection-family')}: {family}
            </p>
          )}
          {name && (
            <p>
              {t('table.name')}: <b>{name}</b>
            </p>
          )}
          {!family && !name && (
            <p>
              {t('table.collection')}: {collectionNameText(data)}
            </p>
          )}
          {description && (
            <p>
              {t('table.description')}: {description}
            </p>
          )}
          {nonSologenic(data) && (
            <>
              <p>
                {t('table.issuer')}: {issuer}
              </p>
              <p>
                {t('table.taxon')}: {taxon}
              </p>
            </>
          )}
        </>
      )
    }

    let nameLink = nftExplorerLink(data, {
      text: name || collectionNameText(data)
    })

    if (family) {
      if (
        name &&
        !family.toLowerCase().includes(name.toLowerCase()) &&
        !name.toLowerCase().includes(family.toLowerCase())
      ) {
        return (
          <>
            {family}: <b>{nameLink}</b>
          </>
        )
      }
    }
    if (name) {
      return <b>{nameLink}</b>
    }
    return nameLink
  }

  const nonSologenic = (data) => {
    return data?.collectionDetails?.issuer && (data?.collectionDetails?.taxon || data?.collectionDetails?.taxon === 0)
  }

  return (
    <>
      <SEO
        title={
          t('header', { ns: 'nft-volumes' }) +
          ' ' +
          t('tabs.' + listTab) +
          ' ' +
          (saleTab === 'secondary' ? t('tabs.secondary-sales') : '') +
          (saleTab === 'primary' ? t('tabs.primary-sales') : '') +
          (currencyTab ? ' ' + currencyTab : '') +
          (currencyIssuer ? ' ' + currencyIssuer : '') +
          (listTab === 'list' ? ' ' + t('tabs.list') : '') +
          (period ? ' ' + period : '')
        }
        images={
          xahauNetwork
            ? []
            : [
                {
                  width: 1200,
                  height: 630,
                  file: 'previews/1200x630/nft-volumes.png'
                },
                {
                  width: 630,
                  height: 630,
                  file: 'previews/630x630/nft-volumes.png'
                }
              ]
        }
      />

      <h1 className="center">{t('header', { ns: 'nft-volumes' }) + ' '}</h1>
      <div className="tabs-inline">
        <Tabs tabList={listTabList} tab={listTab} setTab={setListTab} name="list" />
      </div>

      <FiltersFrame
        contentStyle={{ marginTop: 0 }}
        count={data?.length}
        hasMore={hasMore}
        data={listTab === 'charts' ? [] : data || []}
        csvHeaders={csvHeaders}
        filtersHide={filtersHide}
        setFiltersHide={setFiltersHide}
      >
        <>
          <div>
            {(listTab === 'issuers' || listTab === 'collections') && (
              <CheckBox checked={extendedStats} setChecked={setExtendedStats}>
                {t('table.text.show-extended-statistics')}
              </CheckBox>
            )}
          </div>
          <div>
            {t('table.period')}
            <DateAndTimeRange
              periodQueryName="period"
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
          {!currencyIssuer && listTab !== 'currencies' && (
            <div>
              {t('tabs.currencies')}
              <RadioOptions tabList={currencyTabList} tab={currencyTab} setTab={setCurrencyTab} name="currency" />
            </div>
          )}
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
        </>
        <>
          {listTab === 'charts' ? (
            <>
              <center>
                {loadingChart ? (
                  <>
                    {loadingChart !== 'refresh' && (
                      <>
                        <br />
                        <span className="waiting"></span>
                        <br />
                        {t('general.loading')}
                        <br />
                        <br />
                      </>
                    )}
                  </>
                ) : (
                  <>
                    {chartIssuers.length > 0 && chartVolumes.length > 0 && (
                      <div className="flex" style={{ marginLeft: '10px', justifyContent: 'center' }}>
                        <div style={chartDivStyle}>
                          <h3>
                            {t('sales-chart', { ns: 'nft-volumes' })} / {t('volumes-chart', { ns: 'nft-volumes' })} (
                            {convertCurrency?.toUpperCase()})
                          </h3>
                          <SimpleChart
                            currency={selectedCurrency}
                            data={[
                              { name: t('table.sales'), data: chartIssuers },
                              { name: t('table.volume'), data: chartVolumes }
                            ]}
                            combined={true}
                          />
                        </div>
                      </div>
                    )}
                  </>
                )}
              </center>
            </>
          ) : (
            <>
              {listTab !== 'currencies' && (
                <div className="text-after-filter-toggle" style={{ marginTop: '-15px' }}>
                  {!xahauNetwork && <p>{t(listTab + '.desc', { ns: 'nft-volumes', explorerName })}</p>}
                  <p>
                    {loading ? (
                      t('general.loading')
                    ) : (
                      <>
                        {rawDataSummary && (
                          <>
                            {listTab === 'brokers' ? (
                              <Trans i18nKey="brokers.text0" ns="nft-volumes">
                                XRPL had {{ allSales: shortNiceNumber(rawDataSummary.all.sales, 0) }}{' '}
                                <b>
                                  {{ currency: currencyIssuer ? niceCurrency(currency) : currencyTab.toUpperCase() }}
                                </b>{' '}
                                NFT{' '}
                                {{
                                  saleType:
                                    saleTab === 'primaryAndSecondary'
                                      ? ''
                                      : ('(' + t('tabs.' + saleTab + '-sales')).toLocaleLowerCase() + ')'
                                }}{' '}
                                sales for{' '}
                                {{
                                  allVolume: niceNumber(
                                    rawDataSummary.all.volumesInConvertCurrencies[convertCurrency],
                                    0,
                                    convertCurrency
                                  )
                                }}
                                , from which <b>{{ brokerSales: shortNiceNumber(rawDataSummary.brokers?.sales, 0) }}</b>{' '}
                                {{
                                  percentBrokerSales: percentFormat(
                                    rawDataSummary.brokers?.sales,
                                    rawDataSummary.all.sales
                                  )
                                }}{' '}
                                of trades for{' '}
                                <b>
                                  {{
                                    brokerVolume: niceNumber(
                                      rawDataSummary.brokers?.volumesInConvertCurrencies[convertCurrency],
                                      0,
                                      convertCurrency
                                    )
                                  }}
                                </b>{' '}
                                {{
                                  percentBrokerVolume: percentFormat(
                                    rawDataSummary.brokers?.volumesInConvertCurrencies[convertCurrency],
                                    rawDataSummary.all.volumesInConvertCurrencies[convertCurrency]
                                  )
                                }}{' '}
                                were through the brokerage model.
                              </Trans>
                            ) : (
                              <Trans i18nKey="text0" ns="nft-volumes">
                                {{ explorerName }} had {{ allSales: shortNiceNumber(rawDataSummary.all.sales, 0) }}{' '}
                                {{ currency: currencyIssuer ? niceCurrency(currency) : currencyTab.toUpperCase() }} NFT{' '}
                                {{
                                  saleType:
                                    saleTab === 'primaryAndSecondary'
                                      ? ''
                                      : ('(' + t('tabs.' + saleTab + '-sales')).toLocaleLowerCase() + ')'
                                }}{' '}
                                sales for{' '}
                                {{
                                  allVolume: niceNumber(
                                    rawDataSummary.all.volumesInConvertCurrencies[convertCurrency],
                                    0,
                                    convertCurrency
                                  )
                                }}
                                .
                              </Trans>
                            )}
                          </>
                        )}
                      </>
                    )}
                  </p>
                </div>
              )}
              <InfiniteScroll
                dataLength={data.length}
                next={checkApi}
                hasMore={hasMore}
                loader={
                  !errorMessage && (
                    <p className="center">
                      {hasMore !== 'first' ? (
                        <>
                          {!sessionToken ? (
                            <Trans i18nKey="general.login-to-bithomp-pro">
                              Loading more data is available to <Link href="/admin">logged-in</Link> Bithomp Pro
                              subscribers.
                            </Trans>
                          ) : (
                            <>
                              {!subscriptionExpired ? (
                                t('general.loading')
                              ) : (
                                <Trans i18nKey="general.renew-bithomp-pro">
                                  Your Bithomp Pro subscription has expired.
                                  <Link href="/admin/subscriptions">Renew your subscription</Link>.
                                </Trans>
                              )}
                            </>
                          )}
                        </>
                      ) : (
                        t('general.loading')
                      )}
                    </p>
                  )
                }
                endMessage={<p className="center">End of list</p>}
              >
                {windowWidth > 1000 || !['issuers', 'collections', 'marketplaces'].includes(listTab) ? (
                  <table className="table-large expand">
                    <thead>
                      <tr>
                        <th className="center">{t('table.index')}</th>
                        {listTab === 'collections' && <th>{t('table.name')}</th>}
                        {listTab === 'marketplaces' && <th>{t('table.marketplace')}</th>}
                        {listTab === 'marketplaces' && <th className="right">{t('table.minted')}</th>}
                        {listTab === 'issuers' && <th>{t('table.issuer')}</th>}
                        {(listTab === 'issuers' || listTab === 'collections') && extendedStats && (
                          <th className="right hide-on-mobile">
                            {t('table.nfts-now')}{' '}
                            <b
                              className={'link' + (sortConfig.key === 'nfts' ? ' orange' : '')}
                              onClick={() => sortTable('nfts')}
                            >
                              ⇅
                            </b>
                          </th>
                        )}
                        {(listTab === 'issuers' || listTab === 'collections') && extendedStats && (
                          <th className="right hide-on-mobile">
                            {t('table.owners-now')}{' '}
                            <b
                              className={'link' + (sortConfig.key === 'owners' ? ' orange' : '')}
                              onClick={() => sortTable('owners')}
                            >
                              ⇅
                            </b>
                          </th>
                        )}
                        {(listTab === 'issuers' || listTab === 'collections') && extendedStats && (
                          <th className="right">{t('table.floor-now')}</th>
                        )}
                        {(listTab === 'issuers' || listTab === 'collections') && extendedStats && (
                          <th className="right hide-on-mobile">
                            {t('table.traded-nfts')}{' '}
                            <b
                              className={'link' + (sortConfig.key === 'tradedNfts' ? ' orange' : '')}
                              onClick={() => sortTable('tradedNfts')}
                            >
                              ⇅
                            </b>
                          </th>
                        )}
                        {listTab === 'brokers' && <th>{t('table.broker')}</th>}
                        {listTab === 'currencies' && <th>{t('table.issuers')}</th>}
                        <th className="right">
                          {t('table.sales')}{' '}
                          <b
                            className={'link' + (sortConfig.key === 'sales' ? ' orange' : '')}
                            onClick={() => sortTable('sales')}
                          >
                            ⇅
                          </b>
                        </th>
                        {(listTab === 'issuers' || listTab === 'collections') && extendedStats && (
                          <th className="right hide-on-mobile">
                            {t('table.buyers')}{' '}
                            <b
                              className={'link' + (sortConfig.key === 'buyers' ? ' orange' : '')}
                              onClick={() => sortTable('buyers')}
                            >
                              ⇅
                            </b>
                          </th>
                        )}
                        {(listTab === 'currencies' ||
                          (currency && currencyIssuer) ||
                          currencyTab === nativeCurrency) && <th className="right">{t('table.volume')}</th>}
                        <th className="right">
                          {t('table.volume')} ({convertCurrency?.toUpperCase()}){' '}
                          <b
                            className={'link' + (sortConfig.key === 'amount' ? ' orange' : '')}
                            onClick={() => sortTable('amount')}
                          >
                            ⇅
                          </b>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {loading ? (
                        <tr className="center">
                          <td colSpan="100">
                            <br />
                            <span className="waiting"></span>
                            <br />
                            {t('general.loading')}
                            <br />
                            <br />
                          </td>
                        </tr>
                      ) : (
                        <>
                          {!errorMessage && data ? (
                            <>
                              {data.length > 0 &&
                                data.map((volume, i) => (
                                  <tr key={i}>
                                    <td className="center">{i + 1}</td>
                                    {listTab === 'collections' && (
                                      <td>
                                        {collectionThumbnail(volume.collectionDetails)} {collectionName(volume)}
                                      </td>
                                    )}
                                    {listTab === 'marketplaces' && <td>{volume.marketplace}</td>}
                                    {listTab === 'marketplaces' && (
                                      <td className="right">
                                        {xahauNetwork ? (
                                          <>
                                            {shortNiceNumber(volume.uritokens?.minted, 0)}{' '}
                                            {volume.uritokens?.minted ? nftExplorerLink(volume) : ''}
                                          </>
                                        ) : (
                                          <>
                                            {shortNiceNumber(volume.nftokens?.minted, 0)}{' '}
                                            {volume.nftokens?.minted ? nftExplorerLink(volume) : ''}
                                          </>
                                        )}
                                      </td>
                                    )}
                                    {listTab === 'issuers' && (
                                      <td>{addressUsernameOrServiceLink(volume, 'issuer', { short: true })}</td>
                                    )}
                                    {(listTab === 'issuers' || listTab === 'collections') && extendedStats && (
                                      <td className="right">
                                        {shortNiceNumber(volume.statistics?.nfts, 0)} {nftExplorerLink(volume)}
                                      </td>
                                    )}
                                    {(listTab === 'issuers' || listTab === 'collections') && extendedStats && (
                                      <td className="right">
                                        {shortNiceNumber(volume.statistics?.owners, 0)} {nftDistributionLink(volume)}
                                      </td>
                                    )}
                                    {(listTab === 'issuers' || listTab === 'collections') && extendedStats && (
                                      <td className="right">{showFloor(volume)}</td>
                                    )}
                                    {(listTab === 'issuers' || listTab === 'collections') && extendedStats && (
                                      <td className="right">{shortNiceNumber(volume.statistics?.tradedNfts, 0)}</td>
                                    )}
                                    {listTab === 'brokers' && (
                                      <td>
                                        {addressUsernameOrServiceLink(volume, 'broker', {
                                          short: true,
                                          noBroker: t('brokers.no-broker', { ns: 'nft-volumes' })
                                        })}
                                      </td>
                                    )}
                                    {listTab === 'currencies' && (
                                      <td className="center">
                                        <Link
                                          href={'/nft-volumes' + urlParams(volume) + '&list=issuers'}
                                          onClick={() =>
                                            handleClick('/nft-volumes' + urlParams(volume) + '&list=issuers')
                                          }
                                        >
                                          <LinkIcon />
                                        </Link>
                                      </td>
                                    )}
                                    <td className="right">
                                      {shortNiceNumber(volume.sales, 0)}
                                      {rawDataSummary && <> {percentFormat(volume.sales, rawDataSummary.all.sales)}</>}
                                      {listTab !== 'brokers' && nftSalesLink(volume)}
                                    </td>
                                    {(listTab === 'issuers' || listTab === 'collections') && extendedStats && (
                                      <td className="right hide-on-mobile">
                                        {shortNiceNumber(volume.statistics?.buyers, 0)}
                                      </td>
                                    )}
                                    {(listTab === 'currencies' ||
                                      (currency && currencyIssuer) ||
                                      currencyTab === nativeCurrency) && (
                                      <td className="right">
                                        {amountFormat(volume.volumes?.[0]?.amount, { maxFractionDigits: 2 })}
                                      </td>
                                    )}
                                    <td className="right">
                                      <span className={listTab !== 'currencies' ? 'tooltip' : ''}>
                                        {niceNumber(
                                          volume.volumesInConvertCurrencies[convertCurrency],
                                          2,
                                          convertCurrency
                                        )}
                                        {listTab !== 'currencies' && (
                                          <table
                                            className="tooltiptext left table-large shrink"
                                            style={{ width: '490px', transition: 'none' }}
                                          >
                                            <thead>
                                              <tr>
                                                <th className="center">{t('table.index')}</th>
                                                <th className="right">{t('table.sales')}</th>
                                                <th className="right">{t('table.volume')}</th>
                                                <th className="right">
                                                  {t('table.volume')} ({convertCurrency?.toUpperCase()})
                                                </th>
                                              </tr>
                                            </thead>
                                            <tbody>
                                              {volume.volumes?.map((vol, j) => (
                                                <tr key={j}>
                                                  <td className="center">{j + 1}</td>
                                                  <td className="right">{vol.sales}</td>
                                                  <td className="right">
                                                    {amountFormat(vol.amount, { maxFractionDigits: 2 })}
                                                  </td>
                                                  <td className="right">
                                                    {niceNumber(
                                                      vol.amountInConvertCurrencies[convertCurrency],
                                                      2,
                                                      convertCurrency
                                                    )}
                                                  </td>
                                                </tr>
                                              ))}
                                            </tbody>
                                          </table>
                                        )}
                                      </span>{' '}
                                      {percentFormat(
                                        volume.volumesInConvertCurrencies[convertCurrency],
                                        rawDataSummary?.all.volumesInConvertCurrencies[convertCurrency]
                                      )}
                                      {(listTab === 'issuers' || listTab === 'collections') && nftVolumesLink(volume)}
                                    </td>
                                  </tr>
                                ))}
                            </>
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
                    <thead></thead>
                    <tbody>
                      {loading ? (
                        <tr className="center">
                          <td colSpan="100">
                            <br />
                            <span className="waiting"></span>
                            <br />
                            {t('general.loading')}
                            <br />
                            <br />
                          </td>
                        </tr>
                      ) : (
                        <>
                          {!errorMessage ? (
                            data.map((volume, i) => (
                              <tr key={i}>
                                <td style={{ padding: '5px' }} className="center">
                                  <b>{i + 1}</b>
                                  {listTab === 'collections' &&
                                    (volume?.collectionDetails?.image || volume?.collectionDetails?.video) && (
                                      <>
                                        <br />
                                        <br />
                                        {collectionThumbnail(volume.collectionDetails)}
                                      </>
                                    )}
                                </td>
                                <td>
                                  {listTab === 'collections' && collectionName(volume, 'mobile')}
                                  {listTab === 'marketplaces' && (
                                    <p>
                                      {t('table.marketplace')}: {volume.marketplace}
                                    </p>
                                  )}
                                  {listTab === 'marketplaces' &&
                                    (volume.nftokens?.minted || volume.nftokens?.minted === 0) && (
                                      <p>
                                        {t('table.minted')}: {shortNiceNumber(volume.nftokens?.minted, 0)}{' '}
                                        {t('table.nfts')}
                                      </p>
                                    )}
                                  {listTab === 'issuers' && (
                                    <p>
                                      {t('table.issuer')}: {addressUsernameOrServiceLink(volume, 'issuer')}
                                    </p>
                                  )}
                                  {(listTab === 'issuers' || listTab === 'collections') && extendedStats && (
                                    <>
                                      <p>
                                        {t('table.nfts-now')}: {shortNiceNumber(volume.statistics?.nfts, 0)}{' '}
                                        {nftExplorerLink(volume)}
                                      </p>
                                      <p>
                                        {t('table.owners-now')}: {shortNiceNumber(volume.statistics?.owners, 0)}{' '}
                                        {nftDistributionLink(volume)}
                                      </p>
                                      {showFloor(volume) ? (
                                        <div>
                                          {t('table.floor-now')}: {showFloor(volume)}
                                        </div>
                                      ) : (
                                        ''
                                      )}
                                      <p>
                                        {t('table.traded-nfts')}: {shortNiceNumber(volume.statistics?.tradedNfts, 0)}
                                      </p>
                                    </>
                                  )}
                                  <p>
                                    {t('table.sales')}: {shortNiceNumber(volume.sales, 0)}
                                    {rawDataSummary && <> {percentFormat(volume.sales, rawDataSummary.all.sales)}</>}
                                    {listTab !== 'brokers' && nftSalesLink(volume)}
                                  </p>
                                  {extendedStats && (
                                    <p>
                                      {t('table.buyers')}: {shortNiceNumber(volume.statistics?.buyers, 0)}
                                    </p>
                                  )}
                                  <div>
                                    {t('table.volume')}:{' '}
                                    {niceNumber(volume.volumesInConvertCurrencies[convertCurrency], 2, convertCurrency)}
                                    {rawDataSummary && (
                                      <>
                                        {' '}
                                        {percentFormat(
                                          volume.volumesInConvertCurrencies[convertCurrency],
                                          rawDataSummary.all.volumesInConvertCurrencies[convertCurrency]
                                        )}
                                      </>
                                    )}
                                    {(listTab === 'issuers' || listTab === 'collections') && nftVolumesLink(volume)}
                                    <table
                                      className="table-mobile"
                                      style={{ width: 'calc(100% - 22px)', margin: '10px 0' }}
                                    >
                                      <thead>
                                        <tr>
                                          <th className="center">{t('table.index')}</th>
                                          <th className="right">{t('table.sales')}</th>
                                          <th className="right">{t('table.volume')}</th>
                                          <th className="right">
                                            {t('table.volume')} ({convertCurrency?.toUpperCase()})
                                          </th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {volume.volumes.map((vol, j) => (
                                          <tr key={j}>
                                            <td className="center">{j + 1}</td>
                                            <td className="right">{vol.sales}</td>
                                            <td className="right">
                                              {amountFormat(vol.amount, { maxFractionDigits: 2 })}
                                            </td>
                                            <td className="right">
                                              {niceNumber(
                                                vol.amountInConvertCurrencies[convertCurrency],
                                                2,
                                                convertCurrency
                                              )}
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
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
              </InfiniteScroll>
            </>
          )}
        </>
      </FiltersFrame>
    </>
  )
}

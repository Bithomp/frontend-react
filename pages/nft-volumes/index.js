import { useTranslation, Trans } from 'next-i18next'
import { useState, useEffect } from 'react'
import axios from 'axios'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { useRouter } from 'next/router'
import Link from 'next/link'

export const getServerSideProps = async ({ query, locale }) => {
  const { period, sale, list, currency, currencyIssuer, sortCurrency } = query
  return {
    props: {
      periodNameQuery: period || "week",
      sale: sale || "secondary",
      list: list || "issuers",
      currency: currency || "",
      currencyIssuer: currencyIssuer || "",
      sortCurrency: sortCurrency || "",
      ...(await serverSideTranslations(locale, ['common'])),
    },
  }
}

import SEO from '../../components/SEO'
import Tabs from '../../components/Tabs'
import CheckBox from '../../components/UI/CheckBox'
import DateAndTimeRange from '../../components/UI/DateAndTimeRange'

import { setTabParams, stripText, isAddressOrUsername, useWidth } from '../../utils'
import {
  amountFormat,
  shortNiceNumber,
  addressUsernameOrServiceLink,
  usernameOrAddress,
  persentFormat,
  niceNumber
} from '../../utils/format'

import LinkIcon from "../../public/images/link.svg"

export default function NftVolumes({
  periodNameQuery,
  sale,
  list,
  currency,
  currencyIssuer,
  selectedCurrency,
  sortCurrency
}) {
  const { t } = useTranslation()
  const router = useRouter()
  const windowWidth = useWidth()

  const { isReady } = router

  const [data, setData] = useState([])
  const [rawData, setRawData] = useState({})
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")
  const [period, setPeriod] = useState("")
  const [saleTab, setSaleTab] = useState(sale)
  const [listTab, setListTab] = useState(list)
  const [currencyTab, setCurrencyTab] = useState(currency?.toLowerCase())
  const [sortConfig, setSortConfig] = useState({})
  const [issuersExtended, setIssuersExtended] = useState(false)

  const convertCurrency = sortCurrency || selectedCurrency

  const listTabList = [
    { value: 'issuers', label: (t("tabs.issuers")) },
    { value: 'marketplaces', label: (t("tabs.marketplaces")) },
    { value: 'currencies', label: (t("tabs.currencies")) },
    { value: 'brokers', label: (t("tabs.brokers")) }
  ]

  const saleTabList = [
    { value: 'primaryAndSecondary', label: t("tabs.primaryAndSecondary-sales") },
    { value: 'secondary', label: (t("tabs.secondary-sales")) },
    { value: 'primary', label: (t("tabs.primary-sales")) }
  ]

  const currencyTabList = [
    { value: '', label: t("tabs.all-tokens") },
    { value: 'xrp', label: (t("tabs.xrp-only")) }
  ]

  const controller = new AbortController()

  const checkApi = async () => {
    if (!period || !listTab || !convertCurrency) return

    let apiUrl = 'v2/nft-volumes-extended?list=' + listTab + '&convertCurrencies=' + convertCurrency + '&sortCurrency=' + convertCurrency

    if (listTab === 'issuers' && issuersExtended) {
      apiUrl += '&floorPrice=true&statistics=true'
    }
    if (listTab !== 'currencies') {
      if (currency && currencyIssuer) {
        apiUrl += '&currency=' + stripText(currency) + '&currencyIssuer=' + stripText(currencyIssuer)
      } else if (currencyTab === 'xrp') {
        apiUrl += '&currency=xrp'
      }
    }

    setLoading(true)
    setRawData({})
    setData([])

    const response = await axios.get(apiUrl + '&period=' + period + '&saleType=' + saleTab, {
      signal: controller.signal
    }).catch(error => {
      if (error && error.message !== "canceled") {
        setErrorMessage(t("error." + error.message))
        setLoading(false) //keep here for fast tab clickers
      }
    })
    const newdata = response?.data;

    if (newdata) {
      setRawData(newdata)
      setLoading(false) //keep here for fast tab clickers
      if (newdata.period) {
        let list = newdata[listTab]
        if (list.length > 0) {
          setErrorMessage("")
          if (listTab === 'brokers' && newdata.summary) {
            const sumAllVolumes = newdata.summary.all.volumes
            const sumBrokersVolumes = newdata.summary.brokers.volumes
            let sumAllNoBroker = []

            for (let i = 0; i < sumAllVolumes.length; i++) {
              let foundCurrency = false
              for (let j = 0; j < sumBrokersVolumes.length; j++) {
                if (sumAllVolumes[i].amount.currency === sumBrokersVolumes[j].amount.currency && sumAllVolumes[i].amount.issuer === sumBrokersVolumes[j].amount.issuer) {
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
                  noBrokerObj.amountInConvertCurrencies[convertCurrency] = sumAllVolumes[i].amountInConvertCurrencies[convertCurrency] - sumBrokersVolumes[j].amountInConvertCurrencies[convertCurrency]
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
              if (a.amountInConvertCurrencies[convertCurrency] === "" || a.amountInConvertCurrencies[convertCurrency] === null) return 1
              if (b.amountInConvertCurrencies[convertCurrency] === "" || b.amountInConvertCurrencies[convertCurrency] === null) return -1
              if (a.amountInConvertCurrencies[convertCurrency] === b.amountInConvertCurrencies[convertCurrency]) return 0
              return (parseFloat(a.amountInConvertCurrencies[convertCurrency]) < parseFloat(b.amountInConvertCurrencies[convertCurrency])) ? 1 : -1
            })

            let volumesInConvertCurrencies = {}
            volumesInConvertCurrencies[convertCurrency] = newdata.summary.all.volumesInConvertCurrencies[convertCurrency] - newdata.summary.brokers.volumesInConvertCurrencies[convertCurrency]

            list.push({
              broker: "no broker",
              sales: newdata.summary.all.sales - newdata.summary.brokers.sales,
              volumes: sumAllNoBroker,
              volumesInConvertCurrencies
            })
          }
          setData(list.sort(function (a, b) {
            if (a.volumesInConvertCurrencies[convertCurrency] === null) return 1
            if (b.volumesInConvertCurrencies[convertCurrency] === null) return -1
            if (a.volumesInConvertCurrencies[convertCurrency] === b.volumesInConvertCurrencies[convertCurrency]) return 0
            return (parseFloat(a.volumesInConvertCurrencies[convertCurrency]) < parseFloat(b.volumesInConvertCurrencies[convertCurrency])) ? 1 : -1
          }))
        } else {
          setErrorMessage(t("general.no-data"))
        }
      } else {
        if (newdata.error) {
          setErrorMessage(newdata.error)
        } else {
          setErrorMessage("Error")
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
              "service": "onXRP"
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
    if (!convertCurrency) return
    checkApi()

    let queryAddList = []
    let queryRemoveList = []
    const tabsToSet = [
      {
        tabList: listTabList,
        tab: listTab,
        defaultTab: "issuers",
        setTab: setListTab,
        paramName: "list"
      },
      {
        tabList: saleTabList,
        tab: saleTab,
        defaultTab: "secondary",
        setTab: setSaleTab,
        paramName: "sale"
      }
    ]
    if ((!currency || (currency.toLowerCase() !== 'xrp' && !isAddressOrUsername(currencyIssuer))) || listTab === 'currencies') {
      queryRemoveList = ["currency", "currencyIssuer"]
    }

    if (period) {
      queryAddList.push({
        name: "period",
        value: period
      })
    }

    if (currencyTab === "") {
      queryRemoveList = ["currency", "currencyIssuer"]
    } else if (currencyTab === "xrp") {
      queryAddList.push({
        name: "currency",
        value: "xrp"
      })
    }
    setTabParams(router, tabsToSet, queryAddList, queryRemoveList)

    setSortConfig({})

    return () => {
      controller.abort()
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isReady, saleTab, period, listTab, currency, currencyIssuer, convertCurrency, issuersExtended, currencyTab])

  const urlParams = (volume, options) => {
    let urlPart = "?period=" + period + "&sale=" + saleTab
    if (volume?.volumes && volume?.volumes.length === 1 && !options?.excludeCurrency) {
      if (volume.volumes[0].amount.currency) {
        urlPart = urlPart + "&currency=" + volume.volumes[0].amount.currency + '&currencyIssuer=' + volume.volumes[0].amount.issuer
      } else {
        urlPart = urlPart + "&currency=xrp"
      }
    }
    if (volume?.issuer && !options?.excludeIssuer) {
      urlPart = urlPart + "&issuer=" + usernameOrAddress(volume, "issuer")
    }
    if (volume?.marketplace) {
      urlPart += "&marketplace=" + volume.marketplace
    }
    return urlPart
  }

  const sortTable = key => {
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
      setData(data.sort(function (a, b) {
        if (a.volumesInConvertCurrencies[convertCurrency] === "" || a.volumesInConvertCurrencies[convertCurrency] === null) return 1
        if (b.volumesInConvertCurrencies[convertCurrency] === "" || b.volumesInConvertCurrencies[convertCurrency] === null) return -1
        if (a.volumesInConvertCurrencies[convertCurrency] === b.volumesInConvertCurrencies[convertCurrency]) return 0
        return (parseFloat(a.volumesInConvertCurrencies[convertCurrency]) < parseFloat(b.volumesInConvertCurrencies[convertCurrency])) ? sortA : sortB
      }))
    } else if (sortConfig.key?.includes(".")) {
      const keys = sortConfig.key.split(".")
      setData(data.sort(function (a, b) {
        return (parseFloat(a[keys[0]]?.[keys[1]]) < parseFloat(b[keys[0]]?.[keys[1]])) ? sortA : sortB
      }))
    } else {
      setData(data.sort((a, b) => (parseFloat(a[key]) < parseFloat(b[key])) ? sortA : sortB))
    }
  }

  const bestFloor = priceFloor => {
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
    let priceColor = "orange"
    let service = priceFloor.private?.destinationDetails.service || "Private market"
    if (open && priv) {
      if (open <= priv) {
        floor = priceFloor.open?.amount
        priceColor = ""
        service = ""
      }
    } else if (open) {
      floor = priceFloor.open?.amount
      priceColor = ""
      service = ""
    }
    return {
      floor,
      priceColor,
      service
    }
  }

  const trWithPriceAndMarketPlace = (j, priceFloor) => {
    const { floor, service } = bestFloor(priceFloor)
    if (!floor) return;
    return <tr key={j}>
      {/* <td className='center'>{j + 1}</td> */}
      <td className='right'>{amountFormat(floor, { maxFractionDigits: 2 })}</td>
      <td className='right'>{service}</td>
    </tr>
  }

  const showFloor = volume => {
    const floorPrices = volume.floorPrices
    if (!floorPrices || floorPrices.length < 1) return ""
    let priceFloor = floorPrices[0]

    const { floor, priceColor } = bestFloor(priceFloor)

    let output = amountFormat(floor, { tooltip: 'left', maxFractionDigits: 2 });
    if (output && priceColor === 'orange') {
      let tableWithFloors = <table
        className={windowWidth > 1000 ? "tooltiptext left table-large shrink" : "table-mobile"}
        style={windowWidth > 1000 ? { width: "300px", transition: "none" } : { width: "calc(100% - 22px)", margin: "10px 0" }}
      >
        <thead>
          <tr>
            {/* <th className='center'>{t("table.index")}</th> */}
            <th className='right'>{t("table.price")}</th>
            <th className='right'>{t("table.marketplace")}</th>
          </tr>
        </thead>
        <tbody>
          {floorPrices.map((vol, j) =>
            trWithPriceAndMarketPlace(j, vol)
          )}
        </tbody>
      </table>
      if (windowWidth > 1000) {
        output = <span className={'tooltip ' + priceColor}>
          {output}
          {tableWithFloors}
        </span>
      } else {
        return <>
          {output}
          <Link href={'/nft-explorer?issuer=' + usernameOrAddress(volume, 'issuer') + '&list=onSale'}><LinkIcon /></Link>
          {tableWithFloors}
        </>
      }
    }
    if (output) {
      return <>{output} <Link href={'/nft-explorer?issuer=' + usernameOrAddress(volume, 'issuer') + '&list=onSale'}><LinkIcon /></Link></>
    } else {
      return ""
    }
  }

  return <>
    <SEO
      title={
        t("nft-volumes.header") + ' '
        + (saleTab === 'secondary' ? t("tabs.secondary-sales") : "")
        + (saleTab === 'primary' ? t("tabs.primary-sales") : "")
        + (currency ? (" " + currency) : "")
        + (currencyIssuer ? (" " + currencyIssuer) : "")
        + (listTab === "list" ? (" " + t("tabs.list")) : "")
        + (period ? (" " + period) : "")
      }
    />
    <div className="content-text">
      <h1 className="center">{t("nft-volumes.header") + " "}</h1>
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

        <Tabs tabList={listTabList} tab={listTab} setTab={setListTab} name="list" />
        {(!currencyIssuer && listTab !== "currencies") &&
          <Tabs tabList={currencyTabList} tab={currencyTab} setTab={setCurrencyTab} name="currency" />
        }
        <Tabs tabList={saleTabList} tab={saleTab} setTab={setSaleTab} name="sale" />
      </div>
      {listTab !== 'currencies' &&
        <>
          <div className='flex'>
            <div className="grey-box">
              {t("nft-volumes." + listTab + ".desc")}
            </div>
            <div className="grey-box">
              {loading ?
                t("general.loading")
                :
                <>
                  {rawData?.summary &&
                    <>
                      {listTab === 'brokers' ?
                        <Trans i18nKey="nft-volumes.brokers.text0">
                          XRPL had {{ allSales: shortNiceNumber(rawData.summary.all.sales, 0) }} <b>{{ currency: (currencyIssuer ? currency : currencyTab).toUpperCase() }}</b> NFT {{ saleType: saleTab === 'primaryAndSecondary' ? "" : ("(" + t("tabs." + saleTab + "-sales")).toLocaleLowerCase() + ")" }} sales for {{ allVolume: niceNumber(rawData.summary.all.volumesInConvertCurrencies[convertCurrency], 0, convertCurrency) }},
                          from which <b>{{ brokerSales: shortNiceNumber(rawData.summary.brokers?.sales, 0) }}</b> {{ percentBrokerSales: persentFormat(rawData.summary.brokers?.sales, rawData.summary.all.sales) }} of trades for <b>{{ brokerVolume: niceNumber(rawData.summary.brokers?.volumesInConvertCurrencies[convertCurrency], 0, convertCurrency) }}</b> {{ percentBrokerVolume: persentFormat(rawData.summary.brokers?.volumesInConvertCurrencies[convertCurrency], rawData.summary.all.volumesInConvertCurrencies[convertCurrency]) }} were through the brokerage model.
                        </Trans>
                        :
                        <Trans i18nKey="nft-volumes.text0">
                          XRPL had {{ allSales: shortNiceNumber(rawData.summary.all.sales, 0) }} {{ currency: (currencyIssuer ? currency : currencyTab).toUpperCase() }} NFT {{ saleType: saleTab === 'primaryAndSecondary' ? "" : ("(" + t("tabs." + saleTab + "-sales")).toLocaleLowerCase() + ")" }} sales for {{ allVolume: niceNumber(rawData.summary.all.volumesInConvertCurrencies[convertCurrency], 0, convertCurrency) }}.
                        </Trans>
                      }
                    </>
                  }
                </>
              }
            </div>
          </div>
          <br />
        </>
      }
      {listTab === 'issuers' &&
        <center>
          <div style={{ display: "inline-block", marginBottom: "20px", marginTop: "-20px" }}>
            <CheckBox checked={issuersExtended} setChecked={setIssuersExtended}>
              {t("table.text.show-extended-statistics")}
            </CheckBox>
          </div>
        </center>
      }
      {(windowWidth > 1000 || !['issuers', 'marketplaces'].includes(listTab)) ?
        <table className="table-large shrink">
          <thead>
            <tr>
              <th className='center'>{t("table.index")}</th>
              {listTab === 'marketplaces' && <th>{t("table.marketplace")}</th>}
              {listTab === 'marketplaces' && <th className='right'>{t("table.minted")}</th>}
              {listTab === 'issuers' && <th>{t("table.issuer")}</th>}
              {listTab === 'issuers' && issuersExtended && <th className='right hide-on-mobile'>{t("table.nfts-now")} <b className={"link" + (sortConfig.key === 'nfts' ? " orange" : "")} onClick={() => sortTable('nfts')}>⇅</b></th>}
              {listTab === 'issuers' && issuersExtended && <th className='right hide-on-mobile'>{t("table.owners-now")} <b className={"link" + (sortConfig.key === 'owners' ? " orange" : "")} onClick={() => sortTable('owners')}>⇅</b></th>}
              {listTab === 'issuers' && issuersExtended && <th className='right'>{t("table.floor-now")}</th>}
              {listTab === 'issuers' && issuersExtended && <th className='right hide-on-mobile'>{t("table.traded-nfts")} <b className={"link" + (sortConfig.key === 'tradedNfts' ? " orange" : "")} onClick={() => sortTable('tradedNfts')}>⇅</b></th>}
              {listTab === 'brokers' && <th>{t("table.broker")}</th>}
              {listTab === 'currencies' && <th>{t("table.issuers")}</th>}
              <th className='right'>{t("table.sales")} <b className={"link" + (sortConfig.key === 'sales' ? " orange" : "")} onClick={() => sortTable('sales')}>⇅</b></th>
              {listTab === 'issuers' && issuersExtended && <th className='right hide-on-mobile'>{t("table.buyers")} <b className={"link" + (sortConfig.key === 'buyers' ? " orange" : "")} onClick={() => sortTable('buyers')}>⇅</b></th>}
              {(listTab === 'currencies' || (currency && currencyIssuer) || currencyTab === 'xrp') && <th className='right'>{t("table.volume")}</th>}
              <th className='right'>{t("table.volume")} ({convertCurrency?.toUpperCase()}) <b className={"link" + (sortConfig.key === 'amount' ? " orange" : "")} onClick={() => sortTable('amount')}>⇅</b></th>
            </tr>
          </thead>
          <tbody>
            {loading ?
              <tr className='center'>
                <td colSpan="100">
                  <br />
                  <span className="waiting"></span>
                  <br />{t("general.loading")}<br />
                  <br />
                </td>
              </tr>
              :
              <>
                {(!errorMessage && data) ?
                  <>
                    {data.length > 0 &&
                      data.map((volume, i) =>
                        <tr key={i}>
                          <td className='center'>{i + 1}</td>
                          {listTab === 'marketplaces' && <td>{volume.marketplace}</td>}
                          {listTab === 'marketplaces' &&
                            <td className='right'>
                              {shortNiceNumber(volume.nftokens?.minted, 0)}
                            </td>
                          }
                          {listTab === 'issuers' && <td>{addressUsernameOrServiceLink(volume, "issuer", { short: true })}</td>}
                          {listTab === 'issuers' && issuersExtended && <td className='right hide-on-mobile'>{shortNiceNumber(volume.statistics?.nfts, 0)} <Link href={'/nft-explorer?issuer=' + usernameOrAddress(volume, 'issuer')}><LinkIcon /></Link></td>}
                          {listTab === 'issuers' && issuersExtended && <td className='right hide-on-mobile'>{shortNiceNumber(volume.statistics?.owners, 0)} <Link href={'/nft-distribution/' + usernameOrAddress(volume, 'issuer')}><LinkIcon /></Link></td>}
                          {listTab === 'issuers' && issuersExtended &&
                            <td className='right'>
                              {showFloor(volume)}
                            </td>
                          }
                          {listTab === 'issuers' && issuersExtended && <td className='right hide-on-mobile'>{shortNiceNumber(volume.statistics?.tradedNfts, 0)}</td>}
                          {listTab === 'brokers' && <td>{addressUsernameOrServiceLink(volume, "broker", { short: true, noBroker: t("nft-volumes.brokers.no-broker") })}</td>}
                          {listTab === 'currencies' && <td className='center'><Link href={'/nft-volumes' + urlParams(volume) + '&list=issuers'}><LinkIcon /></Link></td>}
                          <td className='right'>
                            {shortNiceNumber(volume.sales, 0)}
                            {rawData?.summary &&
                              <> {persentFormat(volume.sales, rawData.summary.all.sales)}</>
                            }
                            {listTab !== 'brokers' &&
                              <Link href={'/nft-sales' + urlParams(volume)}> <LinkIcon /></Link>
                            }
                          </td>
                          {listTab === 'issuers' && issuersExtended && <td className='right hide-on-mobile'>{shortNiceNumber(volume.statistics?.buyers, 0)}</td>}
                          {(listTab === 'currencies' || (currency && currencyIssuer) || currencyTab === 'xrp') &&
                            <td className='right'>
                              {amountFormat(volume.volumes[0].amount, { maxFractionDigits: 2 })}
                            </td>
                          }
                          <td className='right'>
                            <span className='tooltip'>
                              {niceNumber(volume.volumesInConvertCurrencies[convertCurrency], 2, convertCurrency)}
                              {listTab !== 'currencies' &&
                                <table className="tooltiptext left table-large shrink" style={{ width: "490px", transition: "none" }}>
                                  <thead>
                                    <tr>
                                      <th className='center'>{t("table.index")}</th>
                                      <th className='right'>{t("table.sales")}</th>
                                      <th className='right'>{t("table.volume")}</th>
                                      <th className='right'>{t("table.volume")} ({convertCurrency?.toUpperCase()})</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {volume.volumes?.map((vol, j) =>
                                      <tr key={j}>
                                        <td className='center'>{j + 1}</td>
                                        <td className='right'>{vol.sales}</td>
                                        <td className='right'>
                                          {amountFormat(vol.amount, { maxFractionDigits: 2 })}
                                        </td>
                                        <td className='right'>
                                          {niceNumber(vol.amountInConvertCurrencies[convertCurrency], 2, convertCurrency)}
                                        </td>
                                      </tr>
                                    )}
                                  </tbody>
                                </table>
                              }
                            </span> {persentFormat(volume.volumesInConvertCurrencies[convertCurrency], rawData.summary.all.volumesInConvertCurrencies[convertCurrency])}
                            {listTab === 'issuers' && <Link href={'/nft-volumes/' + usernameOrAddress(volume, 'issuer') + urlParams(volume, { excludeIssuer: true, excludeCurrency: true })}> <LinkIcon /></Link>}
                          </td>
                        </tr>
                      )
                    }
                  </>
                  :
                  <tr><td colSpan="100" className='center orange bold'>{errorMessage}</td></tr>
                }
              </>
            }
          </tbody>
        </table>
        :
        <table className="table-mobile">
          <thead>
          </thead>
          <tbody>
            {loading ?
              <tr className='center'>
                <td colSpan="100">
                  <br />
                  <span className="waiting"></span>
                  <br />{t("general.loading")}<br />
                  <br />
                </td>
              </tr>
              :
              <>
                {!errorMessage ? data.map((volume, i) =>
                  <tr key={i}>
                    <td style={{ padding: "5px" }} className='center'>
                      <b>{i + 1}</b>
                    </td>
                    <td>
                      {listTab === 'marketplaces' &&
                        <p>
                          {t("table.marketplace")}: {volume.marketplace}
                        </p>
                      }
                      {listTab === 'marketplaces' && (volume.nftokens?.minted || volume.nftokens?.minted === 0) &&
                        <p>
                          {t("table.minted")}: {shortNiceNumber(volume.nftokens?.minted, 0)} {t("table.nfts")}
                        </p>
                      }
                      {listTab === 'issuers' && <>
                        <p>
                          {t("table.issuer")}: {addressUsernameOrServiceLink(volume, "issuer")}
                        </p>
                        {issuersExtended &&
                          <>
                            <p>
                              {t("table.nfts-now")}:{" "}
                              {shortNiceNumber(volume.statistics?.nfts, 0)} <Link href={'/nft-explorer?issuer=' + usernameOrAddress(volume, 'issuer')}><LinkIcon /></Link>
                            </p>
                            <p>
                              {t("table.owners-now")}:{" "}
                              {shortNiceNumber(volume.statistics?.owners, 0)} <Link href={'/nft-distribution/' + usernameOrAddress(volume, 'issuer')}><LinkIcon /></Link>
                            </p>
                            {showFloor(volume) ?
                              <div>
                                {t("table.floor-now")}: {showFloor(volume)}
                              </div>
                              :
                              ""
                            }
                            <p>
                              {t("table.traded-nfts")}: {shortNiceNumber(volume.statistics?.tradedNfts, 0)}
                            </p>
                          </>
                        }
                      </>
                      }
                      <p>
                        {t("table.sales")}: {shortNiceNumber(volume.sales, 0)}
                        {rawData?.summary &&
                          <> {persentFormat(volume.sales, rawData.summary.all.sales)}</>
                        }
                        {listTab !== 'brokers' &&
                          <Link href={'/nft-sales' + urlParams(volume)}> <LinkIcon /></Link>
                        }
                      </p>
                      {issuersExtended &&
                        <p>
                          {t("table.buyers")}: {shortNiceNumber(volume.statistics?.buyers, 0)}
                        </p>
                      }
                      <div>
                        {t("table.volume")}: {niceNumber(volume.volumesInConvertCurrencies[convertCurrency], 2, convertCurrency)}
                        {rawData?.summary &&
                          <> {persentFormat(volume.volumesInConvertCurrencies[convertCurrency], rawData.summary.all.volumesInConvertCurrencies[convertCurrency])}</>
                        }
                        {listTab === 'issuers' && <Link href={'/nft-volumes/' + usernameOrAddress(volume, 'issuer') + urlParams(volume, { excludeIssuer: true, excludeCurrency: true })}> <LinkIcon /></Link>}

                        <table className="table-mobile" style={{ width: "calc(100% - 22px)", margin: "10px 0" }}>
                          <thead>
                            <tr>
                              <th className='center'>{t("table.index")}</th>
                              <th className='right'>{t("table.sales")}</th>
                              <th className='right'>{t("table.volume")}</th>
                              <th className='right'>{t("table.volume")} ({convertCurrency?.toUpperCase()})</th>
                            </tr>
                          </thead>
                          <tbody>
                            {volume.volumes.map((vol, j) =>
                              <tr key={j}>
                                <td className='center'>{j + 1}</td>
                                <td className='right'>{vol.sales}</td>
                                <td className='right'>
                                  {amountFormat(vol.amount, { maxFractionDigits: 2 })}
                                </td>
                                <td className='right'>
                                  {niceNumber(vol.amountInConvertCurrencies[convertCurrency], 2, convertCurrency)}
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
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
    </div>
  </>
}

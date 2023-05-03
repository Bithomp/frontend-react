import { useTranslation, Trans } from 'next-i18next'
import { useState, useEffect } from 'react'
import axios from 'axios'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { useRouter } from 'next/router'

export const getServerSideProps = async ({ query, locale }) => {
  const { period, sale, list, currency, currencyIssuer, sortCurrency } = query
  return {
    props: {
      period: period || "week",
      sale: sale || "all",
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

import { setTabParams, stripText, isAddressOrUsername, useWidth } from '../../utils'
import {
  amountFormat,
  shortNiceNumber,
  addressUsernameOrServiceLink,
  usernameOrAddress,
  persentFormat,
  niceNumber
} from '../../utils/format';

import LinkIcon from "../../public/images/link.svg"

export default function NftVolumes({ period, sale, list, currency, currencyIssuer, selectedCurrency, sortCurrency }) {
  const { t } = useTranslation()
  const router = useRouter()

  const { isReady } = router

  const windowWidth = useWidth()

  const [data, setData] = useState([])
  const [rawData, setRawData] = useState({})
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")
  const [periodTab, setPeriodTab] = useState(period)
  const [saleTab, setSaleTab] = useState(sale)
  const [listTab, setListTab] = useState(list)
  const [sortConfig, setSortConfig] = useState({})
  const [issuersExtended, setIssuersExtended] = useState(false)

  const convertCurrency = sortCurrency || selectedCurrency

  const listTabList = [
    { value: 'issuers', label: (t("tabs.issuers")) },
    { value: 'marketplaces', label: (t("tabs.marketplaces")) },
    { value: 'currencies', label: (t("tabs.currencies")) },
    { value: 'brokers', label: (t("tabs.brokers")) }
  ]

  const periodTabList = [
    { value: 'all', label: t("tabs.all-time") },
    //{ value: 'year', label: t("tabs.year") },
    { value: 'month', label: t("tabs.month") },
    { value: 'week', label: t("tabs.week") },
    { value: 'day', label: t("tabs.day") }
  ]

  const saleTabList = [
    { value: 'all', label: t("tabs.all-sales") },
    { value: 'secondary', label: (t("tabs.secondary-sales")) },
    { value: 'primary', label: (t("tabs.primary-sales")) }
  ]

  const controller = new AbortController()

  const checkApi = async () => {
    let apiUrl = 'v2/nft-volumes-extended?list=' + listTab + '&convertCurrencies=' + convertCurrency + '&sortCurrency=' + convertCurrency

    if (listTab === 'issuers' && issuersExtended) {
      apiUrl += '&floorPrice=true&statistics=true'
    }
    if (currency && currencyIssuer) {
      apiUrl += '&currency=' + stripText(currency) + '&currencyIssuer=' + stripText(currencyIssuer)
    } else if (currency?.toLowerCase() === 'xrp') {
      apiUrl += '&currency=xrp'
    }

    setLoading(true)
    setRawData({})
    setData([])

    const response = await axios.get(apiUrl + '&period=' + periodTab + '&saleType=' + saleTab, {
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
          setErrorMessage("");
          if (listTab === 'brokers' && newdata.summary) {
            list.push({
              broker: "no broker",
              sales: newdata.summary.all.sales - newdata.summary.brokers.sales,
              amount: newdata.summary.all.volume - newdata.summary.brokers.volume
            })
          }
          setData(list)
          //it should sort on the backend already
          //setData(list.sort((a, b) => (parseFloat(a.volumesInConvertCurrencies[convertCurrency]) < parseFloat(b.volumesInConvertCurrencies[convertCurrency])) ? 1 : -1))
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
          ]
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
            },
            "floorPrice": {
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
        tabList: periodTabList,
        tab: periodTab,
        defaultTab: "week",
        setTab: setPeriodTab,
        paramName: "period"
      },
      {
        tabList: saleTabList,
        tab: saleTab,
        defaultTab: "all",
        setTab: setSaleTab,
        paramName: "sale"
      }
    ]
    if ((!currency || (currency.toLowerCase() !== 'xrp' && !isAddressOrUsername(currencyIssuer))) || listTab === 'currencies') {
      queryRemoveList = ["currency", "currencyIssuer"]
    }
    setTabParams(router, tabsToSet, queryAddList, queryRemoveList)

    setSortConfig({})

    return () => {
      controller.abort()
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isReady, saleTab, periodTab, listTab, currency, currencyIssuer, convertCurrency, issuersExtended])

  const urlParams = (volume, options) => {
    let urlPart = "?period=" + periodTab + "&sale=" + saleTab;
    if (volume?.amount && !options?.excludeCurrency) {
      if (volume.amount.currency) {
        urlPart = urlPart + "&currency=" + volume.amount.currency + '&currencyIssuer=' + volume.amount.issuer;
      } else {
        urlPart = urlPart + "&currency=xrp";
      }
    }
    if (volume?.issuer && !options?.excludeIssuer) {
      urlPart = urlPart + "&issuer=" + usernameOrAddress(volume, "issuer");
    }
    return urlPart;
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
      setData(data.sort((a, b) => (parseFloat(a.volumesInConvertCurrencies[convertCurrency]) < parseFloat(b.volumesInConvertCurrencies[convertCurrency])) ? sortA : sortB))
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
      <td className='center'>{j + 1}</td>
      <td className='right'>{amountFormat(floor, { maxFractionDigits: 2 })}</td>
      <td className='right'>{service}</td>
    </tr>
  }

  const showFloor = volume => {
    const volumes = volume.volumes
    if (!volumes) return ""

    let floors = []
    let xrpIndex = -1
    for (let i = 0; i < volumes.length; i++) {
      if (volumes[i].floorPrice) {
        floors.push(volumes[i].floorPrice)
      }
      if (volumes[i].amount && !volumes[i].amount.currency) {
        xrpIndex = i
      }
    }

    if (floors.length < 1) return ""

    let priceFloor = volumes[0].floorPrice
    // if not only one, and if we found xrp there, then show XRP, otherwise it's teh first one or the only one.
    if (floors.length !== 1 && xrpIndex !== -1) {
      priceFloor = volumes[xrpIndex].floorPrice
    }

    const { floor, priceColor } = bestFloor(priceFloor)

    let output = amountFormat(floor, { tooltip: 'left', maxFractionDigits: 2 });
    if (output && priceColor === 'orange') {
      let tableWithFloors = <table
        className={windowWidth > 1000 ? "tooltiptext left table-large shrink" : "table-mobile"}
        style={windowWidth > 1000 ? { width: "300px", transition: "none" } : { width: "calc(100% - 22px)", margin: "10px 0" }}
      >
        <thead>
          <tr>
            <th className='center'>{t("table.index")}</th>
            <th className='right'>{t("table.price")}</th>
            <th className='right'>{t("table.marketplace")}</th>
          </tr>
        </thead>
        <tbody>
          {volumes.map((vol, j) =>
            trWithPriceAndMarketPlace(j, vol.floorPrice)
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
          <a href={'/nft-explorer?issuer=' + usernameOrAddress(volume, 'issuer') + '&list=onSale'}><LinkIcon /></a>
          {tableWithFloors}
        </>
      }
    }
    if (output) {
      return <>{output} <a href={'/nft-explorer?issuer=' + usernameOrAddress(volume, 'issuer') + '&list=onSale'}><LinkIcon /></a></>
    } else {
      return ""
    }
  }

  return <>
    <SEO title={t("nft-volumes.header")} />
    <div className="content-text">
      <h2 className="center">{t("nft-volumes.header") + " "}</h2>
      <div className='tabs-inline'>
        <Tabs tabList={listTabList} tab={listTab} setTab={setListTab} name="list" />
        <Tabs tabList={periodTabList} tab={periodTab} setTab={setPeriodTab} name="period" />
        <Tabs tabList={saleTabList} tab={saleTab} setTab={setSaleTab} name="sale" />
      </div>
      {listTab === 'issuers' &&
        <center>
          <div style={{ display: "inline-block", marginBottom: "20px", marginTop: "-20px" }}>
            <CheckBox checked={issuersExtended} setChecked={setIssuersExtended}>
              {t("table.text.show-extended-statistics")}
            </CheckBox>
          </div>
        </center>
      }
      {listTab === 'brokers' &&
        <>
          <div className='flex'>
            <div className="grey-box">
              {t("nft-volumes.brokers.not-a-marketplace-list")}
            </div>
            <div className="grey-box">
              {rawData?.summary && !loading &&
                <>
                  {t("nft-volumes.brokers.period." + periodTab)}{" "}
                  <Trans
                    i18nKey="nft-volumes.brokers.text0"
                    values={{
                      allSales: shortNiceNumber(rawData.summary.all.sales, 0),
                      allVolume: amountFormat(rawData.summary.all.volume, { tooltip: 'right', maxFractionDigits: 2 }),
                      brokerSales: shortNiceNumber(rawData.summary.brokers.sales, 0),
                      percentBrokerSales: persentFormat(rawData.summary.brokers.sales, rawData.summary.all.sales),
                      brokerVolume: amountFormat(rawData.summary.brokers.volume, { tooltip: 'right', maxFractionDigits: 2 }),
                      percentBrokerVolume: persentFormat(rawData.summary.brokers.volume, rawData.summary.all.volume)
                    }}
                  >
                    XRPL had {shortNiceNumber(rawData.summary.all.sales, 0)} NFT trades for {amountFormat(rawData.summary.all.volume, { tooltip: 'right', maxFractionDigits: 2 })},
                    from which {shortNiceNumber(rawData.summary.brokers.sales, 0)} ({persentFormat(rawData.summary.brokers.sales, rawData.summary.all.sales)}) of trades for {amountFormat(rawData.summary.brokers.volume, { tooltip: 'right', maxFractionDigits: 2 })} ({persentFormat(rawData.summary.brokers.volume, rawData.summary.all.volume)}) were through the brokerage model.
                  </Trans>
                </>
              }
            </div>
          </div>
          <br />
        </>
      }
      {(listTab !== 'issuers' || (listTab === 'issuers' && windowWidth > 1000)) ?
        <table className="table-large shrink">
          <thead>
            <tr>
              <th className='center'>{t("table.index")}</th>
              {listTab === 'marketplaces' && <th>{t("table.marketplace")}</th>}
              {listTab === 'issuers' && <th>{t("table.issuer")}</th>}
              {listTab === 'issuers' && issuersExtended && <th className='right hide-on-mobile'>{t("table.nfts-now")} <b className={"link" + (sortConfig.key === 'nfts' ? " orange" : "")} onClick={() => sortTable('nfts')}>⇅</b></th>}
              {listTab === 'issuers' && issuersExtended && <th className='right hide-on-mobile'>{t("table.owners-now")} <b className={"link" + (sortConfig.key === 'owners' ? " orange" : "")} onClick={() => sortTable('owners')}>⇅</b></th>}
              {listTab === 'issuers' && issuersExtended && <th className='right'>{t("table.floor-now")}</th>}
              {listTab === 'issuers' && issuersExtended && <th className='right hide-on-mobile'>{t("table.traded-nfts")} <b className={"link" + (sortConfig.key === 'tradedNfts' ? " orange" : "")} onClick={() => sortTable('tradedNfts')}>⇅</b></th>}
              {listTab === 'brokers' && <th>{t("table.broker")}</th>}
              {listTab === 'currencies' && <th>{t("table.issuers")}</th>}
              <th className='right'>{t("table.sales")} <b className={"link" + (sortConfig.key === 'sales' ? " orange" : "")} onClick={() => sortTable('sales')}>⇅</b></th>
              {listTab === 'issuers' && issuersExtended && <th className='right hide-on-mobile'>{t("table.buyers")} <b className={"link" + (sortConfig.key === 'buyers' ? " orange" : "")} onClick={() => sortTable('buyers')}>⇅</b></th>}
              <th className='right'>{t("table.volume")} <b className={"link" + (sortConfig.key === 'amount' ? " orange" : "")} onClick={() => sortTable('amount')}>⇅</b></th>
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
                          {listTab === 'issuers' && <td>{addressUsernameOrServiceLink(volume, "issuer", { short: true })}</td>}
                          {listTab === 'issuers' && issuersExtended && <td className='right hide-on-mobile'>{shortNiceNumber(volume.statistics?.nfts, 0)} <a href={'/nft-explorer?issuer=' + usernameOrAddress(volume, 'issuer')}><LinkIcon /></a></td>}
                          {listTab === 'issuers' && issuersExtended && <td className='right hide-on-mobile'>{shortNiceNumber(volume.statistics?.owners, 0)} <a href={'/nft-distribution/' + usernameOrAddress(volume, 'issuer')}><LinkIcon /></a></td>}
                          {listTab === 'issuers' && issuersExtended &&
                            <td className='right'>
                              {showFloor(volume)}
                            </td>
                          }
                          {listTab === 'issuers' && issuersExtended && <td className='right hide-on-mobile'>{shortNiceNumber(volume.statistics?.tradedNfts, 0)}</td>}
                          {listTab === 'brokers' && <td>{addressUsernameOrServiceLink(volume, "broker", { short: true, noBroker: t("nft-volumes.brokers.no-broker") })}</td>}
                          {listTab === 'currencies' && <td className='center'><a href={'/nft-volumes' + urlParams(volume) + '&list=issuers'}><LinkIcon /></a></td>}
                          <td className='right'>
                            {shortNiceNumber(volume.sales, 0)}
                            {listTab === 'brokers' ?
                              <>
                                {rawData?.summary &&
                                  <> ({persentFormat(volume.sales, rawData.summary.all.sales)})</>
                                }
                              </>
                              :
                              <a href={'/nft-sales' + urlParams(volume)}> <LinkIcon /></a>
                            }
                          </td>
                          {listTab === 'issuers' && issuersExtended && <td className='right hide-on-mobile'>{shortNiceNumber(volume.statistics?.buyers, 0)}</td>}
                          <td className='right'>
                            <span className='tooltip'>
                              {niceNumber(volume.volumesInConvertCurrencies[convertCurrency], 2, convertCurrency)}
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
                                  {volume.volumes.map((vol, j) =>
                                    <tr key={j}>
                                      <td className='center'>{j + 1}</td>
                                      <td className='right'>{vol.sales}</td>
                                      <td className='right'>
                                        {amountFormat(vol.amount)}
                                      </td>
                                      <td className='right'>
                                        {niceNumber(vol.amountInConvertCurrencies[convertCurrency], 2, convertCurrency)}
                                      </td>
                                    </tr>
                                  )}
                                </tbody>
                              </table>
                            </span>
                            {listTab === 'brokers' && rawData?.summary &&
                              <> ({persentFormat(volume.amount, rawData.summary.all.volume)})</>
                            }
                            {listTab === 'issuers' && <a href={'/nft-volumes/' + usernameOrAddress(volume, 'issuer') + urlParams(volume, { excludeIssuer: true, excludeCurrency: true })}> <LinkIcon /></a>}
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
                      <p>{i + 1}</p>
                    </td>
                    <td>
                      <p>
                        {t("table.issuer")}: {addressUsernameOrServiceLink(volume, "issuer")}
                      </p>
                      {issuersExtended &&
                        <>
                          <p>
                            {t("table.nfts-now")}:{" "}
                            {shortNiceNumber(volume.statistics?.nfts, 0)} <a href={'/nft-explorer?issuer=' + usernameOrAddress(volume, 'issuer')}><LinkIcon /></a>
                          </p>
                          <p>
                            {t("table.owners-now")}:{" "}
                            {shortNiceNumber(volume.statistics?.owners, 0)} <a href={'/nft-distribution/' + usernameOrAddress(volume, 'issuer')}><LinkIcon /></a>
                          </p>
                          {showFloor(volume) ?
                            <p>
                              {t("table.floor-now")}: {showFloor(volume)}
                            </p>
                            :
                            ""
                          }
                          <p>
                            {t("table.traded-nfts")}: {shortNiceNumber(volume.statistics?.tradedNfts, 0)}
                          </p>
                        </>
                      }
                      <p>
                        {t("table.sales")}: {shortNiceNumber(volume.sales, 0)} <a href={'/nft-sales' + urlParams(volume)}> <LinkIcon /></a>
                      </p>
                      {issuersExtended &&
                        <p>
                          {t("table.buyers")}: {shortNiceNumber(volume.statistics?.buyers, 0)}
                        </p>
                      }
                      <p>
                        {t("table.volume")}: {niceNumber(volume.volumesInConvertCurrencies[convertCurrency], 2, convertCurrency)}
                        {listTab === 'issuers' && <a href={'/nft-volumes/' + usernameOrAddress(volume, 'issuer') + urlParams(volume, { excludeIssuer: true, excludeCurrency: true })}> <LinkIcon /></a>}
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
                                  {amountFormat(vol.amount)}
                                </td>
                                <td className='right'>
                                  {niceNumber(vol.amountInConvertCurrencies[convertCurrency], 2, convertCurrency)}
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                        {listTab === 'brokers' && rawData?.summary &&
                          <> ({persentFormat(volume.amount, rawData.summary.all.volume)})</>
                        }
                      </p>
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
  </>;
};

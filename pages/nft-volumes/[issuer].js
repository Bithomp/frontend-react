import { useTranslation } from 'next-i18next'
import { useState, useEffect } from 'react'
import axios from 'axios'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { useRouter } from 'next/router'

export const getServerSideProps = async ({ query, locale }) => {
  const { period, sale, currency, currencyIssuer, issuer, sortCurrency } = query
  return {
    props: {
      period: period || "week",
      sale: sale || "all",
      issuer: issuer || "",
      currency: currency || "",
      currencyIssuer: currencyIssuer || "",
      sortCurrency: sortCurrency || "",
      ...(await serverSideTranslations(locale, ['common'])),
    },
  }
}

import SEO from '../../components/SEO'
import Tabs from '../../components/Tabs'
import SearchBlock from '../../components/Layout/SearchBlock'

import { setTabParams, stripText, isAddressOrUsername, useWidth } from '../../utils'
import {
  niceNumber,
  shortNiceNumber,
  usernameOrAddress,
  amountFormat
} from '../../utils/format';

import LinkIcon from "../../public/images/link.svg"

export default function NftVolumes({ period, sale, currency, currencyIssuer, issuer, selectedCurrency, sortCurrency }) {
  const { t } = useTranslation()
  const router = useRouter()
  const { isReady } = router
  const windowWidth = useWidth()

  const [data, setData] = useState([])
  const [rawData, setRawData] = useState({});
  const [userData, setUserData] = useState({});
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")
  const [periodTab, setPeriodTab] = useState(period)
  const [saleTab, setSaleTab] = useState(sale)
  const [sortConfig, setSortConfig] = useState({})

  const convertCurrency = sortCurrency || selectedCurrency

  const periodTabList = [
    { value: 'all', label: t("tabs.all-time") },
    //{ value: 'year', label: t("tabs.year") },
    { value: 'month', label: t("tabs.month") },
    { value: 'week', label: t("tabs.week") },
    { value: 'day', label: t("tabs.day") }
  ];

  const saleTabList = [
    { value: 'all', label: t("tabs.all-sales") },
    { value: 'secondary', label: (t("tabs.secondary-sales")) },
    { value: 'primary', label: (t("tabs.primary-sales")) }
  ];

  const controller = new AbortController();

  const checkApi = async () => {
    if (!issuer) return;
    let apiUrl = 'v2/nft-volumes-extended?issuer=' + issuer + '&list=taxons&convertCurrencies=' + convertCurrency + '&sortCurrency=' + convertCurrency

    if (currency && currencyIssuer) {
      apiUrl += '&currency=' + stripText(currency) + '&currencyIssuer=' + stripText(currencyIssuer)
    } else if (currency.toLowerCase() === 'xrp') {
      apiUrl += '&currency=xrp';
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
    });

    const newdata = response?.data;
    if (newdata) {
      setUserData({
        username: newdata.issuerDetails?.username,
        service: newdata.issuerDetails?.service,
        address: newdata.issuer
      })
      setRawData(newdata)
      setLoading(false) //keep here for fast tab clickers
      if (newdata.period) {
        if (newdata.taxons?.length > 0) {
          setErrorMessage("")
          let volumes = newdata.taxons
          setData(volumes.sort((a, b) => (parseFloat(a.volumesInConvertCurrencies[convertCurrency]) < parseFloat(b.volumesInConvertCurrencies[convertCurrency])) ? 1 : -1))
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
    {
      "period": "week",
      "saleType": "all",
      "issuer": "ra59pDJcuqKJcQws7Xpuu1S8UYKmKnpUkW",
      "issuerDetails": {
        "username": "xSPECTAR",
        "service": "xSPECTAR"
      },
      "taxons": [
        {
          "taxon": 168380,
          "volumes": [
            {
              "amount": {
                "currency": "MRM",
                "issuer": "rNjQ9HZYiBk1WhuscDkmJRSc3gbrBqqAaQ",
                "value": "200000000"
              },
              "amountInConvertCurrencies": {
                "usd": "131.53812270977"
              },
              "sales": 1
            }
          ],
          "sales": 1,
          "buyers": 1,
          "tradedNfts": 1,
          "owners": 1,
          "nfts": 1,
          "volumesInConvertCurrencies": {
            "usd": "4.4172",
            "xrp": "12"
          }
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
      controller.abort();
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isReady, saleTab, periodTab, currency, currencyIssuer, convertCurrency]);

  const urlParams = (volume) => {
    let urlPart = "?period=" + periodTab + "&sale=" + saleTab
    if (volume?.amount) {
      if (volume.amount.currency) {
        urlPart = urlPart + "&currency=" + volume.amount.currency + '&currencyIssuer=' + volume.amount.issuer
      } else {
        urlPart = urlPart + "&currency=xrp"
      }
    }
    urlPart = urlPart + "&issuer=" + usernameOrAddress(rawData, "issuer") + "&taxon=" + volume.taxon
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
      setData(data.sort((a, b) => (parseFloat(a.volumesInConvertCurrencies[convertCurrency]) < parseFloat(b.volumesInConvertCurrencies[convertCurrency])) ? sortA : sortB))
    } else {
      setData(data.sort((a, b) => (parseFloat(a[key]) < parseFloat(b[key])) ? sortA : sortB))
    }
  }

  return <>
    <SEO
      title={t("nft-volumes.header") + " " + issuer}
    />
    <SearchBlock
      searchPlaceholderText={t("explorer.enter-address")}
      tab="nft-volumes"
      userData={userData}
    />
    <div className="content-text" style={{ marginTop: "20px" }}>
      <div className='tabs-inline'>
        <Tabs tabList={periodTabList} tab={periodTab} setTab={setPeriodTab} name="period" />
        <Tabs tabList={saleTabList} tab={saleTab} setTab={setSaleTab} name="sale" />
      </div>
      {windowWidth > 1000 ?
        <table className="table-large shrink">
          <thead>
            <tr>
              <th className='center'>{t("table.index")}</th>
              <th className='right'>{t("table.taxon")} <b className={"link" + (sortConfig.key === 'taxon' ? " orange" : "")} onClick={() => sortTable('taxon')}>⇅</b></th>
              <th className='right'>{t("table.nfts-now")} <b className={"link" + (sortConfig.key === 'nfts' ? " orange" : "")} onClick={() => sortTable('nfts')}>⇅</b></th>
              <th className='right'>{t("table.owners-now")} <b className={"link" + (sortConfig.key === 'owners' ? " orange" : "")} onClick={() => sortTable('owners')}>⇅</b></th>
              <th className='right'>{t("table.traded-nfts")} <b className={"link" + (sortConfig.key === 'tradedNfts' ? " orange" : "")} onClick={() => sortTable('tradedNfts')}>⇅</b></th>
              <th className='right'>{t("table.sales")} <b className={"link" + (sortConfig.key === 'sales' ? " orange" : "")} onClick={() => sortTable('sales')}>⇅</b></th>
              <th className='right'>{t("table.buyers")} <b className={"link" + (sortConfig.key === 'buyers' ? " orange" : "")} onClick={() => sortTable('buyers')}>⇅</b></th>
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
                          <td className='right'>{volume.taxon}</td>
                          <td className='right'>{shortNiceNumber(volume.nfts, 0)} <a href={'/nft-explorer?issuer=' + usernameOrAddress(rawData, 'issuer') + "&taxon=" + volume.taxon}><LinkIcon /></a></td>
                          <td className='right'>{shortNiceNumber(volume.owners, 0)} {/* <a href={'/nft-distribution/' + usernameOrAddress(rawData, 'issuer') + "?taxon=" + volume.taxon}><LinkIcon /></a> */}</td>
                          <td className='right'>{shortNiceNumber(volume.tradedNfts, 0)}</td>
                          <td className='right'>
                            {shortNiceNumber(volume.sales, 0)}
                            <a href={'/nft-sales' + urlParams(volume)}> <LinkIcon /></a>
                          </td>
                          <td className='right'>{shortNiceNumber(volume.buyers, 0)}</td>
                          <td className='right'>
                            <span className='tooltip'>
                              {niceNumber(volume.volumesInConvertCurrencies[convertCurrency], 2, convertCurrency)}
                              <table className="tooltiptext left table-large shrink" style={{ width: "400px", transition: "none" }}>
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
                        {t("table.taxon")}: {volume.taxon}
                      </p>
                      <p>
                        {t("table.nfts-now")}:{" "}
                        {shortNiceNumber(volume.nfts, 0)} <a href={'/nft-explorer?issuer=' + usernameOrAddress(rawData, 'issuer') + "&taxon=" + volume.taxon}><LinkIcon /></a>
                      </p>
                      <p>
                        {t("table.owners-now")}:{" "}
                        {shortNiceNumber(volume.owners, 0)} {/* <a href={'/nft-distribution/' + usernameOrAddress(rawData, 'issuer') + "?taxon=" + volume.taxon}><LinkIcon /></a> */}
                      </p>
                      <p>
                        {t("table.traded-nfts")}: {shortNiceNumber(volume.tradedNfts, 0)}
                      </p>
                      <p>
                        {t("table.sales")}: {shortNiceNumber(volume.sales, 0)} <a href={'/nft-sales' + urlParams(volume)}> <LinkIcon /></a>
                      </p>
                      <p>
                        {t("table.buyers")}: {shortNiceNumber(volume.buyers, 0)}
                      </p>
                      <p>
                        {t("table.volume")}: {niceNumber(volume.volumesInConvertCurrencies[convertCurrency], 2, convertCurrency)}
                      </p>
                      <table className="tooltiptext left table-mobile" style={{ width: "calc(100% - 20px)", margin: "20px 20px 20px 0px" }}>
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

import { useTranslation } from 'next-i18next'
import { useState, useEffect } from 'react'
import axios from 'axios'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { useRouter } from 'next/router'

export const getServerSideProps = async ({ query, locale }) => {
  const { period, sale, currency, currencyIssuer, issuer } = query
  return {
    props: {
      period: period || "week",
      sale: sale || "all",
      issuer: issuer || "",
      currency: currency || "xrp", //only XRP for now
      currencyIssuer: currencyIssuer || "",
      ...(await serverSideTranslations(locale, ['common'])),
    },
  }
}

import SEO from '../../components/SEO'
import Tabs from '../../components/Tabs'
import SearchBlock from '../../components/Layout/SearchBlock'

import { setTabParams, stripText, isAddressOrUsername, useWidth, removeQueryParams } from '../../utils'
import {
  amountFormat,
  shortNiceNumber,
  usernameOrAddress
} from '../../utils/format';

import LinkIcon from "../../public/images/link.svg"

export default function NftVolumes({ period, sale, currency, currencyIssuer, issuer }) {
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
    let apiUrl = 'v2/nft-volumes-issuer/' + issuer + '?list=taxons'

    if (currency && currencyIssuer) {
      apiUrl += '&currency=' + stripText(currency) + '&currencyIssuer=' + stripText(currencyIssuer);
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
        if (newdata.volumes.length > 0) {
          setErrorMessage("");
          if (newdata.volumes[0].amount.value) {
            setData(newdata.volumes.sort((a, b) => (parseFloat(a.amount.value) < parseFloat(b.amount.value)) ? 1 : -1));
          } else {
            let volumes = newdata.volumes
            setData(volumes.sort((a, b) => (parseFloat(a.amount) < parseFloat(b.amount)) ? 1 : -1))
          }
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
      "currency": "xrp",
      "saleType": "all",
      "issuer": "ra59pDJcuqKJcQws7Xpuu1S8UYKmKnpUkW",
      "issuerDetails": {
        "username": "xSPECTAR",
        "service": "xSPECTAR"
      },
      "volumes": [
        {
          "taxon": 2,
          "amount": "34761105001",
          "sales": 4
        },
        {
          "taxon": 1,
          "amount": "23238622299",
          "sales": 86
        }
      ]
    }
  */

  useEffect(() => {
    checkApi();
    setTabParams(router, [
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
    ])

    setSortConfig({});

    if ((!currency || (currency.toLowerCase() !== 'xrp' && !isAddressOrUsername(currencyIssuer)))) {
      removeQueryParams(router, ["currency", "currencyIssuer"])
    }
    return () => {
      controller.abort();
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isReady, saleTab, periodTab, currency, currencyIssuer]);

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
    if (!data || !data[0] || !data[0][key]) return;
    let direction = 'descending';
    let sortA = 1;
    let sortB = -1;
    if (sortConfig.key === key && sortConfig.direction === direction) {
      direction = 'ascending';
      sortA = -1;
      sortB = 1;
    }
    setSortConfig({ key, direction });

    if (key === 'amount' && data[0].amount.value) {
      setData(data.sort((a, b) => (parseFloat(a.amount.value) < parseFloat(b.amount.value)) ? sortA : sortB));
    } else {
      setData(data.sort((a, b) => (parseFloat(a[key]) < parseFloat(b[key])) ? sortA : sortB));
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
              <th>{t("table.taxon")}</th>
              <th className='right hide-on-mobile'>{t("table.nfts-now")} <b className={"link" + (sortConfig.key === 'totalNfts' ? " orange" : "")} onClick={() => sortTable('totalNfts')}>⇅</b></th>
              {/* <th className='right hide-on-mobile'>{t("table.owners-now")} <b className={"link" + (sortConfig.key === 'totalOwners' ? " orange" : "")} onClick={() => sortTable('totalOwners')}>⇅</b></th> */}
              {/* <th className='right hide-on-mobile'>{t("table.traded-nfts")} <b className={"link" + (sortConfig.key === 'tradedNfts' ? " orange" : "")} onClick={() => sortTable('tradedNfts')}>⇅</b></th> */}
              <th className='right'>{t("table.sales")} (XRP) <b className={"link" + (sortConfig.key === 'sales' ? " orange" : "")} onClick={() => sortTable('sales')}>⇅</b></th>
              {/* <th className='right hide-on-mobile'>{t("table.buyers")} <b className={"link" + (sortConfig.key === 'buyers' ? " orange" : "")} onClick={() => sortTable('buyers')}>⇅</b></th> */}
              <th className='right'>{t("table.volume")} (XRP only) <b className={"link" + (sortConfig.key === 'amount' ? " orange" : "")} onClick={() => sortTable('amount')}>⇅</b></th>
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
                          <td>{volume.taxon}</td>
                          <td className='center hide-on-mobile'>{shortNiceNumber(volume.totalNfts, 0)} <a href={'/nft-explorer?issuer=' + usernameOrAddress(rawData, 'issuer') + "&taxon=" + volume.taxon}><LinkIcon /></a></td>
                          {/* <td className='right hide-on-mobile'>{shortNiceNumber(volume.totalOwners, 0)} <a href={'/nft-distribution/' + usernameOrAddress(rawData, 'issuer') + "?taxon=" + volume.taxon}><LinkIcon /></a></td> */}
                          {/* <td className='right hide-on-mobile'>{shortNiceNumber(volume.tradedNfts, 0)}</td> */}
                          <td className='right'>
                            {shortNiceNumber(volume.sales, 0)}
                            <a href={'/nft-sales' + urlParams(volume)}> <LinkIcon /></a>
                          </td>
                          {/* <td className='right hide-on-mobile'>{shortNiceNumber(volume.buyers, 0)}</td> */}
                          <td className='right'>
                            {amountFormat(volume.amount, { tooltip: 'right', maxFractionDigits: 2 })}
                          </td>
                        </tr>)
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
                        {shortNiceNumber(volume.totalNfts, 0)} <a href={'/nft-explorer?issuer=' + usernameOrAddress(rawData, 'issuer') + "&taxon=" + volume.taxon}><LinkIcon /></a>
                      </p>
                      {/*
                      <p>
                        {t("table.owners-now")}:{" "}
                        {shortNiceNumber(volume.totalOwners, 0)} <a href={'/nft-distribution/' + usernameOrAddress(rawData, 'issuer') + "?taxon=" + volume.taxon}><LinkIcon /></a>
                      </p>
                      <p>
                        {t("table.traded-nfts")}: {shortNiceNumber(volume.tradedNfts, 0)}
                      </p>
                      */}
                      <p>
                        {t("table.sales")} (XRP): {shortNiceNumber(volume.sales, 0)} <a href={'/nft-sales' + urlParams(volume)}> <LinkIcon /></a>
                      </p>
                      {/*
                      <p>
                        {t("table.buyers")}: {shortNiceNumber(volume.buyers, 0)}
                      </p>
                      */}
                      <p>
                        {t("table.volume")} (XRP only): {amountFormat(volume.amount, { tooltip: 'right', maxFractionDigits: 2 })}
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

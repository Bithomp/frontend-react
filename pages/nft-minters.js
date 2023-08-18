import { useTranslation, Trans } from 'next-i18next'
import { useState, useEffect } from 'react'
import axios from 'axios'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { useRouter } from 'next/router'
import Link from 'next/link'

export const getServerSideProps = async ({ query, locale }) => {
  const { period } = query
  return {
    props: {
      period: period || "week",
      ...(await serverSideTranslations(locale, ['common', 'nft-minters'])),
    },
  }
}

import SEO from '../components/SEO'
import Tabs from '../components/Tabs'

import { setTabParams, useWidth } from '../utils'
import {
  shortNiceNumber,
  persentFormat,
  niceNumber
} from '../utils/format';

import LinkIcon from "../public/images/link.svg"

export default function NftMinters({ period }) {
  const { t } = useTranslation(['common', 'nft-minters'])
  const router = useRouter()

  const { isReady } = router

  const windowWidth = useWidth()

  const [data, setData] = useState([])
  const [rawData, setRawData] = useState({})
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")
  const [periodTab, setPeriodTab] = useState(period)
  const [sortConfig, setSortConfig] = useState({})

  const periodTabList = [
    { value: 'all', label: t("tabs.all-time") },
    //{ value: 'year', label: t("tabs.year") },
    { value: 'month', label: t("tabs.month") },
    { value: 'week', label: t("tabs.week") },
    { value: 'day', label: t("tabs.day") }
  ]

  const controller = new AbortController()

  const checkApi = async () => {
    let apiUrl = 'v2/nft-marketplaces'

    setLoading(true)
    setRawData({})
    setData([])

    const response = await axios.get(apiUrl + '?period=' + periodTab, {
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
        let list = newdata.marketplaces
        if (list.length > 0) {
          setErrorMessage("")
          setData(list.sort(function (a, b) {
            if (a.minted === null) return 1
            if (b.minted === null) return -1
            if (a.minted === b.minted) return 0
            return a.minted < b.minted ? 1 : -1
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
    {
      "period": "all",
      "summary": {
        "minted": 1873080,
        "mintedAndBurned": 306224,
        "burned": 306224
      },
      "marketplaces": [
        {
          "marketplace": "unknown",
          "minted": 616658,
          "mintedAndBurned": 186176,
          "burned": 186176
        },
        {
          "marketplace": "onxrp.com",
          "minted": 299713,
          "mintedAndBurned": 22778,
          "burned": 22778
        },
  */

  useEffect(() => {
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
      }
    ]

    setTabParams(router, tabsToSet, queryAddList, queryRemoveList)

    setSortConfig({})

    return () => {
      controller.abort()
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isReady, periodTab])

  const urlParams = (minter) => {
    let urlPart = "?mintedByMarketplace=" + minter?.marketplace
    return urlPart
  }

  const sortTable = key => {
    if (!data) return
    let direction = 'descending'
    let sortA = 1
    let sortB = -1

    if (sortConfig.key === key && sortConfig.direction === direction) {
      direction = 'ascending'
      sortA = -1
      sortB = 1
    }
    setSortConfig({ key, direction })
    setData(data.sort(function (a, b) {
      return a[key] < b[key] ? sortA : sortB
    }))
  }

  return <>
    <SEO
      title={
        t("header", { ns: "nft-minters" }) + ' '
        + (periodTab ? (" (" + (periodTab === 'all' ? t("tabs.all-time") : t("tabs." + periodTab)) + ")") : "")
      }
    />
    <div className="content-text">
      <h1 className="center">{t("header", { ns: "nft-minters" }) + " "}</h1>
      <div className='tabs-inline'>
        <Tabs tabList={periodTabList} tab={periodTab} setTab={setPeriodTab} name="period" />
      </div>
      <div className='flex'>
        <div className="grey-box">
          {t("desc", { ns: 'nft-minters' })}
        </div>
        <div className="grey-box">
          {loading ?
            t("general.loading")
            :
            <>
              {rawData?.summary &&
                <>
                  {t("period." + periodTab)}{" "}
                  {
                    periodTab === "all" ?
                      <Trans i18nKey="summary-all" ns="nft-minters">
                        XRPL had <b>{{ minted: shortNiceNumber(rawData.summary.minted, 0) }}</b> NFTs,
                        from which <b>{{ mintedAndBurned: shortNiceNumber(rawData.summary.mintedAndBurned, 0) }}</b> NFTs {{ percentMintedAndBurned: persentFormat(rawData.summary.mintedAndBurned, rawData.summary.minted) }} were burned.
                      </Trans>
                      :
                      <Trans i18nKey="summary-period" ns="nft-minters">
                        XRPL had <b>{{ minted: shortNiceNumber(rawData.summary.minted, 0) }}</b> NFTs,
                        from which <b>{{ mintedAndBurned: shortNiceNumber(rawData.summary.mintedAndBurned, 0) }}</b> NFTs {{ percentMintedAndBurned: persentFormat(rawData.summary.mintedAndBurned, rawData.summary.minted) }} were burned during the same period of time, total burned during this period: <b>{{ burned: niceNumber(rawData.summary.burned, 0) }}</b> NFTs.
                      </Trans>
                  }
                </>
              }
            </>
          }
        </div >
      </div >
      <br />
      {
        (windowWidth > 1000) ?
          <table className="table-large shrink">
            <thead>
              <tr>
                <th className='center'>{t("table.index")}</th>
                <th>{t("table.minter")} <b className={"link" + (sortConfig.key === 'marketplace' ? " orange" : "")} onClick={() => sortTable('marketplace')}>⇅</b></th>
                <th className='right'>{t("table.minted-total", { ns: "nft-minters" })} <b className={"link" + (sortConfig.key === 'minted' ? " orange" : "")} onClick={() => sortTable('minted')}>⇅</b></th>
                {periodTab !== "all" && <th className='right'>{t("table.minted-and-burned", { ns: "nft-minters" })} <b className={"link" + (sortConfig.key === 'mintedAndBurned' ? " orange" : "")} onClick={() => sortTable('mintedAndBurned')}>⇅</b></th>}
                <th className='right'>{t("table.burned-total", { ns: "nft-minters" })} <b className={"link" + (sortConfig.key === 'burned' ? " orange" : "")} onClick={() => sortTable('burned')}>⇅</b></th>
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
                        data.map((minter, i) =>
                          <tr key={i}>
                            <td className='center'>{i + 1}</td>
                            <td>{minter.marketplace}</td>
                            <td className='right'>
                              {shortNiceNumber(minter.minted, 0)} {persentFormat(minter.minted, rawData.summary.minted)}
                              <Link href={'/nfts' + urlParams(minter) + "&mintedPeriod=" + periodTab}> <LinkIcon /></Link>
                            </td>
                            {periodTab !== "all" &&
                              <td className='right'>
                                {shortNiceNumber(minter.mintedAndBurned, 0)}
                                <Link href={'/nfts' + urlParams(minter) + "&mintedPeriod=" + periodTab + "&burnedPeriod=" + periodTab}> <LinkIcon /></Link>
                              </td>
                            }
                            <td className='right'>
                              {shortNiceNumber(minter.burned, 0)}
                              <Link href={'/nfts' + urlParams(minter) + "&burnedPeriod=" + periodTab}> <LinkIcon /></Link>
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
                  {!errorMessage ? data.map((minter, i) =>
                    <tr key={i}>
                      <td style={{ padding: "5px" }} className='center'>
                        <b>{i + 1}</b>
                      </td>
                      <td>
                        <p>
                          {t("table.minter")}: {minter.marketplace}
                        </p>
                        <p>
                          {t("table.minted-total", { ns: "nft-minters" })}: {shortNiceNumber(minter.minted, 0)} {persentFormat(minter.minted, rawData.summary.minted)}
                        </p>
                        {periodTab !== "all" &&
                          <p>
                            {t("table.minted-and-burned", { ns: "nft-minters" })}: {shortNiceNumber(minter.mintedAndBurned, 0)}
                          </p>
                        }
                        <p>
                          {t("table.burned-total", { ns: "nft-minters" })}: {shortNiceNumber(minter.burned, 0)}
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
    </div >
  </>
}

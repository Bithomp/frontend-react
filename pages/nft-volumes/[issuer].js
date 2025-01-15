import { useTranslation } from 'next-i18next'
import { useState, useEffect } from 'react'
import axios from 'axios'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { useRouter } from 'next/router'
import Link from 'next/link'

import { getIsSsrMobile } from '../../utils/mobile'

export const getServerSideProps = async (context) => {
  const { query, locale } = context
  const { period, sale, currency, currencyIssuer, issuer, sortCurrency } = query
  return {
    props: {
      periodQuery: period || 'week',
      sale: sale || 'all',
      issuer: issuer || '',
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
import SearchBlock from '../../components/Layout/SearchBlock'
import DateAndTimeRange from '../../components/UI/DateAndTimeRange'
import SimpleChart from '../../components/SimpleChart'

import { setTabParams, stripText, isAddressOrUsername, useWidth, chartSpan } from '../../utils'
import { niceNumber, shortNiceNumber, usernameOrAddress, amountFormat } from '../../utils/format'

import LinkIcon from '../../public/images/link.svg'

export default function NftVolumes({
  periodQuery,
  sale,
  currency,
  currencyIssuer,
  issuer,
  selectedCurrency,
  sortCurrency
}) {
  const { t } = useTranslation()
  const router = useRouter()
  const { isReady } = router
  const windowWidth = useWidth()

  const [data, setData] = useState([])
  const [rawData, setRawData] = useState({})
  const [userData, setUserData] = useState({})
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [period, setPeriod] = useState(periodQuery)
  const [saleTab, setSaleTab] = useState(sale)
  const [sortConfig, setSortConfig] = useState({})
  const [chartIssuers, setChartIssuers] = useState([])
  const [chartVolumes, setChartVolumes] = useState([])
  const [loadingChart, setLoadingChart] = useState(false)

  const convertCurrency = sortCurrency || selectedCurrency

  const saleTabList = [
    { value: 'all', label: t('tabs.primaryAndSecondary-sales') },
    { value: 'secondary', label: t('tabs.secondary-sales') },
    { value: 'primary', label: t('tabs.primary-sales') }
  ]

  const controller = new AbortController()

  const checkApi = async () => {
    if (!period || !issuer || !convertCurrency) return

    let apiUrl =
      'v2/nft-volumes-extended?issuer=' +
      issuer +
      '&list=taxons&convertCurrencies=' +
      convertCurrency +
      '&sortCurrency=' +
      convertCurrency +
      '&statistics=true'

    let currencyUrlPart = ''
    if (currency && currencyIssuer) {
      currencyUrlPart = '&currency=' + stripText(currency) + '&currencyIssuer=' + stripText(currencyIssuer)
    } else if (currency.toLowerCase() === 'xrp') {
      currencyUrlPart = '&currency=xrp'
    }

    apiUrl += currencyUrlPart

    // get the chart data
    setLoadingChart(true)
    setChartIssuers([])
    setChartVolumes([])
    const chartDataResponse = await axios
      .get(
        'v2/nft-sales-chart?span=' +
          chartSpan(period) +
          '&period=' +
          period +
          '&saleType=' +
          saleTab +
          currencyUrlPart +
          '&convertCurrencies=' +
          convertCurrency +
          '&issuer=' +
          issuer
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
    // end getting the chart data

    setLoading(true)
    setRawData({})
    setData([])
    const response = await axios
      .get(apiUrl + '&period=' + period + '&saleType=' + saleTab, {
        signal: controller.signal
      })
      .catch((error) => {
        if (error && error.message !== 'canceled') {
          setErrorMessage(t('error.' + error.message))
          setLoading(false) //keep here for fast tab clickers
        }
      })

    const newdata = response?.data
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
          setErrorMessage('')
          let volumes = newdata.taxons
          setData(
            volumes.sort((a, b) =>
              parseFloat(a.volumesInConvertCurrencies[convertCurrency]) <
              parseFloat(b.volumesInConvertCurrencies[convertCurrency])
                ? 1
                : -1
            )
          )
        } else {
          setErrorMessage(t('general.no-data'))
        }
      } else {
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
          "statistics": {
            "buyers": 34,
            "tradedNfts": 91,
            "owners": 243,
            "nfts": 1521
          },
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
        tabList: saleTabList,
        tab: saleTab,
        defaultTab: 'all',
        setTab: setSaleTab,
        paramName: 'sale'
      }
    ]
    if (
      !currency ||
      (currency.toLowerCase() !== 'xrp' && !isAddressOrUsername(currencyIssuer)) ||
      listTab === 'currencies'
    ) {
      queryRemoveList = ['currency', 'currencyIssuer']
    }

    setTabParams(router, tabsToSet, queryAddList, queryRemoveList)

    setSortConfig({})

    return () => {
      controller.abort()
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isReady, saleTab, period, currency, currencyIssuer, convertCurrency, issuer])

  const urlParams = (volume) => {
    let urlPart = '?period=' + period + '&sale=' + saleTab
    if (volume?.amount) {
      if (volume.amount.currency) {
        urlPart = urlPart + '&currency=' + volume.amount.currency + '&currencyIssuer=' + volume.amount.issuer
      } else {
        urlPart = urlPart + '&currency=xrp'
      }
    }
    urlPart =
      urlPart +
      '&issuer=' +
      usernameOrAddress(rawData, 'issuer') +
      '&taxon=' +
      volume.taxon +
      '&includeWithoutMediaData=true'
    return urlPart
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
        data.sort((a, b) =>
          parseFloat(a.volumesInConvertCurrencies[convertCurrency]) <
          parseFloat(b.volumesInConvertCurrencies[convertCurrency])
            ? sortA
            : sortB
        )
      )
    } else {
      setData(data.sort((a, b) => (parseFloat(a[key]) < parseFloat(b[key]) ? sortA : sortB)))
    }
  }

  return (
    <>
      <SEO
        title={
          t('header', { ns: 'nft-volumes' }) +
          ' ' +
          issuer +
          ' ' +
          (saleTab === 'secondary' ? t('tabs.secondary-sales') : '') +
          (saleTab === 'primary' ? t('tabs.primary-sales') : '') +
          (currency ? ' ' + currency : '') +
          (currencyIssuer ? ' ' + currencyIssuer : '') +
          (period ? ' ' + period : '')
        }
      />
      <SearchBlock searchPlaceholderText={t('explorer.enter-address')} tab="nft-volumes" userData={userData} />
      <div className="content-text">
        <div className="tabs-inline">
          {windowWidth < 720 && <br />}
          {t('table.period')}
          {windowWidth < 720 && <br />}

          <DateAndTimeRange
            period={period}
            setPeriod={setPeriod}
            defaultPeriod={periodQuery}
            minDate="nft"
            tabs={true}
          />

          <br />

          <Tabs tabList={saleTabList} tab={saleTab} setTab={setSaleTab} name="sale" />
        </div>

        <center>
          {loadingChart ? (
            <>
              <br />
              <span className="waiting"></span>
              <br />
              {t('general.loading')}
              <br />
              <br />
            </>
          ) : (
            <>
              {chartIssuers.length > 0 && chartVolumes.length > 0 && (
                <div>
                  <div style={{ maxWidth: '100%', width: '600px', display: 'inline-block' }}>
                    <h3>{t('sales-chart', { ns: 'nft-volumes' })}</h3>
                    <SimpleChart data={chartIssuers} />
                  </div>
                  {windowWidth > 1000 && <div style={{ display: 'inline-block', width: '100px' }}></div>}
                  <div style={{ maxWidth: '100%', width: '600px', display: 'inline-block' }}>
                    <h3>
                      {t('volumes-chart', { ns: 'nft-volumes' })} ({convertCurrency?.toUpperCase()})
                    </h3>
                    <SimpleChart data={chartVolumes} />
                  </div>
                </div>
              )}
            </>
          )}
        </center>

        {windowWidth > 1000 ? (
          <table className="table-large shrink">
            <thead>
              <tr>
                <th className="center">{t('table.index')}</th>
                <th className="right">
                  {t('table.taxon')}{' '}
                  <b
                    className={'link' + (sortConfig.key === 'taxon' ? ' orange' : '')}
                    onClick={() => sortTable('taxon')}
                  >
                    ⇅
                  </b>
                </th>
                <th className="right">
                  {t('table.nfts-now')}{' '}
                  <b
                    className={'link' + (sortConfig.key === 'nfts' ? ' orange' : '')}
                    onClick={() => sortTable('nfts')}
                  >
                    ⇅
                  </b>
                </th>
                <th className="right">
                  {t('table.owners-now')}{' '}
                  <b
                    className={'link' + (sortConfig.key === 'owners' ? ' orange' : '')}
                    onClick={() => sortTable('owners')}
                  >
                    ⇅
                  </b>
                </th>
                <th className="right">
                  {t('table.traded-nfts')}{' '}
                  <b
                    className={'link' + (sortConfig.key === 'tradedNfts' ? ' orange' : '')}
                    onClick={() => sortTable('tradedNfts')}
                  >
                    ⇅
                  </b>
                </th>
                <th className="right">
                  {t('table.sales')}{' '}
                  <b
                    className={'link' + (sortConfig.key === 'sales' ? ' orange' : '')}
                    onClick={() => sortTable('sales')}
                  >
                    ⇅
                  </b>
                </th>
                <th className="right">
                  {t('table.buyers')}{' '}
                  <b
                    className={'link' + (sortConfig.key === 'buyers' ? ' orange' : '')}
                    onClick={() => sortTable('buyers')}
                  >
                    ⇅
                  </b>
                </th>
                <th className="right">
                  {t('table.volume')}{' '}
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
                            <td className="right">{volume.taxon}</td>
                            <td className="right">
                              {shortNiceNumber(volume.statistics.nfts, 0)}{' '}
                              <Link
                                href={
                                  '/nft-explorer?issuer=' +
                                  usernameOrAddress(rawData, 'issuer') +
                                  '&taxon=' +
                                  volume.taxon
                                }
                              >
                                <LinkIcon />
                              </Link>
                            </td>
                            <td className="right">
                              {shortNiceNumber(volume.statistics.owners, 0)}{' '}
                              <Link
                                href={
                                  '/nft-distribution/' + usernameOrAddress(rawData, 'issuer') + '?taxon=' + volume.taxon
                                }
                              >
                                <LinkIcon />
                              </Link>
                            </td>
                            <td className="right">{shortNiceNumber(volume.statistics.tradedNfts, 0)}</td>
                            <td className="right">
                              {shortNiceNumber(volume.sales, 0)}
                              <Link href={'/nft-sales' + urlParams(volume)}>
                                {' '}
                                <LinkIcon />
                              </Link>
                            </td>
                            <td className="right">{shortNiceNumber(volume.statistics.buyers, 0)}</td>
                            <td className="right">
                              <span className="tooltip">
                                {niceNumber(volume.volumesInConvertCurrencies[convertCurrency], 2, convertCurrency)}
                                <table
                                  className="tooltiptext left table-large shrink"
                                  style={{ width: '400px', transition: 'none' }}
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
                                        <td className="right">{amountFormat(vol.amount)}</td>
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
                              </span>
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
                          <p>{i + 1}</p>
                        </td>
                        <td>
                          <p>
                            {t('table.taxon')}: {volume.taxon}
                          </p>
                          <p>
                            {t('table.nfts-now')}: {shortNiceNumber(volume.statistics.nfts, 0)}{' '}
                            <Link
                              href={
                                '/nft-explorer?issuer=' +
                                usernameOrAddress(rawData, 'issuer') +
                                '&taxon=' +
                                volume.taxon
                              }
                            >
                              <LinkIcon />
                            </Link>
                          </p>
                          <p>
                            {t('table.owners-now')}: {shortNiceNumber(volume.statistics.owners, 0)}{' '}
                            {/* <Link href={'/nft-distribution/' + usernameOrAddress(rawData, 'issuer') + "?taxon=" + volume.taxon}><LinkIcon /></Link> */}
                          </p>
                          <p>
                            {t('table.traded-nfts')}: {shortNiceNumber(volume.statistics.tradedNfts, 0)}
                          </p>
                          <p>
                            {t('table.sales')}: {shortNiceNumber(volume.sales, 0)}{' '}
                            <Link href={'/nft-sales' + urlParams(volume)}>
                              {' '}
                              <LinkIcon />
                            </Link>
                          </p>
                          <p>
                            {t('table.buyers')}: {shortNiceNumber(volume.statistics.buyers, 0)}
                          </p>
                          <p>
                            {t('table.volume')}:{' '}
                            {niceNumber(volume.volumesInConvertCurrencies[convertCurrency], 2, convertCurrency)}
                          </p>
                          <table
                            className="tooltiptext left table-mobile"
                            style={{ width: 'calc(100% - 20px)', margin: '20px 20px 20px 0px' }}
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
                                  <td className="right">{amountFormat(vol.amount)}</td>
                                  <td className="right">
                                    {niceNumber(vol.amountInConvertCurrencies[convertCurrency], 2, convertCurrency)}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
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
      </div>
    </>
  )
}

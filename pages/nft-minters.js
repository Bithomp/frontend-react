import { useTranslation, Trans } from 'next-i18next'
import { useState, useEffect } from 'react'
import axios from 'axios'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { useRouter } from 'next/router'
import Link from 'next/link'

import { getIsSsrMobile } from '../utils/mobile'

export const getServerSideProps = async (context) => {
  const { query, locale } = context
  const { period } = query
  return {
    props: {
      periodQuery: period || 'week',
      isSsrMobile: getIsSsrMobile(context),
      ...(await serverSideTranslations(locale, ['common', 'nft-minters']))
    }
  }
}

import SEO from '../components/SEO'
import DateAndTimeRange from '../components/UI/DateAndTimeRange'
import SimpleChart from '../components/SimpleChart'

import { chartSpan, useWidth } from '../utils'
import { shortNiceNumber, percentFormat, niceNumber } from '../utils/format'

import LinkIcon from '../public/images/link.svg'

export default function NftMinters({ periodQuery }) {
  const { t } = useTranslation(['common', 'nft-minters'])
  const router = useRouter()

  const { isReady } = router

  const windowWidth = useWidth()

  const [data, setData] = useState([])
  const [rawData, setRawData] = useState({})
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [period, setPeriod] = useState(periodQuery)
  const [sortConfig, setSortConfig] = useState({})
  const [loadingChart, setLoadingChart] = useState(false)
  const [chartData, setChartData] = useState([])

  const controller = new AbortController()

  const checkApi = async () => {
    let apiUrl = 'v2/nft-marketplaces'

    setLoading(true)
    setRawData({})
    setData([])

    if (period) {
      //chartData
      setLoadingChart(true)
      setChartData([])

      const chartDataResponse = await axios
        .get('v2/nft-chart?span=' + chartSpan(period) + '&period=' + period)
        .catch((error) => {
          if (error && error.message !== 'canceled') {
            setErrorMessage(t('error.' + error.message))
          }
          setLoadingChart(false)
        })
      setLoadingChart(false)

      if (chartDataResponse?.data?.chart?.length > 0) {
        const newChartData = chartDataResponse.data.chart.map((item) => {
          return [item.time, item.issues]
        })
        setChartData(newChartData)
      }

      //chart data ends
    }

    const response = await axios
      .get(apiUrl + '?period=' + period, {
        signal: controller.signal
      })
      .catch((error) => {
        if (error && error.message !== 'canceled') {
          setErrorMessage(t('error.' + error.message))
        }
        setLoading(false) //keep here for fast tab clickers
      })
    const newdata = response?.data

    setLoading(false) //keep here for fast tab clickers

    if (newdata) {
      setRawData(newdata)
      if (newdata.period) {
        let list = newdata.marketplaces
        if (list.length > 0) {
          setErrorMessage('')
          setData(
            list.sort(function (a, b) {
              if (a.mintedWithMetadata === null) return 1
              if (b.mintedWithMetadata === null) return -1
              if (a.mintedWithMetadata === b.mintedWithMetadata) return 0
              return a.mintedWithMetadata < b.mintedWithMetadata ? 1 : -1
            })
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
      "period": "all",
      "summary": {
        "minted": 1873080,
        "mintedWithMetadata": 1240000,
        "mintedAndBurned": 306224,
        "burned": 306224
      },
      "marketplaces": [
        {
          "marketplace": "unknown",
          "minted": 616658,
          "mintedWithMetadata": 234000,
          "mintedAndBurned": 186176,
          "burned": 186176
        },
        {
          "marketplace": "bidds.com",
          "minted": 299713,
          "mintedWithMetadata": 120000,
          "mintedAndBurned": 22778,
          "burned": 22778
        },
  */

  useEffect(() => {
    checkApi()
    setSortConfig({})
    return () => {
      controller.abort()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isReady, period])

  const urlParams = (minter) => {
    let urlPart = '?mintedByMarketplace=' + minter?.marketplace + '&includeBurned=true&includeWithoutMediaData=true'
    return urlPart
  }

  const sortTable = (key) => {
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
    setData(
      data.sort(function (a, b) {
        return a[key] < b[key] ? sortA : sortB
      })
    )
  }

  return (
    <>
      <SEO
        title={
          t('header', { ns: 'nft-minters' }) +
          ' ' +
          (period ? ' (' + (period === 'all' ? t('tabs.all-time') : t('tabs.' + period)) + ')' : '')
        }
      />
      <div className="content-text">
        <h1 className="center">{t('header', { ns: 'nft-minters' })}</h1>
        <div className="tabs-inline">
          <DateAndTimeRange
            period={period}
            setPeriod={setPeriod}
            defaultPeriod={periodQuery}
            minDate="nft"
            tabs={true}
          />
        </div>
        <div className="flex">
          <div className="grey-box">{t('desc', { ns: 'nft-minters' })}</div>
          <div className="grey-box">
            {loading ? (
              t('general.loading')
            ) : (
              <>
                {rawData?.summary && (
                  <>
                    {period === 'all' ? (
                      <Trans i18nKey="summary-all" ns="nft-minters">
                        XRPL had <b>{{ minted: shortNiceNumber(rawData.summary.minted, 0) }}</b> NFTs, from which{' '}
                        <b>{{ mintedAndBurned: shortNiceNumber(rawData.summary.mintedAndBurned, 0) }}</b> NFTs{' '}
                        {{
                          percentMintedAndBurned: percentFormat(rawData.summary.mintedAndBurned, rawData.summary.minted)
                        }}{' '}
                        were burned.
                      </Trans>
                    ) : (
                      <Trans i18nKey="summary-period" ns="nft-minters">
                        For that period XRPL had <b>{{ minted: shortNiceNumber(rawData.summary.minted, 0) }}</b> NFTs
                        were minted, from which{' '}
                        <b>{{ mintedAndBurned: shortNiceNumber(rawData.summary.mintedAndBurned, 0) }}</b> NFTs{' '}
                        {{
                          percentMintedAndBurned: percentFormat(rawData.summary.mintedAndBurned, rawData.summary.minted)
                        }}{' '}
                        were burned during the same period of time, total burned during this period:{' '}
                        <b>{{ burned: niceNumber(rawData.summary.burned, 0) }}</b> NFTs.
                      </Trans>
                    )}
                  </>
                )}
              </>
            )}
          </div>
        </div>

        <center>
          <br />
          <h3>{t('mint-chart', { ns: 'nft-minters' })}</h3>
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
              {chartData.length > 0 && (
                <div style={{ maxWidth: '600px' }}>
                  <SimpleChart data={chartData} />
                </div>
              )}
            </>
          )}
        </center>

        <br />
        {windowWidth > 1000 ? (
          <table className="table-large shrink">
            <thead>
              <tr>
                <th className="center">{t('table.index')}</th>
                <th>
                  {t('table.minter')}{' '}
                  <b
                    className={'link' + (sortConfig.key === 'marketplace' ? ' orange' : '')}
                    onClick={() => sortTable('marketplace')}
                  >
                    ⇅
                  </b>
                </th>
                <th className="right">
                  {t('table.minted-total', { ns: 'nft-minters' })}{' '}
                  <b
                    className={'link' + (sortConfig.key === 'minted' ? ' orange' : '')}
                    onClick={() => sortTable('minted')}
                  >
                    ⇅
                  </b>
                </th>
                <th className="right">
                  {t('table.minted-with-metadata', { ns: 'nft-minters' })}{' '}
                  <b
                    className={'link' + (sortConfig.key === 'mintedWithMetadata' ? ' orange' : '')}
                    onClick={() => sortTable('mintedWithMetadata')}
                  >
                    ⇅
                  </b>
                </th>
                {period !== 'all' && (
                  <th className="right">
                    {t('table.minted-and-burned', { ns: 'nft-minters' })}{' '}
                    <b
                      className={'link' + (sortConfig.key === 'mintedAndBurned' ? ' orange' : '')}
                      onClick={() => sortTable('mintedAndBurned')}
                    >
                      ⇅
                    </b>
                  </th>
                )}
                <th className="right">
                  {t('table.burned-total', { ns: 'nft-minters' })}{' '}
                  <b
                    className={'link' + (sortConfig.key === 'burned' ? ' orange' : '')}
                    onClick={() => sortTable('burned')}
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
                        data.map((minter, i) => (
                          <tr key={i}>
                            <td className="center">{i + 1}</td>
                            <td>{minter.marketplace}</td>
                            <td className="right">
                              {shortNiceNumber(minter.minted, 0)} {percentFormat(minter.minted, rawData.summary.minted)}
                              <Link href={'/nft-explorer' + urlParams(minter) + '&mintedPeriod=' + period}>
                                {' '}
                                <LinkIcon />
                              </Link>
                            </td>
                            <td className="right">
                              {shortNiceNumber(minter.mintedWithMetadata, 0)}{' '}
                              {minter.mintedWithMetadata ? percentFormat(minter.mintedWithMetadata, minter.minted) : ''}
                            </td>
                            {period !== 'all' && (
                              <td className="right">
                                {shortNiceNumber(minter.mintedAndBurned, 0)}{' '}
                                {minter.mintedAndBurned ? percentFormat(minter.mintedAndBurned, minter.minted) : ''}
                                <Link
                                  href={
                                    '/nft-explorer' +
                                    urlParams(minter) +
                                    '&mintedPeriod=' +
                                    period +
                                    '&burnedPeriod=' +
                                    period
                                  }
                                >
                                  {' '}
                                  <LinkIcon />
                                </Link>
                              </td>
                            )}
                            <td className="right">
                              {shortNiceNumber(minter.burned, 0)}
                              <Link href={'/nft-explorer' + urlParams(minter) + '&burnedPeriod=' + period}>
                                {' '}
                                <LinkIcon />
                              </Link>
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
                    data.map((minter, i) => (
                      <tr key={i}>
                        <td style={{ padding: '5px' }} className="center">
                          <b>{i + 1}</b>
                        </td>
                        <td>
                          <p>
                            {t('table.minter')}: {minter.marketplace}
                          </p>
                          <p>
                            {t('table.minted-total', { ns: 'nft-minters' })}: {shortNiceNumber(minter.minted, 0)}{' '}
                            {percentFormat(minter.minted, rawData.summary.minted)}
                            <Link href={'/nft-explorer' + urlParams(minter) + '&mintedPeriod=' + period}>
                              {' '}
                              <LinkIcon />
                            </Link>
                          </p>
                          <p>
                            {t('table.minted-with-metadata', { ns: 'nft-minters' })}:{' '}
                            {shortNiceNumber(minter.mintedWithMetadata, 0)}{' '}
                            {minter.mintedWithMetadata ? percentFormat(minter.mintedWithMetadata, minter.minted) : ''}
                          </p>
                          {period !== 'all' && (
                            <p>
                              {t('table.minted-and-burned', { ns: 'nft-minters' })}:{' '}
                              {shortNiceNumber(minter.mintedAndBurned, 0)}{' '}
                              {minter.mintedAndBurned ? percentFormat(minter.mintedAndBurned, minter.minted) : ''}
                              <Link
                                href={
                                  '/nft-explorer' +
                                  urlParams(minter) +
                                  '&mintedPeriod=' +
                                  period +
                                  '&burnedPeriod=' +
                                  period
                                }
                              >
                                {' '}
                                <LinkIcon />
                              </Link>
                            </p>
                          )}
                          <p>
                            {t('table.burned-total', { ns: 'nft-minters' })}: {shortNiceNumber(minter.burned, 0)}
                            <Link href={'/nft-explorer' + urlParams(minter) + '&burnedPeriod=' + period}>
                              {' '}
                              <LinkIcon />
                            </Link>
                          </p>
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

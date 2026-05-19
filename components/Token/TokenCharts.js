import { useEffect, useMemo, useState } from 'react'
import dynamic from 'next/dynamic'
import axios from 'axios'
import { useTranslation } from 'next-i18next'
import { IoExpandOutline, IoInformationCircleOutline } from 'react-icons/io5'

import Dialog from '../UI/Dialog'
import { useTheme } from '../Layout/ThemeContext'
import { nativeCurrency, xahauNetwork } from '../../utils'
import { niceCurrency, niceNumber, shortNiceNumber } from '../../utils/format'
import {
  tokenChartDialog,
  tokenChartDialogDescription
} from '../../styles/pages/token.module.scss'

const Chart = dynamic(() => import('react-apexcharts'), { ssr: false })

const zoomInIcon = '/images/chart/zoom-in.svg'
const zoomOutIcon = '/images/chart/zoom-out.svg'
const resetIcon = '/images/chart/reset.svg'
const MIN_VISIBLE_VOLUME_SUMMARY = 0.001

const toolbarIcon = (src, alt) =>
  `<img src="${src}" width="20" height="20" alt="${alt}" style="display:block;width:20px;height:20px;">`

const escapeHtml = (value) =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

const CHART_COLORS = {
  ammPrice: '#5bc0eb',
  offerPrice: '#7ddc7a',
  ammBuy: '#2fb6a3',
  buyTotal: '#007c89',
  ammSell: '#f28a5b',
  sellTotal: '#b95c3b',
  offerBuy: '#8dd7be',
  offerSell: '#f6c177',
  marketCap: '#00bcd4',
  supply: '#b68cff',
  holders: '#00bcd4',
  trustlines: '#7e8cff',
  ammTxs: '#00bcd4',
  offerTxs: '#7e8cff',
  ammDexes: '#5bc0eb',
  offerDexes: '#ffc857',
  ammAccounts: '#00bcd4',
  accountOverlap: '#58a9d7',
  offerAccounts: '#7e8cff',
  uniqueAccounts: '#ffc857',
  uniqueBuyers: '#21c978',
  uniqueSellers: '#ff7a59',
  mintVolume: '#21c978',
  burnVolume: '#ff7a59',
  transferVolume: '#7e8cff',
  transferTxs: '#00bcd4'
}

const toNumber = (value) => {
  if (value === undefined || value === null || value === '') return null
  const number = Number(value)
  return Number.isFinite(number) ? number : null
}

const toTimestamp = (time) => {
  const number = toNumber(time)
  if (!number) return null
  return number < 10000000000 ? number * 1000 : number
}

const chartDataUrl = (token, selectedCurrency) => {
  if (!token || !selectedCurrency) return ''

  const tokenPath = token?.mptokenIssuanceID
    ? encodeURIComponent(token.mptokenIssuanceID)
    : token?.issuer
      ? `${encodeURIComponent(token.issuer)}/${encodeURIComponent(token.currency)}`
      : encodeURIComponent(token?.currency || nativeCurrency)

  return `v2/token/${tokenPath}/chart?convertCurrencies=${encodeURIComponent(selectedCurrency.toLowerCase())}`
}

const tokenLabel = (token) => {
  if (token?.mptokenIssuanceID) return token?.metadata?.name || token?.currency || 'MPT'
  return token?.currencyDetails?.currency || niceCurrency(token?.currency) || token?.currency || nativeCurrency
}

const fiatValue = (row, selectedCurrency, field = 'priceFiats') => {
  const currency = selectedCurrency?.toLowerCase()
  if (!currency) return null
  return toNumber(row?.[field]?.[currency])
}

const hasUsableData = (series) =>
  series.some((item) => Array.isArray(item.data) && item.data.some((point) => point[1] !== null && point[1] !== undefined))

const fieldSeries = ({ rows, name, field, type = 'line', color, group }) => ({
  name,
  type,
  color,
  group,
  data: rows.map((row) => [row.timestamp, toNumber(row[field])])
})

const derivedSeries = ({ rows, name, getValue, type = 'line', color, group }) => ({
  name,
  type,
  color,
  group,
  data: rows.map((row) => [row.timestamp, getValue(row)])
})

const compactNumber = (value, currency) => {
  if (value === null || value === undefined) return '-'
  const abs = Math.abs(Number(value))
  const decimals = abs && abs < 1 ? 4 : 2
  return shortNiceNumber(value, decimals, 1, currency)
}

const fullNumber = (value, currency) => {
  if (value === null || value === undefined) return '-'
  const abs = Math.abs(Number(value))
  const decimals = abs && abs < 1 ? 6 : 2
  return niceNumber(value, decimals, currency)
}

const seriesRange = (series) => {
  const values = series
    .flatMap((item) => item.data?.map((point) => point[1]) || [])
    .filter((value) => value !== null && value !== undefined)

  if (!values.length) return null

  const min = Math.min(...values)
  const max = Math.max(...values)
  const spread = max - min
  const padding = spread ? spread * 0.14 : Math.max(Math.abs(max) * 0.05, 1)

  return {
    min: Math.max(0, min - padding),
    max: max + padding
  }
}

const chartDate = (value) =>
  new Date(value).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric'
  })

const firstSentence = (value) => {
  if (!value) return ''
  const text = String(value)
  const match = text.match(/^.*?[.!?。！？](?=\s|$)/)
  return match?.[0] || text
}

const tooltipShell = ({ date, rows }) =>
  `<div style="min-width:176px;max-width:340px;color:var(--text-main);">
    <div class="apexcharts-tooltip-title" style="font-family:Helvetica, Arial, sans-serif;font-size:12px;">${escapeHtml(date)}</div>
    ${rows.join('')}
  </div>`

const tooltipDivider = () =>
  '<div style="margin:4px 10px 2px;border-top:1px solid color-mix(in srgb, var(--card-border) 72%, transparent);"></div>'

const tooltipRow = ({ color, label, value, bold = false, formatter }) =>
  `<div class="apexcharts-tooltip-series-group apexcharts-active" style="display:flex;align-items:center;gap:8px;padding:4px 10px;line-height:1.25;">
    <span class="apexcharts-tooltip-marker" style="width:9px;height:9px;min-width:9px;border-radius:999px;background-color:${color};"></span>
    <div class="apexcharts-tooltip-text" style="display:flex;flex:1 1 auto;min-width:0;font-family:Helvetica, Arial, sans-serif;font-size:12px;">
      <div class="apexcharts-tooltip-y-group" style="display:flex;align-items:baseline;justify-content:space-between;gap:16px;width:100%;font-weight:${bold ? 700 : 400};">
        <span class="apexcharts-tooltip-text-y-label" style="font-size:12px;white-space:normal;">${escapeHtml(label)}: </span>
        <span class="apexcharts-tooltip-text-y-value" style="font-size:12px;font-variant-numeric:tabular-nums;white-space:nowrap;">${escapeHtml(formatter(value))}</span>
      </div>
    </div>
  </div>`

function TokenChart({ group, expanded = false }) {
  const { theme } = useTheme()
  const textColor = theme === 'light' ? '#2f3337' : '#f4f4f4'
  const gridColor =
    theme === 'light' ? 'rgba(52, 59, 66, 0.16)' : 'rgba(255, 255, 255, 0.16)'
  const labelColor = theme === 'light' ? '#5f6670' : '#a7a7a7'
  const height = expanded ? 420 : 150
  const yAxisLabelOptions = {
    minWidth: expanded ? 56 : 32,
    style: { colors: labelColor }
  }
  const yaxis = group.secondaryAxisFormatter
    ? [
        {
          ...(group.yRange ? group.yRange : {}),
          seriesName: group.primarySeriesName,
          tickAmount: expanded ? 5 : 3,
          labels: {
            ...yAxisLabelOptions,
            formatter: group.axisFormatter
          }
        },
        {
          seriesName: group.secondarySeriesName,
          opposite: true,
          tickAmount: expanded ? 5 : 3,
          labels: {
            minWidth: expanded ? 42 : 28,
            style: { colors: labelColor },
            formatter: group.secondaryAxisFormatter
          }
        }
      ]
    : {
        ...(group.yRange ? group.yRange : {}),
        tickAmount: expanded ? 5 : 3,
        labels: {
          ...yAxisLabelOptions,
          formatter: group.axisFormatter
        }
      }

  const options = useMemo(
    () => ({
      chart: {
        id: `token-${group.key}-${expanded ? 'expanded' : 'compact'}`,
        animations: { enabled: false },
        foreColor: textColor,
        stacked: group.stacked,
        stackOnlyBar: group.stackOnlyBar,
        toolbar: {
          show: expanded,
          tools: {
            download: false,
            selection: false,
            zoom: false,
            zoomin: toolbarIcon(zoomInIcon, 'zoom in'),
            zoomout: toolbarIcon(zoomOutIcon, 'zoom out'),
            pan: false,
            reset: toolbarIcon(resetIcon, 'reset zoom')
          }
        },
        zoom: {
          enabled: expanded,
          autoScaleYaxis: true
        }
      },
      colors: group.colors,
      dataLabels: { enabled: false },
      fill: {
        opacity: group.series.map((series) => (series.type === 'column' ? 0.86 : series.type === 'area' ? 0.18 : 1))
      },
      grid: {
        borderColor: gridColor,
        strokeDashArray: 3,
        padding: expanded ? { left: 12, right: 16, top: 0, bottom: 0 } : { left: 0, right: 4, top: 0, bottom: 0 }
      },
      legend: {
        show: expanded || group.series.length <= 3,
        position: 'top',
        horizontalAlign: 'left',
        fontSize: expanded ? '12px' : '11px',
        labels: { colors: labelColor },
        markers: { size: 5 }
      },
      markers: {
        size: expanded ? 3 : 0,
        strokeWidth: 0,
        hover: { size: 5 }
      },
      plotOptions: {
        bar: {
          borderRadius: 3,
          columnWidth: expanded ? '56%' : '68%'
        }
      },
      stroke: {
        curve: 'smooth',
        width: group.series.map((series) => (series.type === 'column' ? 0 : expanded ? 3 : 2.5))
      },
      tooltip: {
        shared: true,
        intersect: false,
        theme,
        fixed: group.tooltipFixed && !expanded
          ? {
            enabled: true,
            position: 'bottomLeft',
            offsetX: 0,
            offsetY: 18
          }
          : { enabled: false },
        ...(group.tooltipCustom ? { custom: group.tooltipCustom } : {}),
        x: {
          formatter: chartDate
        },
        y: {
          formatter: group.tooltipFormatter
        }
      },
      xaxis: {
        type: 'datetime',
        crosshairs: {
          show: group.crosshairs !== false
        },
        labels: {
          datetimeUTC: true,
          style: { colors: labelColor },
          datetimeFormatter: { day: 'd MMM' }
        },
        axisBorder: { color: gridColor },
        axisTicks: { color: gridColor },
        tooltip: { enabled: false }
      },
      yaxis
    }),
    [expanded, gridColor, group, labelColor, textColor, theme, yaxis]
  )

  return (
    <Chart
      type={group.chartType || 'line'}
      series={group.series}
      options={options}
      height={height}
    />
  )
}

export default function TokenCharts({ token, selectedCurrency }) {
  const { t } = useTranslation('token')
  const [chartRows, setChartRows] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [expandedKey, setExpandedKey] = useState('')
  const url = chartDataUrl(token, selectedCurrency)
  const tokenUnit = tokenLabel(token)
  const selectedFiat = selectedCurrency?.toLowerCase()
  const isNativeToken = !token?.issuer && token?.currency === nativeCurrency
  const showMintData = !isNativeToken || xahauNetwork

  useEffect(() => {
    if (!url) {
      setChartRows([])
      return
    }

    let ignore = false
    const controller = new AbortController()

    setLoading(true)
    setError('')

    axios
      .get(url, { signal: controller.signal })
      .then((response) => {
        if (ignore) return
        const rows = Array.isArray(response?.data?.chart) ? response.data.chart : []
        setChartRows(
          rows
            .map((row) => ({ ...row, timestamp: toTimestamp(row.time) }))
            .filter((row) => row.timestamp)
            .sort((a, b) => a.timestamp - b.timestamp)
        )
      })
      .catch((requestError) => {
        if (ignore || axios.isCancel(requestError)) return
        setChartRows([])
        setError(t('charts.errors.failed'))
      })
      .finally(() => {
        if (!ignore) setLoading(false)
      })

    return () => {
      ignore = true
      controller.abort()
    }
  }, [t, url])

  const groups = useMemo(() => {
    if (!chartRows.length) return []

    const latest = chartRows[chartRows.length - 1]
    const priceSeries = [
      {
        name: t('charts.series.ammPrice'),
        type: 'area',
        color: CHART_COLORS.ammPrice,
        data: chartRows.map((row) => [row.timestamp, fiatValue(row, selectedFiat, 'ammPriceFiats')])
      },
      {
        name: t('charts.series.offerPrice'),
        type: 'line',
        color: CHART_COLORS.offerPrice,
        data: chartRows.map((row) => [row.timestamp, fiatValue(row, selectedFiat, 'offerPriceFiats')])
      }
    ].filter((series) => hasUsableData([series]))

    const volumeCanUseFiat = chartRows.some((row) => fiatValue(row, selectedFiat) !== null)
    const volumeUnit = volumeCanUseFiat ? selectedCurrency : null
    const volumeValue = (row, field) => {
      const amount = toNumber(row[field])
      if (amount === null) return null
      if (!volumeCanUseFiat) return amount
      const price = fiatValue(row, selectedFiat)
      return price === null ? null : amount * price
    }
    const totalBuyVolumeValue = (row) => {
      const splitValues = ['ammBuyVolume', 'offerBuyVolume']
        .map((field) => volumeValue(row, field))
        .filter((value) => value !== null)

      if (splitValues.length) return splitValues.reduce((sum, value) => sum + value, 0)

      return volumeValue(row, 'buyVolume')
    }
    const totalSellVolumeValue = (row) => {
      const splitValues = ['ammSellVolume', 'offerSellVolume']
        .map((field) => volumeValue(row, field))
        .filter((value) => value !== null)

      if (splitValues.length) return splitValues.reduce((sum, value) => sum + value, 0)

      return volumeValue(row, 'sellVolume')
    }
    const totalVolumeValue = (row) => (totalBuyVolumeValue(row) || 0) + (totalSellVolumeValue(row) || 0)
    const volumeSeries = [
      {
        name: t('charts.series.ammBuyVolume'),
        type: 'column',
        color: CHART_COLORS.ammBuy,
        group: 'buy',
        data: chartRows.map((row) => [row.timestamp, volumeValue(row, 'ammBuyVolume')])
      },
      {
        name: t('charts.series.offerBuyVolume'),
        type: 'column',
        color: CHART_COLORS.offerBuy,
        group: 'buy',
        data: chartRows.map((row) => [row.timestamp, volumeValue(row, 'offerBuyVolume')])
      },
      {
        name: t('charts.series.ammSellVolume'),
        type: 'column',
        color: CHART_COLORS.ammSell,
        group: 'sell',
        data: chartRows.map((row) => [row.timestamp, volumeValue(row, 'ammSellVolume')])
      },
      {
        name: t('charts.series.offerSellVolume'),
        type: 'column',
        color: CHART_COLORS.offerSell,
        group: 'sell',
        data: chartRows.map((row) => [row.timestamp, volumeValue(row, 'offerSellVolume')])
      },
      {
        name: t('fields.volumeBuy'),
        type: 'line',
        color: CHART_COLORS.buyTotal,
        data: chartRows.map((row) => [row.timestamp, totalBuyVolumeValue(row)])
      },
      {
        name: t('fields.volumeSell'),
        type: 'line',
        color: CHART_COLORS.sellTotal,
        data: chartRows.map((row) => [row.timestamp, totalSellVolumeValue(row)])
      }
    ].filter((series) => hasUsableData([series]))
    const volumeTooltip = ({ dataPointIndex }) => {
      const row = chartRows[dataPointIndex] || {}
      const formatted = (value) =>
        volumeCanUseFiat ? fullNumber(value, selectedCurrency) : `${fullNumber(value)} ${tokenUnit}`
      const buyTotal = totalBuyVolumeValue(row) || 0
      const sellTotal = totalSellVolumeValue(row) || 0

      return tooltipShell({
        date: chartDate(row.timestamp),
        rows: [
          tooltipRow({
            color: CHART_COLORS.buyTotal,
            label: t('fields.volumeBuy'),
            value: buyTotal,
            bold: true,
            formatter: formatted
          }),
          tooltipRow({
            color: CHART_COLORS.ammBuy,
            label: t('charts.series.ammBuyVolume'),
            value: volumeValue(row, 'ammBuyVolume') || 0,
            formatter: formatted
          }),
          tooltipRow({
            color: CHART_COLORS.offerBuy,
            label: t('charts.series.offerBuyVolume'),
            value: volumeValue(row, 'offerBuyVolume') || 0,
            formatter: formatted
          }),
          tooltipDivider(),
          tooltipRow({
            color: CHART_COLORS.sellTotal,
            label: t('fields.volumeSell'),
            value: sellTotal,
            bold: true,
            formatter: formatted
          }),
          tooltipRow({
            color: CHART_COLORS.ammSell,
            label: t('charts.series.ammSellVolume'),
            value: volumeValue(row, 'ammSellVolume') || 0,
            formatter: formatted
          }),
          tooltipRow({
            color: CHART_COLORS.offerSell,
            label: t('charts.series.offerSellVolume'),
            value: volumeValue(row, 'offerSellVolume') || 0,
            formatter: formatted
          }),
          tooltipDivider(),
          tooltipRow({
            color: 'var(--link-color)',
            label: t('fields.volumeTotal'),
            value: buyTotal + sellTotal,
            bold: true,
            formatter: formatted
          })
        ]
      })
    }

    const holderSeries = [
      fieldSeries({
        rows: chartRows,
        name: t('charts.series.holders'),
        field: 'holders',
        type: 'line',
        color: CHART_COLORS.holders
      }),
      fieldSeries({
        rows: chartRows,
        name: t('charts.series.trustlines'),
        field: 'trustlines',
        type: 'line',
        color: CHART_COLORS.trustlines
      })
    ].filter((series) => hasUsableData([series]))

    const supplySeries = [
      fieldSeries({
        rows: chartRows,
        name: t('charts.series.supply'),
        field: 'supply',
        type: 'area',
        color: CHART_COLORS.supply
      })
    ].filter((series) => hasUsableData([series]))

    const hasSupplyData = chartRows.some((row) => toNumber(row.supply) !== null)
    const marketCapCanUseFiat = chartRows.some(
      (row) => toNumber(row.supply) !== null && fiatValue(row, selectedFiat) !== null
    )
    const marketCapUnit = marketCapCanUseFiat ? selectedCurrency : nativeCurrency
    const marketCapValue = (row) => {
      const supply = toNumber(row.supply)
      if (supply === null) return null
      const price = fiatValue(row, selectedFiat)
      if (marketCapCanUseFiat) return supply !== null && price !== null ? supply * price : null
      return toNumber(row.marketcap)
    }
    const marketCapSeries = hasSupplyData
      ? [
          {
            name: t('charts.series.marketCap'),
            type: 'area',
            color: CHART_COLORS.marketCap,
            data: chartRows.map((row) => [row.timestamp, marketCapValue(row)])
          }
        ].filter((series) => hasUsableData([series]))
      : []

    const transferSeries = [
      {
        name: t('charts.series.transferVolume'),
        type: 'column',
        color: CHART_COLORS.transferVolume,
        data: chartRows.map((row) => [row.timestamp, volumeValue(row, 'transferVolume')])
      },
      fieldSeries({
        rows: chartRows,
        name: t('fields.transferTransactions'),
        field: 'transferTxs',
        type: 'line',
        color: CHART_COLORS.transferTxs
      })
    ].filter((series) => hasUsableData([series]))
    const transferTooltip = ({ dataPointIndex }) => {
      const row = chartRows[dataPointIndex] || {}
      const formattedVolume = (value) =>
        volumeCanUseFiat ? fullNumber(value, selectedCurrency) : `${fullNumber(value)} ${tokenUnit}`
      const formatCount = (value) => niceNumber(value || 0, 0)

      return tooltipShell({
        date: chartDate(row.timestamp),
        rows: [
          tooltipRow({
            color: CHART_COLORS.transferVolume,
            label: t('charts.series.transferVolume'),
            value: volumeValue(row, 'transferVolume') || 0,
            formatter: formattedVolume
          }),
          tooltipRow({
            color: CHART_COLORS.transferTxs,
            label: t('fields.transferTransactions'),
            value: toNumber(row.transferTxs) || 0,
            formatter: formatCount
          })
        ]
      })
    }
    const transferVolumeSeriesName = t('charts.series.transferVolume')
    const transferTransactionsSeriesName = t('fields.transferTransactions')
    const transferHasTxs = transferSeries.some((series) => series.name === transferTransactionsSeriesName)
    const transferHasVolume = transferSeries.some((series) => series.name === transferVolumeSeriesName)
    const transferUsesDualAxis = transferHasVolume && transferHasTxs

    const mintBurnSeries = [
      ...(showMintData
        ? [
            fieldSeries({
              rows: chartRows,
              name: t('charts.series.mintVolume'),
              field: 'mintVolume',
              type: 'column',
              color: CHART_COLORS.mintVolume
            })
          ]
        : []),
      fieldSeries({
        rows: chartRows,
        name: t('charts.series.burnVolume'),
        field: 'burnVolume',
        type: 'column',
        color: CHART_COLORS.burnVolume
      })
    ].filter((series) => hasUsableData([series]))
    const mintBurnSummaryItem = ({ key, label, value, color }) => {
      const amount = toNumber(value)
      if (amount === null || Math.abs(amount) < MIN_VISIBLE_VOLUME_SUMMARY) return null

      return {
        key,
        label,
        value: compactNumber(amount),
        color
      }
    }
    const mintBurnSummaryItems = [
      showMintData
        ? mintBurnSummaryItem({
            key: 'mints',
            label: t('activity.mints'),
            value: latest?.mintVolume,
            color: CHART_COLORS.mintVolume
          })
        : null,
      mintBurnSummaryItem({
        key: 'burns',
        label: t('activity.burns'),
        value: latest?.burnVolume,
        color: CHART_COLORS.burnVolume
      })
    ].filter(Boolean)

    const splitAccountOverlap = (row, { totalField, ammField, offerField }) => {
      const amm = toNumber(row[ammField]) || 0
      const offer = toNumber(row[offerField]) || 0
      const reportedTotal = toNumber(row[totalField])
      const overlap = reportedTotal === null ? 0 : Math.min(Math.max(amm + offer - reportedTotal, 0), amm, offer)

      return {
        total: reportedTotal ?? amm + offer,
        ammOnly: Math.max(amm - overlap, 0),
        overlap,
        offerOnly: Math.max(offer - overlap, 0)
      }
    }
    const buyerSplit = (row) =>
      splitAccountOverlap(row, {
        totalField: 'uniqueBuyers',
        ammField: 'ammUniqueBuyers',
        offerField: 'offerUniqueBuyers'
      })
    const sellerSplit = (row) =>
      splitAccountOverlap(row, {
        totalField: 'uniqueSellers',
        ammField: 'ammUniqueSellers',
        offerField: 'offerUniqueSellers'
      })
    const dexAccountsSeries = [
      derivedSeries({
        rows: chartRows,
        name: `${t('charts.series.uniqueBuyers')} ${t('charts.series.ammOnly')}`,
        getValue: (row) => buyerSplit(row).ammOnly,
        type: 'column',
        color: CHART_COLORS.ammAccounts,
        group: 'buyers'
      }),
      derivedSeries({
        rows: chartRows,
        name: `${t('charts.series.uniqueBuyers')} ${t('charts.series.ammAndOffer')}`,
        getValue: (row) => buyerSplit(row).overlap,
        type: 'column',
        color: CHART_COLORS.accountOverlap,
        group: 'buyers'
      }),
      derivedSeries({
        rows: chartRows,
        name: `${t('charts.series.uniqueBuyers')} ${t('charts.series.offerOnly')}`,
        getValue: (row) => buyerSplit(row).offerOnly,
        type: 'column',
        color: CHART_COLORS.offerAccounts,
        group: 'buyers'
      }),
      derivedSeries({
        rows: chartRows,
        name: `${t('charts.series.uniqueSellers')} ${t('charts.series.ammOnly')}`,
        getValue: (row) => sellerSplit(row).ammOnly,
        type: 'column',
        color: CHART_COLORS.ammAccounts,
        group: 'sellers'
      }),
      derivedSeries({
        rows: chartRows,
        name: `${t('charts.series.uniqueSellers')} ${t('charts.series.ammAndOffer')}`,
        getValue: (row) => sellerSplit(row).overlap,
        type: 'column',
        color: CHART_COLORS.accountOverlap,
        group: 'sellers'
      }),
      derivedSeries({
        rows: chartRows,
        name: `${t('charts.series.uniqueSellers')} ${t('charts.series.offerOnly')}`,
        getValue: (row) => sellerSplit(row).offerOnly,
        type: 'column',
        color: CHART_COLORS.offerAccounts,
        group: 'sellers'
      }),
      fieldSeries({
        rows: chartRows,
        name: t('charts.series.uniqueBuyers'),
        field: 'uniqueBuyers',
        type: 'line',
        color: CHART_COLORS.uniqueBuyers
      }),
      fieldSeries({
        rows: chartRows,
        name: t('charts.series.uniqueSellers'),
        field: 'uniqueSellers',
        type: 'line',
        color: CHART_COLORS.uniqueSellers
      })
    ].filter((series) => hasUsableData([series]))

    const uniqueAccountsSeries = [
      fieldSeries({
        rows: chartRows,
        name: t('charts.series.uniqueAccounts'),
        field: 'uniqueAccounts',
        type: 'area',
        color: CHART_COLORS.uniqueAccounts
      })
    ].filter((series) => hasUsableData([series]))
    const accountTooltip = ({ dataPointIndex }) => {
      const row = chartRows[dataPointIndex] || {}
      const formatCount = (value) => niceNumber(value || 0, 0)
      const breakdownSection = ({ label, split, totalColor, withDivider = true }) => {
        const values = split(row)

        return [
          ...(withDivider ? [tooltipDivider()] : []),
          tooltipRow({ color: totalColor, label, value: values.total, bold: true, formatter: formatCount }),
          tooltipRow({
            color: CHART_COLORS.ammAccounts,
            label: t('charts.series.ammOnly'),
            value: values.ammOnly,
            formatter: formatCount
          }),
          tooltipRow({
            color: CHART_COLORS.accountOverlap,
            label: t('charts.series.ammAndOffer'),
            value: values.overlap,
            formatter: formatCount
          }),
          tooltipRow({
            color: CHART_COLORS.offerAccounts,
            label: t('charts.series.offerOnly'),
            value: values.offerOnly,
            formatter: formatCount
          })
        ]
      }

      return tooltipShell({
        date: chartDate(row.timestamp),
        rows: [
          ...breakdownSection({
            label: t('charts.series.uniqueBuyers'),
            split: buyerSplit,
            totalColor: CHART_COLORS.uniqueBuyers,
            withDivider: false
          }),
          ...breakdownSection({
            label: t('charts.series.uniqueSellers'),
            split: sellerSplit,
            totalColor: CHART_COLORS.uniqueSellers
          })
        ]
      })
    }

    const dexActivitySeries = [
      fieldSeries({
        rows: chartRows,
        name: t('charts.series.ammTxs'),
        field: 'ammTxs',
        type: 'column',
        color: CHART_COLORS.ammTxs,
        group: 'txs'
      }),
      fieldSeries({
        rows: chartRows,
        name: t('charts.series.offerTxs'),
        field: 'offerTxs',
        type: 'column',
        color: CHART_COLORS.offerTxs,
        group: 'txs'
      }),
      fieldSeries({
        rows: chartRows,
        name: t('charts.series.ammDexes'),
        field: 'ammDexes',
        type: 'column',
        color: CHART_COLORS.ammDexes,
        group: 'dexes'
      }),
      fieldSeries({
        rows: chartRows,
        name: t('charts.series.offerDexes'),
        field: 'offerDexes',
        type: 'column',
        color: CHART_COLORS.offerDexes,
        group: 'dexes'
      })
    ].filter((series) => hasUsableData([series]))
    const dexActivityTooltip = ({ dataPointIndex }) => {
      const row = chartRows[dataPointIndex] || {}
      const formatCount = (value) => niceNumber(value || 0, 0)
      const section = ({ label, totalField, ammField, offerField, ammColor, offerColor, withDivider = true }) => {
        const amm = toNumber(row[ammField]) || 0
        const offer = toNumber(row[offerField]) || 0
        const total = toNumber(row[totalField]) ?? amm + offer

        return [
          ...(withDivider ? [tooltipDivider()] : []),
          tooltipRow({ color: 'var(--link-color)', label, value: total, bold: true, formatter: formatCount }),
          tooltipRow({ color: ammColor, label: t('charts.series.amm'), value: amm, formatter: formatCount }),
          tooltipRow({ color: offerColor, label: t('charts.series.offer'), value: offer, formatter: formatCount })
        ]
      }

      return tooltipShell({
        date: chartDate(row.timestamp),
        rows: [
          ...section({
            label: t('fields.dexTxs'),
            totalField: 'dexTxs',
            ammField: 'ammTxs',
            offerField: 'offerTxs',
            ammColor: CHART_COLORS.ammTxs,
            offerColor: CHART_COLORS.offerTxs,
            withDivider: false
          }),
          ...section({
            label: t('charts.series.dexes'),
            totalField: 'dexes',
            ammField: 'ammDexes',
            offerField: 'offerDexes',
            ammColor: CHART_COLORS.ammDexes,
            offerColor: CHART_COLORS.offerDexes
          })
        ]
      })
    }

    return [
      {
        key: 'price',
        title: t('charts.price.title'),
        description: firstSentence(t('charts.price.description')),
        summaryLabel: t('charts.price.summary'),
        summaryValue: compactNumber(fiatValue(latest, selectedFiat), selectedCurrency),
        chartType: 'line',
        colors: priceSeries.map((series) => series.color),
        series: priceSeries,
        axisFormatter: (value) => compactNumber(value, selectedCurrency),
        tooltipFormatter: (value) => fullNumber(value, selectedCurrency)
      },
      {
        key: 'volume',
        title: t('charts.volume.title'),
        description: volumeCanUseFiat
          ? t('charts.volume.descriptionFiat')
          : t('charts.volume.descriptionToken', { token: tokenUnit }),
        summaryLabel: t('charts.volume.summary'),
        summaryValue: compactNumber(totalVolumeValue(latest), volumeUnit),
        chartType: 'bar',
        stacked: true,
        stackOnlyBar: true,
        crosshairs: false,
        colors: volumeSeries.map((series) => series.color),
        series: volumeSeries,
        axisFormatter: (value) => compactNumber(value, volumeUnit),
        tooltipFormatter: (value) =>
          volumeCanUseFiat ? fullNumber(value, selectedCurrency) : `${fullNumber(value)} ${tokenUnit}`,
        tooltipCustom: volumeTooltip,
        tooltipFixed: true
      },
      {
        key: 'marketCap',
        title: t('charts.marketCap.title'),
        description: t('charts.marketCap.description'),
        summaryLabel: t('charts.marketCap.summary'),
        summaryValue: compactNumber(marketCapValue(latest), marketCapUnit),
        chartType: 'line',
        colors: marketCapSeries.map((series) => series.color),
        series: marketCapSeries,
        axisFormatter: (value) => compactNumber(value, marketCapUnit),
        tooltipFormatter: (value) => fullNumber(value, marketCapUnit)
      },
      {
        key: 'dexAccounts',
        title: t('charts.dexAccounts.title'),
        description: t('charts.dexAccounts.description'),
        summaryLabel: t('charts.dexAccounts.summary'),
        summaryValue: compactNumber(toNumber(latest?.uniqueDexAccounts)),
        chartType: 'bar',
        stacked: true,
        stackOnlyBar: true,
        crosshairs: false,
        colors: dexAccountsSeries.map((series) => series.color),
        series: dexAccountsSeries,
        axisFormatter: (value) => compactNumber(value),
        tooltipFormatter: (value) => niceNumber(value, 0),
        tooltipCustom: accountTooltip,
        tooltipFixed: true
      },
      {
        key: 'uniqueAccounts',
        title: t('charts.uniqueAccounts.title'),
        description: t('charts.uniqueAccounts.description'),
        summaryLabel: t('charts.uniqueAccounts.summary'),
        summaryValue: compactNumber(toNumber(latest?.uniqueAccounts)),
        chartType: 'line',
        colors: uniqueAccountsSeries.map((series) => series.color),
        series: uniqueAccountsSeries,
        yRange: seriesRange(uniqueAccountsSeries),
        axisFormatter: (value) => compactNumber(value),
        tooltipFormatter: (value) => niceNumber(value, 0)
      },
      {
        key: 'dexActivity',
        title: t('charts.dexActivity.title'),
        description: t('charts.dexActivity.description'),
        summaryLabel: t('charts.dexActivity.summary'),
        summaryValue: compactNumber(toNumber(latest?.dexTxs)),
        chartType: 'bar',
        stacked: true,
        crosshairs: false,
        colors: dexActivitySeries.map((series) => series.color),
        series: dexActivitySeries,
        axisFormatter: (value) => compactNumber(value),
        tooltipFormatter: (value) => niceNumber(value, 0),
        tooltipCustom: dexActivityTooltip,
        tooltipFixed: true
      },
      {
        key: 'transferVolume',
        title: t('charts.transfer.title'),
        description: t('charts.transfer.description'),
        summaryLabel: t('charts.transfer.summary'),
        summaryValue: compactNumber(volumeValue(latest, 'transferVolume'), volumeUnit),
        chartType: 'bar',
        crosshairs: false,
        colors: transferSeries.map((series) => series.color),
        series: transferSeries,
        primarySeriesName: transferVolumeSeriesName,
        secondarySeriesName: transferTransactionsSeriesName,
        axisFormatter: (value) => compactNumber(value, volumeUnit),
        secondaryAxisFormatter: transferUsesDualAxis ? (value) => compactNumber(value) : null,
        tooltipFormatter: (value) =>
          volumeCanUseFiat ? fullNumber(value, selectedCurrency) : `${fullNumber(value)} ${tokenUnit}`,
        tooltipCustom: transferTooltip
      },
      {
        key: 'mintBurnVolume',
        title: showMintData ? t('charts.mintBurn.title') : t('charts.burn.title'),
        description: showMintData ? t('charts.mintBurn.description') : t('charts.burn.description'),
        summaryLabel: t('charts.mintBurn.summary'),
        summaryItems: mintBurnSummaryItems,
        chartType: 'bar',
        crosshairs: false,
        colors: mintBurnSeries.map((series) => series.color),
        series: mintBurnSeries,
        axisFormatter: (value) => compactNumber(value),
        tooltipFormatter: (value) => `${fullNumber(value)} ${tokenUnit}`
      },
      {
        key: 'supply',
        title: t('charts.supply.title'),
        description: t('charts.supply.description'),
        summaryLabel: t('charts.supply.summary'),
        summaryValue: compactNumber(toNumber(latest?.supply)),
        chartType: 'line',
        colors: supplySeries.map((series) => series.color),
        series: supplySeries,
        axisFormatter: (value) => compactNumber(value),
        tooltipFormatter: (value) => `${fullNumber(value)} ${tokenUnit}`
      },
      {
        key: 'holders',
        title: t('charts.holders.title'),
        description: t('charts.holders.description'),
        summaryLabel: t('charts.holders.summary'),
        summaryValue: compactNumber(toNumber(latest?.holders)),
        chartType: 'line',
        colors: holderSeries.map((series) => series.color),
        series: holderSeries,
        yRange: seriesRange(holderSeries),
        axisFormatter: (value) => compactNumber(value),
        tooltipFormatter: (value) => niceNumber(value, 0)
      }
    ].filter((group) => hasUsableData(group.series))
  }, [chartRows, selectedCurrency, selectedFiat, showMintData, t, tokenUnit])

  const expandedGroup = groups.find((group) => group.key === expandedKey)

  if (!url) return null

  return (
    <section className="tokenChartsSection">
      <div className="tokenChartsHeader">
        <div>
          <h2>{t('charts.title')}</h2>
          <span>{t('charts.subtitle')}</span>
        </div>
        <span className="tokenChartsMeta">{t('charts.reportsCount')}</span>
      </div>

      {loading && !groups.length ? (
        <div className="tokenChartsGrid">
          {[0, 1, 2, 3, 4].map((item) => (
            <div key={item} className="tokenChartCard tokenChartCardLoading">
              <span className="waiting"></span>
            </div>
          ))}
        </div>
      ) : groups.length ? (
        <div className="tokenChartsGrid">
          {groups.map((group) => (
            <article key={group.key} className="tokenChartCard">
              <div className="tokenChartCardHeader">
                <div>
                  <h3>{group.title}</h3>
                  {group.summaryItems?.length ? (
                    <div className="tokenChartSummaryItems" aria-label={group.summaryLabel}>
                      {group.summaryItems.map((item) => (
                        <span key={item.key} className="tokenChartSummaryItem">
                          <span className="tokenChartSummaryDot" style={{ backgroundColor: item.color }}></span>
                          <strong>{item.value}</strong>
                          <span>{item.label}</span>
                          <span className="tokenChartSummaryPeriod">{group.summaryLabel}</span>
                        </span>
                      ))}
                    </div>
                  ) : group.summaryItems ? null : (
                    <span>
                      <strong>{group.summaryValue}</strong> {group.summaryLabel}
                    </span>
                  )}
                </div>
                <div className="tokenChartCardActions">
                  <span className="tooltip tokenChartInfo" tabIndex={0}>
                    <IoInformationCircleOutline aria-hidden="true" />
                    <span className="tooltiptext left">{group.description}</span>
                  </span>
                  <button
                    type="button"
                    className="tokenChartExpandButton"
                    onClick={() => setExpandedKey(group.key)}
                    aria-label={t('charts.expand', { title: group.title })}
                  >
                    <IoExpandOutline aria-hidden="true" />
                  </button>
                </div>
              </div>
              <div
                role="button"
                tabIndex={0}
                className="tokenChartPreviewButton"
                onClick={() => setExpandedKey(group.key)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault()
                    setExpandedKey(group.key)
                  }
                }}
              >
                <TokenChart group={group} />
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="tokenChartEmpty">{error || t('charts.errors.empty')}</div>
      )}

      <Dialog
        isOpen={!!expandedGroup}
        onClose={() => setExpandedKey('')}
        title={expandedGroup?.title || ''}
        size="xlarge"
      >
        {expandedGroup ? (
          <div className={tokenChartDialog}>
            <p className={tokenChartDialogDescription}>{expandedGroup.description}</p>
            <TokenChart group={expandedGroup} expanded />
          </div>
        ) : null}
      </Dialog>
    </section>
  )
}

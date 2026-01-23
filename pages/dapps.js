import { useTranslation } from 'next-i18next'
import { useMemo, useState } from 'react'
import FiltersFrame from '../components/Layout/FiltersFrame'
import { axiosServer, getFiatRateServer, passHeaders } from '../utils/axios'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { useWidth } from '../utils'
import { getIsSsrMobile } from '../utils/mobile'

import SEO from '../components/SEO'
import { shortNiceNumber } from '../utils/format'

const dropsToXrp = (drops) => {
  if (drops === null || drops === undefined) return ''
  const n = Number(drops)
  if (!Number.isFinite(n)) return ''
  return (n / 1_000_000).toFixed(6)
}

const calcSuccessRate = (total, success) => {
  const t = Number(total)
  const s = Number(success)
  if (!Number.isFinite(t) || t <= 0 || !Number.isFinite(s) || s < 0) return 0
  return (s / t) * 100
}

const sortDapps = (list, order, convertCurrency) => {
  const arr = Array.isArray(list) ? [...list] : []
  const cc = (convertCurrency || 'usd').toLowerCase()
  const getFiat = (a) => Number(a?.totalFeesInFiats?.[cc] ?? 0)

  switch (order) {
    case 'txHigh':
      return arr.sort((a, b) => Number(b?.totalTransactions ?? 0) - Number(a?.totalTransactions ?? 0))
    case 'txLow':
      return arr.sort((a, b) => Number(a?.totalTransactions ?? 0) - Number(b?.totalTransactions ?? 0))
    case 'successRateHigh':
      return arr.sort(
        (a, b) =>
          calcSuccessRate(b?.totalTransactions, b?.successTransactions) -
          calcSuccessRate(a?.totalTransactions, a?.successTransactions)
      )
    case 'feesXrpHigh':
      return arr.sort((a, b) => Number(b?.totalFees ?? 0) - Number(a?.totalFees ?? 0))
    case 'feesXrpLow':
      return arr.sort((a, b) => Number(a?.totalFees ?? 0) - Number(b?.totalFees ?? 0))
    case 'feesFiatHigh':
      return arr.sort((a, b) => getFiat(b) - getFiat(a))
    case 'feesFiatLow':
      return arr.sort((a, b) => getFiat(a) - getFiat(b))
    case 'tagHigh':
      return arr.sort((a, b) => Number(b?.sourceTag ?? 0) - Number(a?.sourceTag ?? 0))
    case 'tagLow':
      return arr.sort((a, b) => Number(a?.sourceTag ?? 0) - Number(b?.sourceTag ?? 0))
    default:
      return arr
  }
}

export async function getServerSideProps(context) {
  const { locale, req, query } = context
  const { order } = query

  let initialData = null
  let initialErrorMessage = null

  const { selectedCurrencyServer } = await getFiatRateServer(req)
  const convertCurrency = (selectedCurrencyServer || 'usd').toLowerCase()

  try {
    const res = await axiosServer({
      method: 'get',
      url: `v2/dapps?convertCurrencies=${encodeURIComponent(convertCurrency)}`,
      headers: passHeaders(req)
    }).catch((error) => {
      initialErrorMessage = error.message
    })
    initialData = res?.data
  } catch (error) {
    console.error(error)
  }

  return {
    props: {
      initialData: initialData || null,
      orderQuery: order || 'txHigh',
      initialErrorMessage: initialErrorMessage || '',
      selectedCurrencyServer,
      isSsrMobile: getIsSsrMobile(context),
      ...(await serverSideTranslations(locale, ['common']))
    }
  }
}

export default function Dapps({
  initialData,
  initialErrorMessage,
  orderQuery,
  selectedCurrency: selectedCurrencyApp,
  fiatRate: fiatRateApp,
  selectedCurrencyServer
}) {
  const { t } = useTranslation()
  const windowWidth = useWidth()

  let selectedCurrency = selectedCurrencyServer
  if (fiatRateApp) {
    selectedCurrency = selectedCurrencyApp
  }

  const convertCurrency = (selectedCurrency || 'usd').toLowerCase()

  const [order, setOrder] = useState(orderQuery)
  const [errorMessage] = useState(t(`error.${initialErrorMessage}`, { defaultValue: initialErrorMessage }) || '')

  const rawData = useMemo(() => initialData || {}, [initialData])
  const data = useMemo(() => {
    const list = Array.isArray(rawData?.dapps) ? rawData.dapps : []
    return sortDapps(list, order, convertCurrency)
  }, [rawData, order, convertCurrency])

  const orderList = [
    { value: 'txHigh', label: 'Transactions: High to Low' },
    { value: 'txLow', label: 'Transactions: Low to High' },
    { value: 'successRateHigh', label: 'Success rate: High to Low' },
    { value: 'feesXrpHigh', label: 'Fees (XRP): High to Low' },
    { value: 'feesXrpLow', label: 'Fees (XRP): Low to High' },
    { value: 'feesFiatHigh', label: `Fees (${convertCurrency.toUpperCase()}): High to Low` },
    { value: 'feesFiatLow', label: `Fees (${convertCurrency.toUpperCase()}): Low to High` },
    { value: 'tagHigh', label: 'SourceTag: High to Low' },
    { value: 'tagLow', label: 'SourceTag: Low to High' }
  ]

  return (
    <>
      <SEO title="Dapps" />
      <h1 className="center">Dapps</h1>

      <FiltersFrame order={order} setOrder={setOrder} orderList={orderList} data={data} onlyCsv={true}>
        {/* FiltersFrame expects children[0] for filters, children[1] for content */}
        <></>
        {!errorMessage ? (
          !windowWidth || windowWidth > 860 ? (
            <table className="table-large expand">
              <thead>
                <tr>
                  <th className="center">{t('table.index')}</th>
                  <th>SourceTag</th>
                  <th className="right">Transactions</th>
                  <th className="right">Success</th>
                  <th className="right">Success %</th>
                  <th className="right">Fees (XRP)</th>
                  <th className="right">Fees ({convertCurrency.toUpperCase()})</th>
                </tr>
              </thead>
              <tbody>
                {data?.length ? (
                  data.map((d, idx) => {
                    const successRate = calcSuccessRate(d?.totalTransactions, d?.successTransactions)
                    return (
                      <tr key={d?.sourceTag ?? idx}>
                        <td className="center">{idx + 1}</td>
                        <td>{d?.sourceTag}</td>
                        <td className="right">{shortNiceNumber(d?.totalTransactions)}</td>
                        <td className="right">{shortNiceNumber(d?.successTransactions)}</td>
                        <td className="right">{successRate.toFixed(2)}%</td>
                        <td className="right">{dropsToXrp(d?.totalFees)}</td>
                        <td className="right">{d?.totalFeesInFiats?.[convertCurrency] ?? ''}</td>
                      </tr>
                    )
                  })
                ) : (
                  <tr>
                    <td colSpan="100" className="center orange bold">
                      {t('general.no-data')}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          ) : (
            <table className="table-mobile">
              <thead></thead>
              <tbody>
                {data?.length ? (
                  data.map((d, idx) => {
                    const successRate = calcSuccessRate(d?.totalTransactions, d?.successTransactions)
                    return (
                      <tr key={d?.sourceTag ?? idx}>
                        <td style={{ padding: '5px' }} className="center">
                          <b>{idx + 1}</b>
                        </td>
                        <td>
                          <p>
                            <b>SourceTag:</b> {d?.sourceTag}
                          </p>
                          <p>
                            <b>Transactions:</b> {shortNiceNumber(d?.totalTransactions)}
                          </p>
                          <p>
                            <b>Success:</b> {shortNiceNumber(d?.successTransactions)} ({successRate.toFixed(2)}%)
                          </p>
                          <p>
                            <b>Fees (XRP):</b> {dropsToXrp(d?.totalFees)}
                          </p>
                          <p>
                            <b>Fees ({convertCurrency.toUpperCase()}):</b>{' '}
                            {d?.totalFeesInFiats?.[convertCurrency] ?? ''}
                          </p>
                          <br />
                        </td>
                      </tr>
                    )
                  })
                ) : (
                  <tr>
                    <td colSpan="100" className="center orange bold">
                      {t('general.no-data')}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )
        ) : (
          <div className="center orange bold" style={{ marginTop: 20 }}>
            {errorMessage}
          </div>
        )}
      </FiltersFrame>
    </>
  )
}

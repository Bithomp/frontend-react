import { useTranslation } from 'next-i18next'
import { useMemo, useState } from 'react'
import FiltersFrame from '../components/Layout/FiltersFrame'
import { axiosServer, passHeaders, currencyServer } from '../utils/axios'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { useWidth } from '../utils'
import { getIsSsrMobile } from '../utils/mobile'

import SEO from '../components/SEO'
import { shortNiceNumber, amountFormat } from '../utils/format'
import { dappBySourceTag } from '../utils/transaction'

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

  const selectedCurrencyServer = currencyServer(req)
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
    // Exclude these sourceTags
    const excludeSourceTags = [0, 111, 222, 777, 4004, 604802567]
    const filtered = list.filter((d) => {
      if (excludeSourceTags.includes(Number(d?.sourceTag))) return false
      const hasName = dappBySourceTag(d?.sourceTag)
      if (hasName) return true
      return Number(d?.totalTransactions) >= 10
    })
    return sortDapps(filtered, order, convertCurrency)
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
                  <th className="right">Performing</th>
                  <th className="right">Interacting</th>
                  <th className="right">Transactions</th>
                  <th className="right">Types</th>
                  <th className="right">Success</th>
                  <th className="right">Fees</th>
                </tr>
              </thead>
              <tbody>
                {data?.length ? (
                  data.map((d, idx) => {
                    const successRate = calcSuccessRate(d?.totalTransactions, d?.successTransactions)
                    return (
                      <tr key={d?.sourceTag ?? idx}>
                        <td className="center">{idx + 1}</td>
                        <td>{dappBySourceTag(d?.sourceTag) || d?.sourceTag}</td>
                        <td className="right">{shortNiceNumber(d?.uniqueSourceAddresses, 0)}</td>
                        <td className="right">{shortNiceNumber(d?.uniqueInteractedAddresses, 0)}</td>
                        <td className="right">{shortNiceNumber(d?.totalTransactions, 0)}</td>
                        <td className="right">
                          {d?.transactionTypes
                            ? Object.entries(d.transactionTypes)
                                .map(([type, count]) => `${type}: ${shortNiceNumber(count, 0)}`)
                                .join(', ')
                            : ''}
                        </td>
                        <td className="right">
                          {shortNiceNumber(d?.successTransactions, 0)}
                          <br />
                          <span style={{ opacity: 0.7 }}>{successRate.toFixed(2)}%</span>
                        </td>
                        <td className="right">
                          {amountFormat(d?.totalFees, { short: true })}
                          <br />
                          <span style={{ opacity: 0.7 }}>
                            {shortNiceNumber(d?.totalFeesInFiats?.[convertCurrency], 2, 1, convertCurrency)}
                          </span>
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
                            <b>SourceTag:</b> {dappBySourceTag(d?.sourceTag) || d?.sourceTag}
                          </p>
                          <b>Performing:</b> {shortNiceNumber(d?.uniqueSourceAddresses, 0)}
                          <br />
                          <b>Interacting:</b> {shortNiceNumber(d?.uniqueInteractedAddresses, 0)}
                          <p>
                            <b>Transactions:</b> {shortNiceNumber(d?.totalTransactions, 0)}
                          </p>
                          <p>
                            <b>Types:</b>{' '}
                            {d?.transactionTypes
                              ? Object.entries(d.transactionTypes)
                                  .map(([type, count]) => `${type}: ${shortNiceNumber(count, 0)}`)
                                  .join(', ')
                              : ''}
                          </p>
                          <p>
                            <b>Success:</b> {shortNiceNumber(d?.successTransactions, 0)}
                            <br />
                            <span style={{ opacity: 0.7 }}>{successRate.toFixed(2)}%</span>
                          </p>
                          <p>
                            <b>Fees:</b> {amountFormat(d?.totalFees, { short: true })}
                            <br />
                            <span style={{ opacity: 0.7 }}>
                              {shortNiceNumber(d?.totalFeesInFiats?.[convertCurrency], 2, 1, convertCurrency)}
                            </span>
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

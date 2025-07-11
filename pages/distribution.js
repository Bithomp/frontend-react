import { useTranslation, Trans } from 'next-i18next'
import { useState, useEffect } from 'react'
import axios from 'axios'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { useRouter } from 'next/router'

import { getIsSsrMobile } from '../utils/mobile'

export const getServerSideProps = async (context) => {
  const { locale } = context
  return {
    props: {
      isSsrMobile: getIsSsrMobile(context),
      ...(await serverSideTranslations(locale, ['common', 'distribution']))
    }
  }
}

import SEO from '../components/SEO'
import FiltersFrame from '../components/Layout/FiltersFrame'

import { useWidth, nativeCurrency, devNet } from '../utils'
import { amountFormat, niceNumber, percentFormat, nativeCurrencyToFiat, AddressWithIconFilled } from '../utils/format'

export default function Distribution({ selectedCurrency, fiatRate }) {
  const { t } = useTranslation()
  const router = useRouter()

  const { isReady } = router

  const windowWidth = useWidth()

  const [data, setData] = useState([])
  const [rawData, setRawData] = useState({})
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [escrowMode, setEscrowMode] = useState('none') // 'none', 'short', 'locked'
  const [filtersHide, setFiltersHide] = useState(false)

  const controller = new AbortController()

  const escrowModeList = [
    { value: 'none', label: 'Without Escrow (balance only)' },
    { value: 'short', label: 'With Escrow balances included (balance + escrow short)' },
    { value: 'locked', label: 'With Escrow balances included (balance + escrow locked)' }
  ]

  // calculate total balance including escrow
  const calculateTotalBalance = (record, mode = escrowMode) => {
    const baseBalance = parseInt(record.balance)
    if (mode === 'short' && record.escrowShortBalance) {
      return baseBalance + parseInt(record.escrowShortBalance)
    }
    if (mode === 'locked' && record.escrowLockedBalance) {
      return baseBalance + parseInt(record.escrowLockedBalance)
    }
    return baseBalance
  }

  const getEscrowAmount = (record, mode) => {
    if (mode === 'short' && record.escrowShortBalance) {
      return parseInt(record.escrowShortBalance)
    }
    if (mode === 'locked' && record.escrowLockedBalance) {
      return parseInt(record.escrowLockedBalance)
    }
    return 0
  }

  const renderBalance = (amount, totalCoins) => (
    <>
      {amountFormat(amount)} {percentFormat(amount, totalCoins)}
      <br />
      {devNet
        ? t('table.no-value')
        : fiatRate > 0 && nativeCurrencyToFiat({ amount, selectedCurrency, fiatRate })}
    </>
  )

  const renderLoadingState = (colSpan = "100") => (
    <tr className="center">
      <td colSpan={colSpan}>
        <br />
        <span className="waiting"></span>
        <br />
        {t('general.loading')}
        <br />
        <br />
      </td>
    </tr>
  )

  const renderErrorState = (colSpan = "100") => (
    <tr>
      <td colSpan={colSpan} className="center orange bold">
        {errorMessage}
      </td>
    </tr>
  )

  const checkApi = async () => {
    let apiUrl = 'v2/addresses/richlist'

    // Add escrow parameter if mode is selected
    if (escrowMode !== 'none') {
      apiUrl += `?escrow=${escrowMode}`
    }

    setLoading(true)
    setRawData({})
    setData([])

    const response = await axios
      .get(apiUrl, {
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
      setRawData(newdata)
      setLoading(false) //keep here for fast tab clickers
      if (newdata.addresses) {
        let list = newdata.addresses
        if (list.length > 0) {
          setErrorMessage('')
          setData(list)
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
      "summary": {
        "maxCoins": "100000000000000000",
        "totalCoins": "99988432439120264",
        "activeAccounts": 4771977
      },
      "addresses": [
        {
          "address": "rMQ98K56yXJbDGv49ZSmW51sLn94Xe1mu1",
          "balance": "1960027032479644",
          "addressDetails": {
              "username": null,
              "service": "Ripple"
          }
        },
  */

  useEffect(() => {
    checkApi()
    return () => {
      controller.abort()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isReady, escrowMode])

  return (
    <>
      <SEO
        title={t('menu.network.distribution', { nativeCurrency })}
        images={[
          {
            width: 1200,
            height: 630,
            file: 'previews/1200x630/distribution.png'
          },
          {
            width: 630,
            height: 630,
            file: 'previews/630x630/distribution.png'
          }
        ]}
      />
      <div className="content-center">
        <h1 className="center">{t('menu.network.distribution', { nativeCurrency })}</h1>
        <div className="flex-container">
          <div className="grey-box">{t('desc', { ns: 'distribution', nativeCurrency })}</div>
          <div className="grey-box">
            {loading ? (
              t('general.loading')
            ) : (
              <Trans i18nKey="summary" ns="distribution">
                There are <b>{{ activeAccounts: niceNumber(rawData?.summary?.activeAccounts) }}</b> active accounts,
                total available: <b>{{ totalCoins: amountFormat(rawData?.summary?.totalCoins) }}</b>
              </Trans>
            )}
          </div>
        </div>
      </div>
      <FiltersFrame filtersHide={filtersHide} setFiltersHide={setFiltersHide} data={data || []}>
        <>
          <div>
            <span>Escrow Mode</span>
            <div
              className="radio-options radio-options--large"
              style={{ flexDirection: 'column', alignItems: 'flex-start' }}
            >
              {escrowModeList.map((tabItem) => (
                <div className="radio-input" key={tabItem.value}>
                  <input
                    type="radio"
                    name="escrowMode"
                    value={tabItem.value}
                    checked={tabItem.value === escrowMode}
                    onChange={() => setEscrowMode(tabItem.value)}
                    id={tabItem.value}
                  />
                  <label htmlFor={tabItem.value}>{tabItem.label}</label>
                </div>
              ))}
            </div>
          </div>
        </>
        <>
          <br />
          {windowWidth > 1000 ? (
            <table className="table-large shrink no-hover">
              <thead>
                <tr>
                  <th className="center">{t('table.index')}</th>
                  <th>{t('table.address')}</th>
                  <th className="right">{t('table.balance')}</th>
                  {escrowMode === 'short' && <th className="right">Escrow Short</th>}
                  {escrowMode === 'locked' && <th className="right">Escrow Locked</th>}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  renderLoadingState()
                ) : (
                  <>
                    {!errorMessage && data ? (
                      <>
                        {data.length > 0 &&
                          data.map((r, i) => (
                            <tr key={i}>
                              <td className="center">{i + 1}</td>
                              <td>
                                <AddressWithIconFilled data={r} />
                              </td>
                              <td className="right">
                                {renderBalance(calculateTotalBalance(r), rawData.summary?.totalCoins)}
                              </td>
                              {escrowMode === 'short' && r.escrowShortBalance && (
                                <td className="right">
                                  {renderBalance(getEscrowAmount(r, 'short'), rawData.summary?.totalCoins, true)}
                                </td>
                              )}
                              {escrowMode === 'locked' && r.escrowLockedBalance && (
                                <td className="right">
                                  {renderBalance(getEscrowAmount(r, 'locked'), rawData.summary?.totalCoins, true)}
                                </td>
                              )}
                            </tr>
                          ))}
                      </>
                    ) : (
                      renderErrorState()
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
                  renderLoadingState()
                ) : (
                  <>
                    {!errorMessage ? (
                      data.map((r, i) => (
                        <tr key={i}>
                          <td style={{ padding: '5px' }} className="center">
                            <b>{i + 1}</b>
                          </td>
                          <td>
                            <br />
                            <AddressWithIconFilled data={r} />
                            <p>
                              {t('table.balance')}: {amountFormat(calculateTotalBalance(r))}{' '}
                              {percentFormat(calculateTotalBalance(r), rawData.summary?.totalCoins)}{' '}
                              {devNet
                                ? t('table.no-value')
                                : fiatRate > 0 &&
                                  nativeCurrencyToFiat({ amount: calculateTotalBalance(r), selectedCurrency, fiatRate })}
                            </p>
                            {escrowMode === 'short' && r.escrowShortBalance && (
                              <p>
                                Escrow Short: {amountFormat(getEscrowAmount(r, 'short'))}{' '}
                                {percentFormat(getEscrowAmount(r, 'short'), rawData.summary?.totalCoins)}{' '}
                                {devNet
                                  ? t('table.no-value')
                                  : fiatRate > 0 &&
                                    nativeCurrencyToFiat({ amount: getEscrowAmount(r, 'short'), selectedCurrency, fiatRate })}
                              </p>
                            )}
                            {escrowMode === 'locked' && r.escrowLockedBalance && (
                              <p>
                                Escrow Locked: {amountFormat(getEscrowAmount(r, 'locked'))}{' '}
                                {percentFormat(getEscrowAmount(r, 'locked'), rawData.summary?.totalCoins)}
                                <br />
                                {devNet
                                  ? t('table.no-value')
                                  : fiatRate > 0 &&
                                    nativeCurrencyToFiat({ amount: getEscrowAmount(r, 'locked'), selectedCurrency, fiatRate })}
                              </p>
                            )}
                          </td>
                        </tr>
                      ))
                    ) : (
                      renderErrorState()
                    )}
                  </>
                )}
              </tbody>
            </table>
          )}
        </>
      </FiltersFrame>
    </>
  )
}

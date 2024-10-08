import { useTranslation } from 'next-i18next'
import { useEffect } from 'react'
import { axiosServer } from '../utils/axios'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { useWidth } from '../utils'
import { getIsSsrMobile } from '../utils/mobile'
import {
  lpTokenName,
  shortHash,
  showAmmPercents,
  addressUsernameOrServiceLink,
  shortNiceNumber,
  fullDateAndTime,
  timeFromNow,
  amountFormatNode
} from '../utils/format'

export async function getServerSideProps(context) {
  const { locale, req } = context
  let initialData = null

  let headers = {}
  if (req.headers['x-real-ip']) {
    headers['x-real-ip'] = req.headers['x-real-ip']
  }
  if (req.headers['x-forwarded-for']) {
    headers['x-forwarded-for'] = req.headers['x-forwarded-for']
  }
  let initialErrorMessage = null
  try {
    const res = await axiosServer({
      method: 'get',
      url: 'v2/amms?order=currencyHigh&sortCurrency=XRP',
      headers
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
      initialErrorMessage: initialErrorMessage || '',
      isSsrMobile: getIsSsrMobile(context),
      ...(await serverSideTranslations(locale, ['common']))
    }
  }
}

import SEO from '../components/SEO'
import CopyButton from '../components/UI/CopyButton'
import { LinkAmm } from '../utils/links'

export default function Amms({ initialData, initialErrorMessage }) {
  const { t, i18n } = useTranslation()

  const windowWidth = useWidth()

  const data = initialData?.amms || []
  const errorMessage = initialErrorMessage || ''
  const loading = false
  /*
  const [data, setData] = useState(initialData?.amms || [])
  const [rawData, setRawData] = useState(initialData || {})
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState(initialErrorMessage || "")
  */

  /*
  const checkApi = async () => {
    let apiUrl = 'v2/amms'

    setLoading(true)
    setRawData({})
    setData([])

    const response = await axios.get(apiUrl, {
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
      if (newdata.addresses) {
        let list = newdata.addresses
        if (list.length > 0) {
          setErrorMessage("")
          setData(list)
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
  */

  useEffect(() => {
    //checkApi()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <>
      <SEO title={t('menu.amm.pools')} />
      <div className="content-text">
        <h1 className="center">{t('menu.amm.pools')}</h1>
        <br />
        {!windowWidth || windowWidth > 1000 ? (
          <table className="table-large shrink">
            <thead>
              <tr>
                <th className="center">{t('table.index')}</th>
                <th>Asset 1</th>
                <th>Asset 2</th>
                <th>LP balance</th>
                <th className="right">AMM ID</th>
                <th>AMM address</th>
                <th>Currency code</th>
                <th>Created</th>
                <th className="right">Trading fee</th>
                <th className="center">Vote slots</th>
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
                        data.map((a, i) => (
                          <tr key={i}>
                            <td className="center">{i + 1}</td>
                            <td>
                              {amountFormatNode(a.amount, { short: true, maxFractionDigits: 6 })}
                              {a.amount?.issuer && (
                                <>
                                  <br />
                                  {addressUsernameOrServiceLink(a.amount, 'issuer', { short: true })}
                                </>
                              )}
                            </td>
                            <td>
                              {amountFormatNode(a.amount2, { short: true, maxFractionDigits: 6 })}
                              {a.amount2?.issuer && (
                                <>
                                  <br />
                                  {addressUsernameOrServiceLink(a.amount2, 'issuer', { short: true })}
                                </>
                              )}
                            </td>
                            <td suppressHydrationWarning>
                              {shortNiceNumber(a.lpTokenBalance.value)}
                              <br />
                              {lpTokenName(a)}
                            </td>
                            <td className="right">
                              <LinkAmm ammId={a.ammID} hash={6} copy={true} icon={true} />
                            </td>
                            <td>{addressUsernameOrServiceLink(a, 'account', { short: true })}</td>
                            <td>
                              {shortHash(a.lpTokenBalance.currency)} <CopyButton text={a.lpTokenBalance.currency} />
                            </td>
                            <td>{timeFromNow(a.createdAt, i18n)}</td>
                            <td className="right">{showAmmPercents(a.tradingFee)}</td>
                            <td className="center">{a.voteSlots?.length}</td>
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
                    data.map((a, i) => (
                      <tr key={i}>
                        <td style={{ padding: '5px' }} className="center">
                          <b>{i + 1}</b>
                        </td>
                        <td>
                          <p>
                            Asset 1: {amountFormatNode(a.amount, { short: true, maxFractionDigits: 6 })}
                            {a.amount?.issuer && addressUsernameOrServiceLink(a.amount, 'issuer', { short: true })}
                          </p>
                          <p>
                            Asset 2: {amountFormatNode(a.amount2, { short: true, maxFractionDigits: 6 })}
                            {a.amount2?.issuer && addressUsernameOrServiceLink(a.amount2, 'issuer', { short: true })}
                          </p>
                          <p suppressHydrationWarning>
                            LP balance: {shortNiceNumber(a.lpTokenBalance.value)} {lpTokenName(a)}
                          </p>
                          <p>
                            AMM ID: <LinkAmm ammId={a.ammID} hash={6} copy={true} icon={true} />
                          </p>
                          <p>AMM address: {addressUsernameOrServiceLink(a, 'account', { short: true })}</p>
                          <p>
                            Currency code: {shortHash(a.lpTokenBalance.currency)}{' '}
                            <CopyButton text={a.lpTokenBalance.currency} />
                          </p>
                          <p>
                            Created: {timeFromNow(a.createdAt, i18n)}
                            {', '}
                            {fullDateAndTime(a.createdAt)}
                          </p>
                          <p>Trading fee: {showAmmPercents(a.tradingFee)}</p>
                          <p>Vote slots: {a.voteSlots?.length}</p>
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

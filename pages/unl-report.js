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
      ...(await serverSideTranslations(locale, ['common', 'unl-report']))
    }
  }
}

import SEO from '../components/SEO'
import CopyButton from '../components/UI/CopyButton'

import { useWidth } from '../utils'
import { userOrServiceLink, niceNumber, shortHash, addressUsernameOrServiceLink } from '../utils/format'
import Link from 'next/link'

export default function UNLreport() {
  const { t } = useTranslation(['common', 'unl-report'])
  const router = useRouter()

  const { isReady } = router

  const windowWidth = useWidth()

  const [rawData, setRawData] = useState({})
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const controller = new AbortController()

  const checkApi = async () => {
    let apiUrl = 'v2/unl-report'

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
      if (newdata.ledgerEntry) {
        setErrorMessage('')
        setData(newdata.activeValidators)
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
      "ledgerEntry": "61E32E7A24A238F1C619D5F9DDCC41A94B33B66C0163F7EFCC8A19C9FD6F28DC",
      "ledgerHash": "082C7468B15FC93DF216FE1B58CA326F7DF42A753F0399C027F747E572DFA913",
      "ledgerIndex": 7322707,
      activeValidators: [
      {
        "account": "rGhk2uLd8ShzX2Zrcgn8sQk1LWBG4jjEwf",
        "publicKey": "DECODED",
        accountDetails,
      }
      ],
      importVLKeys: [
        {
          "account": "rGhk2uLd8ShzX2Zrcgn8sQk1LWBG4jjEwf",
          "publicKey": "DECODED",
          accountDetails,
        }
      ],
      validated: true
    }
  */

  useEffect(() => {
    checkApi()
    return () => {
      controller.abort()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isReady])

  return (
    <>
      <SEO title={t('header', { ns: 'unl-report' })} />
      <div className="content-text">
        <h1 className="center">{t('header', { ns: 'unl-report' })}</h1>
        <div className="flex">
          <div className="grey-box center">
            <Trans i18nKey="desc" ns="unl-report">
              Here you can find UNL report for Ledger <b>{{ ledgerIndex: rawData?.ledgerIndex || '' }}</b>, ledger
              entry: 61E32E...6F28DC.
            </Trans>
            <br />
            <br />
            {loading ? (
              t('general.loading')
            ) : (
              <Trans i18nKey="summary" ns="unl-report">
                There are <b>{{ activeValidators: niceNumber(data?.length) }}</b> active validators.
              </Trans>
            )}
          </div>
        </div>
        <br />
        {windowWidth > 1000 ? (
          <table className="table-large shrink">
            <thead>
              <tr>
                <th className="center">{t('table.index')}</th>
                <th className="left">{t('table.public-key')}</th>
                <th>{t('table.address')}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr className="right">
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
                        data.map((av, i) => (
                          <tr key={i}>
                            <td className="center">{i + 1}</td>
                            <td className="left">
                              <CopyButton text={av.publicKey} /> {shortHash(av.publicKey)}
                            </td>
                            <td>
                              <CopyButton text={av.account} /> {addressUsernameOrServiceLink(av, 'account')}
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
                    data.map((av, i) => (
                      <tr key={i}>
                        <td style={{ padding: '5px' }} className="center">
                          <b>{i + 1}</b>
                        </td>
                        <td>
                          <p>
                            {t('table.address')}: <Link href={'/account/' + av.account}>{av.account}</Link>{' '}
                            {userOrServiceLink(av, 'account')}
                          </p>
                          <p>
                            {t('table.public-key')}: {shortHash(av.publicKey)} <CopyButton text={av.publicKey} />
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

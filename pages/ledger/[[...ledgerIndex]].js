import { useTranslation, Trans } from 'next-i18next'
import { useState, useEffect } from 'react'
import axios from 'axios'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'

import SEO from '../../components/SEO'

import { network, ledgerName, minLedger } from '../../utils'
import { getIsSsrMobile } from '../../utils/mobile'
import { fullDateAndTime, shortHash, addressUsernameOrServiceLink } from '../../utils/format'
import { LedgerLink } from '../../utils/links'
import { axiosServer, passHeaders } from '../../utils/axios'
import Image from 'next/image'

export async function getServerSideProps(context) {
  const { locale, req, query } = context
  //keep it from query instead of params, anyway it is an array sometimes
  const ledgerIndex = query.ledgerIndex
    ? Array.isArray(query.ledgerIndex)
      ? query.ledgerIndex[0]
      : query.ledgerIndex
    : ''

  let pageMeta = { ledgerIndex }

  try {
    if (ledgerIndex === '' || ledgerIndex >= minLedger) {
      const res = await axiosServer({
        method: 'get',
        url: 'xrpl/next/ledger/' + ledgerIndex,
        headers: passHeaders(req)
      })
      pageMeta = res?.data
      if (pageMeta) {
        pageMeta.transactions?.sort((a, b) => (a.indexInLedger > b.indexInLedger ? 1 : -1))
      }
    }
  } catch (error) {
    console.error(error)
  }

  return {
    props: {
      pageMeta,
      isSsrMobile: getIsSsrMobile(context),
      ...(await serverSideTranslations(locale, ['common', 'ledger']))
    }
  }
}

export default function Ledger({ pageMeta }) {
  const [data, setData] = useState(pageMeta)
  const [loading, setLoading] = useState(false)
  const { t } = useTranslation()

  const [ledgerVersion, setLedgerVersion] = useState(pageMeta?.ledgerIndex)

  const checkApi = async () => {
    setLoading(true)
    const response = await axios('xrpl/next/ledger/' + ledgerVersion)
    const data = response.data
    setLoading(false)

    if (data?.ledgerIndex) {
      data.transactions?.sort((a, b) => (a.indexInLedger > b.indexInLedger ? 1 : -1))
      setData(data)
      setLedgerVersion(data.ledgerIndex)
    } else {
      setData(null)
    }
  }

  /*
  {
    error: "lgrNotFound"
    error_code: 21
    error_message: "ledgerNotFound"
    status: "error"
  }

  {
    "closeTime": "2022-11-17T11:40:20.000Z",
    "closeTimeResolution": 10,
    "ledgerVersion": 23545951,
    "totalDrops": "99987053011898778",
    "transactions": [
      {
        "address": "rxxx",
        "type": "nftokenAcceptOffer",
        "id": "F8E5691555ACCC15757A988337E2ACEBFF454DF2AD4B46C7CEF7748B58F53845",
        "outcome": {
          "result": "tesSUCCESS",
          "fee": "0.000012",
          "ledgerVersion": 23545951,
          "indexInLedger": 0
        },
        "rawTransaction": {}
  */

  useEffect(() => {
    if ((ledgerVersion === '' || ledgerVersion >= minLedger) && ledgerVersion !== data?.ledgerIndex) {
      checkApi()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ledgerVersion])

  const ledgerNavigation = (
    <p className="center">
      {ledgerVersion >= minLedger + 1 && (
        <LedgerLink
          version={Number(ledgerVersion) - 1}
          style={{ marginRight: '10px' }}
          onClick={() => setLedgerVersion(ledgerVersion - 1)}
          text="←"
        />
      )}
      #{ledgerVersion}
      <LedgerLink
        version={Number(ledgerVersion) + 1}
        style={{ marginLeft: '10px' }}
        onClick={() => setLedgerVersion(ledgerVersion + 1)}
        text="→"
      />
    </p>
  )

  return (
    <>
      <SEO title={t('menu.ledger') + ' ' + ledgerVersion} />
      <div className="content-center">
        <h1 className="center">
          {t('menu.ledger')} #{ledgerVersion}
          <br />
          {data?.close_time ? fullDateAndTime(data.close_time) : <br />}
        </h1>
        {ledgerVersion >= minLedger ? (
          <>
            {ledgerNavigation}
            <table className="table-large">
              <thead>
                <tr>
                  <th>{t('table.index')}</th>
                  <th>{t('table.type')}</th>
                  <th className="center">{t('table.address')}</th>
                  <th className="hide-on-mobile">{t('table.status')}</th>
                  <th className="right">{t('table.hash')}</th>
                </tr>
              </thead>
              <tbody>
                {!loading ? (
                  <>
                    {data?.transactions ? (
                      data?.transactions.map((tx) => (
                        <tr key={tx.hash}>
                          <td className="center">{tx.indexInLedger}</td>
                          <td>{tx.type}</td>
                          <td>
                            <Image
                              src={'https://cdn.bithomp.com/avatar/' + tx.address}
                              alt={tx.addressDetails?.service || 'service logo'}
                              height={20}
                              width={20}
                              style={{ marginRight: '5px', marginBottom: '-5px' }}
                            />
                            {addressUsernameOrServiceLink(tx, 'address', { short: 6 })}
                          </td>
                          <td className="hide-on-mobile">{tx.txStatus}</td>
                          <td className="right">
                            <a href={'/explorer/' + tx.hash}>{shortHash(tx.hash, 5)}</a>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="100" className="center">
                          {t('no-transactions', { ns: 'ledger' })}
                        </td>
                      </tr>
                    )}
                  </>
                ) : (
                  <tr className="center">
                    <td colSpan="100">
                      <span className="waiting"></span>
                      <br />
                      {t('general.loading')}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            {ledgerNavigation}
          </>
        ) : (
          <div className="flex">
            <div className="grey-box">
              {!ledgerVersion && ledgerVersion !== '' ? (
                <p className="center">{t('ledger-not-found', { ns: 'ledger' })}</p>
              ) : (
                <>
                  {network === 'mainnet' ? (
                    <>
                      <Trans i18nKey="earliest-ledger-mainnet" ns="ledger">
                        The ledger <b>32570</b> is the earliest ledger available, approximately the first week of XRPL
                        history,
                        <a
                          href="https://web.archive.org/web/20171211225452/https://forum.ripple.com/viewtopic.php?f=2&t=3613"
                          rel="noreferrer"
                          target="_blank"
                        >
                          ledgers 1 through 32569 were lost due to a mishap in 2012
                        </a>
                        .
                      </Trans>
                      <br />
                      <br />
                    </>
                  ) : (
                    <Trans i18nKey="earliest-ledger" ns="ledger">
                      The ledger <b>{{ minLedger }}</b> is the earliest ledger available.
                    </Trans>
                  )}
                  <br />
                  {t('ledger-continue', { ns: 'ledger', ledgerName })}
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  )
}

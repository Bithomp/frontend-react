import { useState, useEffect } from 'react'
import axios from 'axios'
import { useTranslation, Trans } from 'next-i18next'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'

import { useIsMobile, getIsSsrMobile } from '../utils/mobile'
import { dateFormat, amountFormat, AddressWithIconFilled } from '../utils/format'
import { network } from '../utils'

export async function getServerSideProps(context) {
  const { locale } = context
  return {
    props: {
      isSsrMobile: getIsSsrMobile(context),
      ...(await serverSideTranslations(locale, ['common']))
    }
  }
}

import SEO from '../components/SEO'

export default function Genesis() {
  const { t } = useTranslation()
  const isMobile = useIsMobile()

  const [data, setData] = useState({})
  const [rendered, setRendered] = useState(false)

  useEffect(() => {
    setRendered(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    async function fetchData() {
      /*
        {
          "result": "success",
          "count": 136,
          "inception": 1357010470,
          "ledger_index": 32570,
          "genesis_balance_all": 99999999999.99632,
          "balance_all": 504471064.5181259,
          "balance_update": 1550646472,
          "genesis": [
            {
              "address": "rBKPS4oLSaV2KVVuHH8EpQqMGgGefGFQs7",
              "genesis_balance": 370,
              "genesis_index": 1,
              "balance": 20.009958
            },
      */
      const response = await axios('v2/genesis')
      setData(response.data)
    }
    fetchData()
  }, [setData])

  const timestampFormatParams = { year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: 'numeric' }

  return (
    <>
      <SEO title={t('menu.network.genesis')} />
      <div className="page-genesis content-text">
        <h1 className="center">{t('menu.network.genesis')}</h1>

        {/* TODO add description for other networks like in ledger/[[...ledgerindex]].js */}
        {network === 'mainnet' && (
          <div className="flex">
            <div className="grey-box">
              <Trans i18nKey="genesis.text0">
                The ledger <b>32570</b> is the earliest ledger available, approximately the first week of XRPL history,
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
              {t('genesis.ledger-continue')}
            </div>
            <div className="grey-box">
              <table>
                <tbody>
                  <tr>
                    <td>{t('genesis.ledger-index')}</td>
                    <td>32570</td>
                  </tr>
                  <tr>
                    <td>{t('genesis.account-count')}</td>
                    <td>136</td>
                  </tr>
                  <tr>
                    <td>{t('genesis.inception')}</td>
                    <td>{rendered && dateFormat('2013-01-01T03:21:00Z', timestampFormatParams, { type: 'ISO' })}</td>
                  </tr>
                  <tr>
                    <td>{t('table.balance')}</td>
                    <td>{amountFormat(99999999999996320, { minFractionDigits: 6 })}</td>
                  </tr>
                  <tr>
                    <td colSpan="2">
                      <hr />
                    </td>
                  </tr>
                  <tr>
                    <td>{t('genesis.balance-update')}</td>
                    <td>{rendered && dateFormat(data.balance_update, timestampFormatParams)}</td>
                  </tr>
                  <tr>
                    <td>{t('table.balance')}</td>
                    <td>{data.balance_all && amountFormat(data.balance_all, { minFractionDigits: 6 })}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}
        <br />

        {isMobile ? (
          <table className="table-mobile">
            <thead>
              <tr>
                <th>№</th>
                <th>{t('genesis.details')}</th>
              </tr>
            </thead>
            <tbody>
              {data?.genesis?.map((account, i) => (
                <tr key={i}>
                  <td>{account.genesis_index}</td>
                  <td>
                    <p></p>
                    <AddressWithIconFilled data={account} name="address" copyButton={true} />
                    <p>
                      {t('genesis.genesis-balance')}
                      <br />
                      {amountFormat(account.genesis_balance)}
                    </p>
                    <p>
                      {t('table.balance')} {rendered && dateFormat(data.balance_update)}
                      <br />
                      {amountFormat(account.balance)}
                    </p>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <table className="table-large">
            <thead>
              <tr>
                <th className="center">{t('genesis.genesis-index')}</th>
                <th>{t('genesis.address')}</th>
                <th className="right">{t('genesis.genesis-balance')}</th>
                <th className="right">
                  {t('table.balance')} {rendered && dateFormat(data.balance_update)}
                </th>
              </tr>
            </thead>
            <tbody>
              {data?.genesis?.map((account, i) => (
                <tr key={i}>
                  <td className="center">{account.genesis_index}</td>
                  <td>
                    <AddressWithIconFilled data={account} name="address" copyButton={true} />
                  </td>
                  <td className="right">{amountFormat(account.genesis_balance)}</td>
                  <td className="right">{amountFormat(account.balance)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  )
}

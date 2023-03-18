import { useState, useEffect } from 'react'
import axios from 'axios'
import { useTranslation, Trans } from 'next-i18next'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'

import { useIsMobile, getIsSsrMobile } from "../utils/mobile"
import { niceNumber, dateFormat } from '../utils/format'

export async function getServerSideProps(context) {
  const { locale } = context
  return {
    props: {
      isSsrMobile: getIsSsrMobile(context),
      ...(await serverSideTranslations(locale, ['common'])),
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
              "rippletrade": "DeaDTerra",
              "nickname": "DeaDTerra"
              "balance": 20.009958
            },
      */
      const response = await axios('v2/genesis');
      setData(response.data);
    }
    fetchData();
  }, [setData]);

  const timestampFormatParams = { year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: 'numeric' };

  return <>
    <SEO title={t("menu.genesis")} />
    <div className="page-genesis content-text">
      <h1 className="center">{t("menu.genesis")}</h1>

      <div className='flex'>
        <div className="grey-box">
          <Trans i18nKey="genesis.text0">
            The ledger <b>32570</b> is the earliest ledger available, approximately the first week of XRPL history,
            <a
              href="https://web.archive.org/web/20171211225452/https://forum.ripple.com/viewtopic.php?f=2&t=3613"
              rel="noreferrer"
              target="_blank"
            >
              ledgers 1 through 32569 were lost due to a mishap in 2012
            </a>.
          </Trans>
          <br /><br />
          {t("genesis.ledger-continue")}
        </div>

        <div className="grey-box">
          <table>
            <tbody>
              <tr><td>{t("genesis.ledger-index")}</td><td>32570</td></tr>
              <tr><td>{t("genesis.account-count")}</td><td>136</td></tr>
              <tr>
                <td>{t("genesis.inception")}</td>
                <td>{rendered && dateFormat("2013-01-01T03:21:00Z", timestampFormatParams, { type: "ISO" })}</td>
              </tr>
              <tr><td>{t("genesis.xrp-balance")}</td><td>{niceNumber(99999999999.996320, 6)}</td></tr>
              <tr><td colSpan="2"><hr /></td></tr>
              <tr>
                <td>{t("genesis.balance-update")}</td>
                <td>{rendered && dateFormat(data.balance_update, timestampFormatParams)}</td>
              </tr>
              <tr>
                <td>{t("genesis.xrp-balance")}</td>
                <td>{data.balance_all && niceNumber(data.balance_all, 6)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      <br />

      {isMobile ?
        <table className="table-mobile">
          <thead>
            <tr>
              <th>№</th>
              <th>{t("genesis.details")}</th>
            </tr>
          </thead>
          <tbody>
            {data?.genesis?.map((account, i) => (
              <tr key={i}>
                <td>{account.genesis_index}</td>
                <td>
                  <p>
                    {t("genesis.address")}<br />
                    <a href={"/explorer/" + account.address}>{account.address}</a>
                  </p>
                  <p>
                    {t("genesis.genesis-balance")}<br />
                    {niceNumber(account.genesis_balance)}
                  </p>
                  <p>
                    {t("genesis.xrp-balance")} {rendered && dateFormat(data.balance_update)}<br />
                    {niceNumber(account.balance)}
                  </p>
                  {account.rippletrade &&
                    <p>
                      {t("genesis.rippletrade-username")}<br />
                      <a href={"/explorer/" + account.rippletrade}>{account.rippletrade}</a>
                    </p>
                  }
                  {
                    account.nickname &&
                    <p>
                      {t("genesis.nickname")}<br />
                      {account.nickname}
                    </p>
                  }
                </td>
              </tr>
            ))}
          </tbody>
        </table> :
        <table className="table-large">
          <thead>
            <tr>
              <th>{t("genesis.genesis-index")}</th>
              <th>{t("genesis.address")}</th>
              <th>{t("genesis.genesis-balance")}</th>
              <th>{t("genesis.xrp-balance")} {rendered && dateFormat(data.balance_update)}</th>
              <th>Rippletrade</th>
              <th>{t("genesis.nickname")}</th>
            </tr>
          </thead>
          <tbody>
            {data?.genesis?.map((account, i) => (
              <tr key={i}>
                <td>{account.genesis_index}</td>
                <td><a href={"/explorer/" + account.address}>{account.address}</a></td>
                <td>{niceNumber(account.genesis_balance)}</td>
                <td>{niceNumber(account.balance)}</td>
                <td><a href={"/explorer/" + account.rippletrade}>{account.rippletrade}</a></td>
                <td>{account.nickname}</td>
              </tr>
            ))}
          </tbody>
        </table>
      }
    </div>
  </>
};

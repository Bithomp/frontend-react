import { useTranslation } from 'next-i18next'
import { useState, useEffect } from 'react'
import axios from 'axios'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'

import SEO from '../../components/SEO'

import { server } from '../../utils'
import { fullDateAndTime, ledgerLink, shortHash, addressUsernameOrServiceLink } from '../../utils/format';

export async function getServerSideProps(context) {
  const { locale, req, params } = context
  let pageMeta = null
  const ledgerIndex = params.ledgerIndex ? params.ledgerIndex : ""

  let headers = null
  if (process.env.NODE_ENV !== 'development') {
    //otherwise can not verify ssl serts
    headers = req.headers
  }
  try {
    const res = await axios({
      method: 'get',
      url: server + '/api/cors/xrpl/v1/ledger/' + ledgerIndex,
      headers
    })
    pageMeta = res?.data
  } catch (error) {
    console.error(error)
  }

  return {
    props: {
      pageMeta,
      ...(await serverSideTranslations(locale, ['common']))
    }
  }
}

export default function Ledger({ pageMeta }) {
  const [data, setData] = useState(null)
  const [rendered, setRendered] = useState(false)
  const { t } = useTranslation()

  const ledgerVersion = pageMeta.ledgerVersion

  const checkApi = async () => {
    const response = await axios('xrpl/v1/ledger/' + ledgerVersion + '?transactions=true&expand=true');
    const data = response.data;

    if (data) {
      data.transactions?.sort((a, b) => (a.outcome.indexInLedger > b.outcome.indexInLedger) ? 1 : -1);
      setData(data);
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
    setRendered(true)
    checkApi()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return <>
    <SEO title={t("menu.ledger") + ledgerVersion} />
    <div className="content-text">
      <h1 className="center">{t("menu.ledger")} #{ledgerVersion}<br />{(rendered && pageMeta?.close_time) ? fullDateAndTime(pageMeta.close_time) : <br />}</h1>
      <p className="center">
        {t("ledger.past-ledgers")}: {ledgerLink(ledgerVersion - 1)}
        , {ledgerLink(ledgerVersion - 2)}, {ledgerLink(ledgerVersion - 3)}.
      </p>
      <table className="table-large">
        <thead>
          <tr>
            <th>{t("table.index")}</th>
            <th>{t("table.type")}</th>
            <th className='hide-on-mobile'>{t("table.address")}</th>
            <th className='hide-on-mobile'>{t("table.status")}</th>
            <th>{t("table.hash")}</th>
          </tr>
        </thead>
        <tbody>
          {data ?
            <>
              {data.transactions ? data.transactions.map((tx) =>
                <tr key={tx.id}>
                  <td className='center'>{tx.outcome.indexInLedger}</td>
                  <td>{tx.type}</td>
                  <td className='hide-on-mobile'>{addressUsernameOrServiceLink(tx, "address")}</td>
                  <td className='hide-on-mobile'>{tx.outcome.result}</td>
                  <td><a href={"/explorer/" + tx.id}>{shortHash(tx.id, 10)}</a></td>
                </tr>
              ) :
                <tr><td colSpan="4">{t("ledger.no-transactions")}</td></tr>
              }
            </>
            :
            <tr className='center'>
              <td colSpan="100">
                <span className="waiting"></span>
                <br />{t("general.loading")}
              </td>
            </tr>
          }
        </tbody>
      </table>
    </div>
  </>
}

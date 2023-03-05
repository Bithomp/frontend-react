import { useTranslation } from 'next-i18next'
import { useState, useEffect } from 'react'
import axios from 'axios'
import { useRouter } from 'next/router'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'

import SEO from '../../components/SEO'

import { txIdFormat, fullDateAndTime, ledgerLink } from '../../utils/format';

export async function getStaticProps({ locale }) {
  return {
    props: {
      ...(await serverSideTranslations(locale, ['common'])),
    }
  }
}

export async function getStaticPaths() {
  return {
    paths: [],
    fallback: 'blocking'
  }
}

export default function Ledger() {
  const [data, setData] = useState(null);
  const { t } = useTranslation();
  const router = useRouter()
  const { ledgerIndex } = router.query
  const [ledgerVersion, setLedgerVersion] = useState(ledgerIndex);

  const checkApi = async (ledgerI) => {
    if (!ledgerI) {
      ledgerI = ''; //show data for the current ledger
    }
    const response = await axios('xrpl/v1/ledger/' + ledgerI + '?transactions=true&expand=true');
    const data = response.data;

    if (data) {
      setLedgerVersion(data.ledgerVersion ? data.ledgerVersion : ledgerI)
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
    checkApi(ledgerIndex);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <>
    <SEO title={t("menu.ledger") + " " + ledgerVersion} />
    {ledgerVersion ?
      <div className="content-text">
        <h2 className="center">{t("menu.ledger")} #{ledgerVersion}<br />{data?.close_time ? fullDateAndTime(data.close_time) : <br />}</h2>
        <p className="center">
          {t("ledger.past-ledgers")}: {ledgerLink(ledgerVersion - 1)}
          , {ledgerLink(ledgerVersion - 2)}, {ledgerLink(ledgerVersion - 3)}.
        </p>
        <table className="table-large">
          <thead>
            <tr>
              <th>{t("table.index")}</th>
              <th>{t("table.type")}</th>
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
                    <td className='hide-on-mobile'>{tx.outcome.result}</td>
                    <td><a href={"/explorer/" + tx.id}>{txIdFormat(tx.id)}</a></td>
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
      :
      <div className='center' style={{ marginTop: "80px" }}>
        <span className="waiting"></span>
        <br />{t("general.loading")}
      </div>
    }
  </>;
};

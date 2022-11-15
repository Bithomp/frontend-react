import { useTranslation } from 'react-i18next';
import { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams } from "react-router-dom";

import { title } from '../utils';
import { fullDateAndTime } from '../utils/format';

export default function Ledger() {
  const [data, setData] = useState(null);
  const { t } = useTranslation();
  const { ledgerIndex } = useParams();

  const checkApi = async (ledgerIndex) => {
    if (!ledgerIndex) {
      ledgerIndex = ''; //show data for the current ledger
    }
    const response = await axios('xrpl/ledger/' + ledgerIndex + '?transactions=true&expand=true');
    const data = response.data;
    if (data) {
      setData(data);
    }
  }

  /*
  {
    "close_time":721744110,
    "ledger_index":"75748228",
    "totalCoins":"99989213896898111",
    "total_coins":"99989213896898111",
    "transactions":[
      {
        "Account":"rpXCfDds782Bd6eK9Hsn15RDnGMtxf752m",
        "Fee":"10",
        "Flags":131072,
        "LimitAmount":{
          "currency":"IDR",
          "issuer":"rDLx56UDgChRy3HqwkFSDBpX4hL6sEgmtx",
          "value":"5461.5"
        },
        "TransactionType": "TrustSet",
        "hash": "0897DE7DE37145FDA95DEEA2B24553FC5ACCFE6AEA25647FB78402A5D5CABE60",
        "metadata": '',
        "TransactionIndex": 16,
        "TransactionResult": "tesSUCCESS"
  */

  useEffect(() => {
    checkApi(ledgerIndex);
    title(t("menu.ledger"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <>
    <div className="content-text">
      {data?.transactions ?
        <>
          <h2 className="center">{t("menu.ledger")} # {data.ledger_index} ({fullDateAndTime(data.close_time)})</h2>
          <table className="table-large">
            <thead>
              <tr>
                <th>Transaction Index</th>
                <th>Transaction Type</th>
                <th>Hash</th>
              </tr>
            </thead>
            <tbody>
              {data?.transactions?.map((tx, i) =>
                <tr key={i}>
                  <td>{tx.TransactionIndex}</td>
                  <td>{tx.TransactionType}</td>
                  <td><a href={"/explorer/" + tx.hash}>{tx.hash}</a></td>
                </tr>
              )}
            </tbody>
          </table>
        </> : ""
      }
    </div>
  </>;
};

import { useTranslation } from "next-i18next";

import { LinkAccount, LinkLedger } from "./Links";
import { formatDateTime } from "../utils";

export const TransactionDetails = ({ tx, children }) => {
  const { t } = useTranslation();

  const isSuccessful = tx.outcome?.result == "tesSUCCESS";

  return (
      <table className="table-details">
        <thead>
          <tr>
            <th colSpan="100">Transation Details</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>{t("table.transaction")} ID</td>
            <td>{tx.id}</td>
          </tr>
          <tr>
            <td>Summary</td>
            {isSuccessful
              ? (
                <td>
                  The transaction was <b className="green">successfull</b>{" "}
                  and validated in the ledger{" "}
                  <LinkLedger version={tx.outcome.ledgerVersion} /> (index:{" "}
                  {tx.outcome.indexInLedger}).
                </td>
              )
              : (
                <td>
                  The transaction <b className="red">FAILED</b>{" "}
                  and included to the ledger{" "}
                  <LinkLedger version={tx.outcome.ledgerVersion} /> (index:{" "}
                  {tx.outcome.indexInLedger}).
                </td>
              )}
          </tr>
          <tr>
            <td>Initiated by</td>
            <td><LinkAccount hash={tx.address} /></td>
          </tr>
          <tr>
            <td>Time (UTC)</td>
            <td>{formatDateTime(tx.outcome.timestamp)}</td>
          </tr>
          {tx.outcome?.fee && (
            <tr>
              <td>Fee:</td>
              <td>{tx.outcome?.fee}</td>
            </tr>
          )}
          <tr>
            <td>{t("table.type")}</td>
            <td>{tx.type}</td>
          </tr>
          <tr>
            <td>Sequence:</td>
            <td>#{tx.sequence}</td>
          </tr>
          {tx.rawTransaction?.ctid && (
            <tr>
              <td>CTID:</td>
              <td>{tx.rawTransaction?.ctid}</td>
            </tr>
          )}
          {children}
        </tbody>
      </table>
  );
};

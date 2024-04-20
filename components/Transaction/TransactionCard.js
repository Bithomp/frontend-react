import CopyButton from "../UI/CopyButton";

import { Card, Info, Heading, MainBody } from "./styled";
import { LedgerLink } from "../../utils/links";

export const TransactionCard = ({ tx, children }) => {
  const isSuccessful = tx.outcome?.result == "tesSUCCESS";

  return (
    <MainBody>
      <Heading>Transaction Details</Heading>
      <Card>
        <Info>
          {tx.id} <CopyButton text={tx.id}></CopyButton>
        </Info>
        {isSuccessful
          ? (
            <Info>
              The transaction was <b className="green">successfull</b>{" "}
              and validated in the ledger{" "}
              <LedgerLink version={tx.outcome.ledgerVersion} />{" "}
              (index: {tx.outcome.indexInLedger}).
            </Info>
          )
          : (
            <Info>
              The transaction <b className="red">FAILED</b>{" "}
              and included to the ledger{" "}
              <LedgerLink version={tx.outcome.ledgerVersion} /> (index:{" "}
              {tx.outcome.indexInLedger}).
            </Info>
          )}
        {children}
      </Card>
    </MainBody>
  );
};

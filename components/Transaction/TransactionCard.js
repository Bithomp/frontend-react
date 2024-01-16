import CopyButton from "../UI/CopyButton";

import { Card, Info, Heading}  from "./styled";
import { LinkLedger } from "./Links";

export const TransactionCard = ({ tx, children }) => {
  const isSuccessful = tx.outcome?.result == "tesSUCCESS";

  return (
    <>
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
              <LinkLedger version={tx.outcome.ledgerVersion} />{" "}
              (index:{tx.outcome.indexInLedger}).
            </Info>
          )
          : (
            <Info>
              The transaction <b className="red">FAILED</b>{" "}
              and included to the ledger{" "}
              <LinkLedger version={tx.outcome.ledgerVersion} /> (index:{" "}
              {tx.outcome.indexInLedger}).
            </Info>
          )}
        {children}
      </Card>
    </>
  );
};

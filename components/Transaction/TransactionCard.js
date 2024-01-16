import styled from "styled-components";

import CopyButton from "../UI/CopyButton";

import { LinkLedger } from "./Links";

const Heading = styled.h1`
  margin: 24px 0;
  color: var(--text-main);
  font-size: 16px;
  font-weight: 700;
  text-align: left;
  text-transform: uppercase;
`;

const Card = styled.div`
  border-top: 4px solid var(--accent-link);
  box-shadow: 0 1px 3px hsla(0,0%,0%,0.2);
  padding: 8px;
  margin-bottom: 16px;
`;

const Text = styled.p`
  color: var(--text-main);
  font-size: 16px;
  font-weight: 400;
  text-align: left;
  word-break: break-word;
`;

export const TransactionCard = ({ tx, children }) => {
  const isSuccessful = tx.outcome?.result == "tesSUCCESS";

  return (
    <>
      <Heading>Transaction Details</Heading>
      <Card>
        <Text>
          {tx.id} <CopyButton text={tx.id}></CopyButton>
        </Text>
        {isSuccessful
          ? (
            <Text>
              The transaction was <b className="green">successfull</b>{" "}
              and validated in the ledger{" "}
              <LinkLedger version={tx.outcome.ledgerVersion} />{" "}
              (index:{tx.outcome.indexInLedger}).
            </Text>
          )
          : (
            <Text>
              The transaction <b className="red">FAILED</b>{" "}
              and included to the ledger{" "}
              <LinkLedger version={tx.outcome.ledgerVersion} /> (index:{" "}
              {tx.outcome.indexInLedger}).
            </Text>
          )}
        {children}
      </Card>
    </>
  );
};

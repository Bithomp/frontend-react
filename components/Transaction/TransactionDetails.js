import { useTranslation } from "next-i18next";
import styled from "styled-components";

import { LinkAccount, LinkLedger } from "./Links";
import { formatDateTime } from "../../utils/transaction";
import CopyButton from '../UI/CopyButton'

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
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  border-spacing: 0;
  color: var(--text-main);
  font-size: 16px;
  font-weight: 400;
  text-align: left;
`;

const Row = ({ children }) => <tr>{children}</tr>;

const Cell = styled.td`
  padding: 8px 0;
  border-bottom: 1px solid var(--border-color);
  &:first-child {
    color: var(--text-secondary);
    width: 20%;
  }
  &:nth-child(2) {
    word-break: break-word;
  }
`;

export const TransactionDetails = ({ tx }) => {
  const { t } = useTranslation();

  const isSuccessful = tx.outcome?.result == "tesSUCCESS";

  return (
    <>
      <Heading>Transaction Details</Heading>
      <Card>
        <Text>{tx.id} <CopyButton text={tx.id}></CopyButton></Text>
        <Text>
          {isSuccessful
            ? (
              <span>
                The transaction was <b className="green">successfull</b>{" "}
                and validated in the ledger{" "}
                <LinkLedger version={tx.outcome.ledgerVersion} />{" "}
                (index:{tx.outcome.indexInLedger}).
              </span>
            )
            : (
              <span>
                The transaction <b className="red">FAILED</b>{" "}
                and included to the ledger{" "}
                <LinkLedger version={tx.outcome.ledgerVersion} /> (index:{" "}
                {tx.outcome.indexInLedger}).
              </span>
            )}
        </Text>
        <Table>
          <Row>
            <Cell>{t("table.type")}:</Cell>
            <Cell>{tx.type}</Cell>
          </Row>
          <Row>
            <Cell>Time (UTC):</Cell>
            <Cell>{formatDateTime(tx.outcome.timestamp)}</Cell>
          </Row>
          <Row>
            <Cell>Initiated by:</Cell>
            <Cell>
              <LinkAccount hash={tx.address} />
            </Cell>
          </Row>
          <Row>
            <Cell>Sequence:</Cell>
            <Cell>#{tx.sequence}</Cell>
          </Row>
          <Row>
            <Cell>XRLP fee:</Cell>
            <Cell>{tx.outcome?.fee}</Cell>
          </Row>
          <Row>
            <Cell>CTID:</Cell>
            <Cell>{tx.rawTransaction?.ctid}</Cell>
          </Row>
        </Table>
      </Card>
    </>
  );
};

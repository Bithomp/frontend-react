import { useTranslation } from "next-i18next";
import styled from "styled-components";

import { LinkAccount, LinkLedger } from "./Links";
import { formatDateTime } from "../../utils/transaction";
import CopyButton from "../UI/CopyButton";
import * as Table from "../TableDetails";

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

export const TransactionDetails = ({ tx, children }) => {
  const { t } = useTranslation();

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
        <Table.Root>
          <Table.Body>
            <Table.Row>
              <Table.Data>{t("table.type")}:</Table.Data>
              <Table.Data>{tx.type}</Table.Data>
            </Table.Row>
            <Table.Row>
              <Table.Data>Time (UTC):</Table.Data>
              <Table.Data>
                {formatDateTime(tx.outcome.timestamp)}
              </Table.Data>
            </Table.Row>
            <Table.Row>
              <Table.Data>Initiated by:</Table.Data>
              <Table.Data>
                <LinkAccount address={tx.address} />
              </Table.Data>
            </Table.Row>
            <Table.Row>
              <Table.Data>Sequence:</Table.Data>
              <Table.Data>#{tx.sequence}</Table.Data>
            </Table.Row>
            <Table.Row>
              <Table.Data>XRLP fee:</Table.Data>
              <Table.Data>{tx.outcome?.fee}</Table.Data>
            </Table.Row>
            <Table.Row>
              <Table.Data>CTID:</Table.Data>
              <Table.Data>{tx.rawTransaction?.ctid}</Table.Data>
            </Table.Row>

            {/* We can extend this table with more data. */}
            {children}
          </Table.Body>
        </Table.Root>
      </Card>
    </>
  );
};

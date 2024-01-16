import { LinkAccount } from "./Links";
import { TransactionDetails } from "./TransactionDetails";

import * as Table from "../TableDetails";

export const TransactionPayment = ({ tx }) => {
  const destination = tx.specification?.destination?.address;

  return (
    <TransactionDetails tx={tx}>
      <Table.Row>
        <Table.Data>Destination:</Table.Data>
        <Table.Data>
          <LinkAccount address={destination} />
        </Table.Data>
      </Table.Row>
      <Table.Row>
        <Table.Data>Delivered amount:</Table.Data>
        <Table.Data>
          {tx.outcome.deliveredAmount?.value}{" "}
          {tx.outcome.deliveredAmount?.currency}
        </Table.Data>
      </Table.Row>
    </TransactionDetails>
  );
};

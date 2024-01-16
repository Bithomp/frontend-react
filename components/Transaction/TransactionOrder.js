import { useTranslation } from "next-i18next";

import { amountFormat } from "../../utils/format";
import { TDetails, TBody, TData, TRow } from "../TableDetails";

import * as Styled from "./styled";
import { LinkAccount } from "./Links";
import { TransactionCard } from "./TransactionCard";
import { formatDateTime } from "./utils";

export const TransactionOrder = ({ tx }) => {
  const { t } = useTranslation();

  const direction = tx.specification?.direction;
  let txType = direction === "sell" ? "Sell Order" : "Buy Order";

  return (
    <TransactionCard tx={tx}>
      <TDetails>
        <TBody>
          <TRow>
            <TData>{t("table.type")}:</TData>
            <TData><Styled.Type>{txType}</Styled.Type></TData>
          </TRow>
          <TRow>
            <TData>Time:</TData>
            <TData>
              {formatDateTime(tx.outcome.timestamp)}
            </TData>
          </TRow>
          <TRow>
            <TData>Initiated by:</TData>
            <TData>
              <LinkAccount address={tx.address} />
            </TData>
          </TRow>
          <TRow>
            <TData>Sequence:</TData>
            <TData>#{tx.sequence}</TData>
          </TRow>
          <TRow>
            <TData>XRPL Fee:</TData>
            <TData>{amountFormat(tx.outcome?.fee)}</TData>
          </TRow>
          <TRow>
            <TData>CTID:</TData>
            <TData>{tx.rawTransaction?.ctid}</TData>
          </TRow>
          <TRow>
            <TData>Quantity:</TData>
            <TData>
              {tx.specification.quantity.value}{" "}
              {tx.specification.quantity.currency}
            </TData>
          </TRow>
          <TRow>
            <TData>Total Price:</TData>
            <TData>
              {tx.specification.totalPrice.value}{" "}
              {tx.specification.totalPrice.currency}{" "}
              (<LinkAccount
                address={tx.specification.totalPrice.counterparty}
              />)
            </TData>
          </TRow>
        </TBody>
      </TDetails>
    </TransactionCard>
  );
};

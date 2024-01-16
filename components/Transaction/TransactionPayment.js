import { useTranslation } from "next-i18next";

import { TDetails, TBody, TRow, TData } from "../TableDetails";
import { amountFormat } from "../../utils/format";

import * as Styled from "./styled";
import { LinkAccount } from "./Links";
import { TransactionCard } from "./TransactionCard";
import { formatDateTime } from "./utils";

export const TransactionPayment = ({ tx }) => {
  const { t } = useTranslation();

  const destination = tx.specification?.destination?.address;

  return (
    <TransactionCard tx={tx}>
      <TDetails>
        <TBody>
          <TRow>
            <TData>{t("table.type")}:</TData>
            <TData><Styled.Type>Payment</Styled.Type></TData>
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
            <TData>Destination:</TData>
            <TData>
              <LinkAccount address={destination} />
            </TData>
          </TRow>
          <TRow>
            <TData>Delivered amount:</TData>
            <TData>
              {tx.outcome.deliveredAmount?.value}{" "}
              {tx.outcome.deliveredAmount?.currency}
            </TData>
          </TRow>
        </TBody>
      </TDetails>
    </TransactionCard>
  );
};

import { useTranslation } from "next-i18next";

import { TDetails, TBody, TRow, TData } from "../TableDetails";
import { amountFormat, fullDateAndTime } from "../../utils/format";

import * as Styled from "./styled";
import { LinkAccount, LinkTx } from "./Links";
import { TransactionCard } from "./TransactionCard";

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
            <TData>Date and time:</TData>
            <TData>
              {fullDateAndTime(tx.rawTransaction?.date, 'ripple')}
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
            <TData>Ledger fee:</TData>
            <TData>{amountFormat(tx.rawTransaction?.Fee)}</TData>
          </TRow>
          {tx.rawTransaction?.ctid &&
            <TRow>
              <TData>CTID:</TData>
              <TData>{LinkTx({ tx: tx.rawTransaction.ctid })}</TData>
            </TRow>
          }
          <TRow>
            <TData>Destination:</TData>
            <TData>
              <LinkAccount address={destination} />
            </TData>
          </TRow>
          <TRow>
            <TData>Delivered amount:</TData>
            <TData>
              {amountFormat(tx.outcome.deliveredAmount)}
            </TData>
          </TRow>
        </TBody>
      </TDetails>
    </TransactionCard>
  );
};

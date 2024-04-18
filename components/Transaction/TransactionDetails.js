import { useTranslation } from "next-i18next";

import { amountFormat, fullDateAndTime } from "../../utils/format";
import { TBody, TData, TDetails, TRow } from "../TableDetails";

import * as Styled from "./styled";
import { LinkAccount } from "./Links";
import { TransactionCard } from "./TransactionCard";

export const TransactionDetails = ({ tx }) => {
  const { t } = useTranslation();

  return (
    <TransactionCard tx={tx}>
      <TDetails>
        <TBody>
          <TRow>
            <TData>{t("table.type")}:</TData>
            <TData>
              <Styled.Type>{tx.type}</Styled.Type>
            </TData>
          </TRow>
          <TRow>
            <TData>Time:</TData>
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
          <TRow>
            <TData>CTID:</TData>
            <TData>{tx.rawTransaction?.ctid}</TData>
          </TRow>
        </TBody>
      </TDetails>
    </TransactionCard>
  );
};

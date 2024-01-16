import { useTranslation } from "next-i18next";

import { amountFormat } from "../../utils/format";
import { TBody, TData, TDetails, TRow } from "../TableDetails";

import * as Styled from "./styled";
import { LinkAccount } from "./Links";
import { TransactionCard } from "./TransactionCard";
import { formatDateTime } from "./utils";

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
        </TBody>
      </TDetails>
    </TransactionCard>
  );
};

import { useTranslation } from "next-i18next";

import { TBody, TData, TDetails, TRow } from "../TableDetails";
import { amountFormat } from "../../utils/format";

import * as Styled from "./styled";
import { LinkAccount } from "./Links";
import { TransactionCard } from "./TransactionCard";
import { formatDateTime } from "./utils";

export const TransactionEscrowCreation = ({ tx }) => {
  const { t } = useTranslation();

  return (
    <TransactionCard tx={tx}>
      <TDetails>
        <TBody>
          <TRow>
            <TData>{t("table.type")}:</TData>
            <TData>
              <Styled.Type>Escrow Creation</Styled.Type>
            </TData>
          </TRow>
          <TRow>
            <TData>Time:</TData>
            <TData>
              {formatDateTime(tx.outcome.timestamp)}
            </TData>
          </TRow>
          <TRow>
            <TData>Escrow Owner:</TData>
            <TData>
              <LinkAccount address={tx.specification?.source?.address} />
            </TData>
          </TRow>
          <TRow>
            <TData>Escrow Sequence:</TData>
            <TData>#{tx.outcome?.escrowChanges?.escrowSequence}</TData>
          </TRow>
          <TRow>
            <TData>Destination:</TData>
            <TData>
              <LinkAccount address={tx.specification?.destination?.address} />
            </TData>
          </TRow>
          <TRow>
            <TData>Escrow Amount:</TData>
            <TData>
              {amountFormat(tx.specification?.amount)}
            </TData>
          </TRow>
          <TRow>
            <TData>Source Tag:</TData>
            <TData>{tx.specification?.source?.tag}</TData>
          </TRow>
          <TRow>
            <TData>Destination Tag:</TData>
            <TData>{tx.specification?.destination?.tag}</TData>
          </TRow>
          <TRow>
            <TData>Execute After:</TData>
            <TData>{formatDateTime(tx.specification?.allowExecuteAfter)}</TData>
          </TRow>
          <TRow>
            <TData>Cancel After:</TData>
            <TData>{formatDateTime(tx.specification?.allowCancelAfter)}</TData>
          </TRow>
          <TRow>
            <TData>Condition:</TData>
            <TData>{tx.specification?.condition}</TData>
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

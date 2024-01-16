import { useTranslation } from "next-i18next";

import { formatDateTime } from "../../utils/transaction";
import { TRoot, TBody, TRow, TData } from "../TableDetails";

import { LinkAccount } from "./Links";
import { TransactionCard } from "./TransactionCard";
import * as Styled from "./styled";

export const TransactionDetails = ({ tx }) => {
  const { t } = useTranslation();

  return (
    <TransactionCard tx={tx}>
        <TRoot>
          <TBody>
            <TRow>
              <TData>{t("table.type")}:</TData>
              <TData><Styled.Type>{tx.type}</Styled.Type></TData>
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
              <TData>XRLP Fee:</TData>
              <TData>{tx.outcome?.fee}</TData>
            </TRow>
            <TRow>
              <TData>CTID:</TData>
              <TData>{tx.rawTransaction?.ctid}</TData>
            </TRow>
          </TBody>
        </TRoot>
    </TransactionCard>
  );
};

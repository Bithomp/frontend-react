import { useTranslation } from "next-i18next";

import { TDetails, TBody, TRow, TData } from "../TableDetails";
import { amountFormat, fullDateAndTime } from "../../utils/format";
import { useEffect, useState } from "react";

import * as Styled from "./styled";
import { LinkAccount } from "../../utils/links";
import { TransactionCard } from "./TransactionCard";

export const TransactionPayment = ({ tx }) => {
  const { t } = useTranslation();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

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
              {isMounted &&
                fullDateAndTime(tx.rawTransaction?.date, 'ripple')
              }
            </TData>
          </TRow>
          <TRow>
            <TData>Source:</TData>
            <TData>
              <LinkAccount address={tx.rawTransaction.Account} />
            </TData>
          </TRow>
          <TRow>
            <TData>Sequence:</TData>
            <TData>#{tx.sequence}</TData>
          </TRow>
          <TRow>
            <TData>Destination:</TData>
            <TData>
              <LinkAccount address={tx.rawTransaction.Destination} />
            </TData>
          </TRow>
          {tx.rawTransaction?.DestinationTag &&
            <TRow>
              <TData>Destination tag:</TData>
              <TData>{tx.rawTransaction.DestinationTag}</TData>
            </TRow>
          }
          <TRow>
            <TData>Delivered amount:</TData>
            <TData className="bold green">
              {amountFormat(tx.outcome.deliveredAmount)}
            </TData>
          </TRow>
          <TRow>
            <TData>Ledger fee:</TData>
            <TData>{amountFormat(tx.rawTransaction?.Fee)}</TData>
          </TRow>
          {tx.rawTransaction?.ctid &&
            <TRow>
              <TData>CTID:</TData>
              <TData>{tx.rawTransaction.ctid}</TData>
            </TRow>
          }
        </TBody>
      </TDetails>
    </TransactionCard>
  );
};

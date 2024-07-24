import { useTranslation } from "next-i18next";

import { amountFormat, fullDateAndTime, codeHighlight } from "../../utils/format";
import { TBody, TData, TDetails, TRow } from "../TableDetails";

import * as Styled from "./styled";
import { LinkAccount } from "../../utils/links";
import { TransactionCard } from "./TransactionCard";
import { useState } from "react";
import CopyButton from "../UI/CopyButton";

export const TransactionAmm = ({ tx }) => {
  const { t } = useTranslation();

  const [showRawData, setShowRawData] = useState(false)

  return (
    <>
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
            {tx.rawTransaction?.ctid &&
              <TRow>
                <TData>CTID:</TData>
                <TData>
                  {tx.rawTransaction.ctid} <CopyButton text={tx.rawTransaction.ctid} />
                </TData>
              </TRow>
            }
            <TRow>
              <TData>{t("table.raw-data")}</TData>
              <TData>
                <span className='link' onClick={() => setShowRawData(!showRawData)}>
                  {showRawData ? t("table.text.hide") : t("table.text.show")}
                </span>
              </TData>
            </TRow>
          </TBody>
        </TDetails>
      </TransactionCard>
      <div
        className={'slide ' + (showRawData ? "opened" : "closed")}
        style={{ margin: '0 15px' }}
      >
        {codeHighlight(tx.rawTransaction)}
      </div>
    </>
  );
};

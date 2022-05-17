import { useTranslation } from 'react-i18next';
import { useState, useEffect } from 'react';

export default function LastLedgerInformation() {
  const { t } = useTranslation();

  const [ledger, setLedger] = useState("");

  useEffect(() => {
    setLedger({ledger_index: "123456789", txn_count: "50"});
  }, []);

  return (
    <div className="content-text center">
      <h1>{t("menu.last-ledger-information")}</h1>
      <p>Ledger #{ledger.ledger_index} validated with {ledger.txn_count} transactions!</p>
    </div>
  );
};

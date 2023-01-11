import { useTranslation } from 'react-i18next';

import SEO from '../../components/SEO';
import Sales from '../../components/Sales';

export default function NftSalesLatest() {
  const { t } = useTranslation();

  return <>
    <SEO title={t("menu.nft-sales-latest")} />
    <div className="content-text" style={{ minHeight: "480px" }}>
      <h2 className="center">{t("menu.nft-sales-latest") + " "}</h2>
      <Sales list="lastSold" />
    </div>
  </>;
};

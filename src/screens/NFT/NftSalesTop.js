import { useTranslation } from 'react-i18next';

import SEO from '../../components/SEO';
import Sales from '../../components/Sales';

export default function NftSalesTop() {
  const { t } = useTranslation();

  return <>
    <SEO title={t("menu.nft-sales-top")} />
    <div className="content-text">
      <h2 className="center">{t("menu.nft-sales-top")}</h2>
      <Sales list="topSold" defaultSaleTab="all" />
    </div>
  </>;
};
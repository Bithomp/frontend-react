import { useTranslation } from 'react-i18next';
import { useLocation } from "react-router-dom";

import SEO from '../../components/SEO';
import Sales from '../../components/Sales';

export default function NftSales() {
  const location = useLocation();
  const { t } = useTranslation();

  const list = location.pathname.includes("latest-nft-sales") ? "last" : "top";

  return <>
    <SEO title={t("menu.nft-sales")} />
    <div className="content-text" style={{ minHeight: "480px" }}>
      <h2 className="center">{t("menu.nft-sales") + " "}</h2>
      <Sales list={list} />
    </div>
  </>;
};
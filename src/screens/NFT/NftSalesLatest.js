import { useTranslation } from 'react-i18next';
import { useState, useEffect } from 'react';
import { useSearchParams } from "react-router-dom";
import axios from 'axios';

import SEO from '../../components/SEO';
import Tabs from '../../components/Tabs';
import Tiles from '../../components/Tiles';

import { stripText, onFailedRequest } from '../../utils';
import { timeFormat, amountFormat, nftLink } from '../../utils/format';

import { ReactComponent as LinkIcon } from "../../assets/images/link.svg";

export default function NftSalesLatest() {
  const [data, setData] = useState(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const [viewTab, setViewTab] = useState(searchParams.get("view") || "tiles");
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [saleTab, setSaleTab] = useState(searchParams.get("sale") || "secondary");

  const { t } = useTranslation();

  const viewTabList = [
    { value: 'tiles', label: t("tabs.tiles") },
    { value: 'list', label: t("tabs.list") }
  ];

  const saleTabList = [
    { value: 'secondary', label: t("tabs.secondary") },
    { value: 'primary', label: t("tabs.primary") },
    { value: 'all', label: t("tabs.all") }
  ];

  const checkApi = async () => {
    setData(null);
    setLoading(true);

    const response = await axios('v2/nft-sales?list=lastSold&saleType=' + saleTab).catch(error => {
      onFailedRequest(error, setErrorMessage);
    });

    const data = response.data;
    setLoading(false);
    if (data.sales) {
      setData(data.sales);
    }
  }

  useEffect(() => {
    checkApi();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saleTab]);

  useEffect(() => {
    const existView = viewTabList.some(t => t.value === viewTab);
    if (!existView) {
      setViewTab("tiles");
      searchParams.delete("view");
    } else if (viewTab === 'tiles') {
      searchParams.delete("view");
    } else {
      searchParams.set("view", viewTab);
    }

    const existSaleType = saleTabList.some(t => t.value === saleTab);
    if (!existSaleType) {
      setSaleTab("secondary");
      searchParams.delete("sale");
    } else if (saleTab === 'secondary') {
      searchParams.delete("sale");
    } else {
      searchParams.set("sale", saleTab);
    }

    setSearchParams(searchParams);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewTab, saleTab]);

  return <>
    <SEO title={t("menu.nft-sales-latest")} />
    <div className="content-text">
      <h2 className="center">{t("menu.nft-sales-latest")}</h2>
      <div className='tabs-inline'>
        <Tabs tabList={viewTabList} tab={viewTab} setTab={setViewTab} name="view" />
        <Tabs tabList={saleTabList} tab={saleTab} setTab={setSaleTab} name="sale" />
      </div>
      {viewTab === "list" &&
        <table className="table-large">
          <thead>
            <tr>
              <th>{t("table.time")}</th>
              <th>{t("table.amount")}</th>
              <th>{t("table.name")}</th>
              <th className='hide-on-mobile'>{t("table.taxon")}</th>
              <th className='hide-on-mobile'>{t("table.serial")}</th>
              <th>NFT</th>
              <th className='hide-on-mobile'>{t("table.transaction")}</th>
              {saleTab !== "primary" && <th className='hide-on-mobile center'>{t("table.seller")}</th>}
              <th className='hide-on-mobile center'>{t("table.buyer")}</th>
              <th className='hide-on-mobile center'>{t("table.issuer")}</th>
            </tr>
          </thead>
          <tbody>
            {data ?
              <>
                {data.length ? data.map((nft, i) =>
                  <tr key={i}>
                    <td>{timeFormat(nft.acceptedAt)}</td>
                    <td>{amountFormat(nft.amount, { tooltip: 'right' })}</td>
                    <td>{nft.nftoken?.metadata?.name ? stripText(nft.nftoken.metadata.name) : "---//---"}</td>
                    <td className='hide-on-mobile'>{nft.nftoken.nftokenTaxon}</td>
                    <td className='hide-on-mobile'>{nft.nftoken.sequence}</td>
                    <td className='center'><a href={"/explorer/" + nft.nftokenID}><LinkIcon /></a></td>
                    <td className='center hide-on-mobile'><a href={"/explorer/" + nft.acceptedTxHash}><LinkIcon /></a></td>
                    {saleTab !== "primary" && <td className='center hide-on-mobile'>{nftLink(nft, 'seller')}</td>}
                    <td className='center hide-on-mobile'>{nftLink(nft, 'buyer')}</td>
                    <td className='center hide-on-mobile'>{nftLink(nft.nftoken, 'issuer')}</td>
                  </tr>
                ) : <tr className='center'><td colSpan="100">{t("general.no-data")}</td></tr>}
              </>
              :
              <tr className='center'><td colSpan="100"><span className="waiting"></span></td></tr>
            }
          </tbody>
        </table>
      }
      {viewTab === "tiles" &&
        <>
          {loading ?
            <div className='center' style={{ marginTop: "20px" }}><span className="waiting"></span></div>
            :
            <>
              {errorMessage ?
                <div className='center'>{errorMessage}</div>
                :
                <Tiles nftList={data} type="latest" />
              }
            </>
          }
        </>
      }
    </div>
  </>;
};

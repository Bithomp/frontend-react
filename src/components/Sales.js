import { useTranslation } from 'react-i18next';
import { useState, useEffect } from 'react';
import { useSearchParams } from "react-router-dom";
import axios from 'axios';

import Tabs from './Tabs';
import Tiles from './Tiles';

import { stripText, onFailedRequest, isAddressOrUsername } from '../utils';
import { isValidTaxon } from '../utils/nft';
import { dateFormat, timeFormat, amountFormat, nftLink } from '../utils/format';

import { ReactComponent as LinkIcon } from "../assets/images/link.svg";

export default function Sales({ list, defaultSaleTab = "all" }) {
  const [data, setData] = useState(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const [viewTab, setViewTab] = useState(searchParams.get("view") || "tiles");
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [saleTab, setSaleTab] = useState(searchParams.get("sale") || defaultSaleTab);
  const [issuer, setIssuer] = useState(searchParams.get("issuer") || "");
  const [taxon, setTaxon] = useState(searchParams.get("taxon") || "");
  const [issuerInput, setIssuerInput] = useState(searchParams.get("issuer") || "");
  const [taxonInput, setTaxonInput] = useState(searchParams.get("taxon") || "");

  const { t } = useTranslation();

  const viewTabList = [
    { value: 'tiles', label: t("tabs.tiles") },
    { value: 'list', label: t("tabs.list") }
  ];

  const saleTabList = [
    { value: 'all', label: t("tabs.all") },
    { value: 'secondary', label: t("tabs.secondary") },
    { value: 'primary', label: t("tabs.primary") }
  ];

  const checkApi = async () => {
    setData(null);
    setLoading(true);

    let currency = '';
    let currencyUrlPart = '';
    if (list === 'topSold') {
      currency = searchParams.get("currency");
      currency = currency ? stripText(currency) : "xrp";
      currencyUrlPart = '&currency=' + currency;
    }

    let collectionUrlPart = '';
    if (issuer) {
      collectionUrlPart = '&issuer=' + issuer;
      if (taxon) {
        collectionUrlPart += '&taxon=' + taxon;
      }
    }

    const response = await axios('v2/nft-sales?list=' + list + currencyUrlPart + '&saleType=' + saleTab + collectionUrlPart).catch(error => {
      onFailedRequest(error, setErrorMessage);
    });

    const data = response.data;
    setLoading(false);
    if (data.sales) {
      setData(data.sales);
      if (data.sales.length > 0) {
        setErrorMessage("");
      } else {
        setErrorMessage(t("general.no-data"));
      }
    }
  }

  useEffect(() => {
    checkApi();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saleTab, issuer, taxon]);

  useEffect(() => {
    if (isAddressOrUsername(issuer)) {
      searchParams.set("issuer", issuer);
      if (isValidTaxon(taxon)) {
        searchParams.set("taxon", taxon);
      } else {
        searchParams.delete("taxon");
      }
    } else {
      searchParams.delete("issuer");
      searchParams.delete("taxon");
    }

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
      setSaleTab(defaultSaleTab);
      searchParams.delete("sale");
    } else if (saleTab === defaultSaleTab) {
      searchParams.delete("sale");
    } else {
      searchParams.set("sale", saleTab);
    }

    setSearchParams(searchParams);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewTab, saleTab, issuer, taxon]);

  const searchClick = () => {
    if (isAddressOrUsername(issuerInput)) {
      setIssuer(issuerInput);
      if (isValidTaxon(taxonInput)) {
        setTaxon(taxonInput);
      } else {
        setTaxonInput("");
        setTaxon("");
      }
    } else {
      setIssuerInput("");
      setIssuer("");
      setTaxonInput("");
      setTaxon("");
    }
  }

  const enterPress = e => {
    if (e.key === 'Enter') {
      searchClick();
    }
  }

  const onTaxonInput = (e) => {
    if (!/^\d+$/.test(e.key)) {
      e.preventDefault();
    }
    enterPress(e);
  }

  return <>
    <div className='center'>
      <span className='halv'>
        <span className='input-title'>{t("table.issuer")}</span>
        <input
          placeholder={t("explorer.nfts.search-by-issuer")}
          value={issuerInput}
          onChange={(e) => { setIssuerInput(e.target.value) }}
          onKeyPress={enterPress}
          className="input-text"
          spellCheck="false"
          maxLength="35"
        />
      </span>
      <span className='halv'>
        <span className='input-title'>{t("table.taxon")}</span>
        <input
          placeholder={t("explorer.nfts.search-by-taxon")}
          value={taxonInput}
          onChange={(e) => { setTaxonInput(e.target.value) }}
          onKeyPress={onTaxonInput}
          className="input-text"
          spellCheck="false"
          maxLength="35"
          disabled={issuerInput ? false : true}
        />
      </span>
    </div>
    <p className="center" style={{ marginBottom: "40px" }}>
      <input type="button" className="button-action" value={t("button.search")} onClick={searchClick} />
    </p>
    <div className='tabs-inline'>
      <Tabs tabList={viewTabList} tab={viewTab} setTab={setViewTab} name="view" />
      <Tabs tabList={saleTabList} tab={saleTab} setTab={setSaleTab} name="sale" />
    </div>
    {viewTab === "list" &&
      <table className="table-large">
        <thead>
          <tr>
            <th className='center'>{list === 'lastSold' ? t("table.time") : t("table.index")}</th>
            <th>{t("table.amount")}</th>
            {list === 'topSold' && <th className='hide-on-mobile'>{t("table.sold")}</th>}
            <th>{t("table.name")}</th>
            <th className='center hide-on-mobile'>{t("table.taxon")}</th>
            <th className='center hide-on-mobile'>{t("table.serial")}</th>
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
              {!errorMessage && data.length ?
                data.map((nft, i) =>
                  <tr key={i}>
                    <td className='center'>{list === 'lastSold' ? timeFormat(nft.acceptedAt) : (i + 1)}</td>
                    <td>{amountFormat(nft.amount, { tooltip: 'right' })}</td>
                    {list === 'topSold' && <td className='hide-on-mobile'>{dateFormat(nft.acceptedAt)}</td>}
                    <td>{nft.nftoken?.metadata?.name ? stripText(nft.nftoken.metadata.name) : "---//---"}</td>
                    <td className='center hide-on-mobile'>{nft.nftoken.nftokenTaxon}</td>
                    <td className='center hide-on-mobile'>{nft.nftoken.sequence}</td>
                    <td className='center'><a href={"/explorer/" + nft.nftokenID}><LinkIcon /></a></td>
                    <td className='center hide-on-mobile'><a href={"/explorer/" + nft.acceptedTxHash}><LinkIcon /></a></td>
                    {saleTab !== "primary" && <td className='center hide-on-mobile'>{nftLink(nft, 'seller')}</td>}
                    <td className='center hide-on-mobile'>{nftLink(nft, 'buyer')}</td>
                    <td className='center hide-on-mobile'>{nftLink(nft.nftoken, 'issuer')}</td>
                  </tr>
                )
                :
                <tr><td colSpan="100" className='center orange bold'>{errorMessage}</td></tr>
              }
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
              <Tiles nftList={data} type={list} />
            }
          </>
        }
      </>
    }
  </>;
};

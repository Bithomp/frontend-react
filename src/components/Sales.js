import { useTranslation } from 'react-i18next';
import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import axios from 'axios';

import Tabs from './Tabs';
import Tiles from './Tiles';

import { stripText, onFailedRequest, onApiError, isAddressOrUsername, setTabParams } from '../utils';
import { isValidTaxon } from '../utils/nft';
import { amountFormat, nftLink, timeOrDate, userOrServiceLink, usernameOrAddress } from '../utils/format';

import { ReactComponent as LinkIcon } from "../assets/images/link.svg";

export default function Sales({ list, defaultSaleTab = "all" }) {
  const [data, setData] = useState(null);
  const [searchParams] = useSearchParams();
  const [viewTab, setViewTab] = useState(searchParams.get("view") || "tiles");
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [saleTab, setSaleTab] = useState(searchParams.get("sale") || defaultSaleTab);
  const [issuer, setIssuer] = useState(searchParams.get("issuer") || "");
  const [taxon, setTaxon] = useState(searchParams.get("taxon") || "");
  const [issuerInput, setIssuerInput] = useState(searchParams.get("issuer") || "");
  const [taxonInput, setTaxonInput] = useState(searchParams.get("taxon") || "");
  const [total, setTotal] = useState({});
  const [periodTab, setPeriodTab] = useState(searchParams.get("period") || "all");
  const [currency] = useState(searchParams.get("currency"));
  const [currencyIssuer] = useState(searchParams.get("currencyIssuer"));
  const [pageTab, setPageTab] = useState(searchParams.get("list") || list || "top");

  const { t } = useTranslation();
  const navigate = useNavigate();

  const viewTabList = [
    { value: 'tiles', label: t("tabs.tiles") },
    { value: 'list', label: t("tabs.list") }
  ];

  const saleTabList = [
    { value: 'all', label: t("tabs.all-sales") },
    { value: 'secondary', label: (t("tabs.secondary-sales") + (total?.secondary ? (" (" + total.secondary + ")") : "")) },
    { value: 'primary', label: (t("tabs.primary-sales") + (total?.primary ? (" (" + total.primary + ")") : "")) }
  ];

  const pageTabList = [
    { value: 'top', label: t("tabs.top-sales") },
    { value: 'last', label: t("tabs.latest-sales") }
  ];

  const periodTabList = [
    { value: 'all', label: t("tabs.all-time") },
    //{ value: 'year', label: t("tabs.year") },
    { value: 'month', label: t("tabs.month") },
    { value: 'week', label: t("tabs.week") },
    { value: 'day', label: t("tabs.day") }
  ];

  const checkApi = async () => {
    setData(null);
    setLoading(true);

    let periodUrlPart = '';

    if (periodTab) {
      periodUrlPart = '&period=' + periodTab;
    }

    let collectionUrlPart = '';
    if (issuer) {
      collectionUrlPart = '&issuer=' + issuer;
      if (taxon) {
        collectionUrlPart += '&taxon=' + taxon;
      }
    }

    let loadList = "topSold";
    if (pageTab === 'last') {
      loadList = "lastSold";
    }

    const response = await axios('v2/nft-sales?list=' + loadList + currencyUrlPart() + '&saleType=' + saleTab + collectionUrlPart + periodUrlPart).catch(error => {
      onFailedRequest(error, setErrorMessage);
    });

    const data = response.data;
    setLoading(false);

    if (data) {
      if (data.issuer || data.owner) {
        setTotal(data.total);
      } else {
        setTotal({});
      }

      if (data.issuer) {
        setIssuerInput(data.issuer);
      }

      if (data.sales) {
        setData(data);
        if (data.sales.length > 0) {
          setErrorMessage("");
        } else {
          setErrorMessage(t("general.no-data"));
        }
      } else {
        if (data.error) {
          onApiError(data.error, setErrorMessage);
        } else {
          setErrorMessage("Error");
          console.log(data);
        }
      }
    }
  }

  useEffect(() => {
    checkApi();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saleTab, issuer, taxon, periodTab, pageTab]);

  useEffect(() => {
    if (isAddressOrUsername(data?.issuer)) {
      searchParams.set("issuer", usernameOrAddress(data, 'issuer'));
      if (isValidTaxon(data?.taxon)) {
        searchParams.set("taxon", data.taxon);
      } else {
        searchParams.delete("taxon");
      }
    } else {
      searchParams.delete("issuer");
      searchParams.delete("taxon");
    }

    setTabParams(saleTabList, saleTab, defaultSaleTab, setSaleTab, searchParams, "sale");
    setTabParams(viewTabList, viewTab, "tiles", setViewTab, searchParams, "view");
    setTabParams(periodTabList, periodTab, "all", setPeriodTab, searchParams, "period");
    setTabParams(pageTabList, pageTab, "top", setPageTab, searchParams, "list");

    if (!currency || (currency.toLowerCase() !== 'xrp' && !isAddressOrUsername(currencyIssuer))) {
      searchParams.delete("currency");
      searchParams.delete("currencyIssuer");
    }

    navigate('/nft-sales?' + searchParams.toString(), { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewTab, saleTab, data, periodTab, currency, currencyIssuer, pageTab]);

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

  const issuerTaxonUrlPart = (data && issuer) ? ("&issuer=" + usernameOrAddress(data, 'issuer') + (taxon ? ("&taxon=" + taxon) : "")) : "";

  const currencyUrlPart = () => {
    if (!currency) {
      if (pageTab === 'last') return "";
      if (pageTab === 'top') return "&currency=xrp";
    }

    if (currency.toLowerCase() === 'xrp') {
      return "&currency=xrp";
    } else {
      if (isAddressOrUsername(currencyIssuer)) {
        return '&currency=' + stripText(currency) + "&currencyIssuer=" + stripText(currencyIssuer);
      }
    }
    return "";
  }

  return <>
    <p className='center'><a href={"/nft-explorer?view=" + viewTab + issuerTaxonUrlPart}>{t("menu.nft-explorer")}</a></p>
    <div className='center'>
      <span className='halv'>
        <span className='input-title'>{t("table.issuer")} {userOrServiceLink(data, 'issuer')}</span>
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
    <p className="center" style={{ marginBottom: "20px" }}>
      <input type="button" className="button-action" value={t("button.search")} onClick={searchClick} />
    </p>
    <div className='tabs-inline'>
      <Tabs tabList={pageTabList} tab={pageTab} setTab={setPageTab} name="page" />
      <Tabs tabList={viewTabList} tab={viewTab} setTab={setViewTab} name="view" />
      <Tabs tabList={periodTabList} tab={periodTab} setTab={setPeriodTab} name="period" />
      <Tabs tabList={saleTabList} tab={saleTab} setTab={setSaleTab} name="sale" />
    </div>
    {viewTab === "list" &&
      <table className="table-large">
        <thead>
          <tr>
            <th className='center'>{pageTab === 'last' ? t("table.time") : t("table.index")}</th>
            <th>{t("table.amount")}</th>
            {pageTab === 'top' && <th className='hide-on-mobile'>{t("table.sold")}</th>}
            <th>{t("table.name")}</th>
            <th className='center hide-on-mobile'>{t("table.taxon")}</th>
            <th className='center hide-on-mobile'>{t("table.serial")}</th>
            <th className='center'>NFT</th>
            <th className='hide-on-mobile'>{t("table.transaction")}</th>
            {saleTab !== "primary" && <th className='hide-on-mobile center'>{t("table.seller")}</th>}
            <th className='hide-on-mobile center'>{t("table.buyer")}</th>
            {!issuer && <th className='hide-on-mobile center'>{t("table.issuer")}</th>}
          </tr>
        </thead>
        <tbody>
          {loading ?
            <tr className='center'>
              <td colSpan="100">
                <span className="waiting"></span>
                <br />{t("general.loading")}<br />
              </td>
            </tr>
            :
            <>
              {!errorMessage && data?.sales?.length ?
                data.sales.map((nft, i) =>
                  <tr key={i}>
                    <td className='center'>{pageTab === 'last' ? timeOrDate(nft.acceptedAt) : (i + 1)}</td>
                    <td>{amountFormat(nft.amount, { tooltip: 'right' })}</td>
                    {pageTab === 'top' && <td className='hide-on-mobile'>{timeOrDate(nft.acceptedAt)}</td>}
                    <td>{nft.nftoken?.metadata?.name ? stripText(nft.nftoken.metadata.name) : "---//---"}</td>
                    <td className='center hide-on-mobile'>{nft.nftoken.nftokenTaxon}</td>
                    <td className='center hide-on-mobile'>{nft.nftoken.sequence}</td>
                    <td className='center'><Link to={"/nft/" + nft.nftokenID}><LinkIcon /></Link></td>
                    <td className='center hide-on-mobile'><a href={"/explorer/" + nft.acceptedTxHash}><LinkIcon /></a></td>
                    {saleTab !== "primary" && <td className='center hide-on-mobile'>{nftLink(nft, 'seller')}</td>}
                    <td className='center hide-on-mobile'>{nftLink(nft, 'buyer')}</td>
                    {!issuer && <td className='center hide-on-mobile'>{nftLink(nft.nftoken, 'issuer')}</td>}
                  </tr>
                )
                :
                <tr><td colSpan="100" className='center orange bold'>{errorMessage}</td></tr>
              }
            </>
          }
        </tbody>
      </table>
    }
    {viewTab === "tiles" &&
      <>
        {loading ?
          <div className='center' style={{ marginTop: "20px" }}>
            <span className="waiting"></span>
            <br />{t("general.loading")}
          </div>
          :
          <>
            {errorMessage ?
              <div className='center orange bold'>{errorMessage}</div>
              :
              <Tiles nftList={data?.sales} type={pageTab} />
            }
          </>
        }
      </>
    }
  </>;
};

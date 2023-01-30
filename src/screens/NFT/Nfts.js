import { useTranslation } from 'react-i18next';
import { useState, useEffect } from 'react';
import { useParams, useSearchParams, useLocation, useNavigate, Link } from "react-router-dom";
import { CSVLink } from "react-csv";
import axios from 'axios';
import InfiniteScroll from 'react-infinite-scroll-component';

import SEO from '../../components/SEO';
import SearchBlock from '../../components/SearchBlock';
import Tabs from '../../components/Tabs';
import Tiles from '../../components/Tiles';
import IssuerSelect from '../../components/IssuerSelect';

import { onFailedRequest, onApiError, isAddressOrUsername, setTabParams } from '../../utils';
import { isValidTaxon } from '../../utils/nft';
import { nftLink, usernameOrAddress, userOrServiceLink } from '../../utils/format';

import { ReactComponent as LinkIcon } from "../../assets/images/link.svg";

export default function Nfts() {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [searchParams] = useSearchParams();
  const [data, setData] = useState([]);
  const [rawData, setRawData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState("first");
  const [errorMessage, setErrorMessage] = useState("");
  const [tab, setTab] = useState(searchParams.get("view") || "tiles");
  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [filteredData, setFilteredData] = useState([]);
  const [userData, setUserData] = useState({});
  const [issuersList, setIssuersList] = useState([]);
  const [issuer, setIssuer] = useState(searchParams.get("issuer") || "");
  const [owner, setOwner] = useState(searchParams.get("owner") || "");
  const [taxon, setTaxon] = useState(searchParams.get("taxon") || "");
  const [issuerInput, setIssuerInput] = useState(searchParams.get("issuer") || "");
  const [ownerInput, setOwnerInput] = useState(searchParams.get("owner") || "");
  const [taxonInput, setTaxonInput] = useState(searchParams.get("taxon") || "");

  const nftExplorer = location.pathname.includes("nft-explorer");

  const tabList = [
    { value: 'tiles', label: t("tabs.tiles") },
    { value: 'list', label: t("tabs.list") }
  ];

  const checkApi = async (options) => {
    let marker = hasMore;
    let nftsData = data;
    if (options?.restart) {
      marker = "first";
      setHasMore("first");
      setLoading(true);
      setData([]);
      nftsData = [];
    }

    if (!(isAddressOrUsername(id) || isAddressOrUsername(issuer) || isAddressOrUsername(owner)) || !marker || (marker === "first" && nftsData.length)) {
      return;
    }

    let ownerUrlPart = '';
    let collectionUrlPart = '';
    let markerUrlPart = '';

    if (id || owner) {
      ownerUrlPart = '/' + (id || owner);
      //get issuer list for that owner here when usernames are supported
    }

    if (issuer) {
      collectionUrlPart = '?issuer=' + issuer;
      if (taxon) {
        collectionUrlPart += '&taxon=' + taxon;
      }
      if (marker && marker !== "first") {
        markerUrlPart = "&marker=" + marker;
      }
    } else {
      if (marker && marker !== "first") {
        markerUrlPart = "?marker=" + marker;
      }
    }

    if (marker === "first") {
      setLoading(true);
    }
    const response = await axios('v2/nfts' + ownerUrlPart + collectionUrlPart + markerUrlPart).catch(error => {
      onFailedRequest(error, setErrorMessage);
    });

    setLoading(false);
    const newdata = response?.data;
    if (newdata) {
      setRawData(newdata);
      if (newdata.owner || newdata.issuer) {

        if (newdata.issuer) {
          setIssuerInput(newdata.issuer);
        }

        if (newdata.owner) {
          setOwnerInput(newdata.owner);
          setUserData({
            username: newdata.ownerDetails?.username,
            service: newdata.ownerDetails?.service,
            address: newdata.owner
          });
          //move to earlier when usernames are supported
          const issuersJson = await axios('v2/nft-issuers?owner=' + newdata.owner).catch(error => {
            onFailedRequest(error, (errorText) => { console.log(errorText) });
          });
          if (issuersJson?.data?.issuers) {
            setIssuersList(issuersJson.data.issuers);
          }
        }

        if (newdata.nfts.length > 0) {
          setErrorMessage("");
          if (newdata.marker) {
            setHasMore(newdata.marker);
          } else {
            setHasMore(false);
          }
          setData([...nftsData, ...newdata.nfts]);
        } else {
          if (marker === 'first') {
            setErrorMessage(t("nfts.no-nfts"));
          } else {
            setHasMore(false);
          }
        }
      } else {
        if (newdata.error) {
          onApiError(newdata.error, setErrorMessage);
        } else {
          setErrorMessage("Error");
          console.log(newdata);
        }
      }
    }
  }

  useEffect(() => {
    if (id || issuer || owner) {
      checkApi({ restart: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, issuer, taxon, owner]);

  useEffect(() => {
    if (nftExplorer && isAddressOrUsername(rawData?.owner)) {
      searchParams.set("owner", usernameOrAddress(rawData, 'owner'));
    }

    if (isAddressOrUsername(rawData?.issuer)) {
      searchParams.set("issuer", usernameOrAddress(rawData, 'issuer'));
      if (isValidTaxon(rawData?.taxon)) {
        searchParams.set("taxon", rawData.taxon);
      }
    }

    setTabParams(tabList, tab, "tiles", setTab, searchParams, "view");

    navigate(location.pathname + '?' + searchParams.toString(), { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, rawData]);

  const onSearchChange = (e) => {
    let searchName = e.target.value;
    setSearch(searchName);
    if (searchName) {
      searchParams.set("search", searchName);
    }
    navigate(location.pathname + '?' + searchParams.toString(), { replace: true });
  }

  useEffect(() => {
    if (search) {
      const name = search.toLocaleLowerCase();
      setFilteredData(data.filter(nft => nft.metadata?.name?.toString().toLocaleLowerCase().includes(name)));
    } else {
      setFilteredData(data);
    }
  }, [data, search]);

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
    if (isAddressOrUsername(ownerInput)) {
      setOwner(ownerInput);
    } else {
      setOwnerInput("");
      setOwner("");
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

  const issuerTaxonUrlPart = "?view=" + tab + (rawData ? ("&issuer=" + usernameOrAddress(rawData, 'issuer') + (rawData.taxon ? ("&taxon=" + rawData.taxon) : "")) : "");

  const contextStyle = { minHeight: "480px" };
  if (!nftExplorer) {
    contextStyle.marginTop = "20px";
  }

  /*
  {
    "issuer": "rJxrRzDLjdUiahyLUESuPPR6ucBCUWoMfw",
    "issuerDetails": {
      "username": "3DAPES",
      "service": "3DAPES"
    },
    "nfts": [
      {
        "flags": {
          "burnable": false,
          "onlyXRP": true,
          "trustLine": false,
          "transferable": true
        },
        "issuer": "rJxrRzDLjdUiahyLUESuPPR6ucBCUWoMfw",
        "nftokenID": "000A2134C4E16036D649C037D2DE7C58780DE1D985EEB9860003062600000000",
        "nftokenTaxon": 200637,
        "transferFee": 8500,
        "sequence": 0,
        "owner": "rw5ZYt7SecZ44QLe8Tz6dSYMRuLa8LHv6S",
        "uri": "68747470733A2F2F697066732E696F2F697066732F6261667962656963323779736F376C656C6534786277767464706F6E77716C6C766A68793667717A6C74666E673271357A6869717A61786F7A6B6D2F6D657461646174612E6A736F6E",
        "url": "https://cloudflare-ipfs.com/ipfs/bafybeic27yso7lele4xbwvtdponwqllvjhy6gqzltfng2q5zhiqzaxozkm/metadata.json",
        "nftSerial": 0,
        "issuerDetails": {
          "username": "3DAPES",
          "service": "3DAPES"
        },
        "ownerDetails": {
          "username": null,
          "service": null
        },
        "metadata": {
          "name": "Genesis Mint #001 - αlpha Ωmega"
        }
      },
  */

  let csvHeaders = [
    { label: "NFT ID", key: "nftokenID" },
    { label: t("table.issuer"), key: "issuer" },
    { label: t("table.taxon"), key: "nftokenTaxon" },
    { label: t("table.serial"), key: "sequence" },
    { label: t("table.name"), key: "metadata.name" }
  ];
  if (nftExplorer) {
    csvHeaders.push({ label: t("table.owner"), key: "owner" })
  }

  return <>
    {nftExplorer ?
      <SEO title={t("nft-explorer.header")} />
      :
      <>
        <SEO title={t("nfts.header") + " " + id} />
        <SearchBlock
          searchPlaceholderText={t("explorer.enter-address")}
          tab="nfts"
          userData={userData}
        />
      </>
    }

    <div className="content-text" style={contextStyle}>
      {nftExplorer && <>
        <h2 className='center'>{t("nft-explorer.header") + " "}</h2>
        <p className='center'>
          <a href={"/nft-sales" + issuerTaxonUrlPart} style={{ marginRight: "5px" }}>{t("nft-sales.header")}</a>
        </p>
        <div className='center'>
          <span className='halv'>
            <span className='input-title'>{t("table.issuer")} {userOrServiceLink(rawData, 'issuer')}</span>
            <input
              placeholder={t("nfts.search-by-issuer")}
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
              placeholder={t("nfts.search-by-taxon")}
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
        <div className='center'>
          <span className='halv'>
            <span className='input-title'>{t("table.owner")} {userOrServiceLink(rawData, 'owner')}</span>
            <input
              placeholder={t("nfts.search-by-owner")}
              value={ownerInput}
              onChange={(e) => { setOwnerInput(e.target.value) }}
              onKeyPress={enterPress}
              className="input-text"
              spellCheck="false"
              maxLength="35"
            />
          </span>
          <span className='halv'>
            <span className='input-title'>{t("table.name")}</span>
            <input
              placeholder={t("nfts.search-by-name")}
              value={search}
              onChange={onSearchChange}
              className="input-text"
              spellCheck="false"
              maxLength="18"
              disabled={(id || ownerInput || issuerInput) ? false : true}
            />
          </span>
        </div>
        <p className="center" style={{ marginBottom: "20px" }}>
          <input type="button" className="button-action" value={t("button.search")} onClick={searchClick} />
        </p>
      </>}
      <div className='tabs-inline'>
        <Tabs tabList={tabList} tab={tab} setTab={setTab} />
        {data && data.length > 0 &&
          <CSVLink data={data} headers={csvHeaders} filename='nfts_export.csv' className='button-action thin narrow'>
            ⇩ CSV
          </CSVLink>
        }
      </div>
      {(id || issuer || owner) ?
        <InfiniteScroll
          dataLength={filteredData.length}
          next={checkApi}
          hasMore={hasMore}
          loader={!errorMessage &&
            <p className="center">{t("nfts.load-more")}</p>
          }
          endMessage={<p className="center">{t("nfts.end")}</p>}
        // below props only if you need pull down functionality
        //refreshFunction={this.refresh}
        //pullDownToRefresh
        //pullDownToRefreshThreshold={50}
        //</>pullDownToRefreshContent={
        //  <h3 style={{ textAlign: 'center' }}>&#8595; Pull down to refresh</h3>
        //}
        //releaseToRefreshContent={
        //  <h3 style={{ textAlign: 'center' }}>&#8593; Release to refresh</h3>
        //}
        >
          {!nftExplorer &&
            <div className='center' style={{ marginBottom: "10px" }}>
              <IssuerSelect
                issuersList={issuersList}
                selectedIssuer={issuer}
                setSelectedIssuer={setIssuer}
              />
              <input
                placeholder={t("nfts.search-by-name")}
                value={search}
                onChange={onSearchChange}
                className="input-text halv"
                spellCheck="false"
                maxLength="18"
              />
            </div>
          }

          {tab === "list" &&
            <table className="table-large">
              <thead>
                <tr>
                  <th className='center'>{t("table.index")}</th>
                  <th>{t("table.name")}</th>
                  <th className='center'>{t("table.serial")}</th>
                  {!taxon && <th className='center'>{t("table.taxon")}</th>}
                  <th className='center'>NFT</th>
                  {!issuer && <th className='center'>{t("table.issuer")}</th>}
                  {(!id && !owner) && <th className='center'>{t("table.owner")}</th>}
                </tr>
              </thead>
              <tbody>
                {loading ?
                  <tr className='center'>
                    <td colSpan="100">
                      <span className="waiting"></span>
                      <br />{t("general.loading")}
                    </td>
                  </tr>
                  :
                  <>
                    {!errorMessage ? filteredData.map((nft, i) =>
                      <tr key={nft.nftokenID}>
                        <td className="center">{i + 1}</td>
                        <td>{nft.metadata?.name}</td>
                        <td className='center'>{nft.sequence}</td>
                        {!taxon && <td className='center'>{nft.nftokenTaxon}</td>}
                        <td className='center'><Link to={"/nft/" + nft.nftokenID}><LinkIcon /></Link></td>
                        {!issuer && <td className='center'>{nftLink(nft, 'issuer')}</td>}
                        {(!id && !owner) && <td className='center'>{nftLink(nft, 'owner')}</td>}
                      </tr>)
                      :
                      <tr><td colSpan="100" className='center orange bold'>{errorMessage}</td></tr>
                    }
                  </>
                }
              </tbody>
            </table>
          }
          {tab === "tiles" &&
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
                    <Tiles nftList={filteredData} />
                  }
                </>
              }
            </>
          }
        </InfiniteScroll>
        :
        <>
          {!nftExplorer &&
            <>
              <h2 className='center'>{t("nfts.header")}</h2>
              <p className='center'>
                {t("nfts.desc")}
              </p>
            </>
          }
        </>
      }
    </div>
  </>;
};

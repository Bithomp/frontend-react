import { useTranslation } from 'react-i18next';
import { useState, useEffect } from 'react';
import { useParams, useSearchParams, useLocation } from "react-router-dom";
import axios from 'axios';
import InfiniteScroll from 'react-infinite-scroll-component';

import SEO from '../../components/SEO';
import SearchBlock from '../../components/SearchBlock';
import Tabs from '../../components/Tabs';
import Tiles from '../../components/Tiles';
import IssuerSelect from '../../components/IssuerSelect';

import { onFailedRequest, isAddressOrUsername } from '../../utils';
import { isValidTaxon } from '../../utils/nft';
import { nftLink } from '../../utils/format';

import { ReactComponent as LinkIcon } from "../../assets/images/link.svg";

export default function Nfts() {
  const { t } = useTranslation();
  const { id } = useParams();
  const location = useLocation();

  const [searchParams, setSearchParams] = useSearchParams();
  const [data, setData] = useState([]);
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
      if (newdata.owner || newdata.issuer) {

        if (newdata.owner) {
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

        if (newdata.nfts) {
          setErrorMessage("");
          if (newdata.marker) {
            setHasMore(newdata.marker);
          } else {
            setHasMore(false);
          }
          setData([...nftsData, ...newdata.nfts]);
        } else {
          if (marker === 'first') {
            setErrorMessage(t("explorer.nfts.no-nfts"));
          } else {
            setHasMore(false);
          }
        }
      } else {
        if (newdata.error) {
          setErrorMessage(newdata.error);
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
    const exist = tabList.some(t => t.value === tab);
    if (!exist) {
      setTab("tiles");
      searchParams.delete("view");
    } else if (tab === 'tiles') {
      searchParams.delete("view");
    } else {
      searchParams.set("view", tab);
    }

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

    if (isAddressOrUsername(owner)) {
      searchParams.set("owner", owner);
    } else {
      searchParams.delete("owner");
    }

    setSearchParams(searchParams);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, issuer, taxon, owner]);

  const onSearchChange = (e) => {
    let searchName = e.target.value;
    setSearch(searchName);
    if (searchName) {
      searchParams.set("search", searchName);
    } else {
      searchParams.delete("search");
    }
    setSearchParams(searchParams);
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

  return <>
    {nftExplorer ?
      <SEO title={t("menu.nft-explorer")} />
      :
      <>
        <SEO title={t("menu.nfts") + " " + id} />
        <SearchBlock
          searchPlaceholderText={t("explorer.enter-address")}
          tab="nfts"
          userData={userData}
        />
      </>
    }

    <div className="content-text" style={{ marginTop: "20px", minHeight: "480px" }}>
      {nftExplorer && <>
        <h2 className='center'>{t("menu.nft-explorer")}</h2>
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
        <div className='center'>
          <span className='halv'>
            <span className='input-title'>{t("table.owner")}</span>
            <input
              placeholder={t("explorer.nfts.search-by-owner")}
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
              placeholder={t("explorer.nfts.search-by-name")}
              value={search}
              onChange={onSearchChange}
              className="input-text"
              spellCheck="false"
              maxLength="18"
              disabled={(id || ownerInput || issuerInput) ? false : true}
            />
          </span>
        </div>
        <p className="center" style={{ marginBottom: "40px" }}>
          <input type="button" className="button-action" value={t("button.search")} onClick={searchClick} />
        </p>
      </>}
      {(id || issuer || owner) ?
        <InfiniteScroll
          dataLength={filteredData.length}
          next={checkApi}
          hasMore={hasMore}
          loader={!errorMessage &&
            <p className="center">{t("explorer.nfts.load-more")}</p>
          }
          endMessage={<p className="center">{t("explorer.nfts.end")}</p>}
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
          <Tabs tabList={tabList} tab={tab} setTab={setTab} />
          {!nftExplorer &&
            <div className='center' style={{ marginBottom: "10px" }}>
              <IssuerSelect
                issuersList={issuersList}
                selectedIssuer={issuer}
                setSelectedIssuer={setIssuer}
              />
              <input
                placeholder={t("explorer.nfts.search-by-name")}
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
                  <tr className='center'><td colSpan="100"><span className="waiting"></span></td></tr>
                  :
                  <>
                    {!errorMessage ? filteredData.map((nft, i) =>
                      <tr key={nft.nftokenID}>
                        <td className="center">{i + 1}</td>
                        <td>{nft.metadata?.name}</td>
                        <td className='center'>{nft.sequence}</td>
                        {!taxon && <td className='center'>{nft.nftokenTaxon}</td>}
                        <td className='center'><a href={"/explorer/" + nft.nftokenID}><LinkIcon /></a></td>
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
                <div className='center' style={{ marginTop: "20px" }}><span className="waiting"></span></div>
                :
                <>
                  {errorMessage ?
                    <div className='center'>{errorMessage}</div>
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
              <h2 className='center'>{t("menu.nfts")}</h2>
              <p className='center'>
                {t("explorer.nfts.desc")}
              </p>
            </>
          }
        </>
      }
    </div>
  </>;
};

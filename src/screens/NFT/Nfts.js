import { useTranslation } from 'react-i18next';
import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from "react-router-dom";
import axios from 'axios';
import InfiniteScroll from 'react-infinite-scroll-component';

import SEO from '../../components/SEO';
import SearchBlock from '../../components/SearchBlock';
import Tabs from '../../components/Tabs';
import Tiles from '../../components/Tiles';

import { onFailedRequest, isAddressOrUsername } from '../../utils';

import { ReactComponent as LinkIcon } from "../../assets/images/link.svg";

export default function Nfts() {
  const { t } = useTranslation();
  const { id } = useParams();

  const [searchParams, setSearchParams] = useSearchParams();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState("first");
  const [errorMessage, setErrorMessage] = useState("");
  const [tab, setTab] = useState(searchParams.get("view") || "tiles");
  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [filteredData, setFilteredData] = useState([]);
  const [userData, setUserData] = useState({});
  const [issuer] = useState(searchParams.get("issuer") || "");
  const [taxon] = useState(searchParams.get("taxon") || "");

  const tabList = [
    { value: 'tiles', label: t("tabs.tiles") },
    { value: 'list', label: t("tabs.list") }
  ];

  const checkApi = async () => {
    if (!(isAddressOrUsername(id) || isAddressOrUsername(issuer)) || !hasMore || (hasMore === "first" && data.length)) {
      return;
    }

    let ownerUrlPart = '';
    let collectionUrlPart = '';
    let markerUrlPart = '';

    if (id) {
      ownerUrlPart = '/' + id;
    }

    if (issuer) {
      collectionUrlPart = '?issuer=' + issuer;
      if (taxon) {
        collectionUrlPart += '&taxon=' + taxon;
      }
      if (hasMore && hasMore !== "first") {
        markerUrlPart = "&marker=" + hasMore;
      }
    } else {
      if (hasMore && hasMore !== "first") {
        markerUrlPart = "?marker=" + hasMore;
      }
    }

    const response = await axios('v2/nfts' + ownerUrlPart + collectionUrlPart + markerUrlPart).catch(error => {
      onFailedRequest(error, setErrorMessage);
      setLoading(false);
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
        }

        if (newdata.nfts) {
          setErrorMessage("");
          if (newdata.marker) {
            setHasMore(newdata.marker);
          } else {
            setHasMore(false);
          }
          setData([...data, ...newdata.nfts]);
        } else {
          if (hasMore === 'first') {
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
    checkApi();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

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
    setSearchParams(searchParams);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

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

  return <>
    <SEO title={t("menu.nfts") + " " + id} />
    <SearchBlock
      searchPlaceholderText={t("explorer.enter-address")}
      tab="nfts"
      userData={userData}
    />
    <div className="content-text" style={{ marginTop: "20px" }}>
      {(id || issuer) ?
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
          <div className='center' style={{ marginBottom: "10px" }}>
            <input placeholder={t("explorer.nfts.search-by-name")} value={search} onChange={onSearchChange} className="input-text" spellCheck="false" maxLength="18" />
          </div>
          {tab === "list" &&
            <table className="table-large">
              <thead>
                <tr>
                  <th className='center'>{t("table.index")}</th>
                  <th>{t("table.name")}</th>
                  <th className='center'>{t("table.serial")}</th>
                  <th className='center'>{t("table.taxon")}</th>
                  <th className='center'>NFT</th>
                  <th className='center'>{t("table.issuer")}</th>
                </tr>
              </thead>
              <tbody>
                {loading ?
                  <tr className='center'><td colSpan="5"><span className="waiting"></span></td></tr>
                  :
                  <>
                    {!errorMessage ? filteredData.map((nft, i) =>
                      <tr key={nft.nftokenID}>
                        <td className="center">{i + 1}</td>
                        <td>{nft.metadata?.name}</td>
                        <td className='center'>{nft.sequence}</td>
                        <td className='center'>{nft.nftokenTaxon}</td>
                        <td className='center'><a href={"/explorer/" + nft.nftokenID}><LinkIcon /></a></td>
                        <td className='center'><a href={"/explorer/" + nft.issuer}><LinkIcon /></a></td>
                      </tr>) : <tr><td colSpan="5" className='center orange bold'>{errorMessage}</td></tr>
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
          <h2 className='center'>{t("menu.nfts")}</h2>
          <p className='center'>
            {t("explorer.nfts.desc")}
          </p>
        </>
      }
    </div>
  </>;
};

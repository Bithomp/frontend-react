import { useTranslation } from 'react-i18next';
import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from "react-router-dom";
import axios from 'axios';
import InfiniteScroll from 'react-infinite-scroll-component';

import SEO from '../../components/SEO';
import SearchBlock from '../../components/SearchBlock';
import Tabs from '../../components/Tabs';
import Tiles from '../../components/Tiles';

import { onFailedRequest } from '../../utils';

import { ReactComponent as LinkIcon } from "../../assets/images/link.svg";

export default function Nfts() {
  const { t } = useTranslation();
  const { address } = useParams();

  const [searchParams, setSearchParams] = useSearchParams();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState("first");
  const [errorMessage, setErrorMessage] = useState("");
  const [searchItem, setSearchItem] = useState(address || "");
  const [tab, setTab] = useState(searchParams.get("view") || "tiles");
  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [filteredData, setFilteredData] = useState([]);
  const [userData, setUserData] = useState({});

  const tabList = [
    { value: 'tiles', label: t("tabs.tiles") },
    { value: 'list', label: t("tabs.list") }
  ];

  const checkApi = async () => {
    if (!address || !hasMore || (hasMore === "first" && data.length)) {
      return;
    }

    let addParams = "";
    if (hasMore === "first") {
      //check username and service name on the first run
      addParams = "username=true&service=true&";
    }

    const response = await axios('v2/address/' + address + '?' + addParams + 'nfts=true' + (hasMore !== "first" ? ("&nfts[marker]=" + hasMore) : "")).catch(error => {
      onFailedRequest(error, setErrorMessage);
      setLoading(false);
    });
    setLoading(false);
    const newdata = response?.data;
    if (newdata) {
      if (newdata.address) {
        setUserData({
          username: newdata.username,
          service: newdata.service
        });

        if (newdata.nfts) {
          setErrorMessage("");
          if (newdata.markers?.nfts) {
            setHasMore(newdata.markers.nfts);
          } else {
            setHasMore(false);
          }
          setData([...data, ...newdata.nfts]);
        } else {
          setErrorMessage(t("explorer.nfts.no-nfts"));
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

  /*
  {
    "address": "r9spUPhPBfB6kQeF6vPhwmtFwRhBh2JUCG",
    "nfts": [
      {
        "flags": {
          "burnable": false,
          "onlyXRP": false,
          "trustLine": false,
          "transferable": true
        },
        "issuer": "r9spUPhPBfB6kQeF6vPhwmtFwRhBh2JUCG",
        "nftokenID": "000800005822D634B22590727E3CB2431F03C3B8B041528316E72FD300000001",
        "nftokenTaxon": 193871,
        "transferFee": null,
        "uri": "68747470733A2F2F697066732E696F2F697066732F6261667962656964727274376C6C796A6232717167337533376F61676E77726D707779756F686C74373637676B6E7635707966796A3668706F68342F6D657461646174612E6A736F6E",
        "url": "https://cloudflare-ipfs.com/ipfs/bafybeidrrt7llyjb2qqg3u37oagnwrmpwyuohlt767gknv5pyfyj6hpoh4/metadata.json",
        "nftSerial": 1,
        "metadata": {
          "name": "Pirate Edition",
          "description": "-Sanctum NFTs 007-\n\n&quot;The discovery of treasure in the land of Atlantis.&quot;",
          "external_url": "https://address.com/nfts",
          "attributes": [
            {
              "trait_type": "skin",
              "value": "PIRATES SKIN"
            }
          ],
          "category": "collectibles",
          "image_url": "ipfs://ipfs/bafybeievxhvot3tikwz4vupfkzmlybh6rzpwsz4gkscc7obc6dkbyhrvqe/image.jpeg",
          "animation_url": "ipfs://ipfs/bafybeievxhvot3tikwz4vupfkzmlybh6rzpwsz4gkscc7obc6dkbyhrvqe/animation.jpeg"
        }
      }
    ]
  }
  */

  useEffect(() => {
    checkApi();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address]);

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
    let searchItem = e.target.value;
    setSearch(searchItem);
    if (searchItem) {
      searchParams.set("search", searchItem);
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
    <SEO title={t("menu.nfts") + " " + address} />
    <SearchBlock
      searchPlaceholderText={t("explorer.nfts.enter-address")}
      setSearchItem={setSearchItem}
      searchItem={searchItem}
      tab="nfts"
      userData={userData}
    />
    <div className="content-text" style={{ marginTop: "20px" }}>
      {address ?
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
                        <td className='center'>{nft.nftSerial}</td>
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

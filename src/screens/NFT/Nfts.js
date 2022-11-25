import { useTranslation } from 'react-i18next';
import { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import InfiniteScroll from 'react-infinite-scroll-component';

import { title, onFailedRequest } from '../../utils';

import search from "../../assets/images/search.svg";
import { ReactComponent as LinkIcon } from "../../assets/images/link.svg";

import Tabs from '../../components/Tabs';
import Tiles from '../../components/Tiles';

export default function Nfts() {
  const { t } = useTranslation();
  const { address } = useParams();
  const navigate = useNavigate();

  const [searchParams, setSearchParams] = useSearchParams();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState("first");
  const [errorMessage, setErrorMessage] = useState("");
  const [searchItem, setSearchItem] = useState("");
  const [tab, setTab] = useState("list");

  const tabList = [
    { value: 'list', label: t("tabs.list") },
    { value: 'tiles', label: t("tabs.tiles") }
  ];

  const checkApi = async () => {
    if (!address || !hasMore || (hasMore === "first" && data.length)) {
      return;
    }

    const response = await axios('v2/address/' + address + '?nfts=true' + (hasMore !== "first" ? ("&nfts[marker]=" + hasMore) : "")).catch(error => {
      onFailedRequest(error, setErrorMessage);
      setLoading(false);
    });
    setLoading(false);
    const newdata = response?.data;
    if (newdata) {
      if (newdata.address) {
        if (newdata.nfts) {
          setErrorMessage("");
          if (newdata.markers?.nfts) {
            setHasMore(newdata.markers.nfts);
          } else {
            setHasMore(false);
          }
          setData([...data, ...newdata.nfts]);
        } else {
          setErrorMessage(t("nfts.no-nfts"));
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

  const searchItemType = e => {
    if (e.key === 'Enter') {
      searchClick(searchItem);
    }

    //if (!searchItemRe.test(e.key)) {
    //  e.preventDefault();
    //}
  }

  const validateSearchItem = e => {
    let item = e.target.value;
    item = item.trim();
    //if (searchItemRe.test(item)) {
    setSearchItem(item);
    //} else {
    //  setSearchItem("");
    //}
  }

  const searchClick = item => {
    const searchItem = item.trim();
    if (searchItem) {
      navigate("/nfts/" + encodeURI(searchItem));
      //window.location.replace('/explorer/' + encodeURI(searchItem));
    }
  };

  useEffect(() => {
    checkApi();
    title(t("menu.nfts") + " " + address);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address]);

  useEffect(() => {
    const view = searchParams.get("view");
    if (view) {
      const found = tabList.some(tab => tab.value === view);
      if (found) {
        setTab(view);
      } else {
        searchParams.delete("view");
        setSearchParams(searchParams);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (tab === 'list') {
      searchParams.delete("view");
    } else {
      searchParams.set("view", tab);
    }
    setSearchParams(searchParams);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  return <>
    <div className="content-text">
      {address ?
        <InfiniteScroll
          dataLength={data.length}
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
          <h2 className="center">{t("nfts.owned-by")}</h2>
          <h5 className="center">{address ? address : " "}</h5>
          <Tabs tabList={tabList} tab={tab} setTab={setTab} />
          {tab === "list" &&
            <table className="table-large">
              <thead>
                <tr>
                  <th>{t("table.index")}</th>
                  <th>{t("table.name")}</th>
                  <th>{t("table.serial")}</th>
                  <th>NFT</th>
                  <th>{t("table.issuer")}</th>
                </tr>
              </thead>
              <tbody>
                {loading ?
                  <tr className='center'><td colSpan="5"><span className="waiting"></span></td></tr>
                  :
                  <>
                    {!errorMessage ? data.map((nft, i) =>
                      <tr key={nft.nftokenID}>
                        <td className="center">{i + 1}</td>
                        <td>{nft.metadata?.name}</td>
                        <td>{nft.nftSerial}</td>
                        <td className='center'><a href={"/explorer/" + nft.nftokenID}><LinkIcon /></a></td>
                        <td className='center'><a href={"/explorer/" + nft.issuer}><LinkIcon /></a></td>
                      </tr>) : <tr className='center'><td colSpan="5">{errorMessage}</td></tr>
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
                    <Tiles nftList={data} />
                  }
                </>
              }
            </>
          }
        </InfiniteScroll>
        :
        <div className='center'>
          <h2>{t("menu.nfts")}</h2>
          <div className="search-box" style={{ marginTop: "10px" }}>
            <input
              className="search-input"
              placeholder={t("nfts.enter-address")}
              value={searchItem}
              onKeyPress={searchItemType}
              onChange={validateSearchItem}
            />
            <div className="search-button" onClick={() => searchClick(searchItem)}>
              <img src={search} className="search-icon" alt="search" />
            </div>
          </div>
        </div>
      }
    </div>
  </>;
};

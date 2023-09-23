import { useTranslation } from 'next-i18next'
import { useState, useEffect } from 'react'
import axios from 'axios'
import Select from "react-select"
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import Image from 'next/image'
import Link from 'next/link'

import { stripText, server, decode } from '../../utils'
import { convertedAmount } from '../../utils/format'
import { getIsSsrMobile } from "../../utils/mobile"
import { nftName, mpUrl, bestSellOffer, nftUrl } from '../../utils/nft'
import {
  shortHash,
  trWithAccount,
  trWithFlags,
  fullDateAndTime,
  amountFormat,
  expirationExpired,
  nftOfferLink,
  codeHighlight,
  trStatus,
  cancelNftOfferButton,
  acceptNftSellOfferButton
} from '../../utils/format'

import SocialShare from '../../components/SocialShare'

export async function getServerSideProps(context) {
  const { locale, query, req } = context
  let pageMeta = null
  const { sortCurrency, id } = query
  //keep it from query instead of params, anyway it is an array sometimes in params too.
  const nftId = id ? (Array.isArray(id) ? id[0] : id) : ""
  if (nftId) {
    let headers = null
    if (process.env.NODE_ENV !== 'development') {
      //otherwise can not verify ssl serts
      headers = req.headers
    }
    try {
      const res = await axios({
        method: 'get',
        url: server + '/api/cors/v2/nft/' + nftId + '?uri=true&metadata=true',
        headers
      })
      pageMeta = res?.data
    } catch (error) {
      console.error(error)
    }
  }

  return {
    props: {
      id: nftId,
      isSsrMobile: getIsSsrMobile(context),
      pageMeta,
      sortCurrency: sortCurrency || "",
      ...(await serverSideTranslations(locale, ['common']))
    }
  }
}

import SEO from '../../components/SEO'
import SearchBlock from '../../components/Layout/SearchBlock'
import CopyButton from '../../components/UI/CopyButton'
import NftPreview from '../../components/NftPreview'

import LinkIcon from "../../public/images/link.svg"
const xummImg = "/images/xumm.png"

export default function Nft({ setSignRequest, account, signRequest, pageMeta, id, selectedCurrency, sortCurrency }) {
  const { t } = useTranslation()

  const [rendered, setRendered] = useState(false)
  const [data, setData] = useState({})
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")
  const [showRawMetadata, setShowRawMetadata] = useState(false)

  const [sellOffersFilter, setSellOffersFilter] = useState('active-valid')
  const [buyOffersFilter, setBuyOffersFilter] = useState('active-valid')
  const [filteredSellOffers, setFilteredSellOffers] = useState([])
  const [filteredBuyOffers, setFilteredBuyOffers] = useState([])
  const [countBuyOffers, setCountBuyOffers] = useState(null)
  const [countSellOffers, setCountSellOffers] = useState(null)

  const convertCurrency = sortCurrency || selectedCurrency

  useEffect(() => {
    setRendered(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const checkApi = async (opts) => {
    if (!id) return
    setLoading(true)

    let noCache = ""
    if (opts?.noCache) {
      noCache = "&timestamp=" + Date.now()
    }

    const response = await axios(
      '/v2/nft/' + id
      + '?uri=true&metadata=true&history=true&sellOffers=true&buyOffers=true&offersValidate=true&offersHistory=true'
      + noCache + '&convertCurrencies=' + convertCurrency
    ).catch(error => {
      setErrorMessage(t("error." + error.message))
    })
    setLoading(false)
    let newdata = response?.data
    if (newdata) {
      if (newdata.flags) {
        newdata.history = newdata.history.sort((a, b) => (a.changedAt < b.changedAt) ? 1 : -1);
        if (newdata.sellOffers) {
          newdata.sellOffers = newdata.sellOffers.sort((a, b) => (a.createdAt < b.createdAt) ? 1 : -1);
        }
        if (newdata.buyOffers) {
          newdata.buyOffers = newdata.buyOffers.sort((a, b) => (a.createdAt < b.createdAt) ? 1 : -1);
        }
        setData(newdata);
        countOffersByFilters(newdata.sellOffers, setCountSellOffers);
        countOffersByFilters(newdata.buyOffers, setCountBuyOffers);
      } else {
        if (newdata.error) {
          setErrorMessage(t("error-api." + newdata.error))
        } else {
          setErrorMessage("Error");
          console.log(newdata);
        }
      }
    }
  }

  const countOffersByFilters = (offers, setCount) => {
    let count = {
      all: 0,
      active: 0,
      "active-valid": 0,
      "active-invalid": 0,
      "historical": 0
    }
    if (offers && offers.length > 0) {
      for (let i = 0; i < offers.length; i++) {
        count.all++;
        if (offers[i].valid || offers[i].valid === false) {
          count.active++;
          if (offers[i].valid) {
            count["active-valid"]++;
          } else {
            count["active-invalid"]++;
          }
        } else {
          count.historical++;
        }
      }
    }
    setCount(count);
  }

  /*
    {
      "flags": {
        "burnable":false,
        "onlyXRP":false,
        "trustLine":false,
        "transferable":true
      },
      "issuer":"r9spUPhPBfB6kQeF6vPhwmtFwRhBh2JUCG",
      "nftokenID":"000800005822D634B22590727E3CB2431F03C3B8B041528316E72FD300000001",
      "nftokenTaxon":193871,
      "transferFee":0,
      "sequence":1,
      "owner":"r9spUPhPBfB6kQeF6vPhwmtFwRhBh2JUCG",
      "uri":"68747470733A2F2F697066732E696F2F697066732F6261667962656964727274376C6C796A6232717167337533376F61676E77726D707779756F686C74373637676B6E7635707966796A3668706F68342F6D657461646174612E6A736F6E",
      "issuedAt":1667328041,
      "ownerChangedAt":1667328041,
      "deletedAt":null,
      "url":"https://cloudflare-ipfs.com/ipfs/bafybeidrrt7llyjb2qqg3u37oagnwrmpwyuohlt767gknv5pyfyj6hpoh4/metadata.json",
      "metadata":{
        "name":"Pirate Edition",
        "description":"-Sanctum NFTs 007-\n\n&quot;The discovery of treasure in the land of Atlantis.&quot;",
        "external_url":"https://www.xsanctumchain.com/nfts",
        "attributes":[
          {
            "trait_type":"skin",
            "value":"PIRATES SKIN"
          }
        ],
        "category":"collectibles",
        "md5hash":"3c18d8be15e2fa09879dfcf9ab7050d5",
        "is_explicit":false,
        "content_type":"image/jpeg",
        "image_url":"ipfs://ipfs/bafybeievxhvot3tikwz4vupfkzmlybh6rzpwsz4gkscc7obc6dkbyhrvqe/image.jpeg",
        "animation_url":"ipfs://ipfs/bafybeievxhvot3tikwz4vupfkzmlybh6rzpwsz4gkscc7obc6dkbyhrvqe/animation.jpeg"
      },
      "history":[
        {
          "owner":"r9spUPhPBfB6kQeF6vPhwmtFwRhBh2JUCG",
          "changedAt":1667328041,
          "ledgerIndex":75463709,
          "txHash":"5F0162B9FB19F2D88F5EC38AEA9984B0BAD11E1CD960B135F4BA128BF980AA4D"
        }
      ],
      "sellOffers":[],
      "buyOffers":null
    }
  */

  useEffect(() => {
    if (!convertCurrency) return;
    if (!signRequest) {
      if (!data?.nftokenID) {
        // no token - first time fetching - allow right away
        checkApi()
      } else {
        checkApi({ noCache: true })
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, signRequest, convertCurrency])

  const externalUrl = (meta) => {
    let url = meta.external_url || meta.external_link || meta.externalUrl || meta.externalURL || (meta.minter?.includes("https://") && meta.minter);
    if (url) {
      url = stripText(url);
      if (url.toLowerCase().slice(0, 8) !== 'https://' && url.slice(0, 7).toLowerCase() !== 'http://') {
        url = 'https://' + url;
      }
      return <a href={url} target="_blank" rel="noreferrer nofollow">{url}</a>;
    }
    return null;
  }

  const eventType = event => {
    if (event.owner) {
      if (event.amount === "0") {
        return t("table.transferred")
      } else if (event.amount) {
        return t("table.sold")
      } else {
        return t("table.minted")
      }
    } else {
      return <span className="red">{t("table.burned")}</span>
    }
  }

  const marketPlaceUsage = event => {
    if (event.amount) {
      return t("table.sold-on")
    } else {
      return t("table.minted-on")
    }
  }

  const ownerName = (nftEvent) => {
    if (nftEvent.owner) {
      if (nftEvent.amount === "0") {
        return t("table.receiver");
      } else if (nftEvent.amount) {
        return t("table.buyer");
      } else {
        return t("table.minter");
      }
    }
  }

  const nftHistory = (history) => {
    /*
      "history": [
        {
          "owner": "rJcEbVWJ7xFjL8J9LsbxBMVSRY2C7DU7rz",
          "changedAt": 1653941441,
          "ledgerIndex": 2577883,
          "txHash": "28261C06ECF7B0E8F5843213122DB62A4B8064C22AD5D947A97AF0F1E604123D"
        }
      ],
    */
    if (history) {
      return history.map((nftEvent, i) =>
        <tbody key={i}>
          <tr>
            <td className='bold'>{eventType(nftEvent)}</td>
            <td>{rendered && fullDateAndTime(nftEvent.changedAt)} <a href={"/explorer/" + nftEvent.txHash}><LinkIcon /></a></td>
          </tr>
          {(nftEvent.amount && nftEvent.amount !== "0") &&
            <tr>
              <td>{t("table.price")}</td>
              <td>
                {amountFormat(nftEvent.amount, { tooltip: "right" })}
                {nftEvent.amountInConvertCurrencies[convertCurrency] &&
                  <> (≈ {convertedAmount(nftEvent, convertCurrency)})</>
                }
              </td>
            </tr>
          }
          {trWithAccount(nftEvent, 'owner', ownerName(nftEvent), "/explorer/", "owner")}
          {nftEvent.marketplace &&
            <tr>
              <td>{marketPlaceUsage(nftEvent)}</td>
              <td>{nftEvent.marketplace}</td>
            </tr>
          }
          {i !== history.length - 1 &&
            <tr><td colSpan="100"><hr /></td></tr>
          }
        </tbody>
      );
    }
  }

  const nftOffers = (offers, type) => {
    if (type !== 'sell' && type !== 'buy') {
      return <tbody><tr><td colSpan="100">Error, no offer type</td></tr></tbody>
    }
    /*
      {
        "amount": "1000000000",
        "offerIndex": "D9C7F16C02CEBFF5D4D17F891503253AE6485F6863DEC25D2B095B919D478E06",
        "owner": "rsr1kvnWTNNxaX24Ny2ccE3onPMukiEHY3",
        "expiration": null,
        "destination": null,
        "createdLedgerIndex": 75640602,
        "createdTxHash": "AF8A46B6C49DAF95B44BC34B8961D19B19B5D5C52071BEA3CF0DEE038BFCDEC1",
        "createdAt": 1667249811,
        "valid": true
      }
    */

    const buyerOrSeller = type === 'sell' ? t("table.seller") : t("table.buyer")

    if (offers.length > 0) {
      return offers.map((offer, i) =>
        <tbody key={i}>
          {trStatus(t, offer)}
          {trWithAccount(offer, 'owner', buyerOrSeller, "/explorer/", "nft-seller")}
          <tr>
            <td>{t("table.amount")}</td>
            <td>{amountFormat(offer.amount, { tooltip: "right" })}</td>
          </tr>
          {offer.createdAt &&
            <tr>
              <td>{t("table.placed")}</td>
              <td>{fullDateAndTime(offer.createdAt)} <a href={"/explorer/" + offer.createdTxHash}><LinkIcon /></a></td>
            </tr>
          }
          {offer.acceptedAt &&
            <tr>
              <td>{t("table.accepted")}</td>
              <td>{fullDateAndTime(offer.acceptedAt)} <a href={"/explorer/" + offer.acceptedTxHash}><LinkIcon /></a></td>
            </tr>
          }
          {offer.canceledAt &&
            <tr>
              <td>{t("table.canceled")}</td>
              <td>{fullDateAndTime(offer.canceledAt)} <a href={"/explorer/" + offer.canceledTxHash}><LinkIcon /></a></td>
            </tr>
          }
          {offer.expiration &&
            <tr>
              <td>{expirationExpired(t, offer.expiration)}</td>
              <td>{fullDateAndTime(offer.expiration, "expiration")}</td>
            </tr>
          }
          {offer.destination &&
            trWithAccount(offer, 'destination', t("table.destination"), "/explorer/", "destination")
          }
          <tr>
            <td>{t("table.offer")}</td>
            <td>{nftOfferLink(offer.offerIndex)}</td>
          </tr>
          {(offer.destination && account?.address && account.address === offer.destination && offer.valid && type === 'sell') &&
            <tr>
              <td colSpan="2">
                {acceptNftSellOfferButton(t, setSignRequest, offer)}
              </td>
            </tr>
          }
          {
            !offer.canceledAt && !offer.acceptedAt &&
            (
              (account?.address && offer.owner && account.address === offer.owner)
              || offer.validationErrors?.includes('Offer is expired')
              || (account?.address && offer.destination === account.address)
            ) &&
            <tr>
              <td colSpan="2">
                {cancelNftOfferButton(t, setSignRequest, account.address, offer, type)}
              </td>
            </tr>
          }
          {i !== offers.length - 1 &&
            <tr><td colSpan="100"><hr /></td></tr>
          }
        </tbody>
      )
    } else {
      return <tbody>
        <tr><td colSpan="100">{t("table.text.no-offers")}</td></tr>
      </tbody>
    }
  }

  const offerHistoryFilters = (type, defaultOption = false) => {
    let countOffers = {
      buy: countBuyOffers,
      sell: countSellOffers
    }
    if (defaultOption) {
      return { value: 'active-valid', label: t("table.filter.valid") + ' (' + countOffers[type]["active-valid"] + ')' };
    }

    let options = [
      { value: 'active-valid', label: t("table.filter.valid") + ' (' + countOffers[type]["active-valid"] + ')' }
    ];

    if (countOffers[type]["active-invalid"] > 0) {
      options.push({ value: 'active-invalid', label: t("table.filter.invalid") + ' (' + countOffers[type]["active-invalid"] + ')' });
    }

    if (countOffers[type].active > 0 && countOffers[type].active !== countOffers[type]["active-valid"] && countOffers[type].active !== countOffers[type]["active-invalid"]) {
      options.push({ value: 'active', label: t("table.filter.active") + ' (' + countOffers[type].active + ')' });
    }

    if (countOffers[type].historical > 0) {
      options.push({ value: 'historical', label: t("table.filter.historical") + ' (' + countOffers[type].historical + ')' });
    }

    if (countOffers[type].all !== countOffers[type]["active-valid"] && countOffers[type].all !== countOffers[type]["active-invalid"] && countOffers[type].all !== countOffers[type].active && countOffers[type].all !== countOffers[type].historical) {
      options.push({ value: 'all', label: t("table.filter.all") + ' (' + countOffers[type].all + ')' });
    }

    return options;
  }

  const filterOffers = (unfilteredOffers, filter, setFilteredOffers) => {
    if (!unfilteredOffers) {
      setFilteredOffers([]);
      return;
    };
    if (filter === 'all') {
      setFilteredOffers(unfilteredOffers);
    } else if (filter === 'historical') {
      setFilteredOffers(unfilteredOffers.filter(function (offer) { return (offer.canceledAt || offer.acceptedAt); }));
    } else if (filter === 'active') {
      setFilteredOffers(unfilteredOffers.filter(function (offer) { return (offer.valid || offer.valid === false); }));
    } else if (filter === 'active-valid') {
      setFilteredOffers(unfilteredOffers.filter(function (offer) { return offer.valid; }));
    } else if (filter === 'active-invalid') {
      setFilteredOffers(unfilteredOffers.filter(function (offer) { return offer.valid === false; }));
    }
  }

  useEffect(() => {
    if (!data || !buyOffersFilter) return;
    filterOffers(data.buyOffers, buyOffersFilter, setFilteredBuyOffers);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, buyOffersFilter]);

  useEffect(() => {
    if (!data || !sellOffersFilter) return;
    filterOffers(data.sellOffers, sellOffersFilter, setFilteredSellOffers);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, sellOffersFilter]);

  const offersFilter = (type) => {
    let offersCount = countSellOffers;
    let setFilter = setSellOffersFilter;
    if (type === 'buy') {
      setFilter = setBuyOffersFilter;
      offersCount = countBuyOffers;
    }
    //dont show if there is no offers, or when all offers are valid
    if (offersCount.all === 0 || offersCount["active-valid"] === offersCount.all) {
      return <></>;
    }
    return <Select
      options={offerHistoryFilters(type)}
      defaultValue={offerHistoryFilters(type, true)}
      onChange={(value) => setFilter(value.value)}
      isSearchable={false}
      className="offer-history-filter-select"
      classNamePrefix="react-select"
      instanceId={"offer-history-filter-select-" + type}
    />
  }

  const buyButton = sellOffers => {
    if (!sellOffers) return ""
    sellOffers = sellOffers.filter(function (offer) { return offer.valid; })
    //best xrp offer available or an IOU offer, if it's only one IOU offer available
    //we should get the best IOU offer too... and show both XRP and IOU
    let best = bestSellOffer(sellOffers, account?.address)
    if (!best) return ""

    if (data?.owner && account?.address && account.address === data.owner) {
      return <>
        {cancelNftOfferButton(t, setSignRequest, data.owner, best, "sell")}
        <br /><br />
      </>
    }

    if (mpUrl(best)) {
      return <>
        <a className='button-action wide center' href={mpUrl(best)} target="_blank" rel="noreferrer">
          {t("nft.buy-for-amount-on", { amount: amountFormat(best.amount), service: best.destinationDetails.service })}
        </a>
        <br /><br />
      </>
    }

    return <>
      {acceptNftSellOfferButton(t, setSignRequest, best)}
      <br /><br />
    </>
  }

  const makeOfferButton = sellOffers => {
    //if removed do not offer to add an offer
    // if not transferable, do not show button to create offers
    if (!id || data.deletedAt || !data.flags.transferable) return ""
    //if signed in and user is the nft's owner -> make a sell offer, otherwise make a buy offer (no flag)
    const sell = data?.owner && account?.address && account.address === data.owner

    let request = {
      "TransactionType": "NFTokenCreateOffer",
      "Account": data.owner,
      "NFTokenID": id
    }

    if (sell) {
      if (sellOffers) {
        sellOffers = sellOffers.filter(function (offer) { return offer.valid })
        // do not show "make sell offer" button, when there are active valid sell offers
        if (sellOffers.length) return ""
      }
      request.Flags = 1
    } else {
      request.Owner = data.owner
    }

    return <>
      <button
        className='button-action wide center'
        onClick={() => setSignRequest({
          wallet: "xumm",
          request
        })}
      >
        <Image src={xummImg} className='xumm-logo' alt="xumm" height={24} width={24} />
        {sell ? t("nft.list-for-sale") : t("nft.make-offer")}
      </button>
      <br /><br />
    </>
  }

  const burnButton = () => {
    if (!id || data.deletedAt) return "" //if it is already burned do not offer to burn

    //if not signed, or signed but not an owner - do not show burn button 
    // may we should show it for burnable nfts (with a flag) for the minters also? ! 
    if (!(data?.owner && account?.address && account.address === data.owner)) return ""

    let request = {
      "TransactionType": "NFTokenBurn",
      "Account": data.owner,
      "NFTokenID": id
    }

    return <>
      <button
        className='button-action wide center'
        onClick={() => setSignRequest({
          wallet: "xumm",
          request
        })}
      >
        <Image src={xummImg} className='xumm-logo' alt="xumm" height={24} width={24} />
        {t("nft.burn")} ️‍🔥
      </button>
      <br /><br />
    </>
  }

  const imageUrl = nftUrl(pageMeta, 'image')

  return <>
    <SEO
      page="NFT"
      title={pageMeta?.metadata?.name || pageMeta?.nftokenID || "NFT"}
      description={pageMeta?.metadata?.description || (!pageMeta?.nftokenID ? t("nft.desc") : "")}
      image={{ file: imageUrl }}
    />
    <SearchBlock
      searchPlaceholderText={t("nft.enter-nft-id")}
      tab="nft"
    />
    <div className="content-center short-top nft">
      {id ? <>
        {loading ?
          <div className='center' style={{ marginTop: "80px" }}>
            <span className="waiting"></span>
            <br />{t("general.loading")}
          </div>
          :
          <>
            {errorMessage ?
              <div className='center orange bold'>{errorMessage}</div>
              :
              <>{data.flags &&
                <>
                  <div className="column-left">
                    <NftPreview nft={data} />
                    {buyButton(data.sellOffers)}
                    {makeOfferButton(data.sellOffers)}
                    {burnButton()}
                    <div>
                      {data.metadata?.attributes && data.metadata?.attributes[0] && data.metadata?.attributes[0].trait_type &&
                        <table className='table-details autowidth'>
                          <thead>
                            <tr>
                              <th colSpan="100">{t("table.attributes")}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {data.metadata.attributes.map((attr, i) =>
                              <tr key={i}>
                                <td>{stripText(attr.trait_type)}</td>
                                <td>{stripText(attr.value)}</td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      }
                    </div>
                  </div>
                  <div className="column-right">
                    <SocialShare
                      title={data?.metadata?.name || "XRPL NFT"}
                      description={pageMeta?.metadata?.description || ""}
                      hashtag="NFT"
                      image={imageUrl}
                      t={t}
                    />
                    {data.metadata &&
                      <table className='table-details'>
                        <thead>
                          <tr>
                            <th colSpan="100">{t("table.metadata")}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {!!data.metadata.name &&
                            <tr>
                              <td>{t("table.name")}</td>
                              <td>{nftName(data)}</td>
                            </tr>
                          }
                          {!!data.metadata.description &&
                            <tr>
                              <td>{t("table.description")}</td>
                              <td>{stripText(data.metadata.description)}</td>
                            </tr>
                          }
                          {!!data.metadata.collection && !!data.metadata.collection.name &&
                            <tr>
                              <td>{t("table.collection")}</td>
                              <td>{stripText(data.metadata.collection.name)}</td>
                            </tr>
                          }
                          {externalUrl(data.metadata) &&
                            <tr>
                              <td>{t("table.external-url")}</td>
                              <td>{externalUrl(data.metadata)}</td>
                            </tr>
                          }
                          <tr>
                            <td>{t("table.raw-data")}</td>
                            <td>
                              <span className='link' onClick={() => setShowRawMetadata(!showRawMetadata)}>
                                {showRawMetadata ? t("table.text.hide") : t("table.text.show")}
                              </span>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    }

                    <div className={'slide ' + (showRawMetadata ? "opened" : "closed")}>
                      {codeHighlight(data.metadata)}
                    </div>

                    <table className='table-details'>
                      <thead>
                        <tr><th colSpan="100">{t("table.ledger-data")}</th></tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td>NFT ID</td>
                          <td>{shortHash(data.nftokenID, 10)} <CopyButton text={data.nftokenID} /></td>
                        </tr>
                        {data.issuer === data.owner ?
                          <>
                            {trWithAccount(data, 'owner', t("table.issuer-owner"), "/explorer/", "ownerAndIssuer")}
                          </>
                          :
                          <>
                            {trWithAccount(data, 'owner', t("table.owner"), "/explorer/", "owner")}
                            {trWithAccount(data, 'issuer', t("table.issuer"), "/explorer/", "issuer")}
                          </>
                        }
                        <tr>
                          <td>{t("table.taxon")}</td>
                          <td>{data.nftokenTaxon}</td>
                        </tr>
                        <tr>
                          <td>{t("table.serial")}</td>
                          <td>{data.sequence}</td>
                        </tr>
                        {!!data.transferFee && <tr>
                          <td>{t("table.transfer-fee")}</td>
                          <td>{data.transferFee / 1000}%</td>
                        </tr>}
                        {trWithFlags(t, data.flags)}
                        <tr>
                          <td>URI</td>
                          <td>
                            {data.uri ? decode(data.uri) : t("table.text.unspecified")}
                          </td>
                        </tr>
                      </tbody>
                    </table>

                    <table className='table-details'>
                      <thead>
                        <tr><th colSpan="100">{t("table.related-lists")}</th></tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td>{t("table.by-issuer")}</td>
                          <td>
                            <Link href={"/nft-distribution?issuer=" + data.issuer}>{t("nft.holders")}</Link>,{" "}
                            <Link href={"/nft-explorer?issuer=" + data.issuer}>{t("table.all-nfts")}</Link>,{" "}
                            <Link href={"/nft-sales?issuer=" + data.issuer}>{t("table.sold_few")}</Link>,{" "}
                            <Link href={"/nft-explorer?issuer=" + data.issuer + "&list=onSale"}>{t("table.on-sale")}</Link>
                          </td>
                        </tr>
                        <tr>
                          <td>{t("table.by-taxon")}</td>
                          <td>
                            <Link href={"/nft-explorer?issuer=" + data.issuer + "&taxon=" + data.nftokenTaxon}>{t("table.all-nfts")}</Link>,{" "}
                            <Link href={"/nft-sales?issuer=" + data.issuer + "&taxon=" + data.nftokenTaxon}>{t("table.sold_few")}</Link>,{" "}
                            <Link href={"/nft-explorer?issuer=" + data.issuer + "&taxon=" + data.nftokenTaxon + "&list=onSale"}>{t("table.on-sale")}</Link>
                          </td>
                        </tr>
                        <tr>
                          <td>{t("table.by-owner")}</td>
                          <td>
                            <Link href={"/nft-explorer?owner=" + data.owner}>{t("table.all-nfts")}</Link>,{" "}
                            <Link href={"/nft-explorer?owner=" + data.owner + "&list=onSale"}>{t("table.on-sale")}</Link>
                          </td>
                        </tr>
                      </tbody>
                    </table>

                    <table className='table-details'>
                      <thead>
                        <tr>
                          <th colSpan="100">
                            {t("table.history")}
                          </th>
                        </tr>
                      </thead>
                      {nftHistory(data.history)}
                    </table>

                    <table className='table-details'>
                      <thead>
                        <tr>
                          <th colSpan="100">
                            {t("table.sell-offers")}
                            {countSellOffers && offersFilter("sell")}
                          </th>
                        </tr>
                      </thead>
                      {nftOffers(filteredSellOffers, "sell")}
                    </table>

                    <table className='table-details'>
                      <thead>
                        <tr>
                          <th colSpan="100">
                            {t("table.buy-offers")}
                            {countBuyOffers && offersFilter("buy")}
                          </th>
                        </tr>
                      </thead>
                      {nftOffers(filteredBuyOffers, "buy")}
                    </table>
                  </div>
                </>
              }
              </>
            }
          </>
        }
      </>
        :
        <>
          <h2 className='center'>NFT</h2>
          <p className='center'>
            {t("nft.desc")}
          </p>
        </>
      }
    </div>
  </>;
}

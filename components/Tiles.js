import { useTranslation } from 'next-i18next'
import { useState } from 'react'
import Link from 'next/link'

import { stripText, xahauNetwork } from '../utils'
import { nftImageStyle, nftUrl, bestNftOffer, mpUrl } from '../utils/nft'
import { amountFormat, timeOrDate, convertedAmount } from '../utils/format'

const addressName = (details, name) => {
  if (!details) return ""
  const { username, service } = details
  let label = ""
  if (service) {
    label = service
  } else if (username) {
    label = username
  }
  if (label) {
    return <><br />{name}: {label}</>
  }
  return ""
}

const shortName = (name) => {
  name = stripText(name)
  if (name?.length > 18) {
    name = name.slice(0, name.slice(0, 18).lastIndexOf(" ")) + '...'
    if (name.length > 21) {
      name = name.slice(0, 18) + '...'
    }
  }
  return name
}

const getName = (nft, options) => {
  let name = nft.metadata?.name
  if (!name) {
    name = nft.metadata?.details?.title
  }
  if (options?.short) {
    return shortName(name)
  }
  return stripText(name)
}

export default function Tiles({ nftList, type = 'name', convertCurrency, account }) {
  const { t } = useTranslation();

  const [loaded, setLoaded] = useState([]);
  const [errored, setErrored] = useState([]);
  /*
    {
      "issuer": "r9spUPhPBfB6kQeF6vPhwmtFwRhBh2JUCG",
      "nftokenID": "000800005822D634B22590727E3CB2431F03C3B8B041528316E72FD300000001",
      "nftokenTaxon": 193871,
      "uri": "HEX",
      "sequence": 1,
      "metadata": {
        "name": "Pirate Edition",
        "description": "A long description",
        "category": "collectibles",
        "image_url": "ipfs://ipfs/cid/image.jpeg",
        "animation_url": "ipfs://ipfs/cid/animation.jpeg"
      }
    }
  */

  const loadingImage = nft => {
    const nftId = nft.nftokenID || nft.uriTokenID
    if (errored.includes(nftId)) {
      return <div className="img-status">{t("general.load-failed")}</div>;
    } else if (!loaded.includes(nftId)) {
      return <div className="img-status">{t("general.loading")}</div>;
    }
  }

  const playMovie = (e) => {
    e.target.querySelector('video').play();
  }

  const imageOrVideo = (nft) => {
    let imageStyle = nftImageStyle(nft);
    if (Object.keys(imageStyle).length === 0) {
      const nftVideoUrl = nftUrl(nft, 'video');
      if (nftVideoUrl) {
        return <div className='tile-content' onMouseOver={playMovie}>
          <video playsInline muted preload="metadata">
            <source src={nftVideoUrl} type="video/mp4" />
          </video>
        </div>;
      } else {
        return <div className='tile-content background-secondary'></div>;
      }
    } else {
      return <>
        <div className='tile-content' style={imageStyle}></div>
        <img
          style={{ display: 'none' }}
          src={nftUrl(nft, 'image')}
          onLoad={() => setLoaded([...loaded, (nft.nftokenID || nft.uriTokenID)])}
          onError={() => setErrored([...errored, (nft.nftokenID || nft.uriTokenID)])}
          alt={getName(nft)}
        />
      </>;
    }
  }

  const saleData = sellOffers => {
    if (!sellOffers) return "";
    const best = bestNftOffer(sellOffers, account, 'sell');
    if (best) {
      if (mpUrl(best)) {
        return <>
          {amountFormat(best.amount)}
          <br />
          {t("nfts.on-service", { service: best.destinationDetails.service })}
        </>;
      } else {
        return amountFormat(best.amount);
      }
    };
    return "Private offer"; //shouldn't be the case
  }

  if (type === "name" || type === 'onSale') {
    return <div className='tiles'>
      <div className="grid">
        <ul className="hexGrid">
          {nftList[0] && nftList.map((nft, i) =>
            <li className="hex" key={i}>
              <div className="hexIn">
                <Link href={"/nft/" + (nft.nftokenID || nft.uriTokenID)} className="hexLink">
                  {loadingImage(nft)}
                  {imageOrVideo(nft)}
                  <div className="index">{i + 1}</div>
                  <div className='title'></div>

                  {type === 'name' ?
                    <h1>{getName(nft, { short: true })}</h1>
                    :
                    <h1>{saleData(nft.sellOffers)}</h1>
                  }
                  <div className='title-full'>
                    {getName(nft) ? <>{t("table.name")}: {getName(nft)}<br /></> : ""}
                    {!xahauNetwork && <>
                      {t("table.serial")}: {nft.sequence}<br />
                      {t("table.taxon")}: {nft.nftokenTaxon}
                    </>}

                    {addressName(nft.issuerDetails, t("table.issuer"))}
                    {addressName(nft.ownerDetails, t("table.owner"))}
                  </div>
                </Link>
              </div>
            </li>
          )}
        </ul>
      </div>
    </div>
  }

  if (type === 'top' || type === 'last') {
    return <div className='tiles'>
      <div className="grid">
        <ul className="hexGrid">
          {nftList?.length > 0 && nftList.map((nft, i) =>
            <li className="hex" key={i}>
              <div className="hexIn">
                <Link href={"/nft/" + nft.nftoken.nftokenID} className="hexLink" >
                  {loadingImage(nft.nftoken)}
                  {imageOrVideo(nft.nftoken)}
                  <div className="index">{i + 1}</div>
                  <div className='title'></div>
                  <h1>
                    {convertedAmount(nft, convertCurrency) || amountFormat(nft.amount)}
                    <br />
                    {timeOrDate(nft.acceptedAt)}
                  </h1>
                  <div className='title-full'>
                    {getName(nft.nftoken) ? <>{t("table.name")}: {getName(nft.nftoken, { short: true })}</> : ""}
                    {addressName(nft.nftoken?.issuerDetails, t("table.issuer"))}
                    <br />
                    {t("table.price")}: {amountFormat(nft.amount)}
                    {nft.marketplace &&
                      <>
                        <br />
                        {t("table.marketplace")}: {nft.marketplace}
                      </>
                    }
                  </div>
                </Link>
              </div>
            </li>
          )}
        </ul>
      </div>
    </div>
  }
  return ""
}

import { useTranslation } from 'next-i18next'
import Link from 'next/link'

import { xahauNetwork } from '../utils'
import { bestNftOffer, mpUrl, nftName, partnerMarketplaces } from '../utils/nft'
import { amountFormat, timeOrDate, convertedAmount } from '../utils/format'
import NftImageOrVideo from './NftImageOrVideo'

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

export default function Tiles({ nftList, type = 'name', convertCurrency, account }) {
  const { t } = useTranslation();

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

  const saleData = sellOffers => {
    if (!sellOffers) return ""
    const best = bestNftOffer(sellOffers, account, 'sell')
    if (best) {
      if (mpUrl(best)) {
        return <>
          {amountFormat(best.amount)}
          {!partnerMarketplaces[best?.destination] && <>
            <br />
            {t("nfts.on-service", { service: best.destinationDetails.service })}
          </>}
        </>
      } else {
        return amountFormat(best.amount)
      }
    }
    return t("table.text.private-offer") //shouldn't be the case
  }

  if (type === "name" || type === 'onSale') {
    return <div className='tiles'>
      <div className="grid">
        <ul className="hexGrid">
          {nftList[0] && nftList.map((nft, i) =>
            <li className="hex" key={i}>
              <div className="hexIn">
                <Link href={"/nft/" + (nft.nftokenID || nft.uriTokenID)} className="hexLink">
                  <NftImageOrVideo nft={nft} />
                  <div className="index">{i + 1}</div>
                  <div className='title'></div>

                  <div className='title-text'>
                    {type === 'name' ? nftName(nft, { maxLength: 18 }) : saleData(nft.sellOffers)}
                  </div>
                  <div className='title-full'>
                    {nftName(nft) ? <>{t("table.name")}: {nftName(nft)}<br /></> : ""}
                    {!xahauNetwork &&
                      <>
                        {t("table.serial")}: {nft.sequence}<br />
                        {t("table.taxon")}: {nft.nftokenTaxon}
                      </>
                    }
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
                <Link href={"/nft/" + (nft.nftoken.nftokenID || nft.nftoken.uriTokenID)} className="hexLink" >
                  <NftImageOrVideo nft={nft.nftoken} />
                  <div className="index">{i + 1}</div>
                  <div className='title'></div>
                  <div className='title-text'>
                    {convertedAmount(nft, convertCurrency) || amountFormat(nft.amount)}
                    <br />
                    {timeOrDate(nft.acceptedAt)}
                  </div>
                  <div className='title-full'>
                    {nftName(nft.nftoken) ? <>{t("table.name")}: {nftName(nft.nftoken, { maxLength: 18 })}</> : ""}
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

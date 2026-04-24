import { useTranslation } from 'next-i18next'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { useState } from 'react'

import { forbid18Plus, xahauNetwork } from '../utils'
import { bestNftOffer, mpUrl, needNftAgeCheck, nftName, partnerMarketplaces } from '../utils/nft'
import { amountFormat, timeOrDate, convertedAmount } from '../utils/format'
import NftImageOrVideo from './NftImageOrVideo'
import AgeCheck from './UI/AgeCheck'
import { tiles } from '../styles/components/tiles.module.scss'

const addressName = (details, name) => {
  if (!details) return ''
  const { username, service } = details
  let label = ''
  if (service) {
    label = service
  } else if (username) {
    label = username
  }
  if (label) {
    return (
      <>
        <br />
        {name}: {label}
      </>
    )
  }
  return ''
}

export default function Tiles({
  nftList,
  type = 'name',
  convertCurrency,
  account,
  disabled = false,
  sortOrder = null
}) {
  const { t } = useTranslation()
  const router = useRouter()

  const [showAgeCheck, setShowAgeCheck] = useState(false)

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

  const saleData = (nftOffers, offerType = 'sell') => {
    if (!nftOffers) return ''
    // For buy offers (bids) with priceLow sort, show the lowest bid
    const showLowest = offerType === 'buy' && sortOrder === 'priceLow'
    const best = bestNftOffer(nftOffers, account?.address, offerType, showLowest)
    if (best) {
      if (mpUrl(best)) {
        return (
          <>
            {amountFormat(best.amount, { short: true })}
            {!partnerMarketplaces[best?.destination] && (
              <>
                <br />
                {t('nfts.on-service', { service: best.destinationDetails.service })}
              </>
            )}
          </>
        )
      } else {
        return amountFormat(best.amount, { short: true })
      }
    }
    return t('table.text.private-offer') //shouldn't be the case
  }

  const clickOnTile = async (e, nft) => {
    e.preventDefault()
    if (needNftAgeCheck(nft)) {
      const forbid = await forbid18Plus()
      if (forbid) return
      setShowAgeCheck(true)
    }
    router.push('/nft/' + nft.nftokenID)
  }

  if (type === 'name' || type === 'onSale' || type === 'bids') {
    return (
      <div className={tiles}>
        <div className="grid">
          <ul className="hexGrid">
            {nftList[0] &&
              nftList.map((nft, i) => (
                <li className="hex" key={nft.nftokenID || i}>
                  <div className="hexIn">
                    <Link
                      href={needNftAgeCheck(nft) ? '#' : '/nft/' + nft.nftokenID}
                      className="hexLink"
                      onClick={(e) => clickOnTile(e, nft)}
                    >
                      <NftImageOrVideo nft={nft} />
                      <div className="index">{i + 1}</div>
                      <div className="title"></div>

                      <div className="title-text" style={{ bottom: '9%' }}>
                        {type === 'name'
                          ? nftName(nft, { maxLength: 12 })
                          : saleData(
                              type === 'bids' ? nft.buyOffers : nft.sellOffers,
                              type === 'bids' ? 'buy' : 'sell'
                            )}
                      </div>
                      {!disabled && (
                        <div className="title-full">
                          {nftName(nft) ? (
                            <>
                              {t('table.name')}: {nftName(nft)}
                              <br />
                            </>
                          ) : (
                            ''
                          )}
                          {!xahauNetwork && (
                            <>
                              {t('table.serial')}: {nft.sequence}
                              <br />
                              {t('table.taxon')}: {nft.nftokenTaxon}
                            </>
                          )}
                          {addressName(nft.issuerDetails, t('table.issuer'))}
                          {addressName(nft.ownerDetails, t('table.owner'))}
                        </div>
                      )}
                    </Link>
                  </div>
                </li>
              ))}
          </ul>
        </div>
        {showAgeCheck && <AgeCheck setShowAgeCheck={setShowAgeCheck} />}
      </div>
    )
  }

  if (type === 'priceHigh' || type === 'priceLow' || type === 'soldNew' || type === 'soldOld') {
    return (
      <div className={tiles}>
        <div className="grid">
          <ul className="hexGrid">
            {nftList?.length > 0 &&
              nftList.map((nft, i) => (
                <li className="hex" key={nft.nftoken?.nftokenID || i}>
                  <div className="hexIn">
                    <Link
                      href={needNftAgeCheck(nft.nftoken) ? '#' : '/nft/' + nft.nftoken.nftokenID}
                      className="hexLink"
                      onClick={(e) => clickOnTile(e, nft.nftoken)}
                    >
                      <NftImageOrVideo nft={nft.nftoken} />
                      <div className="index">{i + 1}</div>
                      <div className="title"></div>
                      <div className="title-text" style={{ bottom: '8%' }}>
                        {convertedAmount(nft, convertCurrency, { short: true }) ||
                          amountFormat(nft.amount, { short: true })}
                        <br />
                        <br />
                        {!disabled && timeOrDate(nft.acceptedAt)}
                      </div>
                      {!disabled && (
                        <div className="title-full">
                          {nftName(nft.nftoken) ? (
                            <>
                              {t('table.name')}: {nftName(nft.nftoken, { maxLength: 18 })}
                            </>
                          ) : (
                            ''
                          )}
                          {addressName(nft.nftoken?.issuerDetails, t('table.issuer'))}
                          <br />
                          {t('table.price')}: {amountFormat(nft.amount, { short: true })}
                          {nft.marketplace && (
                            <>
                              <br />
                              {t('table.marketplace')}: {nft.marketplace}
                            </>
                          )}
                        </div>
                      )}
                    </Link>
                  </div>
                </li>
              ))}
          </ul>
        </div>
        {showAgeCheck && <AgeCheck setShowAgeCheck={setShowAgeCheck} />}
      </div>
    )
  }
  return ''
}

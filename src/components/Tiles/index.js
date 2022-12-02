import { useTranslation } from 'react-i18next';

import { stripText } from '../../utils';
import { nftImageStyle, nftUrl } from '../../utils/nft';
import { amountFormat, dateFormat } from '../../utils/format';

import './styles.scss';

export default function Tiles({ nftList, type = 'name' }) {
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

  const shortName = (name) => {
    name = stripText(name);
    if (name?.length > 25) {
      return name.slice(0, name.slice(0, 25).lastIndexOf(" ")) + '...';
    }
    return name;
  }

  const imageOrVideo = (nft) => {
    let imageStyle = nftImageStyle(nft);
    if (Object.keys(imageStyle).length === 0) {
      const nftVideoUrl = nftUrl(nft, 'video');
      if (nftVideoUrl) {
        return <div className='img'>
          <video autoPlay playsInline muted loop>
            <source src={nftVideoUrl} type="video/mp4" />
          </video>
        </div>;
      } else {
        return <div className='img background-secondary'></div>;
      }
    } else {
      return <div className='img' style={imageStyle}></div>;
    }
  }

  if (type === "name") {
    return <div className='tiles'>
      <div className="grid">
        <ul className="hexGrid">
          {nftList.length > 0 && nftList.map((nft, i) =>
            <li className="hex" key={i}>
              <div className="hexIn">
                <a className="hexLink" href={"/explorer/" + nft.nftokenID}>
                  <div className="img-status">{t("general.loading")}</div>
                  {imageOrVideo(nft)}
                  <div className="index">{i + 1}</div>
                  <div className='title'></div>
                  <h1>{nft.metadata?.name ? shortName(nft.metadata.name) : ''}</h1>
                  <div className='title-full'>
                    {t("table.name")}: {nft.metadata?.name}<br />
                    {t("table.serial")}: {nft.sequence}
                  </div>
                </a>
              </div>
            </li>
          )}
        </ul>
      </div>
    </div>
  }

  if (type === 'price') {
    return <div className='tiles'>
      <div className="grid">
        <ul className="hexGrid">
          {nftList?.length > 0 && nftList.map((nft, i) =>
            <li className="hex" key={i}>
              <div className="hexIn">
                <a className="hexLink" href={"/explorer/" + nft.nftoken.nftokenID}>
                  <div className="img-status">{t("general.loading")}</div>
                  {imageOrVideo(nft.nftoken)}
                  <div className="index">{i + 1}</div>
                  <div className='title'></div>
                  <h1>
                    {amountFormat(nft.amount)}<br />
                    {dateFormat(nft.acceptedAt)}
                  </h1>
                  <div className='title-full'>
                    {t("table.name")}: {stripText(nft.nftoken.metadata?.name)}<br />
                    {t("table.serial")}: {nft.nftoken.sequence}
                  </div>
                </a>
              </div>
            </li>
          )}
        </ul>
      </div>
    </div>
  }
};

import { useTranslation } from 'next-i18next'
import { useState } from 'react'

import { nftImageStyle, nftUrl, nftName } from '../utils/nft'

export default function NftImageOrVideo({ nft }) {
  const { t } = useTranslation()

  const [loaded, setLoaded] = useState(false)
  const [errored, setErrored] = useState(false)

  const playMovie = (e) => {
    e.target.querySelector('video').play()
  }

  if (!nft) return ""

  let imageStyle = nftImageStyle(nft)

  if (Object.keys(imageStyle).length === 0) {
    const nftVideoUrl = nftUrl(nft, 'video')
    if (nftVideoUrl) {
      return <div className='tile-content' onMouseOver={playMovie}>
        <video playsInline muted preload="metadata">
          <source src={nftVideoUrl} type="video/mp4" />
        </video>
      </div>
    } else {
      return <div className='tile-content background-secondary'></div>
    }
  } else {
    const imageUri = nftUrl(nft, 'image');
    //data:image show as image right away, as we don't need to wait for it to load
    return <>
      {errored ?
        <div className="img-status">{t("general.load-failed")}</div>
        :
        <>
          {(!loaded && !imageUri?.includes('data:image')) &&
            <div className="img-status">{t("general.loading")}</div>
          }
        </>
      }
      <div className='tile-content' style={imageStyle}></div>
      <img
        bag="sdfsdf"
        style={imageUri?.includes('data:image') ? imageStyle : { display: 'none' }}
        src={imageUri}
        onLoad={() => { if (imageUri.slice(0, 10) !== 'data:image') { setLoaded(true) } }}
        onError={() => setErrored(true)}
        alt={nftName(nft)}
      />
    </>
  }
}

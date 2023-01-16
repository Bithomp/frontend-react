import { useState } from "react";
import { useTranslation } from 'react-i18next';

import { nftUrl } from '../utils/nft';

import Tabs from './Tabs';

export default function NftPreview({ nft }) {
  const { t } = useTranslation();
  const [contentTab, setContentTab] = useState("image");
  const [loaded, setLoaded] = useState(false);
  const [errored, setErrored] = useState(false);

  const loadingImage = () => {
    const style = {
      textAlign: "center",
      marginTop: "40px",
      marginBottom: "20px"
    };
    if (errored) {
      return <div style={style}>{t("general.load-failed")}<br /></div>;
    } else if (!loaded) {
      return <div style={style}><span className="waiting"></span><br />{t("general.loading")}</div>;
    }
  }

  const imageUrl = nftUrl(nft, 'image');
  const videoUrl = nftUrl(nft, 'video');
  const audioUrl = nftUrl(nft, 'audio');

  const clUrl = {
    image: nftUrl(nft, 'image', 'cl'),
    video: nftUrl(nft, 'video', 'cl'),
    audio: nftUrl(nft, 'audio', 'cl')
  }
  const contentTabList = [
    { value: 'image', label: (t("tabs.image")) },
    { value: 'video', label: (t("tabs.video")) }
  ];
  let imageStyle = { width: "100%", height: "auto" };
  if (imageUrl) {
    if (imageUrl.slice(0, 10) === 'data:image') {
      imageStyle.imageRendering = 'pixelated';
    }
    if (nft.deletedAt) {
      imageStyle.filter = 'grayscale(1)';
    }
  }
  let errorStyle = { marginTop: "40px" };
  return <>
    {imageUrl && videoUrl &&
      <div style={{ height: "31px", marginBottom: "10px" }}>
        <span className='tabs-inline' style={{ float: "left" }}>
          <Tabs
            tabList={contentTabList}
            tab={contentTab}
            setTab={setContentTab}
            name="content"
            style={{ margin: 0 }}
          />
        </span>
        <span style={{ float: "right", padding: "4px 0px" }}>
          <a href={clUrl[contentTab]} target="_blank" rel="noreferrer">
            {t("tabs." + contentTab)} IPFS
          </a>
        </span>
      </div>
    }
    {(imageUrl || videoUrl) && loadingImage(nft)}
    {imageUrl && contentTab === 'image' &&
      <img
        style={imageStyle}
        src={imageUrl}
        onLoad={() => setLoaded(true)}
        onError={({ currentTarget }) => {
          currentTarget.onerror = () => {
            setErrored(true);
          };
          currentTarget.src = clUrl.image;
        }}
        alt={nft.metadata?.name}
      />
    }
    {videoUrl && contentTab === 'video' &&
      <video
        autoPlay
        playsInline
        muted
        loop
        controls
        style={{ width: "100%", height: "auto" }}
      >
        <source src={videoUrl} type="video/mp4" />
      </video>
    }
    {!(imageUrl && videoUrl) && clUrl[contentTab] &&
      <span style={{ padding: "4px 0px" }}>
        <a href={clUrl[contentTab]} target="_blank" rel="noreferrer">
          {t("tabs." + contentTab)} IPFS
        </a>
      </span>
    }
    {audioUrl &&
      <>
        <audio src={audioUrl} controls style={{ display: 'block', margin: "20px auto" }}></audio>
        <span style={{ padding: "4px 0px" }}>
          <a href={clUrl.audio} target="_blank" rel="noreferrer">
            {t("tabs.audio")} IPFS
          </a>
        </span>
      </>
    }
    {(!nft.uri && !(nft.metadata)) ?
      <div className="center bold" style={errorStyle}>{t("general.no-uri")}</div>
      :
      <>
        {!(imageUrl || videoUrl || audioUrl) &&
          <div className="center bold" style={errorStyle}>{t("general.no-media")}</div>
        }
      </>
    }
    <div style={{ height: "15px" }}></div>
  </>
}
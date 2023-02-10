import { useState } from "react";
import { useTranslation } from 'react-i18next';
import { Helmet } from "react-helmet-async";

import { nftUrl } from '../utils/nft';

import LoadingGif from "../assets/images/loading.gif";

import Tabs from './Tabs';

export default function NftPreview({ nft }) {
  const { t } = useTranslation();
  const [contentTab, setContentTab] = useState("image");
  const [loaded, setLoaded] = useState(false);
  const [errored, setErrored] = useState(false);

  const style = {
    textAlign: "center",
    marginTop: "40px",
    marginBottom: "20px"
  };

  const loadingImage = () => {
    if (errored) {
      return <div style={style}>{t("general.load-failed")}<br /></div>;
    } else if (!loaded) {
      return <div style={style}><span className="waiting"></span><br />{t("general.loading")}</div>;
    }
  }

  const imageUrl = nftUrl(nft, 'image');
  const videoUrl = nftUrl(nft, 'video');
  const audioUrl = nftUrl(nft, 'audio');
  const modelUrl = nftUrl(nft, 'model');
  const viewerUrl = nftUrl(nft, 'viewer');

  let modelState = null;

  const clUrl = {
    image: nftUrl(nft, 'image', 'cl'),
    video: nftUrl(nft, 'video', 'cl'),
    audio: nftUrl(nft, 'audio', 'cl'),
    model: nftUrl(nft, 'model', 'cl')
  }
  const contentTabList = [];
  if (imageUrl) {
    contentTabList.push({ value: 'image', label: (t("tabs.image")) });
  }
  if (videoUrl) {
    contentTabList.push({ value: 'video', label: (t("tabs.video")) });
  }
  if (modelUrl) {
    contentTabList.push({ value: 'model', label: (t("tabs.model")) });
  }

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
  let defaultTab = contentTab;
  let defaultUrl = clUrl[contentTab];
  if (!imageUrl && contentTab === 'image') {
    if (clUrl['video']) {
      defaultTab = 'video';
      defaultUrl = clUrl['video'];
    } else if (clUrl['model']) {
      defaultTab = 'model';
      defaultUrl = clUrl['model'];
    }
  }

  return <>
    {contentTabList.length > 1 &&
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
    {imageUrl && loadingImage(nft)}
    {imageUrl && contentTab === 'image' &&
      <img
        style={{ ...imageStyle, display: (loaded ? "inline-block" : "none") }}
        src={imageUrl}
        onLoad={() => { setLoaded(true); setErrored(false) }}
        onError={({ currentTarget }) => {
          if (currentTarget.src === imageUrl) {
            currentTarget.src = clUrl.image;
          } else {
            setErrored(true);
          }
        }}
        alt={nft.metadata?.name}
      />
    }
    {videoUrl && defaultTab === 'video' &&
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
    {modelUrl && defaultTab === 'model' &&
      <>
        {modelState === "loading" &&
          <div style={style}><span className="waiting"></span><br />{t("general.loading")}</div>
        }
        {modelState !== "ready" &&
          <>
            <Helmet>
              <script
                type="module"
                src={process.env.PUBLIC_URL + "/js/model-viewer.min.js"}
              />
            </Helmet>
            <model-viewer
              class="model-viewer"
              src={modelUrl}
              camera-controls
              auto-rotate
              ar
              poster={LoadingGif}
              autoplay
            >
            </model-viewer>
          </>
        }
      </>
    }
    {contentTabList.length < 2 && defaultUrl &&
      <span style={{ padding: "4px 0px" }}>
        <a href={defaultUrl} target="_blank" rel="noreferrer">
          {t("tabs." + defaultTab)} IPFS
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
    {viewerUrl &&
        <span style={{ padding: "4px 0px", float: "right" }}>
          <a href={viewerUrl} target="_blank" rel="noreferrer">
            {t("general.viewer")}
          </a>
        </span>
    }
    {(!nft.uri && !(nft.metadata)) ?
      <div className="center bold" style={errorStyle}>{t("general.no-uri")}</div>
      :
      <>
        {!(imageUrl || videoUrl || audioUrl || modelUrl) &&
          <div className="center bold" style={errorStyle}>{t("general.no-media")}</div>
        }
      </>
    }
    <div style={{ height: "15px" }}></div>
  </>
}
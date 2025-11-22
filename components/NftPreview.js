import { useState, useEffect } from 'react'
import { useTranslation } from 'next-i18next'
import Head from 'next/head'

import { forbid18Plus } from '../utils'
import { 
  needNftAgeCheck, 
  nftName, 
  isPanorama, 
  processModelAttributes, 
  buildContentTabList, 
  extractNftUrls, 
  getDefaultTabAndUrl, 
  buildImageStyle 
} from '../utils/nft'

import Tabs from './Tabs'
import LoadingGif from '../public/images/loading.gif'
import { FaCloudDownloadAlt, FaExpand } from 'react-icons/fa'
import ReactPannellum from 'react-pannellum'
import AgeCheck from './UI/AgeCheck'
import NftFullScreenViewer from './NftFullScreenViewer'
import { nftFullScreenViewer } from '../styles/components/nftFullScreenViewer.module.scss'

const downloadIcon = (
  <div className="fv-download-icon">
    <FaCloudDownloadAlt />
  </div>
)

export default function NftPreview({ nft, setIsHidden }) {
  const { t } = useTranslation()
  const [contentTab, setContentTab] = useState('image')
  const [loaded, setLoaded] = useState(false)
  const [errored, setErrored] = useState(false)
  const [isPanoramic, setIsPanoramic] = useState(false)
  const [showAgeCheck, setShowAgeCheck] = useState(false)
  const [showFullScreen, setShowFullScreen] = useState(false)

  const loadingImage = () => {
    if (errored) {
      return (
        <div className="fv-loading-container">
          {t('general.load-failed')}
          <br />
        </div>
      )
    } else if (!loaded) {
      return (
        <div className="fv-loading-container">
          <span className="waiting"></span>
          <br />
          {t('general.loading')}
        </div>
      )
    }
  }

  const urls = extractNftUrls(nft)
  const { image: imageUrl, video: videoUrl, audio: audioUrl, model: modelUrl, viewer: viewerUrl } = urls
  const { cl: clUrl } = urls

  const contentTabList = buildContentTabList(imageUrl, videoUrl, modelUrl, t)

  const imageStyle = buildImageStyle(imageUrl, nft)

  const { defaultTab, defaultUrl } = getDefaultTabAndUrl(contentTab, imageUrl, clUrl)

  const modelAttr = processModelAttributes(nft)

  useEffect(() => {
    if (imageUrl || videoUrl) {
      const panoramic = isPanorama(nft.metadata)
      setIsPanoramic(panoramic)
      if (panoramic) {
        setLoaded(true)
      }
      // if no image, but there is a video, don't show loading spinner
      if (!imageUrl) {
        setLoaded(true)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imageUrl, videoUrl, nft.metadata])

  const clickOn18PlusImage = async () => {
    const forbid = await forbid18Plus()
    if (forbid) return
    setShowAgeCheck(true)
  }

  const renderFullScreenButton = () => (
    <button
      onClick={() => {
        setShowFullScreen(true)
        setIsHidden && setIsHidden(true)
      }}
      className="fv-preview-button"
    >
      <FaExpand /> Full Screen
    </button>
  )

  const renderDownloadButton = (url, label) => (
    <a 
      href={url} 
      target="_blank" 
      rel="noreferrer"
      className="fv-preview-button"
    >
      {label} {downloadIcon}
    </a>
  )

  return (
    <div className={nftFullScreenViewer}>
      {contentTabList.length > 1 && (
        <div className="fv-preview-tabs-container">
          <span className="tabs-inline fv-preview-tabs-inline">
            <Tabs
              tabList={contentTabList}
              tab={contentTab}
              setTab={setContentTab}
              name="content"
              style={{ margin: 0 }}
            />
          </span>
          <span className="fv-preview-actions-right">
            {renderFullScreenButton()}
            {renderDownloadButton(clUrl[contentTab], t('tabs.' + contentTab))}
          </span>
        </div>
      )}

      {needNftAgeCheck(nft) ? (
        <img
          src="/images/nft/18plus.jpg"
          className="fv-preview-age-image"
          onClick={clickOn18PlusImage}
          alt="18 plus content"
        />
      ) : (
        <>
          {imageUrl && contentTab === 'image' && (
            <>
              {loadingImage()}
              {isPanoramic ? (
                <ReactPannellum
                  id="1"
                  sceneId="firstScene"
                  imageSource={defaultUrl}
                  config={{
                    autoLoad: true,
                    autoRotate: -2
                  }}
                  className="fv-preview-panorama"
                  style={{ display: loaded ? 'inline-block' : 'none' }}
                />
              ) : (
                <img
                  className="fv-preview-image"
                  style={{ ...imageStyle, display: loaded ? 'inline-block' : 'none' }}
                  src={imageUrl}
                  onLoad={() => {
                    setLoaded(true)
                    setErrored(false)
                  }}
                  onError={({ currentTarget }) => {
                    if (currentTarget.src === imageUrl && imageUrl !== clUrl.image) {
                      currentTarget.src = clUrl.image
                    } else {
                      setErrored(true)
                    }
                  }}
                  alt={nftName(nft)}
                />
              )}
            </>
          )}
          {videoUrl && defaultTab === 'video' && (
            <>
              {loadingImage()}
              {isPanoramic ? (
                <ReactPannellum
                  id="2"
                  sceneId="videoScene"
                  imageSource={videoUrl}
                  config={{
                    autoLoad: true,
                    autoRotate: 0
                  }}
                  className="fv-preview-panorama"
                  style={{ display: loaded ? 'inline-block' : 'none' }}
                />
              ) : (
                <video autoPlay playsInline muted loop controls className="fv-preview-video">
                  <source src={videoUrl} type="video/mp4" />
                </video>
              )}
            </>
          )}
          {modelUrl && defaultTab === 'model' && (
            <>
              <Head>
                <script type="module" src="/js/model-viewer.min.js?v=2" defer />
              </Head>
              <model-viewer
                className="model-viewer"
                src={modelUrl}
                camera-controls
                auto-rotate
                ar
                poster={LoadingGif}
                autoplay
                ar-modes="webxr scene-viewer quick-look"
                {...modelAttr?.reduce((prev, curr) => {
                  prev[curr.attribute] = curr.value
                  return prev
                }, {})}
              ></model-viewer>
            </>
          )}
          {contentTabList.length < 2 && defaultUrl && (
            <span className="fv-preview-action-row">
              {renderFullScreenButton()}
              {renderDownloadButton(defaultUrl, t('tabs.' + defaultTab))}
            </span>
          )}
        </>
      )}

      {defaultTab !== 'model' && defaultTab !== 'video' && audioUrl && (
        <>
          <audio src={audioUrl} controls className="fv-preview-audio"></audio>
          <span className="fv-preview-action-row-center">
            {renderDownloadButton(clUrl.audio, t('tabs.audio'))}
          </span>
        </>
      )}
      {viewerUrl && (
        <span className="fv-preview-action-row-right">
          <a href={viewerUrl} target="_blank" rel="noreferrer">
            {t('general.viewer')}
          </a>
        </span>
      )}
      {!nft.uri && !nft.metadata ? (
        <div className="center bold" style={{ marginTop: '40px' }}>
          {t('general.no-uri')}
        </div>
      ) : (
        <>
          {!(imageUrl || videoUrl || audioUrl || modelUrl) && (
            <div className="center bold" style={{ marginTop: '40px' }}>
              {t('general.no-media')}
            </div>
          )}
        </>
      )}
      <div className="fv-preview-spacer"></div>
      {showAgeCheck && <AgeCheck setShowAgeCheck={setShowAgeCheck} />}
      
      {/* Full Screen Viewer */}
      {showFullScreen && (
        <NftFullScreenViewer 
          nft={nft} 
          onClose={() => {
            setShowFullScreen(false)
            setIsHidden && setIsHidden(false)
          }} 
        />
      )}
    </div>
  )
}

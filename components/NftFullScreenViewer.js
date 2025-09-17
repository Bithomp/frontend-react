import { useState, useEffect } from 'react'
import { useTranslation } from 'next-i18next'
import Head from 'next/head'

import { forbid18Plus, stripText } from '../utils'
import { needNftAgeCheck, nftName, nftUrl } from '../utils/nft'

import LoadingGif from '../public/images/loading.gif'
import { FaCloudDownloadAlt, FaTimes } from 'react-icons/fa'
import ReactPannellum from 'react-pannellum'
import AgeCheck from './UI/AgeCheck'
import styles from '../styles/components/nftFullScreenViewer.module.scss'

const downloadIcon = (
  <div style={{ display: 'inline-block', verticalAlign: 'bottom', height: '19px' }}>
    <FaCloudDownloadAlt />
  </div>
)

const isPanorama = (metadata) => {
  if (!metadata) return false

  // Check name and description for panorama keywords
  const panoramaKeywords = ['360', 'panorama', 'panoramic', 'equirectangular']
  const name = metadata.name?.toString().toLowerCase() || ''
  const description = metadata.description?.toString().toLowerCase() || ''

  // Check if name or description contains panorama keywords
  const hasPanoramaKeyword = panoramaKeywords.some((keyword) => name.includes(keyword) || description.includes(keyword))

  // Check for specific camera types known for panoramas
  const panoramaCameras = ['gopro fusion', 'insta360', 'ricoh theta']
  const hasPanoramaCamera = panoramaCameras.some((camera) => description.includes(camera.toLowerCase()))

  return hasPanoramaKeyword || hasPanoramaCamera
}

export default function NftFullScreenViewer({ nft, onClose }) {
  const { t } = useTranslation()
  const [contentTab, setContentTab] = useState('image')
  const [loaded, setLoaded] = useState(false)
  const [errored, setErrored] = useState(false)
  const [isPanoramic, setIsPanoramic] = useState(false)
  const [showAgeCheck, setShowAgeCheck] = useState(false)

  const imageUrl = nftUrl(nft, 'image')
  const videoUrl = nftUrl(nft, 'video')
  const audioUrl = nftUrl(nft, 'audio')
  const modelUrl = nftUrl(nft, 'model')

  const clUrl = {
    image: nftUrl(nft, 'image', 'cl'),
    video: nftUrl(nft, 'video', 'cl'),
    audio: nftUrl(nft, 'audio', 'cl'),
    model: nftUrl(nft, 'model', 'cl')
  }

  const contentTabList = []
  if (imageUrl) {
    contentTabList.push({ value: 'image', label: t('tabs.image') })
  }
  if (videoUrl) {
    contentTabList.push({ value: 'video', label: t('tabs.video') })
  }
  if (modelUrl) {
    contentTabList.push({ value: 'model', label: t('tabs.model') })
  }

  let imageStyle = { width: '100%', height: 'auto', maxHeight: '76vh' }
  if (imageUrl) {
    if (imageUrl.slice(0, 10) === 'data:image') {
      imageStyle.imageRendering = 'pixelated'
    }
    if (nft.deletedAt) {
      imageStyle.filter = 'grayscale(1)'
    }
  }

  let defaultTab = contentTab
  let defaultUrl = clUrl[contentTab]
  if (!imageUrl && contentTab === 'image') {
    if (clUrl['video']) {
      defaultTab = 'video'
      defaultUrl = clUrl['video']
    } else if (clUrl['model']) {
      defaultTab = 'model'
      defaultUrl = clUrl['model']
    }
  }

  //add attributes for the 3D model viewer
  let modelAttr = []
  if (nft.metadata && (nft.metadata['3D_attributes'] || nft.metadata['3d_attributes'])) {
    modelAttr = nft.metadata['3D_attributes'] || nft.metadata['3d_attributes']
    const supportedAttr = [
      'environment-image',
      'exposure',
      'shadow-intensity',
      'shadow-softness',
      'camera-orbit',
      'camera-target',
      'skybox-image',
      'auto-rotate-delay',
      'rotation-per-second',
      'field-of-view',
      'max-camera-orbit',
      'min-camera-orbit',
      'max-field-of-view',
      'min-field-of-view',
      'disable-zoom',
      'orbit-sensitivity',
      'animation-name',
      'animation-crossfade-duration',
      'variant-name',
      'orientation',
      'scale'
    ]
    if (Array.isArray(modelAttr)) {
      for (let i = 0; i < modelAttr.length; i++) {
        if (supportedAttr.includes(modelAttr[i].attribute)) {
          modelAttr[i].value = stripText(modelAttr[i].value)
        } else {
          delete modelAttr[i]
        }
      }
    } else if (typeof modelAttr === 'object') {
      let metaModelAttr = modelAttr
      modelAttr = []
      Object.keys(metaModelAttr).forEach((e) => {
        if (supportedAttr.includes(e)) {
          modelAttr.push({
            attribute: e,
            value: stripText(metaModelAttr[e])
          })
        }
      })
    }
  }

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
  }, [imageUrl, videoUrl])

  // Disable body scroll when full-screen viewer is open
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    
    // Set search block visibility flag to false when full screen opens
    document.body.setAttribute('data-fullscreen-open', 'true')

    return () => {
      document.body.style.overflow = 'unset'
      // Set search block visibility flag to true when full screen closes
      document.body.setAttribute('data-fullscreen-open', 'false')
    }
  }, [])

  const clickOn18PlusImage = async () => {
    const forbid = await forbid18Plus()
    if (forbid) return
    setShowAgeCheck(true)
  }

  const loadingImage = () => {
    if (errored) {
      return (
        <div style={{ textAlign: 'center', marginTop: '40px', marginBottom: '20px' }}>
          {t('general.load-failed')}
          <br />
        </div>
      )
    } else if (!loaded) {
      return (
        <div style={{ textAlign: 'center', marginTop: '40px', marginBottom: '20px' }}>
          <span className="waiting"></span>
          <br />
          {t('general.loading')}
        </div>
      )
    }
  }

  // Reusable button rendering functions
  const renderTabButtons = (containerClass = '') => (
    contentTabList.length > 1 && (
      <div className={`${styles['fv-tabs-container']} ${containerClass}`}>
        {contentTabList.map(tab => (
          <button
            key={tab.value}
            onClick={() => setContentTab(tab.value)}
            className={`${styles['fv-tab-button']} ${contentTab === tab.value ? styles['fv-tab-button-active'] : ''}`}
          >
            {tab.label}
          </button>
        ))}
      </div>
    )
  );

  const renderActionButtons = (containerClass = '') => {
    // Use the actual content URL for download, not the clUrl
    let downloadUrl = null
    if (contentTab === 'image' && imageUrl) {
      downloadUrl = imageUrl
    } else if (contentTab === 'video' && videoUrl) {
      downloadUrl = videoUrl
    } else if (contentTab === 'model' && modelUrl) {
      downloadUrl = modelUrl
    } else if (contentTab === 'audio' && audioUrl) {
      downloadUrl = audioUrl
    }

    return (
      <div className={`${styles['fv-actions-container']} ${containerClass}`}>
        {downloadUrl && (
          <a 
            href={downloadUrl} 
            target="_blank" 
            rel="noreferrer"
            className={`${styles['fv-button']} ${styles['fv-action-button']}`}
          >
            {t('tabs.' + contentTab)} {downloadIcon}
          </a>
        )}
        
        <button
          onClick={onClose}
          className={`${styles['fv-button']} ${styles['fv-close-button']}`}
        >
          <FaTimes /> Close
        </button>
      </div>
    );
  };

  const renderDownloadButton = (url, label) => (
    <a 
      href={url} 
      target="_blank" 
      rel="noreferrer"
      className={`${styles['fv-button']} ${styles['fv-action-button']}`}
    >
      {label} {downloadIcon}
    </a>
  );

  return (
    <div className={styles['fv-root']}>
      <Head>
        <title>{nftName(nft) || 'NFT Viewer'} - Full Screen</title>
      </Head>
      
      {/* Header with close button and tabs */}
      <div className={styles['fv-header']}>
        <div className={styles['fv-header-left']}>
          <h2 className={styles['fv-title']} style={{ color: 'white', margin: 0, fontSize: '24px' }}>
            {nftName(nft) || 'NFT Viewer'}
          </h2>
          
          {renderTabButtons()}
        </div>
        
        {renderActionButtons()}

        {/* Mobile buttons row */}
        <div className={styles['fv-mobile-buttons']}>
          {renderTabButtons()}
          {renderActionButtons()}
        </div>
      </div>

      {/* Content Area */}
      <div className={styles['fv-content']}>
        {needNftAgeCheck(nft) ? (
          <img
            src="/images/nft/18plus.jpg"
            className={styles['fv-age-image']}
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
                    id="fullscreen-panorama"
                    sceneId="fullscreenScene"
                    imageSource={defaultUrl}
                    config={{
                      autoLoad: true,
                      autoRotate: -2
                    }}
                    className={styles['fv-panorama']}
                    style={{ display: loaded ? 'inline-block' : 'none' }}
                  />
                ) : (
                  <img
                    className={styles['fv-media-image']}
                    style={{ 
                      imageRendering: imageStyle.imageRendering,
                      filter: imageStyle.filter,
                      display: loaded ? 'inline-block' : 'none'
                    }}
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
            
            {videoUrl && contentTab === 'video' && (
              <>
                {loadingImage()}
                {isPanoramic ? (
                  <ReactPannellum
                    id="fullscreen-video-panorama"
                    sceneId="fullscreenVideoScene"
                    imageSource={videoUrl}
                    config={{
                      autoLoad: true,
                      autoRotate: 0
                    }}
                    className={styles['fv-panorama']}
                    style={{ display: loaded ? 'inline-block' : 'none' }}
                  />
                ) : (
                  <video 
                    autoPlay 
                    playsInline 
                    muted 
                    loop 
                    controls 
                    className={styles['fv-video']}
                  >
                    <source src={videoUrl} type="video/mp4" />
                  </video>
                )}
              </>
            )}
            
            {modelUrl && contentTab === 'model' && (
              <>
                <Head>
                  <script type="module" src="/js/model-viewer.min.js?v=2" defer />
                </Head>
                <model-viewer
                  className={`model-viewer ${styles['fv-model']}`}
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
          </>
        )}
      </div>

      {/* Audio player at bottom if applicable */}
      {defaultTab !== 'model' && defaultTab !== 'video' && audioUrl && (
        <div className={styles['fv-audio-bar']}>
          <div className={styles['fv-audio-row']}>
            <audio 
              src={audioUrl} 
              controls 
              className={styles['fv-audio']}
            />
            {renderDownloadButton(audioUrl, t('tabs.audio'))}
          </div>
        </div>
      )}

      {showAgeCheck && <AgeCheck setShowAgeCheck={setShowAgeCheck} />}
    </div>
  )
}

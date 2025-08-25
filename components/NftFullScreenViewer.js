import { useState, useEffect } from 'react'
import { useTranslation } from 'next-i18next'
import Head from 'next/head'

import { forbid18Plus, stripText } from '../utils'
import { needNftAgeCheck, nftName, nftUrl } from '../utils/nft'

import LoadingGif from '../public/images/loading.gif'
import { FaCloudDownloadAlt, FaTimes } from 'react-icons/fa'
import ReactPannellum from 'react-pannellum'
import AgeCheck from './UI/AgeCheck'

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

  let imageStyle = { width: '100%', height: 'auto', maxHeight: '80vh' }
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

  return (
    <div style={{ 
      position: 'fixed', 
      top: 0, 
      left: 0, 
      right: 0, 
      bottom: 0, 
      backgroundColor: 'rgba(0, 0, 0, 0.95)', 
      zIndex: 9999,
      overflow: 'auto'
    }}>
      <Head>
        <title>{nftName(nft) || 'NFT Viewer'} - Full Screen</title>
      </Head>
      
      {/* Header with close button and tabs */}
      <div style={{ 
        position: 'sticky', 
        top: '80px',  
        padding: '15px 20px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <h2 style={{ color: 'white', margin: 0, fontSize: '24px' }}>
            {nftName(nft) || 'NFT Viewer'}
          </h2>
          
          {contentTabList.length > 1 && (
            <div style={{ display: 'flex', gap: '10px' }}>
              {contentTabList.map(tab => (
                <button
                  key={tab.value}
                  onClick={() => setContentTab(tab.value)}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: contentTab === tab.value ? 'var(--accent-link)' : 'transparent',
                    color: 'white',
                    border: '1px solid var(--accent-link)',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '14px'
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          )}
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          {defaultUrl && (
            <a 
              href={defaultUrl} 
              target="_blank" 
              rel="noreferrer"
              style={{
                color: 'white',
                textDecoration: 'none',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 16px',
                border: '1px solid var(--accent-link)',
                borderRadius: '4px',
                fontSize: '14px'
              }}
            >
              {t('tabs.' + defaultTab)} {downloadIcon}
            </a>
          )}
          
          <button
            onClick={onClose}
            style={{
              backgroundColor: 'transparent',
              color: 'white',
              border: '1px solid var(--accent-link)',
              borderRadius: '4px',
              padding: '8px 16px',
              cursor: 'pointer',
              fontSize: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <FaTimes /> Close
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: 'calc(100vh - 120px)',
        padding: '20px 0'
      }}>
        {needNftAgeCheck(nft) ? (
          <img
            src="/images/nft/18plus.jpg"
            style={{ maxWidth: '100%', maxHeight: '80vh', height: 'auto' }}
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
                    style={{ 
                      width: '90vw', 
                      height: '80vh', 
                      display: loaded ? 'inline-block' : 'none',
                      maxWidth: '1200px'
                    }}
                  />
                ) : (
                  <img
                    style={{ 
                      ...imageStyle, 
                      display: loaded ? 'inline-block' : 'none',
                      maxWidth: '90vw',
                      maxHeight: '80vh',
                      objectFit: 'contain'
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
                    style={{ 
                      width: '90vw', 
                      height: '80vh', 
                      display: loaded ? 'inline-block' : 'none',
                      maxWidth: '1200px'
                    }}
                  />
                ) : (
                  <video 
                    autoPlay 
                    playsInline 
                    muted 
                    loop 
                    controls 
                    style={{ 
                      maxWidth: '90vw', 
                      maxHeight: '80vh', 
                      width: 'auto',
                      height: 'auto'
                    }}
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
                  className="model-viewer"
                  src={modelUrl}
                  camera-controls
                  auto-rotate
                  ar
                  poster={LoadingGif}
                  autoplay
                  ar-modes="webxr scene-viewer quick-look"
                  style={{
                    width: '90vw',
                    height: '80vh',
                    maxWidth: '1200px'
                  }}
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
        <div style={{ 
          position: 'fixed', 
          bottom: 0, 
          left: 0, 
          right: 0, 
          backgroundColor: 'rgba(0, 0, 0, 0.8)', 
          padding: '20px',
          backdropFilter: 'blur(10px)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '20px' }}>
            <audio 
              src={audioUrl} 
              controls 
              style={{ 
                maxWidth: '600px',
                width: '100%'
              }}
            />
            <a 
              href={clUrl.audio} 
              target="_blank" 
              rel="noreferrer"
              style={{
                color: 'white',
                textDecoration: 'none',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 16px',
                border: '1px solid var(--accent-link)',
                borderRadius: '4px'
              }}
            >
              {t('tabs.audio')} {downloadIcon}
            </a>
          </div>
        </div>
      )}

      {showAgeCheck && <AgeCheck setShowAgeCheck={setShowAgeCheck} />}
    </div>
  )
}

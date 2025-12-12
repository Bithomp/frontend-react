import { useTranslation } from 'next-i18next'
import Head from 'next/head'
import { useRef, useEffect } from 'react'
import ReactPannellum from 'react-pannellum'
import LoadingGif from '../../public/images/loading.gif'
import { 
  needNftAgeCheck, 
  nftName, 
  renderLoadingImage,
  handle18PlusClick
} from '../../utils/nft'

export default function NftContentRenderer({
  nft,
  contentTab,
  imageUrl,
  videoUrl,
  modelUrl,
  defaultTab,
  defaultUrl,
  clUrl,
  imageStyle,
  modelAttr,
  isPanoramic,
  loaded,
  errored,
  setLoaded,
  setErrored,
  setShowAgeCheck,
  classNamePrefix = 'fv-preview',
  panoramaIds = { image: '1', video: '2' },
  panoramaSceneIds = { image: 'firstScene', video: 'videoScene' }
}) {
  const { t } = useTranslation()
  const modelViewerRef = useRef(null)

  const clickOn18PlusImage = () => handle18PlusClick(setShowAgeCheck)

  useEffect(() => {
    const modelViewer = modelViewerRef.current
    if (!modelViewer || defaultTab !== 'model') return

    const handleLoad = () => {
      setLoaded(true)
      setErrored(false)
    }

    const handleError = () => {
      setErrored(true)
    }

    modelViewer.addEventListener('load', handleLoad)
    modelViewer.addEventListener('error', handleError)

    return () => {
      modelViewer.removeEventListener('load', handleLoad)
      modelViewer.removeEventListener('error', handleError)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultTab, modelUrl])

  return (
    <>
      {needNftAgeCheck(nft) ? (
        <img
          src="/images/nft/18plus.jpg"
          className={`${classNamePrefix}-age-image`}
          onClick={clickOn18PlusImage}
          alt="18 plus content"
        />
      ) : (
        <>
          {imageUrl && contentTab === 'image' && (
            <>
              {renderLoadingImage(errored, loaded, t)}
              {isPanoramic ? (
                <ReactPannellum
                  id={panoramaIds.image}
                  sceneId={panoramaSceneIds.image}
                  imageSource={defaultUrl}
                  config={{
                    autoLoad: true,
                    autoRotate: -2
                  }}
                  className={`${classNamePrefix}-panorama`}
                  style={{ display: loaded ? 'inline-block' : 'none' }}
                />
              ) : (
                <img
                  className={classNamePrefix === 'fv-fullscreen' ? 'fv-fullscreen-media-image' : `${classNamePrefix}-image`}
                  style={(() => {
                    if (classNamePrefix === 'fv-fullscreen') {
                      return {
                        imageRendering: imageStyle.imageRendering,
                        filter: imageStyle.filter,
                        display: loaded ? 'inline-block' : 'none'
                      }
                    }
                    return {
                      ...imageStyle,
                      display: loaded ? 'inline-block' : 'none'
                    }
                  })()}
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
              {renderLoadingImage(errored, loaded, t)}
              {isPanoramic ? (
                <ReactPannellum
                  id={panoramaIds.video}
                  sceneId={panoramaSceneIds.video}
                  imageSource={videoUrl}
                  config={{
                    autoLoad: true,
                    autoRotate: 0
                  }}
                  className={`${classNamePrefix}-panorama`}
                  style={{ display: loaded ? 'inline-block' : 'none' }}
                />
              ) : (
                <video 
                  autoPlay 
                  playsInline 
                  muted 
                  loop 
                  controls 
                  className={`${classNamePrefix}-video`}
                  style={{ display: loaded ? 'block' : 'none' }}
                  onLoadedData={() => {
                    setLoaded(true)
                    setErrored(false)
                  }}
                  onError={() => {
                    setErrored(true)
                  }}
                >
                  <source src={videoUrl} type="video/mp4" />
                </video>
              )}
            </>
          )}
          
          {modelUrl && defaultTab === 'model' && (
            <>
              {renderLoadingImage(errored, loaded, t)}
              <Head>
                <script type="module" src="/js/model-viewer.min.js?v=2" defer />
              </Head>
              <model-viewer
                ref={modelViewerRef}
                className={`model-viewer ${classNamePrefix === 'fv-fullscreen' ? 'fv-fullscreen-model' : ''}`}
                src={modelUrl}
                camera-controls
                auto-rotate
                ar
                poster={LoadingGif}
                autoplay
                ar-modes="webxr scene-viewer quick-look"
                style={{ opacity: loaded ? 1 : 0 }}
                {...modelAttr?.reduce((prev, curr) => {
                  prev[curr.attribute] = curr.value
                  return prev
                }, {})}
              ></model-viewer>
            </>
          )}
        </>
      )}
    </>
  )
}


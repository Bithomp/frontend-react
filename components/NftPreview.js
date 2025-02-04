import { useState } from 'react'
import { useTranslation } from 'next-i18next'
import Head from 'next/head'

import { stripText } from '../utils'
import { nftName, nftUrl } from '../utils/nft'

import Tabs from './Tabs'
import LoadingGif from '../public/images/loading.gif'
import { FaCloudDownloadAlt } from 'react-icons/fa'

const downloadIcon = (
  <div style={{ display: 'inline-block', verticalAlign: 'bottom', height: '19px' }}>
    <FaCloudDownloadAlt />
  </div>
)

export default function NftPreview({ nft }) {
  const { t } = useTranslation()
  const [contentTab, setContentTab] = useState('image')
  const [loaded, setLoaded] = useState(false)
  const [errored, setErrored] = useState(false)

  const style = {
    textAlign: 'center',
    marginTop: '40px',
    marginBottom: '20px'
  }

  const loadingImage = () => {
    if (errored) {
      return (
        <div style={style}>
          {t('general.load-failed')}
          <br />
        </div>
      )
    } else if (!loaded) {
      return (
        <div style={style}>
          <span className="waiting"></span>
          <br />
          {t('general.loading')}
        </div>
      )
    }
  }

  const imageUrl = nftUrl(nft, 'image')
  const videoUrl = nftUrl(nft, 'video')
  const audioUrl = nftUrl(nft, 'audio')
  const modelUrl = nftUrl(nft, 'model')
  const viewerUrl = nftUrl(nft, 'viewer')

  let modelState = null

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

  let imageStyle = { width: '100%', height: 'auto' }
  if (imageUrl) {
    if (imageUrl.slice(0, 10) === 'data:image') {
      imageStyle.imageRendering = 'pixelated'
    }
    if (nft.deletedAt) {
      imageStyle.filter = 'grayscale(1)'
    }
  }
  let errorStyle = { marginTop: '40px' }
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

  return (
    <>
      {contentTabList.length > 1 && (
        <div style={{ height: '31px', marginBottom: '10px' }}>
          <span className="tabs-inline" style={{ float: 'left' }}>
            <Tabs
              tabList={contentTabList}
              tab={contentTab}
              setTab={setContentTab}
              name="content"
              style={{ margin: 0 }}
            />
          </span>
          <span style={{ float: 'right', padding: '4px 0px' }}>
            <a href={clUrl[contentTab]} target="_blank" rel="noreferrer">
              {t('tabs.' + contentTab)} {downloadIcon}
            </a>
          </span>
        </div>
      )}
      {imageUrl && contentTab === 'image' && (
        <>
          {loadingImage(nft)}
          <img
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
        </>
      )}
      {videoUrl && defaultTab === 'video' && (
        <video autoPlay playsInline muted loop controls style={{ width: '100%', height: 'auto' }}>
          <source src={videoUrl} type="video/mp4" />
        </video>
      )}
      {modelUrl && defaultTab === 'model' && (
        <>
          {modelState === 'loading' && (
            <div style={style}>
              <span className="waiting"></span>
              <br />
              {t('general.loading')}
            </div>
          )}
          {modelState !== 'ready' && (
            <>
              <Head>
                <script type="module" src="/js/model-viewer.min.js" defer />
              </Head>
              <model-viewer
                className="model-viewer"
                src={modelUrl}
                camera-controls
                auto-rotate
                ar
                poster={LoadingGif}
                autoplay
                {...modelAttr?.reduce((prev, curr) => {
                  prev[curr.attribute] = curr.value
                  return prev
                }, {})}
              ></model-viewer>
            </>
          )}
        </>
      )}
      {contentTabList.length < 2 && defaultUrl && (
        <span style={{ padding: '4px 0px' }}>
          <a href={defaultUrl} target="_blank" rel="noreferrer">
            {t('tabs.' + defaultTab)}
          </a>{' '}
          <a href={defaultUrl} target="_blank" rel="noreferrer">
            {downloadIcon}
          </a>
        </span>
      )}

      {defaultTab !== 'model' && defaultTab !== 'video' && audioUrl && (
        <>
          <audio src={audioUrl} controls style={{ display: 'block', margin: '20px auto' }}></audio>
          <span style={{ padding: '4px 0px' }}>
            <a href={clUrl.audio} target="_blank" rel="noreferrer">
              {t('tabs.audio')} {downloadIcon}
            </a>
          </span>
        </>
      )}
      {viewerUrl && (
        <span style={{ padding: '4px 0px', float: 'right' }}>
          <a href={viewerUrl} target="_blank" rel="noreferrer">
            {t('general.viewer')}
          </a>
        </span>
      )}
      {!nft.uri && !nft.metadata ? (
        <div className="center bold" style={errorStyle}>
          {t('general.no-uri')}
        </div>
      ) : (
        <>
          {!(imageUrl || videoUrl || audioUrl || modelUrl) && (
            <div className="center bold" style={errorStyle}>
              {t('general.no-media')}
            </div>
          )}
        </>
      )}
      <div style={{ height: '15px' }}></div>
    </>
  )
}

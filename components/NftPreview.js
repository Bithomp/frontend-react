import { useState } from 'react'

import { 
  renderDownloadButton
} from '../utils/nft'

import { useNftContent } from '../hooks/useNftContent'
import Tabs from './Tabs'
import { FaExpand } from 'react-icons/fa'
import AgeCheck from './UI/AgeCheck'
import NftFullScreenViewer from './NftFullScreenViewer'
import NftContentRenderer from './Nft/NftContentRenderer'
import styles from '../styles/components/nftPreview.module.scss'

export default function NftPreview({ nft, setIsHidden }) {
  const [showFullScreen, setShowFullScreen] = useState(false)

  const {
    contentTab,
    setContentTab,
    loaded,
    setLoaded,
    errored,
    setErrored,
    isPanoramic,
    showAgeCheck,
    setShowAgeCheck,
    imageUrl,
    videoUrl,
    audioUrl,
    modelUrl,
    viewerUrl,
    clUrl,
    contentTabList,
    imageStyle,
    defaultTab,
    defaultUrl,
    modelAttr,
    t
  } = useNftContent(nft)

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


  return (
    <div className={styles.nftPreview}>
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

      <NftContentRenderer
        nft={nft}
        contentTab={contentTab}
        imageUrl={imageUrl}
        videoUrl={videoUrl}
        modelUrl={modelUrl}
        defaultTab={defaultTab}
        defaultUrl={defaultUrl}
        clUrl={clUrl}
        imageStyle={imageStyle}
        modelAttr={modelAttr}
        isPanoramic={isPanoramic}
        loaded={loaded}
        errored={errored}
        setLoaded={setLoaded}
        setErrored={setErrored}
        setShowAgeCheck={setShowAgeCheck}
        classNamePrefix="fv-preview"
        panoramaIds={{ image: '1', video: '2' }}
        panoramaSceneIds={{ image: 'firstScene', video: 'videoScene' }}
      />
      
      {contentTabList.length < 2 && defaultUrl && (
        <span className="fv-preview-action-row">
          {renderFullScreenButton()}
          {renderDownloadButton(defaultUrl, t('tabs.' + defaultTab))}
        </span>
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

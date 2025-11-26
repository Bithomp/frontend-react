import { useEffect } from 'react'
import Head from 'next/head'

import { 
  nftName, 
  renderDownloadButton
} from '../utils/nft'

import { useNftContent } from '../hooks/useNftContent'
import { FaTimes } from 'react-icons/fa'
import AgeCheck from './UI/AgeCheck'
import NftContentRenderer from './Nft/NftContentRenderer'
import styles from '../styles/components/nftFullScreenViewer.module.scss'

export default function NftFullScreenViewer({ nft, onClose }) {
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
    clUrl,
    contentTabList,
    imageStyle,
    defaultTab,
    defaultUrl,
    modelAttr,
    t
  } = useNftContent(nft, { baseStyle: { width: '100%', height: 'auto', maxHeight: '76vh' } })

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    
    document.body.setAttribute('data-fullscreen-open', 'true')

    return () => {
      document.body.style.overflow = 'unset'
      document.body.setAttribute('data-fullscreen-open', 'false')
    }
  }, [])


  // Reusable button rendering functions
  const renderTabButtons = (containerClass = '') => (
    contentTabList.length > 1 && (
      <div className={`fv-fullscreen-tabs-container ${containerClass}`}>
        {contentTabList.map(tab => (
          <button
            key={tab.value}
            onClick={() => setContentTab(tab.value)}
            className={`fv-fullscreen-tab-button ${contentTab === tab.value ? 'fv-fullscreen-tab-button-active' : ''}`}
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
      <div className={`fv-fullscreen-actions-container ${containerClass}`}>
        {downloadUrl && renderDownloadButton(downloadUrl, t('tabs.' + contentTab), 'fv-fullscreen-button fv-fullscreen-action-button')}
        
        <button
          onClick={onClose}
          className="fv-fullscreen-button fv-fullscreen-close-button"
        >
          <FaTimes /> Close
        </button>
      </div>
    );
  };


  return (
    <div className={styles.nftFullScreenView}>
      <div className="fv-fullscreen-root">
        <Head>
          <title>{nftName(nft) || 'NFT Viewer'} - Full Screen</title>
        </Head>
        
        {/* Header with close button and tabs */}
        <div className="fv-fullscreen-header">
          <div className="fv-fullscreen-header-left">
            <h2 className="fv-fullscreen-title">
              {nftName(nft) || 'NFT Viewer'}
            </h2>
            
            {renderTabButtons()}
          </div>
          
          {renderActionButtons()}

          {/* Mobile buttons row */}
          <div className="fv-fullscreen-mobile-buttons">
            {renderTabButtons()}
            {renderActionButtons()}
          </div>
        </div>

        {/* Content Area */}
        <div className="fv-fullscreen-content">
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
            classNamePrefix="fv-fullscreen"
            panoramaIds={{ image: 'fullscreen-panorama', video: 'fullscreen-video-panorama' }}
            panoramaSceneIds={{ image: 'fullscreenScene', video: 'fullscreenVideoScene' }}
          />
        </div>

        {/* Audio player at bottom if applicable */}
        {defaultTab !== 'model' && defaultTab !== 'video' && audioUrl && (
          <div className="fv-fullscreen-audio-bar">
            <div className="fv-fullscreen-audio-row">
              <audio 
                src={audioUrl} 
                controls 
                className="fv-fullscreen-audio"
              />
              {renderDownloadButton(audioUrl, t('tabs.audio'), 'fv-fullscreen-button fv-fullscreen-action-button')}
            </div>
          </div>
        )}

        {showAgeCheck && <AgeCheck setShowAgeCheck={setShowAgeCheck} />}
      </div>
    </div>
  )
}

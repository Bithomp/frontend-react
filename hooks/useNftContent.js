import { useState, useEffect } from 'react'
import { useTranslation } from 'next-i18next'
import { 
  isPanorama, 
  processModelAttributes, 
  buildContentTabList, 
  extractNftUrls, 
  getDefaultTabAndUrl, 
  buildImageStyle
} from '../utils/nft'

/**
 * Custom hook that manages NFT content state and logic
 * @param {Object} nft - The NFT object
 * @param {Object} imageStyleOptions - Optional options for buildImageStyle
 * @returns {Object} NFT content state and computed values
 */
export const useNftContent = (nft, imageStyleOptions = {}) => {
  const { t } = useTranslation()
  const [contentTab, setContentTab] = useState('image')
  const [loaded, setLoaded] = useState(true)
  const [errored, setErrored] = useState(false)
  const [isPanoramic, setIsPanoramic] = useState(false)
  const [showAgeCheck, setShowAgeCheck] = useState(false)

  // Extract URLs and build content structures
  const { imageUrl, videoUrl, audioUrl, modelUrl, viewerUrl, clUrl } = extractNftUrls(nft)

  const contentTabList = buildContentTabList(imageUrl, videoUrl, modelUrl, t)
  const imageStyle = buildImageStyle(imageUrl, nft, imageStyleOptions)
  const { defaultTab, defaultUrl } = getDefaultTabAndUrl(contentTab, imageUrl, clUrl)
  const modelAttr = processModelAttributes(nft)

  // Handle panorama detection and loading state
  useEffect(() => {
    // Reset loading state when content changes
    setLoaded(false)
    setErrored(false)
    
    if (imageUrl || videoUrl) {
      const panoramic = isPanorama(nft.metadata)
      setIsPanoramic(panoramic)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imageUrl, videoUrl, modelUrl, contentTab])

  return {
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
  }
}


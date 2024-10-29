import { useState, useEffect } from 'react'

const useProgressiveImage = (src) => {
  const [sourceLoaded, setSourceLoaded] = useState(null)

  useEffect(() => {
    const img = new Image()
    img.src = src
    img.onload = () => setSourceLoaded(src)
  }, [src])

  return sourceLoaded
}

export const LazyBackground = ({ src, className }) => {
  const loaded = useProgressiveImage(src)
  return <div style={loaded ? { backgroundImage: `url(${loaded})` } : {}} className={className} />
}

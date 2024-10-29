import NextImage from 'next/image'
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

export const LazyLoadImage = ({ src, className, width, height, alt, priority }) => {
  const loaded = useProgressiveImage(src)
  if (!loaded) return null
  return <NextImage src={loaded} className={className} width={width} height={height} alt={alt} priority={priority} />
}

import { useState } from 'react'

export default function DappLogo({ src, alt = 'logo', ...props }) {
  const [error, setError] = useState(false)
  if (!src || error) return null
  const { width = 36, height = 36, style, className = '', ...imageProps } = props
  const customStyle = { ...(style || {}) }
  delete customStyle.border
  delete customStyle.boxShadow
  const imageWidth = Number(width) || 36
  const imageHeight = Number(height) || 36

  return (
    <img
      className={`entity-icon-outline ${className}`.trim()}
      src={src}
      alt={alt}
      width={imageWidth}
      height={imageHeight}
      style={{
        borderRadius: 8,
        background: '#fff',
        marginRight: 8,
        verticalAlign: 'middle',
        marginTop: 4,
        objectFit: 'contain',
        ...customStyle
      }}
      loading="lazy"
      decoding="async"
      onError={() => setError(true)}
      {...imageProps}
    />
  )
}

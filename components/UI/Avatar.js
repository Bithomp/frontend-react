import Image from 'next/image'
import { appendImageParams, retinaImageSize } from '../../utils'

export default function Avatar({ src, alt = 'avatar', size = 35, style = {}, className = '' }) {
  const customStyle = { ...style }
  delete customStyle.border
  delete customStyle.boxShadow
  const imageSrc = appendImageParams(src, { size: retinaImageSize(size), hashIconZoom: 12 })

  return (
    <span
      className={`entity-icon-outline ${className}`.trim()}
      style={{
        display: 'inline-block',
        background: 'white',
        borderRadius: '50%',
        width: size,
        height: size,
        minWidth: size,
        minHeight: size,
        lineHeight: 0,
        overflow: 'hidden',
        verticalAlign: 'middle',
        ...customStyle
      }}
    >
      <Image
        alt={alt}
        src={imageSrc}
        width={size}
        height={size}
        style={{
          display: 'block',
          width: '100%',
          height: '100%',
          borderRadius: '50%',
          objectFit: 'cover',
          verticalAlign: 'middle'
        }}
      />
    </span>
  )
}

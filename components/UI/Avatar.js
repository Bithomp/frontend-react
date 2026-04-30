import Image from 'next/image'
import { useTheme } from '../Layout/ThemeContext'

export default function Avatar({ src, alt = 'avatar', size = 35, style = {} }) {
  const { theme } = useTheme()
  return (
    <span
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
        border: theme === 'dark' ? '1px solid #444' : '1px solid #eee',
        ...style
      }}
    >
      <Image
        alt={alt}
        src={src + (src?.includes('?') ? '&' : '?') + 'hashIconZoom=12'}
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

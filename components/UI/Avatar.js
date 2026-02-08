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
        overflow: 'hidden',
        verticalAlign: 'middle',
        border: theme === 'dark' ? '1px solid #444' : '1px solid #eee',
        ...style
      }}
    >
      <Image
        alt={alt}
        src={src}
        width={size}
        height={size}
        style={{ verticalAlign: 'middle', transform: 'scale(1.10)' }}
      />
    </span>
  )
}

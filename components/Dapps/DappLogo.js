import Image from 'next/image'
import { useState } from 'react'

export default function DappLogo({ src, alt = 'logo', ...props }) {
  const [error, setError] = useState(false)
  if (!src || error) return null
  return (
    <Image
      src={src}
      alt={alt}
      width={22}
      height={22}
      style={{ borderRadius: 6, background: '#fff', marginRight: 8, verticalAlign: 'middle' }}
      onError={() => setError(true)}
      {...props}
    />
  )
}

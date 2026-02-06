import Image from 'next/image'
import { useState } from 'react'

export default function DappLogo({ src, alt = 'logo', ...props }) {
  const [error, setError] = useState(false)
  if (!src || error) return null
  return (
    <Image
      src={src}
      alt={alt}
      width={36}
      height={36}
      style={{
        borderRadius: 8,
        background: '#fff',
        marginRight: 8,
        verticalAlign: 'middle',
        marginTop: '-7px',
        marginBottom: '-7px',
        boxShadow: '0 1px 4px rgba(0,0,0,0.08)'
      }}
      onError={() => setError(true)}
      {...props}
    />
  )
}

import { useState } from 'react'

export default function DappLogo({ src, alt = 'logo', ...props }) {
  const [error, setError] = useState(false)
  if (!src || error) return null
  return (
    <img
      src={src}
      alt={alt}
      width="36"
      height="36"
      style={{
        borderRadius: 8,
        background: '#fff',
        marginRight: 8,
        verticalAlign: 'middle',
        marginTop: 4,
        boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
        objectFit: 'contain'
      }}
      loading="lazy"
      decoding="async"
      onError={() => setError(true)}
      {...props}
    />
  )
}

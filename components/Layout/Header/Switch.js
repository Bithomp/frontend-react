import { useState, useEffect } from 'react'
import { useTheme } from 'next-themes'
import Image from 'next/image'

export default function Switch() {
  const [mounted, setMounted] = useState(false)
  const { theme, setTheme } = useTheme()

  // When mounted on client, now we can show the UI
  useEffect(() => setMounted(true), [])

  if (!mounted) return null

  const switchOnClick = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark')
  }

  return (
    <div className="theme-switch">
      <div className={`switch-container ${theme}`} onClick={switchOnClick}>
        <Image src="/images/sun.svg" className="switch-icon sun" alt="light mode" height={15} width={15} />
        <Image src="/images/sponsored/moon.svg" className="switch-icon moon" alt="dark mode" height={15} width={15} />
      </div>
    </div>
  )
}

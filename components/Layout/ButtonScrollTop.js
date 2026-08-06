import { useCallback, useEffect, useState } from 'react'
import { buttonArrowScroll } from '../../styles/components/buttonScrollTop.module.scss'

import { BsArrowUp } from 'react-icons/bs'

export default function ButtonScrollTop({ footer }) {
  const [buttonState, setButtonState] = useState({ isShown: false, isFixedButton: false })

  const handleScroll = useCallback(() => {
    if (!footer.current) return

    const scrollPosition = window.pageYOffset + window.innerHeight
    const isShown = window.pageYOffset !== 0
    const isFixedButton = scrollPosition > footer.current.offsetTop

    setButtonState({ isShown, isFixedButton })
  }, [footer])

  useEffect(() => {
    window.addEventListener('scroll', handleScroll)

    return () => {
      window.removeEventListener('scroll', handleScroll)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const scrollTop = useCallback(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [])

  return (
    <div className={buttonArrowScroll}>
      <button
        aria-label="ScrollUp"
        className={
          'button-arrow-scroll' +
          (buttonState.isShown ? ' is-shown' : '') +
          (buttonState.isFixedButton ? ' is-fixed' : '')
        }
        onClick={scrollTop}
      >
        <BsArrowUp />
      </button>
    </div>
  )
}

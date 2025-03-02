import { useState } from 'react'
import { useTranslation } from 'next-i18next'

const copyTextToClipboard = async (text) => {
  if ('clipboard' in navigator) {
    return await navigator.clipboard.writeText(text)
  } else {
    return document.execCommand('copy', true, text)
  }
}

export default function CopyButton({ text }) {
  const { t } = useTranslation()

  const [isCopied, setIsCopied] = useState(false)
  const [isTooltipEnabled, setIsTooltipEnabled] = useState(true)

  const handleCopyClick = () => {
    copyTextToClipboard(text)
      .then(() => {
        setIsCopied(true)
        setTimeout(() => {
          setIsCopied(false)
          setIsTooltipEnabled(false)
        }, 1000)
        setTimeout(() => {
          setIsTooltipEnabled(true)
        }, 5000)
      })
      .catch((err) => {
        console.log(err)
      })
  }

  if (!text) return ''

  const notCopiedStyle = {
    outline: 'none',
    marginBottom: '-3px'
  }

  const copiedStyle = {
    ...notCopiedStyle,
    fill: '#FCAC45'
  }

  return (
    <span className="tooltip">
      <svg
        version="1.1"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 210.107 210.107"
        width="20px"
        height="20px"
        className="change-fill"
        fill="#00B1C1"
        style={isCopied ? copiedStyle : notCopiedStyle}
        onClick={handleCopyClick}
      >
        <g>
          <path
            d="M168.506,0H80.235C67.413,0,56.981,10.432,56.981,23.254v2.854h-15.38
		c-12.822,0-23.254,10.432-23.254,23.254v137.492c0,12.822,10.432,23.254,23.254,23.254h88.271
		c12.822,0,23.253-10.432,23.253-23.254V184h15.38c12.822,0,23.254-10.432,23.254-23.254V23.254C191.76,10.432,181.328,0,168.506,0z
		 M138.126,186.854c0,4.551-3.703,8.254-8.253,8.254H41.601c-4.551,0-8.254-3.703-8.254-8.254V49.361
		c0-4.551,3.703-8.254,8.254-8.254h88.271c4.551,0,8.253,3.703,8.253,8.254V186.854z M176.76,160.746
		c0,4.551-3.703,8.254-8.254,8.254h-15.38V49.361c0-12.822-10.432-23.254-23.253-23.254H71.981v-2.854
		c0-4.551,3.703-8.254,8.254-8.254h88.271c4.551,0,8.254,3.703,8.254,8.254V160.746z"
          />
        </g>
      </svg>
      {isTooltipEnabled && <span className="tooltiptext">{isCopied ? t('button.copied') : t('button.copy')}</span>}
    </span>
  )
}

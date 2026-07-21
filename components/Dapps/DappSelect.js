import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/router'
import { useTranslation } from 'next-i18next'
import { FaChevronDown, FaSearch } from 'react-icons/fa'

import { DAPPS_META, generatedAgentNameBySourceTag } from '../../utils/dapps'
import DappLogo from './DappLogo'
import styles from '../../styles/components/dappSelect.module.scss'

const dapps = Object.entries(DAPPS_META?.[0] || {})
  .map(([sourceTag, meta]) => ({ sourceTag, ...meta }))
  .sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')))
const RESULT_LIMIT = 12

export default function DappSelect({ sourceTag }) {
  const router = useRouter()
  const { t } = useTranslation('dapps')
  const rootRef = useRef(null)
  const inputRef = useRef(null)
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')

  const currentMeta = DAPPS_META?.[0]?.[String(sourceTag)] || {}
  const currentName = currentMeta.name || generatedAgentNameBySourceTag(sourceTag) || String(sourceTag)
  const currentLogo = currentMeta.logo ? `/images/dapps/${currentMeta.logo}` : ''
  const normalizedQuery = query.trim()
  const isSourceTag = /^\d+$/.test(normalizedQuery)

  const filteredDapps = useMemo(() => {
    const needle = normalizedQuery.toLowerCase()
    if (!needle) return dapps
    return dapps
      .filter((dapp) => dapp.sourceTag.includes(needle) || String(dapp.name || '').toLowerCase().includes(needle))
  }, [normalizedQuery])
  const matches = filteredDapps.slice(0, RESULT_LIMIT)

  useEffect(() => {
    if (!open) return
    inputRef.current?.focus()
    const closeOnOutsideClick = (event) => {
      if (!rootRef.current?.contains(event.target)) setOpen(false)
    }
    document.addEventListener('mousedown', closeOnOutsideClick)
    return () => document.removeEventListener('mousedown', closeOnOutsideClick)
  }, [open])

  const navigate = (tag) => {
    if (!/^\d+$/.test(String(tag))) return
    setOpen(false)
    setQuery('')
    router.push(`/dapp/${encodeURIComponent(tag)}`)
  }

  const exactMatch = matches.find((dapp) => dapp.sourceTag === normalizedQuery)

  return (
    <div className={styles.root} ref={rootRef}>
      <button
        type="button"
        className={styles.trigger}
        onClick={() => {
          setOpen((value) => !value)
          setQuery('')
        }}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        {currentLogo ? <DappLogo src={currentLogo} alt="" width={26} height={26} className={styles.triggerLogo} /> : null}
        <span>
          <strong>{currentName}</strong>
          <small>{sourceTag}</small>
        </span>
        <FaChevronDown aria-hidden="true" />
      </button>

      {open ? (
        <div className={styles.dropdown}>
          <label className={styles.search}>
            <FaSearch aria-hidden="true" />
            <input
              ref={inputRef}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Escape') setOpen(false)
                if (event.key === 'Enter') {
                  event.preventDefault()
                  if (isSourceTag) navigate(exactMatch?.sourceTag || normalizedQuery)
                  else if (matches[0]) navigate(matches[0].sourceTag)
                }
              }}
              placeholder={t('detail.searchDapp')}
              aria-label={t('detail.searchDapp')}
            />
          </label>

          <div className={styles.options} role="listbox">
            {isSourceTag && !exactMatch ? (
              <button type="button" className={styles.customOption} onClick={() => navigate(normalizedQuery)}>
                <strong>{t('detail.openSourceTag')}</strong>
                <small>{normalizedQuery}</small>
              </button>
            ) : null}
            {matches.map((dapp) => (
              <button
                type="button"
                className={styles.option}
                key={dapp.sourceTag}
                onClick={() => navigate(dapp.sourceTag)}
                role="option"
                aria-selected={dapp.sourceTag === String(sourceTag)}
              >
                {dapp.logo ? <DappLogo src={`/images/dapps/${dapp.logo}`} alt="" width={30} height={30} className={styles.optionLogo} /> : null}
                <span>
                  <strong>{dapp.name || dapp.sourceTag}</strong>
                  <small>{dapp.sourceTag}</small>
                </span>
              </button>
            ))}
            {!matches.length && !isSourceTag ? <div className={styles.empty}>{t('detail.noDappsFound')}</div> : null}
            {filteredDapps.length > RESULT_LIMIT ? (
              <p className={styles.listHint}>{t('detail.searchListHint', { count: RESULT_LIMIT })}</p>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  )
}

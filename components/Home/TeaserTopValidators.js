import { useEffect, useState } from 'react'
import ReactCountryFlag from 'react-country-flag'
import HomeTeaser, { HomeTeaseRow } from './HomeTeaser'
import { shortHash } from '../../utils/format'
import { avatarServer, xahauNetwork } from '../../utils'
import Avatar from '../UI/Avatar'
import { fetchTeaserValidatorsClient } from '../../utils/homeTeaserClientData'
import styles from '@/styles/components/home-teaser.module.scss'

const validatorName = (v) => v.principals?.[0]?.name || shortHash(v.publicKey, 6)
const validatorVersion = (version) => {
  if (!version) return null

  const normalizedVersion = String(version).startsWith('v') ? String(version).slice(1) : String(version)
  const displayVersion = xahauNetwork ? normalizedVersion.split('+')[0] : normalizedVersion

  return xahauNetwork ? displayVersion : `v${displayVersion}`
}

export default function TeaserTopValidators({ data = [], isLoading = false }) {
  const [items, setItems] = useState(data)
  const [isInitialLoading, setIsInitialLoading] = useState(!data?.length || isLoading)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const loading = isInitialLoading && !items?.length
  const showRefresh = isInitialLoading || isRefreshing || !items?.length

  useEffect(() => {
    if (data?.length) {
      setItems(data)
      setIsInitialLoading(false)
    }
  }, [data])

  useEffect(() => {
    let cancelled = false

    const loadData = async () => {
      setIsInitialLoading(true)
      try {
        const latest = await fetchTeaserValidatorsClient()
        if (!cancelled) {
          setItems(latest)
        }
      } finally {
        if (!cancelled) {
          setIsInitialLoading(false)
        }
      }
    }

    loadData()
    return () => {
      cancelled = true
    }
  }, [])

  const refreshData = async () => {
    setIsRefreshing(true)
    try {
      setItems(await fetchTeaserValidatorsClient())
    } finally {
      setIsRefreshing(false)
    }
  }

  return (
    <HomeTeaser
      title="home.teaser.topValidators"
      href="/validators"
      isLoading={loading}
      isRefreshing={isRefreshing || isInitialLoading}
      onRefresh={showRefresh ? refreshData : null}
      isEmpty={!items?.length}
    >
      {items?.map((validator) => (
        <HomeTeaseRow key={validator.publicKey} href={`/validator/${validator.publicKey}`} className={styles.validatorRow}>
          <div className={styles.validatorPrimary}>
            <Avatar
              src={avatarServer + validator.publicKey}
              size={35}
              style={{
                flexShrink: 0,
                background: '#fff',
                border: '1px solid #fff'
              }}
            />
            {validator.ownerCountry && (
              <ReactCountryFlag
                countryCode={validator.ownerCountry}
                style={{ fontSize: '1.3em', lineHeight: '1.3em', flexShrink: 0 }}
                title="Owner"
              />
            )}
            <span className={styles.validatorName}>
              {validatorName(validator)}
            </span>
          </div>
          <div className={styles.validatorDomain}>{validator.domain || ''}</div>
          <div className={styles.validatorServerMeta}>
            {validator.serverCountry && (
              <ReactCountryFlag
                countryCode={validator.serverCountry}
                style={{ fontSize: '1.3em', lineHeight: '1.3em' }}
                title="Server"
              />
            )}
            {validator.serverVersion ? (
              <span className={styles.amendmentVersion}>
                {validatorVersion(validator.serverVersion)}
              </span>
            ) : null}
          </div>
        </HomeTeaseRow>
      ))}
    </HomeTeaser>
  )
}

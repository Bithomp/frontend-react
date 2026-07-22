import { useCallback, useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import { useTranslation } from 'next-i18next'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'

import SEO from '../../components/SEO'
import MptMetadataBuilder from '../../components/Services/MptMetadataBuilder'
import ServicesTabs from '../../components/Tabs/ServicesTabs'
import Dialog from '../../components/UI/Dialog'
import SimpleSelect from '../../components/UI/SimpleSelect'
import { explorerName, isAddressValid } from '../../utils'
import { ipfsUrl } from '../../utils/nft'
import { tokenPage as tokenPreviewTheme } from '../../styles/pages/token.module.scss'
import styles from '../../styles/pages/issue-mpt.module.scss'

const MAX_AMOUNT = 9223372036854775807n
const MAX_METADATA_BYTES = 1024
const FLAGS = [
  ['canTransfer', 32],
  ['canTrade', 16],
  ['canEscrow', 8],
  ['requireAuth', 4],
  ['canLock', 2],
  ['canClawback', 64]
]
const SIMPLE_FLAGS = FLAGS.slice(0, 3)

const cleanNumber = (value, decimals = true) => {
  const cleaned = value.replace(decimals ? /[^\d.]/g : /\D/g, '')
  const [whole, ...fraction] = cleaned.split('.')
  return fraction.length ? `${whole}.${fraction.join('')}` : whole
}

const toBaseUnits = (value, scale) => {
  if (!value) return ''
  if (!/^\d+(\.\d+)?$/.test(value)) return null
  const [whole, fraction = ''] = value.split('.')
  if (fraction.length > scale) return null
  const raw = `${whole}${fraction.padEnd(scale, '0')}`.replace(/^0+(?=\d)/, '')
  return raw || '0'
}

const encodeMetadata = (value) => {
  const bytes = new TextEncoder().encode(value)
  return {
    bytes: bytes.length,
    hex: Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('').toUpperCase()
  }
}

const metadataValue = (value, ...keys) => {
  for (const key of keys) {
    const item = value?.[key]
    if (item !== undefined && item !== null && String(item).trim()) return item
  }
  return ''
}

const metadataIconUrl = (value) => {
  const uri = String(metadataValue(value, 'icon', 'i') || '').trim()
  if (!uri) return ''
  if (/^data:image\//i.test(uri) || /^https?:\/\//i.test(uri)) return uri
  if (/^ipfs:\/\//i.test(uri)) return ipfsUrl(uri, 'image', 'cdn') || ''
  if (/^[a-z][a-z\d+.-]*:/i.test(uri)) return ''
  return `https://${uri}`
}

export async function getServerSideProps({ locale }) {
  return { props: { ...(await serverSideTranslations(locale, ['common', 'services', 'token'])) } }
}

export default function IssueMptPage({ setSignRequest }) {
  const { t } = useTranslation(['common', 'services'])
  const tm = useCallback((key, options) => t(`issue-mpt.${key}`, { ns: 'services', ...options }), [t])
  const [scale, setScale] = useState('0')
  const [maximum, setMaximum] = useState('')
  const [transferFee, setTransferFee] = useState('')
  const [metadata, setMetadata] = useState('')
  const [metadataBuilderValid, setMetadataBuilderValid] = useState(null)
  const [showTokenPreview, setShowTokenPreview] = useState(false)
  const [previewIconError, setPreviewIconError] = useState(false)
  const [mode, setMode] = useState('simple')
  const [domainId, setDomainId] = useState('')
  const [domainOwner, setDomainOwner] = useState('')
  const [ownedDomains, setOwnedDomains] = useState([])
  const [domainsLoading, setDomainsLoading] = useState(false)
  const [domainsLoaded, setDomainsLoaded] = useState(false)
  const [domainsError, setDomainsError] = useState(false)
  const [flags, setFlags] = useState({ canTransfer: true, canTrade: true, canEscrow: true })

  useEffect(() => {
    const owner = domainOwner.trim()
    setOwnedDomains([])
    setDomainsLoaded(false)
    setDomainsError(false)
    if (mode !== 'advanced' || !flags.requireAuth || !isAddressValid(owner)) {
      setDomainsLoading(false)
      return
    }

    const controller = new AbortController()
    const timeout = setTimeout(async () => {
      setDomainsLoading(true)
      try {
        const domains = []
        const seenMarkers = new Set()
        let marker

        do {
          const response = await axios.get(`v2/objects/${owner}`, {
            params: { type: 'permissioned_domain', limit: 1000, ...(marker ? { marker } : {}) },
            signal: controller.signal
          })
          const objects = Array.isArray(response?.data?.objects) ? response.data.objects : []
          domains.push(...objects.filter((object) => object?.LedgerEntryType === 'PermissionedDomain'))

          marker = response?.data?.marker || null
          const markerKey = marker ? JSON.stringify(marker) : ''
          if (markerKey && seenMarkers.has(markerKey)) break
          if (markerKey) seenMarkers.add(markerKey)
        } while (marker)

        setOwnedDomains(domains)
        setDomainsLoaded(true)
      } catch (error) {
        if (!axios.isCancel(error) && error?.name !== 'CanceledError') setDomainsError(true)
      } finally {
        if (!controller.signal.aborted) setDomainsLoading(false)
      }
    }, 400)

    return () => {
      clearTimeout(timeout)
      controller.abort()
    }
  }, [domainOwner, flags.requireAuth, mode])

  const domainOptions = useMemo(
    () =>
      ownedDomains
        .map((domain) => {
          const value = domain?.index || domain?.LedgerIndex
          if (!value) return null
          return {
            value,
            label: `${value}${domain.Sequence ? ` · #${domain.Sequence}` : ''}`
          }
        })
        .filter(Boolean),
    [ownedDomains]
  )

  const previewMetadata = useMemo(() => {
    try {
      const value = JSON.parse(metadata || '{}')
      return value && typeof value === 'object' && !Array.isArray(value) ? value : {}
    } catch (_) {
      return {}
    }
  }, [metadata])
  const previewTicker = String(metadataValue(previewMetadata, 'ticker', 't') || 'MPT')
  const previewName = String(metadataValue(previewMetadata, 'name', 'n') || previewTicker)
  const previewDescription = String(metadataValue(previewMetadata, 'description', 'desc', 'd') || '')
  const previewIssuerName = String(metadataValue(previewMetadata, 'issuer_name', 'in') || '')
  const previewAssetClass = String(metadataValue(previewMetadata, 'asset_class', 'ac') || '')
  const previewAssetSubclass = String(metadataValue(previewMetadata, 'asset_subclass', 'as') || '')
  const previewIcon = metadataIconUrl(previewMetadata)
  const previewPermissions = (mode === 'advanced' ? FLAGS : SIMPLE_FLAGS)
    .filter(([key]) => flags[key])
    .map(([key]) => tm(`permissions.${key}.title`))
    .join(', ')

  useEffect(() => setPreviewIconError(false), [previewIcon])

  const validation = useMemo(() => {
    const assetScale = Number(scale || 0)
    const maximumRaw = toBaseUnits(maximum, assetScale)
    let metadataResult = { bytes: 0, hex: '' }
    let metadataError = ''

    if (metadata.trim()) {
      try {
        const compact = JSON.stringify(JSON.parse(metadata))
        metadataResult = encodeMetadata(compact)
      } catch (_) {
        metadataError = tm('errors.metadataJson')
      }
    }

    const errors = []
    if (!Number.isInteger(assetScale) || assetScale < 0 || assetScale > 255) errors.push(tm('errors.scale'))
    if (maximumRaw === null) errors.push(tm('errors.maximumPrecision', { scale: assetScale }))
    if (maximumRaw && (BigInt(maximumRaw) < 1n || BigInt(maximumRaw) > MAX_AMOUNT)) errors.push(tm('errors.maximumRange'))
    const fee = Number(transferFee || 0)
    if (transferFee && (!/^\d+(\.\d{1,3})?$/.test(transferFee) || fee < 0 || fee > 50)) errors.push(tm('errors.fee'))
    if (fee > 0 && !flags.canTransfer) errors.push(tm('errors.feeTransfer'))
    if (metadataError) errors.push(metadataError)
    if (metadataResult.bytes > MAX_METADATA_BYTES) errors.push(tm('errors.metadataSize', { count: metadataResult.bytes }))
    if (mode === 'advanced' && flags.requireAuth && domainId && !/^[A-Fa-f0-9]{64}$/.test(domainId)) {
      errors.push(tm('errors.domain'))
    }

    const request = { TransactionType: 'MPTokenIssuanceCreate', AssetScale: assetScale }
    const activeFlags = mode === 'advanced' ? FLAGS : SIMPLE_FLAGS
    const flagValue = activeFlags.reduce((total, [key, value]) => total + (flags[key] ? value : 0), 0)
    if (flagValue) request.Flags = flagValue
    if (maximumRaw) request.MaximumAmount = maximumRaw
    if (transferFee && flags.canTransfer) request.TransferFee = Math.floor(fee * 1000)
    if (metadataResult.hex) request.MPTokenMetadata = metadataResult.hex
    if (mode === 'advanced' && flags.requireAuth && domainId) request.DomainID = domainId.toUpperCase()

    return { errors, request, metadataBytes: metadataResult.bytes, maximumRaw }
  }, [domainId, flags, maximum, metadata, mode, scale, tm, transferFee])

  const toggleFlag = (key) => {
    if (key === 'canTransfer' && flags.canTransfer) setTransferFee('')
    setFlags((previous) => ({ ...previous, [key]: !previous[key] }))
  }
  const issuanceErrors = validation.errors.filter(
    (error) => error !== tm('errors.metadataJson') && error !== tm('errors.metadataSize', { count: validation.metadataBytes })
  )
  const useGeneratedMetadata = useCallback(({ json, isValid }) => {
    setMetadata(json)
    setMetadataBuilderValid(json ? isValid : null)
  }, [])
  const permissionOption = (key, className = '') => (
    <label className={`${styles.flag} ${className}`.trim()} key={key}>
      <input type="checkbox" checked={!!flags[key]} onChange={() => toggleFlag(key)} />
      <span className={styles.checkMark} aria-hidden="true" />
      <span>
        <strong>{tm(`permissions.${key}.title`)}</strong>
        <small>{tm(`permissions.${key}.description`)}</small>
      </span>
    </label>
  )

  return (
    <>
      <SEO title={`${tm('title')} | ${explorerName}`} description={tm('seoDescription')} />
      <div className={styles.page}>
        <ServicesTabs category="issuance" tab="issue-mpt" />
        <h1 className="center">{tm('title')}</h1>
        <p className={styles.intro}>{tm('intro')}</p>

        <section className={styles.metadataPanel}>
          <MptMetadataBuilder onMetadataChange={useGeneratedMetadata} />
        </section>

        <div className={styles.layout}>
          <section className={styles.panel}>
            <div className={`radio-options ${styles.modeSelector}`}>
              <div className="radio-input">
                <input
                  type="radio"
                  name="issueMptMode"
                  checked={mode === 'simple'}
                  onChange={() => setMode('simple')}
                  id="issueMptModeSimple"
                />
                <label htmlFor="issueMptModeSimple">{t('trustline.simple', { ns: 'services' })}</label>
              </div>
              <div className="radio-input">
                <input
                  type="radio"
                  name="issueMptMode"
                  checked={mode === 'advanced'}
                  onChange={() => setMode('advanced')}
                  id="issueMptModeAdvanced"
                />
                <label htmlFor="issueMptModeAdvanced">{t('trustline.advanced', { ns: 'services' })}</label>
              </div>
            </div>

            <div className={styles.grid}>
              <label className={styles.field}>
                <span>{tm('fields.scale')}</span>
                <input className="input-text" inputMode="numeric" value={scale} onChange={(event) => setScale(cleanNumber(event.target.value, false).slice(0, 3))} />
                <small>{tm('hints.scale')}</small>
              </label>
              <label className={styles.field}>
                <span>{tm('fields.maximum')}</span>
                <input className="input-text" inputMode="decimal" value={maximum} placeholder={tm('placeholders.optional')} onChange={(event) => setMaximum(cleanNumber(event.target.value))} />
                <small>{validation.maximumRaw ? tm('hints.baseUnits', { amount: validation.maximumRaw }) : tm('hints.maximum')}</small>
              </label>
              <label className={styles.field}>
                <span>{tm('fields.transferFee')}</span>
                <input className="input-text" inputMode="decimal" value={transferFee} placeholder="0" disabled={!flags.canTransfer} onChange={(event) => setTransferFee(cleanNumber(event.target.value))} />
                <small>{tm('hints.transferFee')}</small>
              </label>
              {permissionOption('canTransfer')}
              {permissionOption('canTrade')}
              {permissionOption('canEscrow')}
              {mode === 'advanced' && (
                <>
                  {permissionOption('canLock')}
                  {permissionOption('canClawback')}
                  {permissionOption('requireAuth', styles.fullWidth)}
                  {flags.requireAuth && (
                    <>
                      <label className={styles.field}>
                        <span>{tm('domainLookup.owner')}</span>
                        <input className="input-text" value={domainOwner} placeholder="r..." spellCheck="false" onChange={(event) => setDomainOwner(event.target.value.trim())} />
                        <small>
                          {domainsLoading
                            ? tm('domainLookup.loading')
                            : domainsError
                              ? tm('domainLookup.error')
                              : domainsLoaded && !domainOptions.length
                                ? tm('domainLookup.empty')
                                : tm('domainLookup.hint')}
                        </small>
                      </label>
                      <label className={styles.field}>
                        <span>{tm('fields.domain')}</span>
                        <input className="input-text" value={domainId} maxLength={64} placeholder={tm('placeholders.optional')} onChange={(event) => setDomainId(event.target.value.replace(/[^A-Fa-f0-9]/g, ''))} />
                        <small>{tm('hints.domain')}</small>
                      </label>
                      {domainOptions.length > 0 && (
                        <label className={`${styles.field} ${styles.fullWidth}`}>
                          <span>{tm('domainLookup.domains')}</span>
                          <SimpleSelect
                            value={domainId}
                            setValue={setDomainId}
                            optionsList={domainOptions}
                            className={styles.domainDropdown}
                            instanceId="mpt-permissioned-domain"
                            formatOptionLabel={(option) => <span className={styles.domainOption}>{option.label}</span>}
                          />
                          <small>{tm('domainLookup.found', { count: domainOptions.length })}</small>
                        </label>
                      )}
                    </>
                  )}
                </>
              )}
            </div>
          </section>

          <aside className={styles.preview}>
            <h3>{tm('preview')}</h3>
            <pre>{JSON.stringify(validation.request, null, 2)}</pre>
            {issuanceErrors.length > 0 && <div className={styles.errors}>{issuanceErrors.map((error) => <div key={error}>{error}</div>)}</div>}
            <button type="button" className={`button-outline ${styles.previewButton}`} onClick={() => setShowTokenPreview(true)}>
              {tm('tokenPreview.button')}
            </button>
            <button type="button" className={`button-action ${styles.issueButton}`} disabled={validation.errors.length > 0 || metadataBuilderValid === false} onClick={() => setSignRequest({ request: validation.request })}>
              {tm('issue')}
            </button>
          </aside>
        </div>
      </div>

      <Dialog
        isOpen={showTokenPreview}
        onClose={() => setShowTokenPreview(false)}
        title={tm('tokenPreview.title')}
        size="xlarge"
      >
        <p className={styles.previewNote}>{tm('tokenPreview.note')}</p>
        <div className={`${tokenPreviewTheme} ${styles.tokenPreview}`}>
          <div className="tokenOverview tokenOverviewTop2">
            <aside className="tokenProfileCard">
              <div className="tokenProfileImageWrap">
                {previewIcon && !previewIconError ? (
                  <img src={previewIcon} alt="" className={`token-image ${styles.previewTokenImage}`} onError={() => setPreviewIconError(true)} />
                ) : (
                  <div className={styles.previewIconPlaceholder}>{previewTicker.slice(0, 6)}</div>
                )}
              </div>
              <h1 className="tokenProfileTitle">{previewName}</h1>
              <div className="tokenProfileMeta">
                {previewTicker !== previewName && <span>{previewTicker}</span>}
                <span className="tokenProfileIssuerLine">
                  <span>{t('title.issuedBy', { ns: 'token' })}</span>
                  <span className="tokenProfileIssuerValue">{tm('tokenPreview.afterSigning')}</span>
                </span>
              </div>
              <div className="tokenProfileInfo">
                {previewDescription && (
                  <div className="tokenProfileInfoRow">
                    <span>{t('fields.description', { ns: 'token' })}</span><span>{previewDescription}</span>
                  </div>
                )}
                {previewIssuerName && (
                  <div className="tokenProfileInfoRow">
                    <span>{t('fields.issuerName', { ns: 'token' })}</span><span>{previewIssuerName}</span>
                  </div>
                )}
                {previewAssetClass && (
                  <div className="tokenProfileInfoRow">
                    <span>{t('fields.assetClass', { ns: 'token' })}</span>
                    <span>{t(`mpt-metadata.asset-classes.${previewAssetClass}`, { ns: 'services', defaultValue: previewAssetClass })}</span>
                  </div>
                )}
                {previewAssetSubclass && (
                  <div className="tokenProfileInfoRow">
                    <span>{t('fields.assetSubclass', { ns: 'token' })}</span>
                    <span>{t(`mpt-metadata.asset-subclasses.${previewAssetSubclass}`, { ns: 'services', defaultValue: previewAssetSubclass })}</span>
                  </div>
                )}
                <div className="tokenProfileInfoRow">
                  <span>{t('fields.mptId', { ns: 'token' })}</span><span>{tm('tokenPreview.afterIssuance')}</span>
                </div>
                <div className="tokenProfileInfoRow">
                  <span>{t('fields.flags', { ns: 'token' })}</span>
                  <span>{previewPermissions || t('values.none', { ns: 'token' })}</span>
                </div>
              </div>
            </aside>

            <section className="tokenPanel tokenSupplyPanel">
              <h2>{previewName}</h2>
              <div className="tokenMetricGrid">
                {[
                  ['outstanding', '0'],
                  ['maxSupply', maximum || tm('tokenPreview.protocolDefault')],
                  ['lockedAmount', '0'],
                  ['holders', '0'],
                  ['authorizedAddresses', '0'],
                  ['transferFee', transferFee ? `${transferFee}%` : t('values.none', { ns: 'token' })],
                  ['decimalPlaces', scale || '0']
                ].map(([key, value]) => (
                  <div key={key}>
                    <div className="tokenMetricHeader"><span>{t(`fields.${key}`, { ns: 'token' })}</span></div>
                    <div className="tokenMetricValue">{value}</div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>
      </Dialog>
    </>
  )
}

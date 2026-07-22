import { useCallback, useMemo, useState } from 'react'
import { useTranslation } from 'next-i18next'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'

import SEO from '../../components/SEO'
import MptMetadataBuilder from '../../components/Services/MptMetadataBuilder'
import ServicesTabs from '../../components/Tabs/ServicesTabs'
import { explorerName } from '../../utils'
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

export async function getServerSideProps({ locale }) {
  return { props: { ...(await serverSideTranslations(locale, ['common', 'services'])) } }
}

export default function IssueMptPage({ setSignRequest }) {
  const { t } = useTranslation(['common', 'services'])
  const tm = useCallback((key, options) => t(`issue-mpt.${key}`, { ns: 'services', ...options }), [t])
  const [scale, setScale] = useState('0')
  const [maximum, setMaximum] = useState('')
  const [transferFee, setTransferFee] = useState('')
  const [metadata, setMetadata] = useState('')
  const [metadataBuilderValid, setMetadataBuilderValid] = useState(null)
  const [domainId, setDomainId] = useState('')
  const [flags, setFlags] = useState({ canTransfer: true, canTrade: true, canEscrow: true })

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
    if (domainId && !/^[A-Fa-f0-9]{64}$/.test(domainId)) errors.push(tm('errors.domain'))
    if (domainId && !flags.requireAuth) errors.push(tm('errors.domainAuth'))

    const request = { TransactionType: 'MPTokenIssuanceCreate', AssetScale: assetScale }
    const flagValue = FLAGS.reduce((total, [key, value]) => total + (flags[key] ? value : 0), 0)
    if (flagValue) request.Flags = flagValue
    if (maximumRaw) request.MaximumAmount = maximumRaw
    if (transferFee && flags.canTransfer) request.TransferFee = Math.floor(fee * 1000)
    if (metadataResult.hex) request.MPTokenMetadata = metadataResult.hex
    if (domainId) request.DomainID = domainId.toUpperCase()

    return { errors, request, metadataBytes: metadataResult.bytes, maximumRaw }
  }, [domainId, flags, maximum, metadata, scale, tm, transferFee])

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

  return (
    <>
      <SEO title={`${tm('title')} | ${explorerName}`} description={tm('seoDescription')} />
      <div className={styles.page}>
        <ServicesTabs category="issuance" tab="issue-mpt" />
        <h1 className="center">{tm('title')}</h1>
        <p className={styles.intro}>{tm('intro')}</p>

        <section className={styles.metadataPanel}>
          <div className={styles.metadataHeading}>
            <div>
              <h2>{tm('metadata.title')}</h2>
            </div>
          </div>
          <MptMetadataBuilder onMetadataChange={useGeneratedMetadata} />
        </section>

        <div className={styles.layout}>
          <section className={styles.panel}>
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
              <label className={styles.field}>
                <span>{tm('fields.domain')}</span>
                <input className="input-text" value={domainId} maxLength={64} placeholder={tm('placeholders.optional')} onChange={(event) => setDomainId(event.target.value.replace(/[^A-Fa-f0-9]/g, ''))} />
                <small>{tm('hints.domain')}</small>
              </label>
            </div>

            <h3>{tm('permissions.title')}</h3>
            <p className={styles.warning}>{tm('permissions.warning')}</p>
            <div className={styles.flags}>
              {FLAGS.map(([key]) => (
                <label className={styles.flag} key={key}>
                  <input type="checkbox" checked={!!flags[key]} onChange={() => toggleFlag(key)} />
                  <span className={styles.checkMark} aria-hidden="true" />
                  <span><strong>{tm(`permissions.${key}.title`)}</strong><small>{tm(`permissions.${key}.description`)}</small></span>
                </label>
              ))}
            </div>

          </section>

          <aside className={styles.preview}>
            <h3>{tm('preview')}</h3>
            <pre>{JSON.stringify(validation.request, null, 2)}</pre>
            {issuanceErrors.length > 0 && <div className={styles.errors}>{issuanceErrors.map((error) => <div key={error}>{error}</div>)}</div>}
            <button type="button" className={`button-action ${styles.issueButton}`} disabled={validation.errors.length > 0 || metadataBuilderValid === false} onClick={() => setSignRequest({ request: validation.request })}>
              {tm('issue')}
            </button>
          </aside>
        </div>
      </div>
    </>
  )
}

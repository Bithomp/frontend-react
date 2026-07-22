import { useCallback, useMemo, useState } from 'react'
import { useTranslation } from 'next-i18next'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { LuCopy, LuDownload } from 'react-icons/lu'

import SEO from '../../components/SEO'
import ServicesTabs from '../../components/Tabs/ServicesTabs'
import SimpleSelect from '../../components/UI/SimpleSelect'
import { explorerName, isUrlValid } from '../../utils'
import { ipfsUrl } from '../../utils/nft'
import styles from '../../styles/pages/toml-generator.module.scss'

const SPEC_URL = 'https://github.com/XRPLF/XRPL-Standards/tree/master/XLS-0089-multi-purpose-token-metadata-schema'
const MAX_METADATA_BYTES = 1024
const assetClasses = ['', 'rwa', 'memes', 'wrapped', 'gaming', 'defi', 'other']
const assetSubclasses = ['', 'stablecoin', 'commodity', 'real_estate', 'private_credit', 'equity', 'treasury', 'other']
const uriCategories = ['website', 'social', 'docs', 'other']
const additionalInfoTypes = ['object', 'text']

const createUri = () => ({ uri: '', category: 'website', title: '' })
const clean = (value) => String(value || '').trim()
const compactHttpsUri = (value) => clean(value).replace(/^https:\/\//i, '')
const isValidDataUri = (value, mediaType) => {
  const uri = clean(value)
  const prefix = mediaType ? `data:${mediaType}/` : 'data:'
  return uri.toLowerCase().startsWith(prefix) && /^data:[^,]*,.+$/is.test(uri)
}
const isValidIconUri = (value) => {
  const uri = clean(value)
  if (/^https:\/\//i.test(uri)) return isUrlValid(uri)
  if (/^ipfs:\/\//i.test(uri)) return !!ipfsUrl(uri, 'viewer', 'cl')
  if (/^data:/i.test(uri)) return isValidDataUri(uri, 'image')
  if (/^[a-z][a-z\d+.-]*:/i.test(uri)) return false
  return isUrlValid(`https://${uri}`)
}
const isValidRelatedUri = (value) => {
  const uri = clean(value)
  if (!uri) return false
  if (/^ipfs:\/\//i.test(uri)) return !!ipfsUrl(uri, 'viewer', 'cl')
  if (/^data:/i.test(uri)) return isValidDataUri(uri)
  if (/^[a-z][a-z\d+.-]*:/i.test(uri)) return isUrlValid(uri)
  return isUrlValid(`https://${uri}`)
}
const replaceItem = (items, index, update) =>
  items.map((item, itemIndex) => (itemIndex === index ? { ...item, ...update } : item))

const utf8Bytes = (value) => new TextEncoder().encode(value)
const toHex = (value) => Array.from(utf8Bytes(value), (byte) => byte.toString(16).padStart(2, '0')).join('').toUpperCase()

const parseAdditionalInfo = (value, type) => {
  const text = clean(value)
  if (!text) return { value: null, error: '' }
  if (type === 'text') return { value: text, error: '' }

  try {
    const parsed = JSON.parse(text)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return { value: null, error: 'object' }
    return { value: parsed, error: '' }
  } catch (_) {
    return { value: null, error: 'json' }
  }
}

const buildMetadata = ({ form, uris, additionalInfo, useFullKeys }) => {
  const metadata = {}
  const keys = useFullKeys
    ? {
        ticker: 'ticker',
        name: 'name',
        description: 'desc',
        icon: 'icon',
        assetClass: 'asset_class',
        assetSubclass: 'asset_subclass',
        issuerName: 'issuer_name',
        uris: 'uris',
        additionalInfo: 'additional_info'
      }
    : {
        ticker: 't',
        name: 'n',
        description: 'd',
        icon: 'i',
        assetClass: 'ac',
        assetSubclass: 'as',
        issuerName: 'in',
        uris: 'us',
        additionalInfo: 'ai'
      }
  const uriKeys = useFullKeys ? { uri: 'uri', category: 'category', title: 'title' } : { uri: 'u', category: 'c', title: 't' }
  const add = (key, value) => {
    if (value !== undefined && value !== null && value !== '') metadata[key] = value
  }

  add(keys.ticker, clean(form.ticker))
  add(keys.name, clean(form.name))
  add(keys.description, clean(form.description))
  add(keys.icon, compactHttpsUri(form.icon))
  add(keys.assetClass, form.assetClass)
  add(keys.assetSubclass, form.assetClass === 'rwa' ? form.assetSubclass : '')
  add(keys.issuerName, clean(form.issuerName))

  const validUris = uris
    .filter((item) => clean(item.uri) || clean(item.title))
    .map((item) => ({
      [uriKeys.uri]: compactHttpsUri(item.uri),
      [uriKeys.category]: item.category,
      [uriKeys.title]: clean(item.title)
    }))
  add(keys.uris, validUris.length ? validUris : null)
  add(keys.additionalInfo, additionalInfo)

  return metadata
}

const Field = ({ label, hint, required, className, children }) => (
  <label className={`${styles.field} ${className || ''}`}>
    <span>
      {label}
      {required && <b> *</b>}
    </span>
    {children}
    {hint && <small>{hint}</small>}
  </label>
)

const FormSelect = ({ value, options, onChange, instanceId, showDescriptions = false }) => (
  <SimpleSelect
    value={value}
    setValue={onChange}
    optionsList={options}
    className={styles.formDropdown}
    instanceId={instanceId}
    formatOptionLabel={
      showDescriptions
        ? (option, { context }) =>
            context === 'menu' && option.description ? (
              <span className={styles.describedOption}>
                <strong>{option.label}</strong>
                <small>{option.description}</small>
              </span>
            ) : (
              option.label
            )
        : undefined
    }
  />
)

export async function getServerSideProps({ locale }) {
  return { props: { ...(await serverSideTranslations(locale, ['common', 'services'])) } }
}

export default function MptMetadataGeneratorPage() {
  const { t } = useTranslation(['common', 'services'])
  const title = t('menu.services.mpt-metadata-generator')
  const tg = useCallback((key, options) => t(`mpt-metadata-generator.${key}`, { ns: 'services', ...options }), [t])
  const [form, setForm] = useState({
    ticker: '',
    name: '',
    description: '',
    icon: '',
    assetClass: '',
    assetSubclass: '',
    issuerName: '',
    additionalInfo: ''
  })
  const [uris, setUris] = useState([createUri()])
  const [additionalInfoType, setAdditionalInfoType] = useState('object')
  const [useFullKeys, setUseFullKeys] = useState(false)
  const [copied, setCopied] = useState('')

  const updateForm = (key, value) => {
    setForm((previous) => ({
      ...previous,
      [key]: value,
      ...(key === 'assetClass' && value !== 'rwa' ? { assetSubclass: '' } : {})
    }))
  }
  const updateUri = (index, key, value) => setUris((previous) => replaceItem(previous, index, { [key]: value }))

  const assetClassOptions = useMemo(
    () =>
      assetClasses.map((value) => ({
        value,
        label: tg(`asset-classes.${value || 'select'}`),
        description: value ? tg(`asset-class-descriptions.${value}`) : ''
      })),
    [tg]
  )
  const assetSubclassOptions = useMemo(
    () =>
      assetSubclasses.map((value) => ({
        value,
        label: tg(`asset-subclasses.${value || 'select'}`),
        description: value ? tg(`asset-subclass-descriptions.${value}`) : ''
      })),
    [tg]
  )
  const uriCategoryOptions = useMemo(
    () => uriCategories.map((value) => ({ value, label: tg(`uri-categories.${value}`) })),
    [tg]
  )
  const additionalInfoTypeOptions = useMemo(
    () => additionalInfoTypes.map((value) => ({ value, label: tg(`additional-info-types.${value}`) })),
    [tg]
  )

  const additionalInfo = useMemo(
    () => parseAdditionalInfo(form.additionalInfo, additionalInfoType),
    [additionalInfoType, form.additionalInfo]
  )
  const metadata = useMemo(
    () => buildMetadata({ form, uris, additionalInfo: additionalInfo.value, useFullKeys }),
    [additionalInfo.value, form, uris, useFullKeys]
  )
  const encodedJson = useMemo(() => JSON.stringify(metadata), [metadata])
  const output = useMemo(() => JSON.stringify(metadata, null, 2), [metadata])
  const hexOutput = useMemo(() => toHex(encodedJson), [encodedJson])
  const byteCount = useMemo(() => utf8Bytes(encodedJson).length, [encodedJson])
  const overLimit = byteCount > MAX_METADATA_BYTES

  const warnings = useMemo(() => {
    const items = []
    if (!/^[A-Z0-9]{1,6}$/.test(clean(form.ticker))) items.push(tg('warnings.ticker'))
    if (!clean(form.name)) items.push(tg('warnings.name'))
    if (!clean(form.icon)) items.push(tg('warnings.icon'))
    else if (!isValidIconUri(form.icon)) items.push(tg('warnings.icon-uri'))
    if (!form.assetClass) items.push(tg('warnings.asset-class'))
    if (form.assetClass === 'rwa' && !form.assetSubclass) items.push(tg('warnings.asset-subclass'))
    if (!clean(form.issuerName)) items.push(tg('warnings.issuer-name'))
    uris.forEach((item) => {
      if ((clean(item.uri) || clean(item.title)) && (!clean(item.uri) || !clean(item.title))) {
        items.push(tg('warnings.uri'))
      } else if (clean(item.uri) && !isValidRelatedUri(item.uri)) {
        items.push(tg('warnings.uri-format'))
      }
    })
    if (additionalInfo.error === 'json') items.push(tg('warnings.additional-json'))
    if (additionalInfo.error === 'object') items.push(tg('warnings.additional-object'))
    if (overLimit) items.push(tg('warnings.size', { count: byteCount, max: MAX_METADATA_BYTES }))
    return [...new Set(items)]
  }, [additionalInfo.error, byteCount, form, overLimit, tg, uris])

  const copyValue = async (type, value) => {
    await navigator.clipboard.writeText(value)
    setCopied(type)
    setTimeout(() => setCopied(''), 1800)
  }

  const downloadJson = () => {
    const blob = new Blob([output + '\n'], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${clean(form.ticker).toLowerCase() || 'mptoken'}-metadata.json`
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <>
      <SEO title={`${title} | ${explorerName}`} description={tg('seo-description')} />
      <div className={`content-text ${styles.page}`}>
        <ServicesTabs category="issuance" tab="mpt-metadata-generator" />
        <h1 className="center">{title}</h1>
        <p className="center">
          {tg('intro')}{' '}
          <a href={SPEC_URL} target="_blank" rel="noreferrer">
            XLS-0089
          </a>
          .
        </p>

        <div className={styles.layout}>
          <section className={styles.formPanel}>
            <div className={styles.grid}>
              <Field label={tg('fields.ticker')} required hint={tg('hints.ticker')}>
                <input
                  className="input-text"
                  value={form.ticker}
                  maxLength={6}
                  onChange={(event) => updateForm('ticker', event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                  placeholder="TBILL"
                  spellCheck="false"
                />
              </Field>
              <Field label={tg('fields.name')} required>
                <input
                  className="input-text"
                  value={form.name}
                  onChange={(event) => updateForm('name', event.target.value)}
                  placeholder={tg('placeholders.name')}
                />
              </Field>
              <Field label={tg('fields.icon')} required hint={tg('hints.icon-uri')}>
                <input
                  className="input-text"
                  value={form.icon}
                  onChange={(event) => updateForm('icon', event.target.value)}
                  placeholder="example.com/token.png"
                />
              </Field>
              <Field label={tg('fields.issuer-name')} required>
                <input
                  className="input-text"
                  value={form.issuerName}
                  onChange={(event) => updateForm('issuerName', event.target.value)}
                  placeholder={tg('placeholders.issuer-name')}
                />
              </Field>
              <Field
                label={tg('fields.asset-class')}
                required
                hint={form.assetClass ? tg(`asset-class-descriptions.${form.assetClass}`) : null}
              >
                <FormSelect
                  value={form.assetClass}
                  options={assetClassOptions}
                  onChange={(value) => updateForm('assetClass', value)}
                  instanceId="mpt-metadata-asset-class"
                  showDescriptions
                />
              </Field>
              {form.assetClass === 'rwa' && (
                <Field
                  label={tg('fields.asset-subclass')}
                  required
                  hint={form.assetSubclass ? tg(`asset-subclass-descriptions.${form.assetSubclass}`) : null}
                >
                  <FormSelect
                    value={form.assetSubclass}
                    options={assetSubclassOptions}
                    onChange={(value) => updateForm('assetSubclass', value)}
                    instanceId="mpt-metadata-asset-subclass"
                    showDescriptions
                  />
                </Field>
              )}
              <Field label={tg('fields.description')} className={styles.wideField}>
                <textarea
                  className="input-text"
                  rows={3}
                  value={form.description}
                  onChange={(event) => updateForm('description', event.target.value)}
                  placeholder={tg('placeholders.description')}
                />
              </Field>
            </div>

            <div className={styles.repeatHeader}>
              <h4>{tg('sections.uris')}</h4>
              <button type="button" className="button-action secondary" onClick={() => setUris((prev) => [...prev, createUri()])}>
                {tg('actions.add-link')}
              </button>
            </div>
            {uris.map((item, index) => (
              <div className={styles.repeatRow} key={index}>
                <input
                  className="input-text"
                  value={item.uri}
                  onChange={(event) => updateUri(index, 'uri', event.target.value)}
                  placeholder="example.com or ipfs://..."
                />
                <FormSelect
                  value={item.category}
                  options={uriCategoryOptions}
                  onChange={(value) => updateUri(index, 'category', value)}
                  instanceId={`mpt-metadata-uri-category-${index}`}
                />
                <input
                  className="input-text"
                  value={item.title}
                  onChange={(event) => updateUri(index, 'title', event.target.value)}
                  placeholder={tg('placeholders.link-title')}
                />
                {uris.length > 1 && (
                  <button type="button" className="button-action secondary" onClick={() => setUris((prev) => prev.filter((_, i) => i !== index))}>
                    {tg('actions.remove')}
                  </button>
                )}
              </div>
            ))}

            <h4>{tg('sections.additional-info')}</h4>
            <div className={styles.grid}>
              <Field label={tg('fields.additional-info-type')}>
                <FormSelect
                  value={additionalInfoType}
                  options={additionalInfoTypeOptions}
                  onChange={setAdditionalInfoType}
                  instanceId="mpt-metadata-additional-info-type"
                />
              </Field>
              <Field label={tg('fields.additional-info')} hint={tg('hints.other-links')} className={styles.wideField}>
                <textarea
                  className="input-text"
                  rows={6}
                  value={form.additionalInfo}
                  onChange={(event) => updateForm('additionalInfo', event.target.value)}
                  placeholder={additionalInfoType === 'object' ? '{\n  "interest_rate": "5.00%"\n}' : tg('placeholders.additional-text')}
                  spellCheck="false"
                />
              </Field>
            </div>
          </section>

          <aside className={styles.previewPanel}>
            <div className={styles.previewTop}>
              <h4>{tg('generated-title')}</h4>
              <div className={styles.actions}>
                <button type="button" className="button-action secondary" onClick={() => copyValue('json', output)}>
                  <LuCopy aria-hidden="true" /> {copied === 'json' ? tg('actions.copied') : tg('actions.copy-json')}
                </button>
                <button type="button" className="button-action" onClick={downloadJson}>
                  <LuDownload aria-hidden="true" /> {tg('actions.download')}
                </button>
              </div>
            </div>

            <div className={styles.sectionChecks}>
              <label className={`${styles.sectionCheck} ${styles.keyFormatOption}`}>
                <input type="checkbox" checked={useFullKeys} onChange={(event) => setUseFullKeys(event.target.checked)} />
                <span className={styles.checkMark} aria-hidden="true" />
                <span className={styles.sectionCheckText}>
                  <span className={`${styles.sectionCheckTitle} ${styles.keyFormatTitle}`}>
                    {tg('full-keys.title')}{' '}
                    <span className={`orange ${styles.recommendation}`}>({tg('full-keys.not-recommended')})</span>
                  </span>
                </span>
              </label>
            </div>

            <div className={`${styles.byteMeter} ${overLimit ? styles.byteMeterOver : ''}`}>
              <span>{tg('byte-count', { count: byteCount, max: MAX_METADATA_BYTES })}</span>
            </div>
            {warnings.length > 0 && (
              <div className={styles.warnings}>{warnings.map((warning) => <div key={warning}>{warning}</div>)}</div>
            )}
            <pre className={`${styles.preview} ${styles.metadataPreview}`}>{output}</pre>

            <div className={styles.previewTop}>
              <h4>{tg('hex-title')}</h4>
              <div className={styles.actions}>
                <button type="button" className="button-action secondary" onClick={() => copyValue('hex', hexOutput)}>
                  <LuCopy aria-hidden="true" /> {copied === 'hex' ? tg('actions.copied') : tg('actions.copy-hex')}
                </button>
              </div>
            </div>
            <pre className={`${styles.preview} ${styles.hexPreview}`}>{hexOutput}</pre>
          </aside>
        </div>
      </div>
    </>
  )
}

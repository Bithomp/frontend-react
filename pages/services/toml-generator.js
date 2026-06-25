import { useCallback, useMemo, useState } from 'react'
import Link from 'next/link'
import { useTranslation } from 'next-i18next'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { LuCopy, LuDownload } from 'react-icons/lu'

import SEO from '../../components/SEO'
import ServicesTabs from '../../components/Tabs/ServicesTabs'
import AddressInput from '../../components/UI/AddressInput'
import CountrySelect from '../../components/UI/CountrySelect'
import SimpleSelect from '../../components/UI/SimpleSelect'
import { explorerName, isAddressValid, ledgerName, network, xahauNetwork } from '../../utils'
import styles from '../../styles/pages/toml-generator.module.scss'

const assetClasses = ['', 'rwa', 'memes', 'wrapped', 'gaming', 'defi', 'other']

const assetSubclasses = ['', 'stablecoin', 'commodity', 'real_estate', 'private_credit', 'equity', 'treasury', 'other']

const urlTypes = ['', 'website', 'social', 'document']

const booleanValues = ['', 'true', 'false']

const modeOptions = ['principal', 'account', 'token', 'server', 'validator']

const tomlNetworkOptions = [
  { value: 'main', labelKey: 'main' },
  { value: 'testnet', labelKey: 'testnet' },
  { value: 'devnet', labelKey: 'devnet' },
  { value: 'xahau', labelKey: 'xahau' },
  { value: 'alphanet', labelKey: 'alphanet' },
  { value: 'xahau-testnet', labelKey: 'xahau-testnet' },
  { value: 'xahau-jshooks', labelKey: 'xahau-jshooks' }
]

const defaultTomlNetwork =
  {
    mainnet: 'main',
    staging: 'main',
    testnet: 'testnet',
    devnet: 'devnet',
    alphanet: 'alphanet',
    xahau: 'xahau',
    'xahau-testnet': 'xahau-testnet',
    'xahau-jshooks': 'xahau-jshooks'
  }[network] || (xahauNetwork ? 'xahau' : 'main')

const unlsByNetwork = {
  main: ['https://unl.xrplf.org', 'https://vl.ripple.com'],
  testnet: ['https://vl.altnet.rippletest.net'],
  devnet: ['http://vl.devnet.rippletest.net'],
  alphanet: [],
  xahau: ['https://vl.xahau.org'],
  'xahau-testnet': ['https://vl.test.xahauexplorer.com'],
  'xahau-jshooks': ['https://vl.jshooks.xahauexplorer.com']
}

const unlOptionsByNetwork = Object.fromEntries(
  Object.entries(unlsByNetwork).map(([net, urls]) => [net, urls.map((url) => ({ value: url, label: url }))])
)

const defaultUnlByNetwork = {
  main: 'https://vl.xrplf.org',
  testnet: 'https://vl.altnet.rippletest.net',
  devnet: 'http://vl.devnet.rippletest.net',
  xahau: 'https://vl.xahau.org',
  'xahau-testnet': 'https://vl.test.xahauexplorer.com',
  'xahau-jshooks': 'https://vl.jshooks.xahauexplorer.com'
}

const createAccount = () => ({
  address: '',
  network: defaultTomlNetwork,
  desc: ''
})

const createPrincipal = () => ({
  name: '',
  email: '',
  profileImage: '',
  website: '',
  x: '',
  linkedin: '',
  telegram: '',
  github: ''
})

const createValidator = () => ({
  publicKey: '',
  attestation: '',
  network: defaultTomlNetwork,
  ownerCountry: '',
  serverCountry: '',
  networkAsn: '',
  serverLocation: '',
  serverCloud: '',
  unl: defaultUnlByNetwork[defaultTomlNetwork] || ''
})

const createServer = () => ({
  jsonRpc: '',
  ws: '',
  peer: '',
  network: defaultTomlNetwork,
  desc: ''
})

const createToken = () => ({
  issuerAddress: '',
  issuerName: '',
  issuerDesc: '',
  issuerIcon: '',
  tokenCurrency: '',
  tokenName: '',
  tokenDesc: '',
  tokenIcon: '',
  tokenAssetClass: '',
  tokenAssetSubclass: '',
  network: defaultTomlNetwork,
  displayDecimals: '',
  currencySymbol: '',
  urls: [{ url: '', type: 'website', title: '' }]
})

const defaultTokenUrl = { url: '', type: 'website', title: '' }

const defaultEnabledSections = {
  principal: true,
  account: false,
  token: false,
  server: false,
  validator: false
}

export async function getServerSideProps({ locale }) {
  return {
    props: {
      modifiedAt: new Date().toISOString(),
      ...(await serverSideTranslations(locale, ['common', 'services']))
    }
  }
}

const clean = (value) => String(value || '').trim()

const tomlString = (value) => `"${String(value).replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`

const addTomlField = (lines, key, value) => {
  const nextValue = clean(value)
  if (!nextValue) return
  lines.push(`${key} = ${tomlString(nextValue)}`)
}

const addTomlInteger = (lines, key, value) => {
  const trimmed = clean(value)
  if (/^\d+$/.test(trimmed)) lines.push(`${key} = ${trimmed}`)
}

const addTomlBoolean = (lines, key, value) => {
  const trimmed = clean(value)
  if (trimmed === 'true' || trimmed === 'false') lines.push(`${key} = ${trimmed}`)
}

const addSection = (lines, name) => {
  if (lines.length) lines.push('')
  lines.push(name)
}

const buildToml = ({ accounts, principals, validators, servers, tokens, enabledSections, modifiedAt }) => {
  const lines = ['[METADATA]', `modified = ${modifiedAt}`]

  if (enabledSections.account) {
    accounts.forEach((account) => {
      addSection(lines, '[[ACCOUNTS]]')
      addTomlField(lines, 'address', account.address)
      addTomlField(lines, 'network', account.network)
      addTomlField(lines, 'desc', account.desc)
    })
  }

  if (enabledSections.token) {
    tokens.forEach((token) => {
      if (clean(token.issuerAddress)) {
        addSection(lines, '[[ACCOUNTS]]')
        addTomlField(lines, 'address', token.issuerAddress)
        addTomlField(lines, 'network', token.network)
      }

      addSection(lines, '[[ISSUERS]]')
      addTomlField(lines, 'address', token.issuerAddress)
      addTomlField(lines, 'name', token.issuerName)
      addTomlField(lines, 'desc', token.issuerDesc)
      addTomlField(lines, 'icon', token.issuerIcon)

      addSection(lines, '[[TOKENS]]')
      addTomlField(lines, 'issuer', token.issuerAddress)
      addTomlField(lines, 'currency', token.tokenCurrency)
      addTomlField(lines, 'name', token.tokenName)
      addTomlField(lines, 'desc', token.tokenDesc)
      addTomlField(lines, 'icon', token.tokenIcon)
      addTomlField(lines, 'asset_class', token.tokenAssetClass)
      addTomlField(lines, 'asset_subclass', token.tokenAssetSubclass)

      token.urls
        .filter((item) => clean(item.url))
        .forEach((item) => {
          addSection(lines, '[[TOKENS.URLS]]')
          addTomlField(lines, 'url', item.url)
          addTomlField(lines, 'type', item.type)
          addTomlField(lines, 'title', item.title)
        })

      addSection(lines, '[[CURRENCIES]]')
      addTomlField(lines, 'code', token.tokenCurrency)
      addTomlField(lines, 'issuer', token.issuerAddress)
      addTomlField(lines, 'network', token.network)
      addTomlInteger(lines, 'display_decimals', token.displayDecimals)
      addTomlField(lines, 'symbol', token.currencySymbol)
    })
  }

  if (enabledSections.server) {
    servers.forEach((server) => {
      addSection(lines, '[[SERVERS]]')
      addTomlField(lines, 'json_rpc', server.jsonRpc)
      addTomlField(lines, 'ws', server.ws)
      addTomlField(lines, 'peer', server.peer)
      addTomlField(lines, 'network', server.network)
      addTomlField(lines, 'desc', server.desc)
    })
  }

  if (enabledSections.principal) {
    principals
      .filter(
        (principal) =>
          clean(principal.name) ||
          clean(principal.email) ||
          clean(principal.profileImage) ||
          clean(principal.website) ||
          clean(principal.x) ||
          clean(principal.linkedin) ||
          clean(principal.telegram) ||
          clean(principal.github)
      )
      .forEach((principal) => {
        addSection(lines, '[[PRINCIPALS]]')
        addTomlField(lines, 'name', principal.name)
        addTomlField(lines, 'email', principal.email)
        addTomlField(lines, 'profile_image', principal.profileImage)
        addTomlField(lines, 'website', principal.website)
        addTomlField(lines, 'x', principal.x)
        addTomlField(lines, 'linkedin', principal.linkedin)
        addTomlField(lines, 'telegram', principal.telegram)
        addTomlField(lines, 'github', principal.github)
      })
  }

  if (enabledSections.validator) {
    validators.forEach((validator) => {
      addSection(lines, '[[VALIDATORS]]')
      addTomlField(lines, 'public_key', validator.publicKey)
      addTomlField(lines, 'attestation', validator.attestation)
      addTomlField(lines, 'network', validator.network)
      addTomlField(lines, 'owner_country', validator.ownerCountry.toLowerCase())
      addTomlField(lines, 'server_country', validator.serverCountry.toLowerCase())
      addTomlInteger(lines, 'network_asn', validator.networkAsn)
      addTomlField(lines, 'server_location', validator.serverLocation)
      addTomlBoolean(lines, 'server_cloud', validator.serverCloud)
      addTomlField(lines, 'unl', validator.unl)
    })
  }

  return lines.join('\n') + '\n'
}

const replaceItem = (items, index, update) =>
  items.map((item, itemIndex) => (itemIndex === index ? { ...item, ...update } : item))

const updateListItem = (setItems, index, key, value) => {
  setItems((prev) => replaceItem(prev, index, { [key]: value }))
}

const removeListItem = (setItems, index) => {
  setItems((prev) => prev.filter((_, itemIndex) => itemIndex !== index))
}

const updateTokenAssetClass = (setTokens, tokenIndex, value) => {
  setTokens((prev) =>
    replaceItem(prev, tokenIndex, {
      tokenAssetClass: value,
      tokenAssetSubclass: value === 'rwa' ? prev[tokenIndex].tokenAssetSubclass : ''
    })
  )
}

const RepeatHeader = ({ title, addLabel, onAdd }) => (
  <div className={styles.repeatHeader}>
    <h4>{title}</h4>
    <button type="button" className="button-action secondary" onClick={onAdd}>
      {addLabel}
    </button>
  </div>
)

const RepeatCard = ({ title, removeLabel, canRemove, onRemove, children }) => (
  <div className={styles.repeatCard}>
    <div className={styles.repeatCardTop}>
      <h5>{title}</h5>
      {canRemove && (
        <button type="button" className="button-action secondary" onClick={onRemove}>
          {removeLabel}
        </button>
      )}
    </div>
    {children}
  </div>
)

const Field = ({ label, hint, children, required, className }) => (
  <label className={`${styles.field} ${className || ''}`}>
    <span>
      {label}
      {required && <b> *</b>}
    </span>
    {children}
    {hint && <small>{hint}</small>}
  </label>
)

const AddressField = ({ label, hint, value, onChange, placeholder, type, required }) => (
  <div className={`${styles.field} ${styles.addressField}`}>
    <AddressInput
      title={
        <>
          {label}
          {required && <b> *</b>}
        </>
      }
      placeholder={placeholder}
      hideButton={true}
      setValue={onChange}
      setInnerValue={onChange}
      rawData={isAddressValid(value) ? { [type]: value } : {}}
      type={type}
    />
    {hint && <small>{hint}</small>}
  </div>
)

const FormSelect = ({ value, options, onChange, instanceId }) => (
  <SimpleSelect
    value={value}
    setValue={onChange}
    optionsList={options}
    className={styles.formDropdown}
    instanceId={instanceId}
  />
)

export default function TomlGeneratorPage({ modifiedAt }) {
  const { t } = useTranslation(['common', 'services'])
  const title = t('menu.services.toml-generator')
  const tg = useCallback((key, options) => t(`toml-generator.${key}`, { ns: 'services', ...options }), [t])
  const tomlName = xahauNetwork ? 'xahau.toml' : 'xrp-ledger.toml'

  const [enabledSections, setEnabledSections] = useState(defaultEnabledSections)
  const [accounts, setAccounts] = useState([createAccount()])
  const [principals, setPrincipals] = useState([createPrincipal()])
  const [validators, setValidators] = useState([createValidator()])
  const [servers, setServers] = useState([createServer()])
  const [tokens, setTokens] = useState([createToken()])
  const [copied, setCopied] = useState(false)

  const updateTokenUrl = (tokenIndex, urlIndex, key, value) => {
    setTokens((prev) =>
      prev.map((token, itemIndex) =>
        itemIndex === tokenIndex ? { ...token, urls: replaceItem(token.urls, urlIndex, { [key]: value }) } : token
      )
    )
  }

  const addTokenUrl = (tokenIndex) => {
    setTokens((prev) =>
      prev.map((token, itemIndex) =>
        itemIndex === tokenIndex ? { ...token, urls: [...token.urls, defaultTokenUrl] } : token
      )
    )
  }

  const removeTokenUrl = (tokenIndex, urlIndex) => {
    setTokens((prev) =>
      prev.map((token, itemIndex) =>
        itemIndex === tokenIndex
          ? { ...token, urls: token.urls.filter((_, currentIndex) => currentIndex !== urlIndex) }
          : token
      )
    )
  }

  const toggleSection = (section) => {
    setEnabledSections((prev) => ({ ...prev, [section]: !prev[section] }))
  }

  const output = useMemo(
    () => buildToml({ accounts, principals, validators, servers, tokens, enabledSections, modifiedAt }),
    [accounts, principals, validators, servers, tokens, enabledSections, modifiedAt]
  )
  const modeTabList = useMemo(
    () =>
      modeOptions.map((value) => ({
        value,
        label: tg(`modes.${value}`),
        description: tg(`mode-descriptions.${value}`)
      })),
    [tg]
  )
  const assetClassOptions = useMemo(
    () => assetClasses.map((value) => ({ value, label: tg(`asset-classes.${value || 'select'}`) })),
    [tg]
  )
  const assetSubclassOptions = useMemo(
    () => assetSubclasses.map((value) => ({ value, label: tg(`asset-subclasses.${value || 'select'}`) })),
    [tg]
  )
  const urlTypeOptions = useMemo(
    () => urlTypes.map((value) => ({ value, label: tg(`url-types.${value || 'select'}`) })),
    [tg]
  )
  const booleanOptions = useMemo(
    () => booleanValues.map((value) => ({ value, label: tg(`boolean-options.${value || 'select'}`) })),
    [tg]
  )
  const networkOptions = useMemo(
    () => tomlNetworkOptions.map((item) => ({ value: item.value, label: tg(`networks.${item.labelKey}`) })),
    [tg]
  )

  const warnings = useMemo(() => {
    const items = []

    accounts.forEach((account) => {
      if (enabledSections.account && clean(account.address) && !isAddressValid(clean(account.address))) {
        items.push(tg('warnings.account-address'))
      }
    })

    if (enabledSections.token) {
      tokens.forEach((token) => {
        if (clean(token.issuerAddress) && !isAddressValid(clean(token.issuerAddress))) {
          items.push(tg('warnings.issuer-address'))
        }
        if (token.tokenAssetClass === 'rwa' && !token.tokenAssetSubclass) {
          items.push(tg('warnings.rwa-subclass'))
        }
        if (clean(token.displayDecimals) && !/^\d+$/.test(clean(token.displayDecimals))) {
          items.push(tg('warnings.display-decimals'))
        }
      })
    }

    validators.forEach((validator) => {
      if (enabledSections.validator && clean(validator.publicKey) && !clean(validator.publicKey).startsWith('n')) {
        items.push(tg('warnings.validator-key'))
      }
      if (enabledSections.validator && clean(validator.networkAsn) && !/^\d+$/.test(clean(validator.networkAsn))) {
        items.push(tg('warnings.network-asn'))
      }
    })

    return items
  }, [accounts, enabledSections, tokens, validators, tg])

  const copyOutput = async () => {
    await navigator.clipboard.writeText(output)
    setCopied(true)
    setTimeout(() => setCopied(false), 1800)
  }

  const downloadToml = () => {
    const blob = new Blob([output], { type: 'application/toml' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = tomlName
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <>
      <SEO title={`${title} | ${explorerName}`} description={tg('seo-description', { tomlName, ledgerName })} />

      <div className={`content-text ${styles.page}`}>
        <ServicesTabs category="identity" tab="toml-generator" />

        <h1 className="center">{title}</h1>
        <p className="center">
          {tg('intro', { tomlName })} <code>https://yourdomain.com/.well-known/{tomlName}</code>.
        </p>

        <div className={styles.layout}>
          <section className={styles.formPanel}>
            <div className={styles.modeHeader}>
              <h4>{tg('mode-title')}</h4>
              <div className={styles.sectionChecks}>
                {modeTabList.map((item) => (
                  <label className={styles.sectionCheck} key={item.value}>
                    <input
                      type="checkbox"
                      checked={Boolean(enabledSections[item.value])}
                      onChange={() => toggleSection(item.value)}
                    />
                    <span className={styles.checkMark} aria-hidden="true" />
                    <span className={styles.sectionCheckText}>
                      <span className={styles.sectionCheckTitle}>{item.label}</span>
                      <span className={styles.sectionCheckDescription}>{item.description}</span>
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <div className={styles.notice}>
              {tg('notice.before')} <b>application/toml</b> {tg('notice.middle')} <b>Access-Control-Allow-Origin: *</b>{' '}
              {tg('notice.after')}
            </div>

            <details className={styles.corsGuide}>
              <summary>{tg('cors-guide.title')}</summary>
              <p>{tg('cors-guide.intro', { tomlName })}</p>
              <h5>{tg('cors-guide.apache-title')}</h5>
              <pre>
                <code>{`<Location "/.well-known/${tomlName}">
  Header set Access-Control-Allow-Origin "*"
</Location>`}</code>
              </pre>
              <h5>{tg('cors-guide.htaccess-title')}</h5>
              <pre>
                <code>{`<Files "${tomlName}">
  Header set Access-Control-Allow-Origin "*"
</Files>`}</code>
              </pre>
              <h5>{tg('cors-guide.nginx-title')}</h5>
              <pre>
                <code>{`location /.well-known/${tomlName} {
  add_header 'Access-Control-Allow-Origin' '*';
}`}</code>
              </pre>
              <h5>{tg('cors-guide.managed-title')}</h5>
              <p>{tg('cors-guide.managed-text')}</p>
            </details>

            {enabledSections.account && (
              <div className={`${styles.sectionBlock} ${styles.accountSection}`}>
                <RepeatHeader
                  title={tg('modes.account')}
                  addLabel={`${tg('actions.add')} ${tg('modes.account')}`}
                  onAdd={() => setAccounts((prev) => [...prev, createAccount()])}
                />
                {accounts.map((account, index) => (
                  <RepeatCard
                    key={index}
                    title={`${tg('modes.account')} ${index + 1}`}
                    removeLabel={tg('actions.remove')}
                    canRemove={accounts.length > 1}
                    onRemove={() => removeListItem(setAccounts, index)}
                  >
                    <div className={styles.grid}>
                      <AddressField
                        label={tg('fields.account-address')}
                        required
                        hint={
                          <>
                            {tg('hints.account-address-before')}{' '}
                            <Link href="/domains">{tg('hints.account-address-link')}</Link>.
                          </>
                        }
                        value={account.address}
                        onChange={(value) => updateListItem(setAccounts, index, 'address', value)}
                        placeholder={tg('placeholders.address')}
                        type={`accountAddress${index}`}
                      />
                      <Field label={tg('fields.network')}>
                        <FormSelect
                          value={account.network}
                          options={networkOptions}
                          instanceId={`toml-account-network-${index}`}
                          onChange={(value) => updateListItem(setAccounts, index, 'network', value)}
                        />
                      </Field>
                      <Field label={tg('fields.description')} className={styles.wideField}>
                        <input
                          className="input-text"
                          value={account.desc}
                          onChange={(e) => updateListItem(setAccounts, index, 'desc', e.target.value)}
                          placeholder={tg('placeholders.account-desc')}
                        />
                      </Field>
                    </div>
                  </RepeatCard>
                ))}
              </div>
            )}

            {enabledSections.principal && (
              <div className={`${styles.sectionBlock} ${styles.principalSection}`}>
                <RepeatHeader
                  title={tg('modes.principal')}
                  addLabel={`${tg('actions.add')} ${tg('modes.principal')}`}
                  onAdd={() => setPrincipals((prev) => [...prev, createPrincipal()])}
                />
                {principals.map((principal, index) => (
                  <RepeatCard
                    key={index}
                    title={`${tg('modes.principal')} ${index + 1}`}
                    removeLabel={tg('actions.remove')}
                    canRemove={principals.length > 1}
                    onRemove={() => removeListItem(setPrincipals, index)}
                  >
                    <div className={styles.grid}>
                      <Field label={tg('fields.name')}>
                        <input
                          className="input-text"
                          value={principal.name}
                          onChange={(e) => updateListItem(setPrincipals, index, 'name', e.target.value)}
                          placeholder={tg('placeholders.principal-name')}
                        />
                      </Field>
                      <Field label={tg('fields.email')}>
                        <input
                          className="input-text"
                          type="email"
                          value={principal.email}
                          onChange={(e) => updateListItem(setPrincipals, index, 'email', e.target.value)}
                          placeholder={tg('placeholders.email')}
                        />
                      </Field>
                      <Field label={tg('fields.profile-image')}>
                        <input
                          className="input-text"
                          value={principal.profileImage}
                          onChange={(e) => updateListItem(setPrincipals, index, 'profileImage', e.target.value)}
                          placeholder={tg('placeholders.profile-image')}
                        />
                      </Field>
                      <Field label={tg('fields.website')}>
                        <input
                          className="input-text"
                          value={principal.website}
                          onChange={(e) => updateListItem(setPrincipals, index, 'website', e.target.value)}
                          placeholder={tg('placeholders.website')}
                        />
                      </Field>
                      <Field label={tg('fields.x-handle')}>
                        <input
                          className="input-text"
                          value={principal.x}
                          onChange={(e) => updateListItem(setPrincipals, index, 'x', e.target.value)}
                          placeholder={tg('placeholders.x-handle')}
                        />
                      </Field>
                      <Field label={tg('fields.linkedin')}>
                        <input
                          className="input-text"
                          value={principal.linkedin}
                          onChange={(e) => updateListItem(setPrincipals, index, 'linkedin', e.target.value)}
                          placeholder={tg('placeholders.linkedin')}
                        />
                      </Field>
                      <Field label={tg('fields.telegram')}>
                        <input
                          className="input-text"
                          value={principal.telegram}
                          onChange={(e) => updateListItem(setPrincipals, index, 'telegram', e.target.value)}
                          placeholder={tg('placeholders.telegram')}
                        />
                      </Field>
                      <Field label={tg('fields.github')}>
                        <input
                          className="input-text"
                          value={principal.github}
                          onChange={(e) => updateListItem(setPrincipals, index, 'github', e.target.value)}
                          placeholder={tg('placeholders.github')}
                        />
                      </Field>
                    </div>
                  </RepeatCard>
                ))}
              </div>
            )}

            {enabledSections.validator && (
              <div className={`${styles.sectionBlock} ${styles.validatorSection}`}>
                <RepeatHeader
                  title={tg('modes.validator')}
                  addLabel={`${tg('actions.add')} ${tg('modes.validator')}`}
                  onAdd={() => setValidators((prev) => [...prev, createValidator()])}
                />
                <details className={styles.corsGuide}>
                  <summary>{tg('validator-guide.title')}</summary>
                  <p>{tg('validator-guide.intro')}</p>
                  <h5>{tg('validator-guide.validator-title')}</h5>
                  <p>{tg('validator-guide.validator-text')}</p>
                  <pre>
                    <code>./validator-keys set_domain example.com</code>
                  </pre>
                  <p>{tg('validator-guide.after-command')}</p>
                  <h5>{tg('validator-guide.xrpld-title')}</h5>
                  <p>{tg('validator-guide.xrpld-text')}</p>
                  <h5>{tg('validator-guide.domain-title')}</h5>
                  <p>{tg('validator-guide.domain-text', { tomlName })}</p>
                  <p>
                    <b>{tg('validator-guide.warning')}</b>
                  </p>
                </details>
                {validators.map((validator, index) => (
                  <RepeatCard
                    key={index}
                    title={`${tg('modes.validator')} ${index + 1}`}
                    removeLabel={tg('actions.remove')}
                    canRemove={validators.length > 1}
                    onRemove={() => removeListItem(setValidators, index)}
                  >
                    <div className={styles.grid}>
                      <Field label={tg('fields.validator-public-key')} required>
                        <input
                          className="input-text"
                          value={validator.publicKey}
                          onChange={(e) => updateListItem(setValidators, index, 'publicKey', e.target.value)}
                          placeholder={tg('placeholders.validator-key')}
                          spellCheck="false"
                        />
                      </Field>
                      <Field label={tg('fields.attestation')} hint={tg('hints.attestation')}>
                        <input
                          className="input-text"
                          value={validator.attestation}
                          onChange={(e) => updateListItem(setValidators, index, 'attestation', e.target.value)}
                          placeholder={tg('placeholders.attestation')}
                          spellCheck="false"
                        />
                      </Field>
                      <Field label={tg('fields.network')}>
                        <FormSelect
                          value={validator.network}
                          options={networkOptions}
                          instanceId={`toml-validator-network-${index}`}
                          onChange={(value) => updateListItem(setValidators, index, 'network', value)}
                        />
                      </Field>
                      <Field label={tg('fields.unl')}>
                        <FormSelect
                          value={validator.unl}
                          options={unlOptionsByNetwork[validator.network] || []}
                          instanceId={`toml-validator-unl-${index}`}
                          onChange={(value) => updateListItem(setValidators, index, 'unl', value)}
                        />
                      </Field>
                      <Field label={tg('fields.owner-country')}>
                        <CountrySelect
                          countryCode={validator.ownerCountry}
                          instanceId={`toml-validator-owner-country-${index}`}
                          setCountryCode={(value) => updateListItem(setValidators, index, 'ownerCountry', value)}
                          type="onlySelect"
                        />
                      </Field>
                      <Field label={tg('fields.server-country')}>
                        <CountrySelect
                          countryCode={validator.serverCountry}
                          instanceId={`toml-validator-server-country-${index}`}
                          setCountryCode={(value) => updateListItem(setValidators, index, 'serverCountry', value)}
                          type="onlySelect"
                        />
                      </Field>
                      <Field label={tg('fields.network-asn')}>
                        <input
                          className="input-text"
                          inputMode="numeric"
                          value={validator.networkAsn}
                          onChange={(e) =>
                            updateListItem(setValidators, index, 'networkAsn', e.target.value.replace(/\D/g, ''))
                          }
                          placeholder={tg('placeholders.network-asn')}
                        />
                      </Field>
                      <Field label={tg('fields.server-location')}>
                        <input
                          className="input-text"
                          value={validator.serverLocation}
                          onChange={(e) => updateListItem(setValidators, index, 'serverLocation', e.target.value)}
                          placeholder={tg('placeholders.server-location')}
                        />
                      </Field>
                      <Field label={tg('fields.server-cloud')}>
                        <FormSelect
                          value={validator.serverCloud}
                          options={booleanOptions}
                          instanceId={`toml-validator-server-cloud-${index}`}
                          onChange={(value) => updateListItem(setValidators, index, 'serverCloud', value)}
                        />
                      </Field>
                    </div>
                  </RepeatCard>
                ))}
              </div>
            )}

            {enabledSections.server && (
              <div className={`${styles.sectionBlock} ${styles.serverSection}`}>
                <RepeatHeader
                  title={tg('modes.server')}
                  addLabel={`${tg('actions.add')} ${tg('modes.server')}`}
                  onAdd={() => setServers((prev) => [...prev, createServer()])}
                />
                {servers.map((server, index) => (
                  <RepeatCard
                    key={index}
                    title={`${tg('modes.server')} ${index + 1}`}
                    removeLabel={tg('actions.remove')}
                    canRemove={servers.length > 1}
                    onRemove={() => removeListItem(setServers, index)}
                  >
                    <div className={styles.grid}>
                      <Field label={tg('fields.json-rpc')}>
                        <input
                          className="input-text"
                          value={server.jsonRpc}
                          onChange={(e) => updateListItem(setServers, index, 'jsonRpc', e.target.value)}
                          placeholder="https://s1.ripple.com:51234/"
                        />
                      </Field>
                      <Field label={tg('fields.websocket')}>
                        <input
                          className="input-text"
                          value={server.ws}
                          onChange={(e) => updateListItem(setServers, index, 'ws', e.target.value)}
                          placeholder="wss://s1.ripple.com/"
                        />
                      </Field>
                      <Field label={tg('fields.peer')}>
                        <input
                          className="input-text"
                          value={server.peer}
                          onChange={(e) => updateListItem(setServers, index, 'peer', e.target.value)}
                          placeholder="https://s1.ripple.com:51235/"
                        />
                      </Field>
                      <Field label={tg('fields.network')}>
                        <FormSelect
                          value={server.network}
                          options={networkOptions}
                          instanceId={`toml-server-network-${index}`}
                          onChange={(value) => updateListItem(setServers, index, 'network', value)}
                        />
                      </Field>
                      <Field label={tg('fields.description')} className={styles.wideField}>
                        <input
                          className="input-text"
                          value={server.desc}
                          onChange={(e) => updateListItem(setServers, index, 'desc', e.target.value)}
                          placeholder={tg('placeholders.server-desc')}
                        />
                      </Field>
                    </div>
                  </RepeatCard>
                ))}
              </div>
            )}

            {enabledSections.token && (
              <div className={`${styles.sectionBlock} ${styles.tokenSection}`}>
                <RepeatHeader
                  title={tg('modes.token')}
                  addLabel={`${tg('actions.add')} ${tg('modes.token')}`}
                  onAdd={() => setTokens((prev) => [...prev, createToken()])}
                />
                {tokens.map((token, tokenIndex) => (
                  <RepeatCard
                    key={tokenIndex}
                    title={`${tg('modes.token')} ${tokenIndex + 1}`}
                    removeLabel={tg('actions.remove')}
                    canRemove={tokens.length > 1}
                    onRemove={() => removeListItem(setTokens, tokenIndex)}
                  >
                    <h4>{tg('sections.issuer')}</h4>
                    <div className={styles.grid}>
                      <AddressField
                        label={tg('fields.issuer-address')}
                        required
                        value={token.issuerAddress}
                        onChange={(value) => updateListItem(setTokens, tokenIndex, 'issuerAddress', value)}
                        placeholder={tg('placeholders.address')}
                        type={`issuerAddress${tokenIndex}`}
                      />
                      <Field label={tg('fields.network')}>
                        <FormSelect
                          value={token.network}
                          options={networkOptions}
                          instanceId={`toml-currency-network-${tokenIndex}`}
                          onChange={(value) => updateListItem(setTokens, tokenIndex, 'network', value)}
                        />
                      </Field>
                      <Field label={tg('fields.issuer-name')}>
                        <input
                          className="input-text"
                          value={token.issuerName}
                          onChange={(e) => updateListItem(setTokens, tokenIndex, 'issuerName', e.target.value)}
                          placeholder={tg('placeholders.issuer-name')}
                        />
                      </Field>
                      <Field label={tg('fields.issuer-icon')}>
                        <input
                          className="input-text"
                          value={token.issuerIcon}
                          onChange={(e) => updateListItem(setTokens, tokenIndex, 'issuerIcon', e.target.value)}
                          placeholder="https://example.com/icon.png"
                        />
                      </Field>
                      <Field label={tg('fields.issuer-description')} className={styles.wideField}>
                        <input
                          className="input-text"
                          value={token.issuerDesc}
                          onChange={(e) => updateListItem(setTokens, tokenIndex, 'issuerDesc', e.target.value)}
                          placeholder={tg('placeholders.issuer-desc')}
                        />
                      </Field>
                    </div>

                    <h4>{tg('sections.token-metadata')}</h4>
                    <div className={styles.grid}>
                      <Field label={tg('fields.currency-code')} required>
                        <input
                          className="input-text"
                          value={token.tokenCurrency}
                          onChange={(e) => updateListItem(setTokens, tokenIndex, 'tokenCurrency', e.target.value)}
                          placeholder="RLUSD"
                          spellCheck="false"
                        />
                      </Field>
                      <Field label={tg('fields.token-name')}>
                        <input
                          className="input-text"
                          value={token.tokenName}
                          onChange={(e) => updateListItem(setTokens, tokenIndex, 'tokenName', e.target.value)}
                          placeholder={tg('placeholders.token-name')}
                        />
                      </Field>
                      <Field label={tg('fields.token-icon')}>
                        <input
                          className="input-text"
                          value={token.tokenIcon}
                          onChange={(e) => updateListItem(setTokens, tokenIndex, 'tokenIcon', e.target.value)}
                          placeholder="https://example.com/token.png"
                        />
                      </Field>
                      <Field label={tg('fields.asset-class')}>
                        <FormSelect
                          value={token.tokenAssetClass}
                          options={assetClassOptions}
                          instanceId={`toml-token-asset-class-${tokenIndex}`}
                          onChange={(value) => updateTokenAssetClass(setTokens, tokenIndex, value)}
                        />
                      </Field>
                      {token.tokenAssetClass === 'rwa' && (
                        <Field label={tg('fields.asset-subclass')}>
                          <FormSelect
                            value={token.tokenAssetSubclass}
                            options={assetSubclassOptions}
                            instanceId={`toml-token-asset-subclass-${tokenIndex}`}
                            onChange={(value) => updateListItem(setTokens, tokenIndex, 'tokenAssetSubclass', value)}
                          />
                        </Field>
                      )}
                      <Field label={tg('fields.display-decimals')}>
                        <input
                          className="input-text"
                          inputMode="numeric"
                          value={token.displayDecimals}
                          onChange={(e) =>
                            updateListItem(setTokens, tokenIndex, 'displayDecimals', e.target.value.replace(/\D/g, ''))
                          }
                          placeholder="2"
                        />
                      </Field>
                      <Field label={tg('fields.currency-symbol')}>
                        <input
                          className="input-text"
                          value={token.currencySymbol}
                          onChange={(e) => updateListItem(setTokens, tokenIndex, 'currencySymbol', e.target.value)}
                          placeholder="$"
                        />
                      </Field>
                      <Field label={tg('fields.token-description')} className={styles.wideField}>
                        <input
                          className="input-text"
                          value={token.tokenDesc}
                          onChange={(e) => updateListItem(setTokens, tokenIndex, 'tokenDesc', e.target.value)}
                          placeholder={tg('placeholders.token-desc')}
                        />
                      </Field>
                    </div>

                    <div className={styles.repeatHeader}>
                      <h4>{tg('sections.token-links')}</h4>
                      <button type="button" className="button-action secondary" onClick={() => addTokenUrl(tokenIndex)}>
                        {tg('actions.add-link')}
                      </button>
                    </div>
                    {token.urls.map((item, urlIndex) => (
                      <div className={styles.repeatRow} key={urlIndex}>
                        <input
                          className="input-text"
                          value={item.url}
                          onChange={(e) => updateTokenUrl(tokenIndex, urlIndex, 'url', e.target.value)}
                          placeholder={tg('placeholders.website')}
                        />
                        <FormSelect
                          value={item.type}
                          options={urlTypeOptions}
                          instanceId={`toml-token-url-type-${tokenIndex}-${urlIndex}`}
                          onChange={(value) => updateTokenUrl(tokenIndex, urlIndex, 'type', value)}
                        />
                        <input
                          className="input-text"
                          value={item.title}
                          onChange={(e) => updateTokenUrl(tokenIndex, urlIndex, 'title', e.target.value)}
                          placeholder={tg('placeholders.link-title')}
                        />
                        {token.urls.length > 1 && (
                          <button
                            type="button"
                            className="button-action secondary"
                            onClick={() => removeTokenUrl(tokenIndex, urlIndex)}
                          >
                            {tg('actions.remove')}
                          </button>
                        )}
                      </div>
                    ))}
                  </RepeatCard>
                ))}
              </div>
            )}
          </section>

          <aside className={styles.previewPanel}>
            <div className={styles.previewTop}>
              <h4>{tg('generated-title', { tomlName })}</h4>
              <div className={styles.actions}>
                <button type="button" className="button-action secondary" onClick={copyOutput}>
                  <LuCopy aria-hidden="true" />
                  {copied ? tg('actions.copied') : tg('actions.copy')}
                </button>
                <button type="button" className="button-action" onClick={downloadToml}>
                  <LuDownload aria-hidden="true" />
                  {tg('actions.download')}
                </button>
              </div>
            </div>

            {warnings.length > 0 && (
              <div className={styles.warnings}>
                {warnings.map((warning) => (
                  <div key={warning}>{warning}</div>
                ))}
              </div>
            )}

            <pre className={styles.preview}>{output}</pre>
          </aside>
        </div>
      </div>
    </>
  )
}

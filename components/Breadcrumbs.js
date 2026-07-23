import Head from 'next/head'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { useTranslation } from 'next-i18next'

import { explorerName, nativeCurrency, server, stripLeadingLocale, xahauNetwork } from '../utils'
import { nftName } from '../utils/nft'
import styles from '../styles/components/breadcrumbs.module.scss'

const LABELS = {
  account: 'Account',
  admin: 'Admin',
  amm: 'AMM',
  amms: 'AMMs',
  amendment: 'Amendment',
  amendments: 'Amendments',
  dapp: 'Dapp',
  dapps: 'Dapps',
  explorer: 'Account and transaction search',
  governance: 'Governance',
  learn: 'Learn',
  ledger: 'Ledger',
  nft: 'NFT',
  nfts: 'NFTs',
  'nft-collection': 'NFT collection',
  'nft-distribution': 'NFT distribution',
  'nft-offer': 'NFT offer',
  'nft-offers': 'NFT offers',
  object: 'Ledger object',
  services: 'Services',
  token: 'Token',
  tokens: 'Tokens',
  tx: 'Transaction',
  validator: 'Validator',
  validators: 'Validators'
}

const TRANSLATION_KEYS = {
  account: 'explorer.menu.account',
  amm: 'menu.amm.amm',
  amms: 'menu.amm.pools',
  amendments: 'menu.network.amendments',
  dapps: 'menu.network.dapps',
  explorer: 'menu.search-accounts-transactions',
  governance: 'menu.network.governance',
  ledger: 'menu.ledger',
  nft: 'explorer.header.nft',
  nfts: 'explorer.header.nfts',
  'nft-collection': 'explorer.header.topNftCollections',
  'nft-offer': 'explorer.header.nft-offer',
  'nft-offers': 'explorer.header.nft-offers',
  services: 'menu.services.services',
  tokens: 'menu.tokens',
  tx: 'explorer.header.transaction',
  validators: 'menu.network.validators'
}

const DETAIL_PARENTS = {
  amm: { href: '/amms', label: 'AMM pools', translationKey: 'menu.amm.pools' },
  amendment: { href: '/amendments', label: 'Amendments', translationKey: 'menu.network.amendments' },
  dapp: { href: '/dapps', label: 'Dapps', translationKey: 'menu.network.dapps' },
  nft: { href: '/nft-explorer', label: 'NFTs', translationKey: 'explorer.header.nfts' },
  token: { href: '/tokens', label: 'Tokens', translationKey: 'menu.tokens' },
  validator: { href: '/validators', label: 'Validators', translationKey: 'menu.network.validators' }
}

const SERVICE_TRANSLATION_KEYS = {
  '/services/account-control': 'account-control.title',
  '/services/account-delete': 'account-delete.title',
  '/services/account-settings': 'account-settings.title',
  '/services/check': 'check.title',
  '/services/escrow': 'escrow.title',
  '/services/issue-mpt': 'issue-mpt.title',
  '/services/nft-mint': 'nft-mint.title',
  '/services/send': 'send.title',
  '/services/token-issuer-settings': 'token-issuer-settings-page.title',
  '/services/toml-generator': { key: 'menu.services.toml-generator', ns: 'common' },
  '/services/trustline': 'trustline.title'
}

const SERVICE_ROOT_PAGES = {
  'submit-account-information': { key: 'heading', ns: 'submit-account-information' },
  username: { key: 'menu.services.username', ns: 'common' }
}

const ROUTE_TRANSLATIONS = {
  '/about-us': 'menu.company.about-us',
  '/account': 'explorer.header.account',
  '/activation-tree': 'menu.network.activation-tree',
  '/activations': 'menu.network.activations',
  '/advertise': 'menu.business.advertise',
  '/alerts': 'menu.pro.alerts',
  '/allocation': 'menu.network.allocation',
  '/amm': 'menu.amm.amm',
  '/amms': 'menu.amm.pools',
  '/amendments': 'menu.network.amendments',
  '/build-unl': 'menu.business.build-unl',
  '/customer-support': 'menu.customer-support',
  '/dapps': 'menu.network.dapps',
  '/disclaimer': 'menu.disclaimer',
  '/domains': 'menu.network.verified-domains',
  '/donate': 'menu.donate',
  '/eaas': 'menu.business.eaas',
  '/explorer': 'menu.search-accounts-transactions',
  '/faucet': 'menu.developers.faucet',
  '/genesis': 'menu.network.genesis',
  '/governance': 'menu.network.governance',
  '/last-ledger-information': 'menu.network.last-ledger-information',
  '/mpts': 'menu.token-menu.multi-purpose',
  '/nft-distribution': 'menu.nft.distribution',
  '/nft-explorer': 'explorer.header.nfts',
  '/nft-minters': 'menu.nft.minters',
  '/nft-sales': 'menu.nft.sales',
  '/nft-statistics': 'menu.nft.statistics',
  '/nft-volumes': 'menu.nft.volumes',
  '/nodes': 'menu.network.nodes',
  '/object': 'explorer.header.object',
  '/press': 'menu.press',
  '/privacy-policy': 'menu.privacy-policy',
  '/services': 'menu.services.services',
  '/services/amm': 'menu.amm.amm',
  '/services/reward-auto-claim': 'menu.services.reward-auto-claim',
  '/services/toml-checker': 'menu.services.toml-checker',
  '/terms-and-conditions': 'menu.terms-and-conditions',
  '/tokens': 'menu.tokens',
  '/transaction': 'explorer.header.transaction',
  '/tx': 'explorer.header.transaction',
  '/unl-report': 'menu.network.unl-report',
  '/validators': 'menu.network.validators',
  '/xahau-wallets': 'menu.learn-more.xahau-wallets',
  '/xrp-wallets': 'menu.learn-more.xrp-wallets'
}

const SERVICE_AMM_TRANSLATIONS = {
  '/services/amm/create': 'amm.create-heading',
  '/services/amm/deposit': 'amm.deposit-title',
  '/services/amm/vote': 'amm.vote-heading',
  '/services/amm/withdraw': 'amm.withdraw-heading'
}

const ACRONYMS = new Map([
  ['api', 'API'],
  ['dex', 'DEX'],
  ['did', 'DID'],
  ['mpt', 'MPT'],
  ['nft', 'NFT'],
  ['nfts', 'NFTs'],
  ['toml', 'TOML'],
  ['tx', 'Transaction'],
  ['unl', 'UNL'],
  ['xrp', 'XRP'],
  ['xrpl', 'XRPL']
])

const homeLabel = xahauNetwork ? 'Xahau Explorer' : 'XRP Explorer'
const explorerNetworkName = xahauNetwork ? 'Xahau' : 'XRPL'

const humanize = (segment, t) => {
  let decoded = segment
  try {
    decoded = decodeURIComponent(segment)
  } catch (_) {
    // Keep the original URL segment when it contains malformed escaping.
  }
  const translationKey = TRANSLATION_KEYS[decoded.toLowerCase()]
  if (translationKey) {
    return t(translationKey, {
      defaultValue: LABELS[decoded.toLowerCase()],
      nativeCurrency,
      networkName: explorerNetworkName
    })
  }
  const knownLabel = LABELS[decoded.toLowerCase()]
  if (knownLabel) return knownLabel
  if (decoded.length > 24 && !decoded.includes('-')) return decoded

  return decoded
    .split('-')
    .filter(Boolean)
    .map((word) => ACRONYMS.get(word.toLowerCase()) || word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

const accountLabel = (pageProps) => {
  const sources = [pageProps?.initialData, pageProps?.initialAccountData, pageProps?.rootData]

  for (const source of sources) {
    if (!source) continue
    const details = source.addressDetails || {}
    const service = source.service || details.service
    const serviceName = typeof service === 'string' ? service : service?.name
    const label = serviceName || source.username || details.username
    if (label) return label
  }

  return null
}

const addressLabel = (addressData) => {
  if (!addressData) return null

  const details = addressData.addressDetails || {}
  const service = addressData.service || details.service
  const serviceName = typeof service === 'string' ? service : service?.name

  return serviceName || addressData.username || details.username || addressData.address || null
}

const tokenLabel = (pageProps, fallback) => {
  const token = pageProps?.initialData
  if (!token) return fallback

  if (token.mptokenIssuanceID) {
    const metadata = token.metadata && typeof token.metadata === 'object' ? token.metadata : {}
    const name = typeof metadata.name === 'string' ? metadata.name.trim() : ''
    const shortName = typeof metadata.n === 'string' ? metadata.n.trim() : ''
    const ticker = typeof metadata.ticker === 'string' ? metadata.ticker.trim() : ''
    const shortTicker = typeof metadata.t === 'string' ? metadata.t.trim() : ''

    return name || shortName || ticker || shortTicker || token.currency || 'MPT'
  }

  return token.currencyDetails?.currency || token.currency || fallback
}

const validatorLabel = (pageProps) => {
  const validator = pageProps?.validator
  if (!validator) return null

  const service = validator.addressDetails?.service
  const serviceName = typeof service === 'string' ? service : service?.name

  return (
    validator.principals?.[0]?.name ||
    serviceName ||
    validator.addressDetails?.username ||
    validator.domain ||
    null
  )
}

const distributionCurrency = (pageProps) => {
  const token = pageProps?.queryToken
  if (!token) return nativeCurrency

  if (token.mptokenIssuanceID || token.mptokenIssuanceId || token.mpt_issuance_id) {
    const metadata = token.metadata && typeof token.metadata === 'object' ? token.metadata : {}
    return metadata.name || metadata.n || metadata.ticker || metadata.t || token.currency || 'MPT'
  }

  return token.currencyDetails?.currency || token.currency || nativeCurrency
}

const nftLabel = (pageProps) => {
  const nft = pageProps?.pageMeta
  return nftName(nft) || null
}

const displayLabel = (item, pageProps, t) => {
  if (item.href === '/distribution') {
    return t('menu.network.distribution', { currency: distributionCurrency(pageProps) })
  }
  const routeTranslationKey = ROUTE_TRANSLATIONS[item.href]
  if (routeTranslationKey) {
    return t(routeTranslationKey, {
      explorerName,
      nativeCurrency,
      networkName: explorerNetworkName,
      defaultValue: item.label
    })
  }
  if (item.href === '/learn') {
    return t('page.h1', { ns: 'learn', explorerName, nativeCurrency, defaultValue: item.label })
  }
  if (item.href.startsWith('/learn/')) {
    const slug = item.href.slice('/learn/'.length)
    return t(`items.${slug}`, { ns: 'learn', explorerName, nativeCurrency, defaultValue: item.label })
  }
  const ammServiceTranslationKey = SERVICE_AMM_TRANSLATIONS[item.href]
  if (ammServiceTranslationKey) {
    return t(ammServiceTranslationKey, { ns: 'services', defaultValue: item.label })
  }
  const serviceTranslation = SERVICE_TRANSLATION_KEYS[item.href]
  if (serviceTranslation) {
    const key = typeof serviceTranslation === 'string' ? serviceTranslation : serviceTranslation.key
    const ns = typeof serviceTranslation === 'string' ? 'services' : serviceTranslation.ns
    return t(key, { ns, defaultValue: item.label })
  }
  if (item.parent === 'account') return accountLabel(pageProps) || item.label
  if (item.parent === 'dapp') return pageProps?.dappName || item.label
  if (item.parent === 'ledger' && /^\d+$/.test(item.segment)) return `#${item.segment}`
  if (item.parent === 'nft') return nftLabel(pageProps) || item.label
  if (item.parent === 'validator') return validatorLabel(pageProps) || item.label
  return item.label
}

export default function Breadcrumbs({ pageProps }) {
  const router = useRouter()
  const { t } = useTranslation('common')
  const cleanPath = stripLeadingLocale((router.asPath || '/').split('#')[0].split('?')[0])
  const pathSegments = cleanPath.split('/').filter(Boolean)

  if (!pathSegments.length) return null

  let breadcrumbs = pathSegments.map((segment, index) => {
    const detailParent = index === 0 && pathSegments.length > 1 ? DETAIL_PARENTS[segment.toLowerCase()] : null

    return {
      segment,
      parent: pathSegments[index - 1] || '',
      href: detailParent?.href || `/${pathSegments.slice(0, index + 1).join('/')}`,
      label: detailParent
        ? t(detailParent.translationKey, {
            defaultValue: detailParent.label,
            networkName: explorerNetworkName
          })
        : humanize(segment, t),
      isCurrentPage: index === pathSegments.length - 1
    }
  })

  if (pathSegments[0].toLowerCase() === 'token' && pathSegments.length > 1) {
    const fallback = humanize(pathSegments[pathSegments.length - 1], t)
    breadcrumbs = [
      {
        segment: 'token',
        parent: '',
        href: DETAIL_PARENTS.token.href,
        label: t(DETAIL_PARENTS.token.translationKey, {
          defaultValue: DETAIL_PARENTS.token.label,
          networkName: explorerNetworkName
        }),
        isCurrentPage: false
      },
      {
        segment: pathSegments.slice(1).join('/'),
        parent: 'token',
        href: cleanPath,
        label: tokenLabel(pageProps, fallback),
        isCurrentPage: true
      }
    ]
  }

  if (pathSegments[0].toLowerCase() === 'account' && pathSegments.length > 1) {
    breadcrumbs = [
      {
        segment: pathSegments.slice(1).join('/'),
        parent: 'account',
        href: cleanPath,
        label: humanize(pathSegments[pathSegments.length - 1], t),
        isCurrentPage: true
      }
    ]
  }

  if (['tx', 'transaction'].includes(pathSegments[0].toLowerCase()) && pathSegments.length > 1) {
    const source = pageProps?.data?.specification?.source
    const sourceAddress = source?.address || pageProps?.data?.tx?.Account
    const transactionBreadcrumb = {
      segment: pathSegments[pathSegments.length - 1],
      parent: 'tx',
      href: cleanPath,
      label: humanize(pathSegments[pathSegments.length - 1], t),
      isCurrentPage: true
    }

    breadcrumbs = sourceAddress
      ? [
          {
            segment: sourceAddress,
            parent: 'tx-source',
            href: `/account/${sourceAddress}`,
            label: addressLabel(source) || sourceAddress,
            isCurrentPage: false
          },
          transactionBreadcrumb
        ]
      : [transactionBreadcrumb]
  }

  const serviceRootPage = pathSegments.length === 1 ? SERVICE_ROOT_PAGES[pathSegments[0].toLowerCase()] : null
  if (serviceRootPage) {
    breadcrumbs = [
      {
        segment: 'services',
        parent: '',
        href: '/services',
        label: t('menu.services.services'),
        isCurrentPage: false
      },
      {
        segment: pathSegments[0],
        parent: 'services',
        href: cleanPath,
        label: t(serviceRootPage.key, {
          ns: serviceRootPage.ns,
          defaultValue: humanize(pathSegments[0], t)
        }),
        isCurrentPage: true
      }
    ]
  }

  const schemaItems = [
    { name: homeLabel, href: '/' },
    ...breadcrumbs.map((item) => ({ name: displayLabel(item, pageProps, t), href: item.href }))
  ]
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    '@id': `${server}${cleanPath}#breadcrumb`,
    itemListElement: schemaItems.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: `${server}${item.href === '/' ? '' : item.href}`
    }))
  }

  return (
    <>
      <Head>
        <script
          key="breadcrumbs-jsonld"
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema).replace(/</g, '\\u003c') }}
        />
      </Head>
      <nav aria-label="Breadcrumb" className={styles.nav}>
        <ol className={styles.list}>
          <li className={styles.item}>
            <Link href="/" className={styles.home} aria-label={homeLabel}>
              <span>{homeLabel}</span>
            </Link>
          </li>
          {breadcrumbs.map((item) => {
            const label = displayLabel(item, pageProps, t)

            return (
              <li key={item.href} className={styles.item}>
                <span className={styles.separator} aria-hidden="true">›</span>
                {item.isCurrentPage ? (
                  <span className={styles.current} aria-current="page">
                    {label}
                  </span>
                ) : (
                  <Link href={item.href} className={styles.link}>
                    {label}
                  </Link>
                )}
              </li>
            )
          })}
        </ol>
      </nav>
    </>
  )
}

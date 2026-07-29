import Link from 'next/link'
import { useTranslation } from 'next-i18next'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'

import ArticleMeta from '../../components/ArticleMeta'
import SEO from '../../components/SEO'
import { explorerName, network, xahauNetwork } from '../../utils'
import { getIsSsrMobile } from '../../utils/mobile'

export async function getServerSideProps(context) {
  const { locale } = context
  return {
    props: {
      isSsrMobile: getIsSsrMobile(context),
      ...(await serverSideTranslations(locale, ['common', 'learn', 'guide-for-xrpl-projects']))
    }
  }
}

const ActionLink = ({ href, children }) => (
  <div className="p-4 my-4 border-l-4 rounded bg-white dark:bg-gray-900 border-[#4BA8B6] shadow-sm">
    <p className="text-gray-800 dark:text-gray-200">
      <span aria-hidden="true">👉</span> <Link href={href}>{children}</Link>
    </p>
  </div>
)

export function ProjectProfileGuide({ isXahau = false }) {
  const { t: translate } = useTranslation('guide-for-xrpl-projects')
  const t = (key, options) => {
    const value = translate(key, options)

    if (!isXahau || typeof value !== 'string') return value

    return value
      .replaceAll('XRP Ledger', 'Xahau')
      .replaceAll('XRPL', 'Xahau')
      .replaceAll('xrp-ledger.toml', 'xahau.toml')
  }
  const isCorrectMainnet = isXahau
    ? network === 'xahau' && xahauNetwork
    : network === 'mainnet' && !xahauNetwork

  return (
    <>
      <SEO
        title={t('seo.title')}
        description={t('seo.description', { explorerName })}
        noindex={!isCorrectMainnet}
      />
      <div className="max-w-4xl mx-auto px-4">
        <article className="prose sm:prose-lg dark:prose-invert max-w-4xl my-10">
          <h1 className="text-center">{t('title')}</h1>
          <ArticleMeta />

          <p>{t('intro.lead', { explorerName })}</p>
          <p>{t('intro.scope')}</p>

          <h2>{t('before.title')}</h2>
          <p>{t('before.account')}</p>
          <ul>
            <li>{t('before.items.public')}</li>
            <li>{t('before.items.control')}</li>
            <li>{t('before.items.consistent')}</li>
          </ul>

          <h2>{t('steps.username.title')}</h2>
          <p>{t('steps.username.text', { explorerName })}</p>
          <p>{t('steps.username.tip')}</p>
          <ActionLink href="/username">{t('steps.username.action')}</ActionLink>

          <h2>{t('steps.service.title')}</h2>
          <p>{t('steps.service.text', { explorerName })}</p>
          <p>{t('steps.service.details')}</p>
          <ActionLink href="/submit-account-information">{t('steps.service.action')}</ActionLink>

          <h2>{t('steps.toml.title')}</h2>
          <p>{t('steps.toml.serve')}</p>
          <pre>
            <code>
              https://{'{'}DOMAIN{'}'}/.well-known/{isXahau ? 'xahau.toml' : 'xrp-ledger.toml'}
            </code>
          </pre>
          <p>{t('steps.toml.content')}</p>
          <ul>
            <li>
              <code>[[PRINCIPALS]]</code> — {t('steps.toml.principals')}
            </li>
            <li>
              <code>[[ACCOUNTS]]</code> — {t('steps.toml.accounts')}
            </li>
          </ul>
          <p>{t('steps.toml.note')}</p>
          <ActionLink href="/services/toml-generator">{t('steps.toml.generate')}</ActionLink>
          <ActionLink href="/services/toml-checker">{t('steps.toml.check')}</ActionLink>

          <h2>{t('steps.domain.title')}</h2>
          <p>{t('steps.domain.text')}</p>
          <p>{t('steps.domain.format')}</p>
          <ActionLink href="/services/account-settings">{t('steps.domain.action')}</ActionLink>

          <h2>{t('steps.verify.title')}</h2>
          <p>{t('steps.verify.text')}</p>
          <ol>
            <li>{t('steps.verify.domainClaims')}</li>
            <li>{t('steps.verify.accountClaims')}</li>
          </ol>
          <ActionLink href="/learn/verified-domain">{t('steps.verify.action')}</ActionLink>

          <h2>{t('steps.review.title')}</h2>
          <p>{t('steps.review.text', { explorerName })}</p>
          <ul>
            <li>{t('steps.review.items.name')}</li>
            <li>{t('steps.review.items.domain')}</li>
            <li>{t('steps.review.items.links')}</li>
            <li>{t('steps.review.items.account')}</li>
          </ul>
          <ActionLink href="/account">{t('steps.review.action')}</ActionLink>

          <h2>{t('maintenance.title')}</h2>
          <p>{t('maintenance.text')}</p>
          <p>{t('maintenance.security')}</p>

          <h2>{t('checklist.title')}</h2>
          <ul>
            <li>{t('checklist.username')}</li>
            <li>{t('checklist.service')}</li>
            <li>{t('checklist.toml')}</li>
            <li>{t('checklist.domain')}</li>
            <li>{t('checklist.verified')}</li>
            <li>{t('checklist.reviewed')}</li>
          </ul>
        </article>
      </div>
    </>
  )
}

export default function GuideForXrplProjects() {
  return <ProjectProfileGuide />
}

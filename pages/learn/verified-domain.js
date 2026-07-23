import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { useTranslation } from 'next-i18next'
import SEO from '../../components/SEO'
import ArticleMeta from '../../components/ArticleMeta'
import { getIsSsrMobile } from '../../utils/mobile'
import { network } from '../../utils'
import { explorerName, ledgerName, xahauNetwork } from '../../utils'
import Link from 'next/link'
import Image from 'next/image'

export async function getServerSideProps(context) {
  const { locale } = context
  return {
    props: {
      isSsrMobile: getIsSsrMobile(context),
      ...(await serverSideTranslations(locale, ['common', 'learn', 'verified-domain']))
    }
  }
}

export default function VerifiedDomains() {
  const { t } = useTranslation('verified-domain')
  const { t: tl } = useTranslation('learn')

  return (
    <>
      <SEO
        title={t('seo.title', { explorerName })}
        description={t('seo.description', { explorerName })}
        noindex={network !== 'mainnet'}
        image={{ file: 'pages/learn/verified-domain/cover.png', width: 1520, height: 855, allNetworks: true }}
      />
      <div className="max-w-4xl mx-auto px-4">
        <article className="prose sm:prose-lg dark:prose-invert max-w-4xl my-10">
          <h1>{t('title', { explorerName })}</h1>
          <ArticleMeta />
          <Image
            src="/images/pages/learn/verified-domain/cover.png"
            alt={t('images.cover')}
            width={1520}
            height={855}
            className="w-full h-auto object"
            priority
          />
          <p>
            {t('intro.proof', { explorerName })}
          </p>
          <p>
            {t('intro.transparency', { explorerName })}
          </p>
          <p>
            {t('intro.twoWay', { explorerName })}
          </p>
          <ul>
            <li>
              <strong>{t('intro.domainClaim')}</strong>
            </li>
            <li>
              <strong>{t('intro.addressClaim')}</strong>
            </li>
          </ul>
          <h2>{t('domainClaim.title')}</h2>
          <p>
            {t('domainClaim.serve', { ledgerName })}
          </p>
          <pre>
            <code>
              https://{'{'}DOMAIN{'}'}/.well-known/{xahauNetwork ? 'xahau' : 'xrp-ledger'}.toml
            </code>
          </pre>
          <p>
            {t('domainClaim.accountBefore')} <code>[[ACCOUNTS]]</code> {t('domainClaim.accountAfter')}
          </p>
          <p>
            <strong>{t('domainClaim.example')}</strong>
          </p>
          <p>
            <strong>
              <Link
                href={
                  xahauNetwork
                    ? 'https://xahau.xrpl-labs.com/.well-known/xahau.toml'
                    : 'https://bithomp.com/.well-known/xrp-ledger.toml'
                }
              >
                {xahauNetwork
                  ? 'https://xahau.xrpl-labs.com/.well-known/xahau.toml'
                  : 'https://bithomp.com/.well-known/xrp-ledger.toml'}
              </Link>
            </strong>
          </p>
          <p>
            {!xahauNetwork && (
              <>
                {t('domainClaim.instructions')}{' '}
                <a href="https://xrpl.org/docs/references/xrp-ledger-toml">
                  <strong>XRPL TOML</strong>
                </a>
                .
              </>
            )}
          </p>
          <h2>{t('addressClaim.title')}</h2>
          <p>
            {t('addressClaim.setBefore')} <Link href="/domains/">{t('addressClaim.domainsLink')}</Link>{' '}
            {t('addressClaim.setAfter')}
          </p>
          <figure>
            <Image
              src="/images/pages/verified-domains/domains-screen.png"
              alt={t('images.setDomain')}
              width={1520}
              height={556}
              className="w-full h-auto object-contain scale-110"
              priority
            />
            <figcaption>{t('images.setDomain')}</figcaption>
          </figure>
          <p>
            {t('addressClaim.manageBefore')} <Link href="/account/">{t('addressClaim.accountLink')}</Link>{' '}
            {t('addressClaim.manageAfter')}
          </p>
          <figure>
            <Image
              src={'/images/' + (xahauNetwork ? 'xahau' : 'xrpl') + 'explorer/verified-domains/screen-account-page.png'}
              alt={t('images.accountPage')}
              width={1520}
              height={950}
              className="w-full h-auto object-contain scale-110"
              priority
            />
            <figcaption>{t('images.accountPage')}</figcaption>
          </figure>
          <h2>{t('website.title')}</h2>
          <p>
            {t('website.listBefore')}{' '}
            <Link href="/domains/">{t('website.listLink', { explorerName })}</Link>.
          </p>
          <p>
            <strong>{t('website.examples')}</strong>
          </p>
          <p>
            <Link
              href={
                xahauNetwork
                  ? '/account/rwUAi9ErV3wqgPdPj5qJdhBegJ3SPEvG9Y'
                  : '/account/rKontEGtDju5MCEJCwtrvTWQQqVAw5juXe'
              }
            >
              {xahauNetwork ? 'rwUAi9ErV3wqgPdPj5qJdhBegJ3SPEvG9Y' : 'rKontEGtDju5MCEJCwtrvTWQQqVAw5juXe'}
            </Link>
          </p>
          <p>
            <Link
              href={
                xahauNetwork
                  ? '/account/rNqe9wrMJM3D6hwcTtNmYTtfcjbHsHRDSg'
                  : '/account/rN8FigZNyfEdnve68oPFAeHymsjDaTSN3p'
              }
            >
              {xahauNetwork ? 'rNqe9wrMJM3D6hwcTtNmYTtfcjbHsHRDSg' : 'rN8FigZNyfEdnve68oPFAeHymsjDaTSN3p'}
            </Link>
          </p>
          <p>
            <Link
              href={
                xahauNetwork
                  ? '/account/rD74dUPRFNfgnY2NzrxxYRXN4BrfGSN6Mv'
                  : '/account/rs5wxrBTSErywDDfPs5NY4Zorrca5QMGVd'
              }
            >
              {xahauNetwork ? 'rD74dUPRFNfgnY2NzrxxYRXN4BrfGSN6Mv' : 'rs5wxrBTSErywDDfPs5NY4Zorrca5QMGVd'}
            </Link>
          </p>
          <p>
            {t('website.badge', { ledgerName })}
          </p>
          <figure>
            <Image
              src={
                '/images/' +
                (xahauNetwork ? 'xahau' : 'xrpl') +
                'explorer/verified-domains/checkmark-example-screen.png'
              }
              alt={t('images.badge', { explorerName })}
              width={1520}
              height={945}
              className="w-full h-auto object-contain scale-110"
              priority
            />
            <figcaption>{t('images.badge', { explorerName })}</figcaption>
          </figure>
          <p>
            {t('website.reverify')}
          </p>
          <p>
            {t('website.recommendation', { explorerName })}
          </p>
          <br />
          <h3>{t('related.title')}</h3>

          <ul>
            {!xahauNetwork && (
              <>
                <li>
                  <Link href="/learn/xrpl-article">{tl('items.xrpl-article')}</Link>
                </li>
                <li>
                  <Link href="/learn/ripple-usd">{tl('items.ripple-usd')}</Link>
                </li>
                <li>
                  <Link href="/learn/the-bithomp-explorer-advantages">
                    {tl('items.the-bithomp-explorer-advantages')}
                  </Link>
                </li>
                <li>
                  <Link href="/learn/guide-for-token-issuers">{tl('items.guide-for-token-issuers')}</Link>
                </li>
              </>
            )}

            {xahauNetwork && (
              <li>
                <Link href="/learn/the-bithomp-explorer-advantages">
                  {tl('items.the-bithomp-explorer-advantages')}
                </Link>
              </li>
            )}

            <li>
              <Link href="/learn/blackholed-address">{tl('items.blackholed-address')}</Link>
            </li>
          </ul>
        </article>
      </div>
    </>
  )
}

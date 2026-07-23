import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { useTranslation } from 'next-i18next'
import SEO from '../../components/SEO'
import ArticleMeta from '../../components/ArticleMeta'
import { getIsSsrMobile } from '../../utils/mobile'
import { network } from '../../utils'
import { nativeCurrency, explorerName, xahauNetwork } from '../../utils'
import Image from 'next/image'
import Link from 'next/link'

export async function getServerSideProps(context) {
  const { locale } = context
  return {
    props: {
      isSsrMobile: getIsSsrMobile(context),
      ...(await serverSideTranslations(locale, ['common', 'learn', 'learn-blacklisted-address']))
    }
  }
}

export default function BlacklistedAddress() {
  const { t } = useTranslation('learn-blacklisted-address')

  return (
    <>
      <SEO
        title={t('seo.title')}
        description={t('seo.description', { explorerName })}
        noindex={network !== 'mainnet'}
        image={{ file: 'pages/blacklisted-picture.jpg', width: 1520, height: 1084, allNetworks: true }}
      />
      <div className="max-w-4xl mx-auto px-4">
        <article className="prose sm:prose-lg dark:prose-invert max-w-4xl my-10">
          <h1>{t('h1', { explorerName })}</h1>
          <ArticleMeta />

          <Image
            src="/images/pages/blacklisted-address-cover.png"
            alt={t('images.coverAlt')}
            width={1520}
            height={1084}
            className="max-w-full h-auto object-contain"
            priority
          />

          <p>{t('intro', { explorerName })}</p>
          <ul>
            <li>{t('safety.verify')}</li>
            <li>{t('safety.keys')}</li>
            <li>
              {t('safety.scams', { nativeCurrency })}
            </li>
            <li>{t('safety.tools')}</li>
          </ul>
          <p>{t('fraudAlert')}</p>
          <figure>
            <Image
              src={'/images/pages/blacklisted-address-screen.png'}
              alt={t('images.exampleAlt')}
              width={1520}
              height={673}
              className="w-full h-auto object-contain scale-110"
              priority
            />
            <figcaption>{t('images.exampleCaption')}</figcaption>
          </figure>
          <p>
            <strong>{t('warning')}</strong>
          </p>
          <p>{t('reasonsIntro')}</p>
          <ul>
            <li>{t('reasons.stolenFunds')}</li>
            <li>{t('reasons.scams')}</li>
            <li>{t('reasons.spam')}</li>
          </ul>
          <p>{t('sources')}</p>
          <h3>{t('related.title')}</h3>

          <ul>
            {!xahauNetwork && (
              <>
                <li>
                  <Link href="/learn/xrpl-article">{t('related.xrplArticle')}</Link>
                </li>
                <li>
                  <Link href="/learn/ripple-usd">{t('related.rippleUsd')}</Link>
                </li>
                <li>
                  <Link href="/learn/the-bithomp-explorer-advantages">
                    {t('related.bithompAdvantagesXrpl')}
                  </Link>
                </li>
              </>
            )}

            {xahauNetwork && (
              <li>
                <Link href="/learn/the-bithomp-explorer-advantages">
                  {t('related.bithompAdvantagesXahau')}
                </Link>
              </li>
            )}

            <li>
              <Link href="/learn/blackholed-address">
                {t('related.blackholed', { explorerName })}
              </Link>
            </li>
          </ul>
        </article>
      </div>
    </>
  )
}

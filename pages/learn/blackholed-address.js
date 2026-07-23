import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { Trans, useTranslation } from 'next-i18next'
import SEO from '../../components/SEO'
import { getIsSsrMobile } from '../../utils/mobile'
import { network } from '../../utils'
import { nativeCurrency, explorerName, xahauNetwork } from '../../utils'
import Link from 'next/link'
import Image from 'next/image'

export async function getServerSideProps(context) {
  const { locale } = context
  return {
    props: {
      isSsrMobile: getIsSsrMobile(context),
      ...(await serverSideTranslations(locale, ['common', 'learn', 'learn-blackholed-address']))
    }
  }
}

export default function BlackholedAddress() {
  const { t } = useTranslation('learn-blackholed-address')
  const imagePath = '/images/' + (xahauNetwork ? 'xahau' : 'xrpl') + 'explorer/learn/blackholed-address/'
  const specialAddresses = [
    {
      address: 'rrrrrrrrrrrrrrrrrrrrrhoLvTp',
      href: '/account/rrrrrrrrrrrrrrrrrrrrrhoLvTp',
      name: 'ACCOUNT_ZERO',
      meaning: 'accountZero'
    },
    {
      address: 'rrrrrrrrrrrrrrrrrrrrBZbvji',
      href: '/account/rrrrrrrrrrrrrrrrrrrrBZbvji',
      name: 'ADDRESS_ONE',
      meaning: 'addressOne'
    },
    {
      address: 'rrrrrrrrrrrrrrrrrNAMEtxvNvQ',
      href: '/account/rrrrrrrrrrrrrrrrrNAMEtxvNvQ',
      name: 'Ripple Name Black-hole',
      meaning: 'rippleName'
    },
    {
      address: 'rrrrrrrrrrrrrrrrrrrn5RM1rHd',
      href: '/account/rrrrrrrrrrrrrrrrrrrn5RM1rHd',
      name: 'NaN Address',
      meaning: 'nanAddress'
    }
  ]

  return (
    <>
      <SEO
        title={t('seo.title', { explorerName })}
        description={t('seo.description')}
        noindex={network !== 'mainnet'}
        image={{
          file: '/xrplexplorer/learn/blackholed-address/cover.png',
          width: 1520,
          height: 855,
          allNetworks: true
        }}
      />
      <div className="max-w-4xl mx-auto px-4">
        <article className="prose sm:prose-lg dark:prose-invert max-w-4xl my-10">
          <h1>{t('h1', { explorerName })}</h1>
          <div className="flex justify-center">
            <figure>
              <Image
                src={imagePath + 'cover.png'}
                alt={t('images.coverAlt')}
                width={1520}
                height={857}
                className="w-full h-auto object-contain scale-110"
                priority
              />
              <figcaption>{t('images.coverCaption', { explorerName })}</figcaption>
            </figure>
          </div>

          <p>
            <Trans
              ns="learn-blackholed-address"
              i18nKey="paragraphs.intro"
              values={{ explorerName, nativeCurrency }}
              components={{ strong: <strong /> }}
            />
          </p>
          <p>
            <Trans ns="learn-blackholed-address" i18nKey="paragraphs.reason" components={{ strong: <strong /> }} />
          </p>
          <p>
            <Trans
              ns="learn-blackholed-address"
              i18nKey="paragraphs.how"
              components={{
                strong: <strong />,
                addressOne: <Link href="/account/rrrrrrrrrrrrrrrrrrrrBZbvji" />
              }}
            />
          </p>
          <figure>
            <Image
              src={imagePath + 'blackholed-account-screen.png'}
              alt={t('images.exampleAlt')}
              width={1520}
              height={857}
              className="w-full h-auto object-contain scale-110"
              priority
            />
            <figcaption>{t('images.exampleCaption')}</figcaption>
          </figure>
          <p>{t('exampleIntro')}</p>
          <ul>
            <li>{t('exampleBullets.blackholed')}</li>
            <li>{t('exampleBullets.when')}</li>
            <li>{t('exampleBullets.masterKey')}</li>
            <li>{t('exampleBullets.regularKey', { explorerName })}</li>
          </ul>
          <h1>{t('specialAddresses.title', { explorerName })}</h1>
          <p>{t('specialAddresses.intro', { explorerName })}</p>
          {specialAddresses.map(({ address, href, name, meaning }, index) => (
            <div key={address}>
              <p>
                {index + 1}. {t('specialAddresses.address')}:{' '}
                <strong>
                  <Link href={href}>{address}</Link>
                </strong>
              </p>
              <p>
                {t('specialAddresses.name')}: <strong>{name}</strong>
              </p>
              <p>
                {t(`specialAddresses.meanings.${meaning}`, {
                  explorerName,
                  nativeCurrency,
                  daemon: xahauNetwork ? 'xahaud' : 'rippled'
                })}
              </p>
            </div>
          ))}
          <h3>{t('conclusionTitle')}</h3>
          <p>
            <Trans
              ns="learn-blackholed-address"
              i18nKey="paragraphs.conclusion"
              values={{ explorerName }}
            />
          </p>
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
              <Link href="/learn/blacklisted-address">
                {t('related.blacklisted', { explorerName })}
              </Link>
            </li>
          </ul>
        </article>
      </div>
    </>
  )
}

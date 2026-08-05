import { useTranslation, Trans } from 'next-i18next'
import Link from 'next/link'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'

import SEO from '../components/SEO'

import styles from '../styles/pages/press.module.scss'

import { getIsSsrMobile } from '../utils/mobile'

const pressAssets = [
  {
    key: 'squareLight',
    dark: false,
    background: 'transparentBackground',
    images: [
      {
        src: '/images/press-assets/bithomp-square-logo-for-white-background/bithomp-square-logo-for-white-background-1450x1450.png',
        width: 1450,
        height: 1450
      },
      {
        src: '/images/press-assets/bithomp-square-logo-for-white-background/bithomp-square-logo-for-white-background-290x290.png',
        width: 290,
        height: 290
      }
    ]
  },
  {
    key: 'squareDark',
    dark: true,
    background: 'transparentBackground',
    images: [
      {
        src: '/images/press-assets/bithomp-square-logo-for-dark-background/bithomp-square-logo-for-dark-background-1450x1450.png',
        width: 1450,
        height: 1450
      },
      {
        src: '/images/press-assets/bithomp-square-logo-for-dark-background/bithomp-square-logo-for-dark-background-290x290.png',
        width: 290,
        height: 290
      }
    ]
  },
  {
    key: 'rectangleWithDarkBackground',
    dark: false,
    background: 'darkBackgroundIncluded',
    images: [
      {
        src: '/images/press-assets/bithomp-rectangle-logo-with-dark-background/bithomp-rectangle-logo-with-dark-background-1420x460.png',
        width: 1420,
        height: 460
      },
      {
        src: '/images/press-assets/bithomp-rectangle-logo-with-dark-background/bithomp-rectangle-logo-with-dark-background-710x230.png',
        width: 710,
        height: 230
      }
    ]
  },
  {
    key: 'rectangleLight',
    dark: false,
    background: 'transparentBackground',
    images: [
      {
        src: '/images/press-assets/bithomp-rectangle-logo-for-white-background/bithomp-rectangle-logo-for-white-background-1420x450.png',
        width: 1420,
        height: 450
      },
      {
        src: '/images/press-assets/bithomp-rectangle-logo-for-white-background/bithomp-rectangle-logo-for-white-background-710x225.png',
        width: 710,
        height: 225
      }
    ]
  },
  {
    key: 'rectangleDark',
    dark: true,
    background: 'transparentBackground',
    images: [
      {
        src: '/images/press-assets/bithomp-rectangle-logo-for-dark-background/bithomp-rectangle-logo-for-dark-background-1420x460.png',
        width: 1420,
        height: 460
      },
      {
        src: '/images/press-assets/bithomp-rectangle-logo-for-dark-background/bithomp-rectangle-logo-for-dark-background-710x230.png',
        width: 710,
        height: 230
      }
    ]
  }
]

export async function getServerSideProps(context) {
  const { locale } = context
  return {
    props: {
      isSsrMobile: getIsSsrMobile(context),
      ...(await serverSideTranslations(locale, ['common']))
    }
  }
}

export default function Press() {
  const { t } = useTranslation()

  return (
    <>
      <SEO title={t('menu.press')} />
      <main className={styles.page}>
        <h1 className="center">{t('menu.press')}</h1>
        <p className={styles.intro}>
          <Trans i18nKey="press">
            This is the official logo for Bithomp to use by media and press professionals for print and web (svg, png,
            eps, pdf, for dark and light backgrounds). For media inquiries, please{' '}
            <Link href="/customer-support">contact us</Link>.
          </Trans>
        </p>

        <section className={styles.assets} aria-labelledby="press-assets-title">
          <h2 id="press-assets-title" className="center">
            {t('pressAssets.title')}
          </h2>
          <div className={styles.grid}>
            {pressAssets.map((asset) => {
              const [largeImage, smallImage] = asset.images
              const label = t(`pressAssets.${asset.key}`)

              return (
                <figure className={styles.card} key={asset.key}>
                  <a
                    className={`${styles.preview} ${asset.dark ? styles.darkPreview : styles.lightPreview}`}
                    href={largeImage.src}
                    download
                    aria-label={`${t('button.download')} ${label}`}
                  >
                    <img
                      src={largeImage.src}
                      srcSet={`${smallImage.src} ${smallImage.width}w, ${largeImage.src} ${largeImage.width}w`}
                      sizes="(max-width: 800px) calc(100vw - 84px), 570px"
                      width={largeImage.width}
                      height={largeImage.height}
                      alt={`${label} — ${t(`pressAssets.${asset.background}`)}`}
                    />
                  </a>
                  <figcaption>
                    <strong>{label}</strong>
                    <span>{t(`pressAssets.${asset.background}`)}</span>
                    <div className={styles.downloads}>
                      {asset.images.map((image) => (
                        <a href={image.src} download key={image.src}>
                          PNG · {image.width} × {image.height}
                        </a>
                      ))}
                    </div>
                  </figcaption>
                </figure>
              )
            })}
          </div>
        </section>

        <p className={`center ${styles.downloadAll}`}>
          <a className="button-action" href="/download/bithomp-press.zip">
            {t('pressAssets.downloadAll')}
          </a>
        </p>
      </main>
    </>
  )
}

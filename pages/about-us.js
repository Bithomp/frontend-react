import { serverSideTranslations } from 'next-i18next/serverSideTranslations'

import SEO from '../components/SEO'
import { useTranslation } from 'next-i18next'
import { getIsSsrMobile } from '../utils/mobile'
import SocialIcons from '../components/Layout/SocialIcons'
import { localePath } from '../utils'

export async function getServerSideProps(context) {
  const { locale } = context
  return {
    props: {
      isSsrMobile: getIsSsrMobile(context),
      ...(await serverSideTranslations(locale, ['common', 'about-us']))
    }
  }
}

export default function AboutUs() {
  const { t, i18n } = useTranslation()
  const tt = (key, options = {}) => t(key, { ns: 'about-us', ...options })
  const nftBullets = tt('offerings.nft.bullets', { returnObjects: true })

  return (
    <>
      <SEO title={tt('seo-header')} description={tt('seo-description')} />
      <div className="content-text content-center">
        <h1 className="center">{tt('header')}</h1>
        <p>{tt('intro.description')}</p>
        <ul>
          <li>
            <a href={'https://bithomp.com' + localePath('/', i18n.language)} target="_blank" rel="noreferrer">
              XRPL Mainnet
            </a>
            ,
          </li>
          <li>
            <a href={'https://xahauexplorer.com' + localePath('/', i18n.language)} target="_blank" rel="noreferrer">
              XAHAU Mainnet
            </a>
            ,
          </li>
          <li>
            <a href={'https://test.bithomp.com' + localePath('/', i18n.language)} target="_blank" rel="noreferrer">
              XRPL Testnet
            </a>
            ,
          </li>
          <li>
            <a href={'https://dev.bithomp.com' + localePath('/', i18n.language)} target="_blank" rel="noreferrer">
              XRPL Devnet
            </a>
            ,
          </li>
          <li>
            <a href={'https://alphanet.bithomp.com' + localePath('/', i18n.language)} target="_blank" rel="noreferrer">
              XRPL AlphaNet
            </a>
            ,
          </li>
          <li>
            <a href={'https://test.xahauexplorer.com' + localePath('/', i18n.language)} target="_blank" rel="noreferrer">
              XAHAU Testnet
            </a>
            .
          </li>
        </ul>
        <p>{tt('intro.search-engine')}</p>
        <h2>{tt('sections.story')}</h2>
        <p>{tt('story.text')}</p>
        <h2>{tt('sections.mission')}</h2>
        <p>{tt('mission.text')}</p>
        <h2>{tt('sections.offer')}</h2>
        <ul>
          <li>
            <b>{tt('offerings.explorers.title')}</b> - {tt('offerings.explorers.text')}
          </li>
          <br />
          <li>
            <b>{tt('offerings.api.title')}</b> - {tt('offerings.api.text')}
          </li>
          <br />
          <li>
            <b>{tt('offerings.nft.title')}</b> - {tt('offerings.nft.text')}
            <p>{tt('offerings.nft.why')}</p>
            <ul>
              {Array.isArray(nftBullets) && nftBullets.map((item) => <li key={item}>{item}</li>)}
            </ul>
          </li>
          <br />
          <li>
            <b>{tt('offerings.statistics.title')}</b> - {tt('offerings.statistics.text')}
          </li>
          <br />
          <li>
            <b>{tt('offerings.faucets.title')}</b> - {tt('offerings.faucets.text')}
            <ul>
              <li>
                <a
                  href={'https://test.bithomp.com' + localePath('/faucet', i18n.language)}
                  target="_blank"
                  rel="noreferrer"
                >
                  XRPL Testnet
                </a>
              </li>
              <li>
                <a
                  href={'https://dev.bithomp.com' + localePath('/faucet', i18n.language)}
                  target="_blank"
                  rel="noreferrer"
                >
                  XRPL Devnet
                </a>
              </li>
              <li>
                <a
                  href={'https://alphanet.bithomp.com' + localePath('/faucet', i18n.language)}
                  target="_blank"
                  rel="noreferrer"
                >
                  XRPL AlphaNet
                </a>
              </li>
              <li>
                <a
                  href={'https://test.xahauexplorer.com' + localePath('/faucet', i18n.language)}
                  target="_blank"
                  rel="noreferrer"
                >
                  XAHAU Testnet
                </a>
              </li>
            </ul>
          </li>
        </ul>
        <h2>{tt('sections.plans')}</h2>
        <p>
          {tt('plans.text')}
          <br />
          {tt('plans.closing')}
        </p>
        <h2>{tt('sections.press')}</h2>
        <p>
          <b>Write.as</b> - March 23, 2020
          <br />
          <a href="https://write.as/moncho/xrplore-bithomp" target="_blank" rel="noreferrer">
            XRPLORE: Bithomp
          </a>
        </p>
        <p>
          <b>DEV.to</b> - March 31, 2023
          <br />
          <a href="https://dev.to/ripplexdev/xrpl-developer-ama-bithomp-4a8d" target="_blank" rel="noreferrer">
            XRPL Developer AMA: Bithomp
          </a>
        </p>
        <p>
          <b>XRPL Community Report</b> - October 2023
          <br />
          <a
            href="https://assets-global.website-files.com/640f20bd091411ea6a488ea6/655caf420e1b6cf7c0ce1089_Community%20Report%20Q4%202023.pdf#page=28"
            target="_blank"
            rel="noreferrer"
          >
            Humans of XRPL
          </a>{' '}
          ({tt('press.page', { page: 28 })})
        </p>
        <h2>{tt('product-hunt.header')}</h2>
        <p>{tt('product-hunt.text')}</p>
        <p>
          <a
            href="https://www.producthunt.com/products/bithomp-explorer?utm_source=badge-follow&utm_medium=badge&utm_source=badge-bithomp-explorer"
            target="_blank"
            rel="noopener noreferrer"
          >
            <img
              alt={tt('product-hunt.badge-alt')}
              width="250"
              height="54"
              src="https://api.producthunt.com/widgets/embed-image/v1/follow.svg?product_id=445031&theme=light"
            />
          </a>
        </p>
        <h2>{tt('sections.social')}</h2>
        <SocialIcons />
      </div>
    </>
  )
}

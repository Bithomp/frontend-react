import { serverSideTranslations } from 'next-i18next/serverSideTranslations'

import SEO from '../components/SEO'
import { useTranslation } from 'next-i18next'
import { getIsSsrMobile } from '../utils/mobile'
import SocialIcons from '../components/Layout/SocialIcons'

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

  return (
    <>
      <SEO title={t('seo-header', { ns: 'about-us' })} description={t('seo-description', { ns: 'about-us' })} />
      <div className="content-text content-center">
        <h1 className="center">{t('header', { ns: 'about-us' })}</h1>
        <p>
          Bithomp serves as a tool for users to delve into XRPL and XAHAU accounts, examining balances, transactions,
          owned assets including fungible tokens and NFTs, as well as orders, escrows, and other features across the
          following networks:
        </p>
        <ul>
          <li>
            <a href={'https://xrplexplorer.com/' + i18n.language} target="_blank" rel="noreferrer">
              XRPL Mainnet
            </a>
            ,
          </li>
          <li>
            <a href={'https://xahauexplorer.com/' + i18n.language} target="_blank" rel="noreferrer">
              XAHAU Mainnet
            </a>
            ,
          </li>
          <li>
            <a href={'https://test.xrplexplorer.com/' + i18n.language} target="_blank" rel="noreferrer">
              XRPL Testnet
            </a>
            ,
          </li>
          <li>
            <a href={'https://dev.xrplexplorer.com/' + i18n.language} target="_blank" rel="noreferrer">
              XRPL Devnet
            </a>
            ,
          </li>
          <li>
            <a href={'https://test.xahauexplorer.com/' + i18n.language} target="_blank" rel="noreferrer">
              XAHAU Testnet
            </a>
            .
          </li>
        </ul>
        <p>
          Imagine it as a search engine for the extensive decentralised databases, as well as a source of live
          statistics.
        </p>
        <h2>Our story</h2>
        <p>
          Bithomp was created in 2015 when its founder noticed a lack of user-friendly XRPL explorers and wanted to
          contribute to the ecosystem by creating such a tool. The community’s response was positive from the start,
          allowing Bithomp to grow quickly. From its origins as a hobby project to its transition into a full-time
          endeavour, Bithomp has been driven by community support and a commitment to user-friendly tools.
        </p>
        <h2>Our mission</h2>
        <p>Our mission is to make XRPL ecosystem accessible to a broader audience.</p>
        <h2>What we offer</h2>
        <ul>
          <li>
            <b>XRPL and XAHAU Explorers</b> - your gateway to the extensive decentralised databases.
          </li>
          <br />
          <li>
            <b>API Service</b> - your access to fast and reliable information, historical data and statistics on XRPL
            accounts, NFTs, and more.
          </li>
          <br />
          <li>
            <b>NFT Explorer</b> - the best search engine for NFTs and NFT offers on XRPL and XAHAU networks.
            <p>Why is it the best?</p>
            <ul>
              <li>We display all types of NFTs.</li>
              <li>We present the history of all NFT sales.</li>
              <li>We validate buy and sell offers and display historical offers.</li>
              <li>We efficiently cache video files and images for nearly instantaneous viewing.</li>
              <li>We provide information on the marketplaces where NFTs were minted or sold.</li>
              <li>
                We provide the opportunity of selling, buying, burning, or transferring NFTs directly from our website.
              </li>
              <li>
                We showcase all NFTs, regardless of the marketplace where they were issued, including those issued by
                the users themselves.
              </li>
              <li>We show NFT metadata including all NFT attributes in our CSV exports.</li>
            </ul>
          </li>
          <br />
          <li>
            <b>NFT Statistics</b> - your access to up-to-date data on all XRPL and XAHAU NFTs. Explore floor prices,
            sales volumes, NFT distribution info, minters, create volume sales charts, mint charts, and much more.
          </li>
          <br />
          <li>
            <b>
              Explorers and Faucets for{' '}
              <a href={'https://test.xrplexplorer.com/' + i18n.language + '/faucet'} target="_blank" rel="noreferrer">
                XRPL Testnet
              </a>
              ,{' '}
              <a href={'https://dev.xrplexplorer.com/' + i18n.language + '/faucet'} target="_blank" rel="noreferrer">
                XRPL Devnet
              </a>
              , and{' '}
              <a href={'https://test.xahauexplorer.com/' + i18n.language + '/faucet'} target="_blank" rel="noreferrer">
                XAHAU Testnet
              </a>
            </b>{' '}
            - convenient tool for developers to efficiently explore, test, and troubleshoot their applications without
            using real money.
          </li>
        </ul>
        <h2>Our plans</h2>
        <p>
          Bithomp is constantly evolving, adding new features and improving existing options to make them increasingly
          convenient for our users. Our plans and goals are ambitious and far-reaching. We are committed to ensuring
          that Bithomp remains accessible to all users. We're grateful for the trust and partnership we've built with
          the XRPL community, and we look forward to enhancing our platform further in collaboration with our customers.
          <br />
          Stay with us, as we have many more initiatives in store.
        </p>
        <h2>Bithomp in press</h2>
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
          (page 28)
        </p>
        <p>
          <h2>Follow us on Social Media</h2>
          <SocialIcons />
        </p>
      </div>
    </>
  )
}

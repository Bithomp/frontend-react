import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import SEO from '../../components/SEO'
import { getIsSsrMobile } from '../../utils/mobile'
import { network } from '../../utils'
import { nativeCurrency, explorerName, xahauNetwork } from '../../utils'
import Link from 'next/link'
import Image from 'next/image'
import Breadcrumbs from '../../components/Breadcrumbs'

export async function getServerSideProps(context) {
  const { locale } = context
  return {
    props: {
      isSsrMobile: getIsSsrMobile(context),
      ...(await serverSideTranslations(locale, ['common']))
    }
  }
}

export default function NftExplorer() {
  return (
    <>
      <SEO
        title={'Search, buy, sell, mint NFTs'}
        description="Explore all NFTs in one place. Discover, buy, sell, and manage NFTs with Bithomp — the fastest and most complete NFT explorer."
        noindex={network !== 'mainnet'}
        image={{ file: '/images/xrplexplorer/learn/nft-explorer/cover', width: 1520, height: 855, allNetworks: true }}
      />
      <div className="max-w-4xl mx-auto px-4">
        <Breadcrumbs />
        <article className="prose sm:prose-lg dark:prose-invert max-w-4xl my-10">
          <h1 className="text-center">
            {' '}
            {xahauNetwork ? 'Xahau Explorer' : 'Bithomp'} — The Best Way to Explore {explorerName} NFTs{' '}
          </h1>
          <div className="flex justify-center">
            <figure>
              <Image
                src={
                  xahauNetwork
                    ? '/images/xahauexplorer/learn/nft-explorer/cover.jpg'
                    : '/images/xrplexplorer/learn/nft-explorer/cover.jpg'
                }
                alt="NFT Explorer"
                width={1520}
                height={855}
                className="max-w-full h-auto object-contain"
                priority
              />
              <figcaption>{explorerName} NFT Explorer</figcaption>
            </figure>
          </div>
          <p>
            We started Bithomp to make the {explorerName} more open and easy to explore. Over time, NFTs became an
            important part of that story — and we wanted to give them the same level of visibility and detail. That’s
            how our <Link href="/nft-explorer">{xahauNetwork ? 'Xahau' : 'XRPL'} NFT Explorer</Link> came to life —
            built for everyone who creates, collects, or just loves {explorerName} NFTs - built for the community.
          </p>
          <h2>What we offer and what makes our {explorerName} NFT explorer unique</h2>
          <h3>One place for every type of NFT</h3>
          <p>
            No matter where an NFT was minted or which marketplace it belongs to, you can find it on Bithomp. We
            showcase all types of {xahauNetwork ? 'Xahau' : 'XRPL'} NFTs — with or without images, including music,
            videos, animated 3D models, panoramic views, and more.
          </p>
          {!xahauNetwork && (
            <section className="my-8">
              <p>
                <strong>NFT with music and video</strong>
                <br />
                <a href="https://bithomp.com/en/nft/00083A988FAD76FECCD5D023F7A2D7710CF6297C622492EE977719F105777A85">
                  View NFT
                </a>
              </p>

              <p>
                <strong>360° panoramic NFTs</strong>
                <br />
                <a href="https://bithomp.com/en/nft/00080000B1BC39057B636558C3BACD1FF6FBF014D1F546440F5A5DA503D92A7D">
                  View NFT
                </a>
              </p>

              <p>
                <strong>Animated NFTs</strong>
                <br />
                <a href="https://bithomp.com/en/nft/000800009724F745111A1ED69C10F9CE5FA8215BD6D66D79CE14A86100000009">
                  View NFT
                </a>
              </p>
            </section>
          )}
          <h3>Sales History and Validated Offers</h3>
          <p>
            Every NFT has a story, and we make it easy to follow. You can explore the complete sales history — including
            when and where it was minted, sold, or transferred — and view validated buy and sell offers showing where
            and at what price it can be purchased. Whether you’re tracking price trends or simply curious about a
            specific NFT or collection, all the information is just one click away.
          </p>
          <div className="flex justify-center">
            <figure>
              <Image
                src={
                  xahauNetwork
                    ? '/images/xahauexplorer/learn/nft-explorer/history-screen.png'
                    : '/images/xrplexplorer/learn/nft-explorer/history-screen.png'
                }
                alt="NFT sales history and offers"
                width={1520}
                height={950}
                className="max-w-full h-auto object-contain"
                priority
              />
              <figcaption>{explorerName} NFT sales history and offers</figcaption>
            </figure>
          </div>
          <h3>Instant Media Display</h3>
          <p>
            Browsing NFTs should be quick and effortless. We cache images and video files to make viewing almost
            instantaneous — even when you open large collections or high-resolution assets. It feels quick and
            responsive, just as it should.
          </p>
          <h3>Find Any {explorerName} NFT in Seconds</h3>
          <p>
            Looking for a specific NFT on {xahauNetwork ? 'Xahau' : 'XRPL'}? With our {xahauNetwork ? 'Xahau' : 'XRPL'}{' '}
            NFT Explorer, it’s incredibly easy. Our advanced filters and sorting tools help you find exactly what you
            need — fast.
          </p>
          <div className="flex justify-center">
            <figure>
              <Image
                src={
                  xahauNetwork
                    ? '/images/xahauexplorer/learn/nft-explorer/screen.png'
                    : '/images/xrplexplorer/learn/nft-explorer/screen.png'
                }
                alt="NFT Explorer"
                width={1520}
                height={950}
                className="max-w-full h-auto object-contain"
                priority
              />
              <figcaption>{explorerName} NFT Explorer</figcaption>
            </figure>
          </div>
          <p>You can:</p>
          <ul>
            <li>Search NFTs by name across all NFTs ever minted on the {explorerName}</li>
            <li>Search NFTs by issuer or owner</li>
            <li>Filter NFTs by the minting date or a specific time period</li>
            <li>Sort by listing time — from the oldest to the newest offers</li>
            <li>Exclude or include burned NFTs or NFTs without media</li>
            <li>Discover the most viewed NFTs on our explorer</li>
          </ul>
          <p>
            Whether you’re hunting for a particular collection, exploring new listings, or analyzing popular NFTs, our
            explorer makes the search effortless and intuitive.
          </p>
          <h3>Data Transparency and Exports</h3>
          <p>
            If you enjoy digging deeper, we’ve got you covered. You can export NFT metadata and all related attributes
            to CSV, making it easy to analyze, track, or build on top of {explorerName} NFT data. For developers, our
            API includes dedicated NFT-related endpoints.
          </p>
          <div className="p-4 my-4 border-l-4 rounded bg-white dark:bg-gray-900 border-[#4BA8B6] shadow-sm">
            <p className="text-gray-800 dark:text-gray-200">
              <span role="img" aria-label="lamp">
                👉
              </span>{' '}
              <Link href="https://docs.bithomp.com/#nft-xls-20">Learn more in our documentation</Link>
            </p>
          </div>
          <h3>Manage Your {xahauNetwork ? 'Xahau' : 'XRPL'} NFTs — All in One Place</h3>
          <p>
            With {xahauNetwork ? 'Xahau Explorer' : 'Bithomp'}, you can do much more than explore. Our NFT tools let you
            mint, trade, and manage your {explorerName} NFTs directly from the same interface — quickly, securely, and
            without intermediaries.
          </p>
          <p>Here’s what you can do right on {xahauNetwork ? 'Xahau Explorer' : 'Bithomp'}:</p>
          <div className="flex justify-center">
            <figure>
              <Image
                src={
                  xahauNetwork
                    ? '/images/xahauexplorer/learn/nft-explorer/nft-options.png'
                    : '/images/xrplexplorer/learn/nft-explorer/nft-options.png'
                }
                alt="Manage your NFTs"
                width={1520}
                height={950}
                className="max-w-full h-auto object-contain"
                priority
              />
              <figcaption>{explorerName} Manage your NFTs</figcaption>
            </figure>
          </div>
          <ul>
            <li>
              Mint new NFTs on {explorerName} — including mint and list for sale in one transaction
              {xahauNetwork && ', or mint and send with Remit'}
            </li>
            <div className="p-4 my-4 border-l-4 rounded bg-white dark:bg-gray-900 border-[#4BA8B6] shadow-sm">
              <p className="text-gray-800 dark:text-gray-200">
                <span role="img" aria-label="lamp">
                  👉
                </span>{' '}
                <Link href="/services/nft-mint">Mint {explorerName} NFTs here</Link>
              </p>
            </div>

            <li>Buy NFTs from existing offers</li>
            <li>List your NFTs for sale — for {nativeCurrency} or tokens</li>
            <li>Make, accept, or cancel offers</li>
            <li>Transfer NFTs between wallets</li>

            {!xahauNetwork && (
              <>
                <li>Modify the URI if the NFT is mutable (Dynamic NFTs have the "mutable" flag enabled") </li>
              </>
            )}

            <li>Burn NFTs you no longer need</li>
            <li>Set your NFT as your avatar on your {xahauNetwork ? 'Xahau Explorer' : 'Bithomp'} profile</li>
          </ul>
          <p>
            🔥 And the best part — you’re not limited to one wallet. You can connect using Ledger, Xaman, Gem Wallet,
            MetaMask, Crossmark, and more.
          </p>
          ❤️ Explore {xahauNetwork ? 'Xahau' : 'XRPL'} NFTs the smart way — with{' '}
          {xahauNetwork ? 'Xahau Explorer' : 'Bithomp'}
        </article>
      </div>
      <br />
      <br />
    </>
  )
}

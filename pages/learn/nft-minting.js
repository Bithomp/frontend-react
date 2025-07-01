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

export default function NFTMinting() {
  return (
    <>
      <SEO
        title={'Minting NFTs on ' + explorerName}
        description="How to mint NFTs on XRPL and Xahau. Step-by-step guide"
        noindex={network !== 'mainnet'}
      />
      <div className="max-w-4xl mx-auto px-4">
        <Breadcrumbs />
        <article className="prose sm:prose-lg dark:prose-invert mx-auto max-w-4xl my-10">
          <h1>How to mint NFTs on {explorerName}?</h1>

          <p>
            Minting is the process of creating a new NFT and recording it on a blockchain. When you mint an NFT on{' '}
            {explorerName} you're generating a unique token that can represent anything from art, music, videos, digital
            collectibles, to real-world assets.
          </p>
          <p>In this guide, we’ll walk you through everything you need to know about minting NFTs using our tools.</p>

          <h2>Why Mint NFTs on {explorerName}?</h2>
          <ul>
            <li>
              <strong>Low fees:</strong> {explorerName} transactions cost fractions of a cent.
            </li>

            <li>
              <strong>Speed:</strong> Finality within seconds.
            </li>

            <li>
              <strong>Eco-friendly: </strong>
              {explorerName} is an energy-efficient blockchain.
            </li>

            <li>
              <strong>No smart contracts required:</strong> Native NFT functionality makes minting simple and safe.
            </li>
          </ul>
          <h2>What You’ll Need</h2>
          <p>Before minting, make sure you have:</p>
          <ul>
            <li>
              Activated and funded {nativeCurrency} address. Minting NFTs typically requires {nativeCurrency} held in
              reserve
              {xahauNetwork ? '.' : ' — unless you mint on behalf of another account.'}
            </li>
            <li>
              Your media file (JPG, PNG, GIF, MP4, etc.) uploaded to a permanent storage service (like IPFS):
              <ol className="list-decimal pl-6 mt-2 space-y-2">
                <li>Prepare metadata: Create a JSON file with NFT details (e.g., name, description, image URI).</li>
                <li>
                  Upload to IPFS: Use a service like Pinata, NFT.Storage, or a local IPFS node to upload your metadata
                  file.
                </li>
                <li>Get CID: After upload, you’ll receive a CID (Content Identifier).</li>
                <li>
                  Form the IPFS link: Use the format{' '}
                  <strong>
                    ipfs://{'{'}CID{'}'}
                  </strong>
                </li>
              </ol>
            </li>
          </ul>

          <h2>How to Mint an NFT on {explorerName}</h2>

          <p>
            1. Go to the <Link href="/services/nft-mint">{explorerName} NFT Minting Tool:</Link>
          </p>

          <figure>
            <Image
              src={
                xahauNetwork
                  ? '/images/xahauexplorer/nft-minting/nft-minting-screen.png'
                  : '/images/xrplexplorer/nft-minting/nft-minting-screen.png'
              }
              alt="NFT Minting Screen"
              width={1520}
              height={953}
              className="max-w-full h-auto object-contain"
              priority
            />
            <figcaption>NFT Minting tool</figcaption>
          </figure>
          <p>2. Paste your IPFS link - it should direct to your metadata file. </p>
          <div>
            {xahauNetwork ? (
              <>
                3. Add digest and set required flags:
                <p>
                  Adding a digest ensures data integrity. If someone later downloads the content from the URI (e.g.,
                  your image link) and computes its hash, it should match the digest you included. This proves the file
                  hasn't been tampered with or changed since the NFT was minted.
                </p>
                <p>You can also decide whether your NFT will be burnable or not, and set the corresponding flag.</p>
              </>
            ) : (
              <>
                3. Set the required flags:
                <p>
                  Decide whether your NFT will be transferable, burnable, and whether it will be sold for{' '}
                  {nativeCurrency} only. You can also set a royalty and mint the NFT on behalf of another account (you
                  must be authorized as a minter for that account). To authorize another address to mint NFTokens on
                  behalf of your account, use our <Link href="/services/account-settings">Account Settings page</Link>.
                  Just enter the address you wish to authorize and sign the transaction.
                </p>
                <p>
                  {' '}
                  Thanks to the DynamicNFT amendment, you can update the URI fields of your NFTs. You have an option to
                  mint mutable NFTs on Bithomp by simply enabling the corresponding flag.
                </p>
              </>
            )}
            <p>4. Create a sell offer for your NFT (optional). </p>
            <p>
              Just enter the listing amount and, if you're creating a private offer, specify the destination address.
              The sell offer will be created by signing a single transaction together with the minting.
            </p>
          </div>
          <p>5. After pressing "Mint NFT," you will be prompted to choose a wallet to sign the transaction.</p>
          <figure>
            <Image
              src={
                xahauNetwork
                  ? '/images/xahauexplorer/nft-minting/nft-minting-signing.png'
                  : '/images/xrplexplorer/nft-minting/nft-minting-signing.png'
              }
              alt="NFT Minting signing"
              width={1520}
              height={953}
              className="max-w-full h-auto object-contain"
              priority
            />
            <figcaption>NFT Minting signing options</figcaption>
          </figure>
          <p>
            5. Confirm the transaction. Your NFT will appear on the blockchain and can be viewed on{' '}
            <Link href="/nft-explorer">{explorerName} NFT Explorer.</Link>
          </p>

          <p>
            You can also sell, buy, burn, and transfer NFTs directly through our platform using integrated wallet
            support.
          </p>
          <h3>Conclusion</h3>
          <p>
            Whether you're an artist, developer, or collector, minting NFTs on {explorerName} is easier than ever. With
            us you have a trusted tool with full wallet integration, simple UX, and transparent blockchain tracking.
          </p>
          <p>
            <strong>
              <Link href="/services/nft-mint">Start minting your first NFT today.</Link>
            </strong>
          </p>
        </article>
      </div>
    </>
  )
}

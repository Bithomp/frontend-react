import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import SEO from '../components/SEO'
import { getIsSsrMobile } from '../utils/mobile'
import { network } from '../utils'
import { nativeCurrency, explorerName, xahauNetwork } from '../utils'
import Link from 'next/link'
import Image from 'next/image'

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
      <article className="prose sm:prose-lg dark:prose-invert content-center">
        <h1>How to mint NFTs on {explorerName}?</h1>

        <p>
          Minting is the process of creating a new NFT and recording it on a blockchain. When you mint an NFT on{' '}
          {explorerName} you're generating a unique token that can represent anything from art, music, videos, digital
          collectibles, to real-world assets.
        </p>
        <p>In this guide, we’ll walk you through everything you need to know about minting NFTs using our tools.</p>

        <h1>Why Mint NFTs on {explorerName}?</h1>
        <ul>
          <li>
            <strong>Low fees:</strong> {nativeCurrency} transactions cost fractions of a cent.
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
        <h1>What You’ll Need</h1>
        <p>Before minting, make sure you have:</p>
        <ul>
          <li>
            Minting NFTs typically requires {nativeCurrency} held in reserve — unless you mint and create the sell offer
            in the same transaction, or mint on behalf of another account.
          </li>
          <li>Your media file (JPG, PNG, GIF, MP4, etc.) uploaded to a permanent storage service (like IPFS):</li>
          <li>Prepare metadata: Create a JSON file with NFT details (e.g., name, description, image URL).</li>
          <li>
            Upload to IPFS: Use a service like Pinata, NFT.Storage, or a local IPFS node to upload your metadata file.
          </li>
          <li>Get CID: After upload, you’ll receive a CID (Content Identifier).</li>
          <li>
            Form the IPFS link: Use the format{' '}
            <strong>
              ipfs://{'{'}CID{'}'}
            </strong>
          </li>
        </ul>
        <h1>How to Mint an NFT on {explorerName}</h1>

        <p>
          1. Go to the <Link href="services/nft-mint">{explorerName} NFT Minting Tool:</Link>
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
        <p>2. Paste your IPFS link. </p>
        <div>
          {xahauNetwork ? (
            <>
              3. Add digest:
              <br />
              Adding a digest ensures data integrity. If someone later downloads the content from the URI (e.g., your
              image link) and computes its hash, it should match the digest you included. This proves the file hasn't
              been tampered with or changed since the NFT was minted.
            </>
          ) : (
            <>
              3. Set the required flags:
              <br />
              Decide whether your NFT will be transferable, burnable, and whether it will be sold for {
                nativeCurrency
              }{' '}
              only. You can also set a royalty, create a sell offer, or mint the NFT on behalf of another account (you
              must be authorized as a minter for that account).
            </>
          )}
        </div>
        <p>4. After pressing "Mint NFT," you will be prompted to choose a wallet to sign the transaction.</p>
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
          <Link href="/nft-explorer">{explorerName} NFT Explorer</Link>
        </p>

        <p>
          You can also sell, buy, burn, and transfer NFTs directly through our platform using integrated wallet support.
          You can also update the URI of your Dynamic NFTs.
        </p>
        <h1>Conclusion</h1>
        <p>
          Whether you're an artist, developer, or collector, minting NFTs on {explorerName} is easier than ever. With us
          you have a trusted tool with full wallet integration, simple UX, and transparent blockchain tracking.
        </p>
        <p>
          <strong>
            <Link href="services/nft-mint">Start minting your first NFT today.</Link>
          </strong>
        </p>
      </article>
    </>
  )
}

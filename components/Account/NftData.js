import Link from 'next/link'

import { AddressWithIconFilled } from '../../utils/format'
import { xahauNetwork } from '../../utils'

import LinkIcon from '../../public/images/link.svg'

export default function NftData({ data, objects }) {
  const title = 'NFT Data'

  const ownedNftsNode = !objects?.nftList ? (
    'Loading...'
  ) : objects?.nftList?.length > 0 ? (
    <>
      <span className="bold orange">{objects?.nftList?.length}</span>{' '}
      <Link href={'/nfts/' + data?.address + '?includeWithoutMediaData=true'}>
        <LinkIcon />
      </Link>
    </>
  ) : (
    "This account doesn't own any NFTs."
  )

  const nftOffersNode = !objects?.nftOfferList ? (
    'Loading...'
  ) : objects?.nftOfferList?.length > 0 ? (
    <>
      <span className="bold orange">{objects?.nftOfferList?.length}</span>{' '}
      <Link href={'/nft-offers/' + data?.address}>
        <LinkIcon />
      </Link>
    </>
  ) : (
    "This account doesn't have any NFT Offers."
  )

  const mintedNftsNode = (
    <>
      {data.ledgerInfo.mintedNFTokens}{' '}
      <Link href={'/nft-explorer?includeWithoutMediaData=true&issuer=' + data?.address + '&includeBurned=true'}>
        <LinkIcon />
      </Link>
    </>
  )

  const burnedNftsNode = (
    <>
      {data.ledgerInfo.burnedNFTokens}{' '}
      <Link
        href={
          '/nft-explorer?includeWithoutMediaData=true&issuer=' + data?.address + '&includeBurned=true&burnedPeriod=all'
        }
      >
        <LinkIcon />
      </Link>
    </>
  )

  const nftMinterNode = <AddressWithIconFilled data={data.ledgerInfo} name="nftokenMinter" />

  return (
    <>
      <table className="table-details hide-on-small-w800">
        <thead>
          <tr>
            <th colSpan="100">{title}</th>
          </tr>
        </thead>
        <tbody>
          {!xahauNetwork && (
            <>
              {data?.ledgerInfo?.activated && (
                <tr>
                  <td>Owned NFTs</td>
                  <td>{ownedNftsNode}</td>
                </tr>
              )}
              {data.ledgerInfo?.mintedNFTokens && (
                <tr>
                  <td>Minted NFTs</td>
                  <td>{mintedNftsNode}</td>
                </tr>
              )}
              {data.ledgerInfo?.burnedNFTokens && (
                <tr>
                  <td>Burned NFTs</td>
                  <td>{burnedNftsNode}</td>
                </tr>
              )}
              {data?.ledgerInfo?.activated && (
                <tr>
                  <td>NFT Offers</td>
                  <td>{nftOffersNode}</td>
                </tr>
              )}
              {data.ledgerInfo?.firstNFTokenSequence && (
                <tr>
                  <td>First NFT sequence</td>
                  <td>{data.ledgerInfo.firstNFTokenSequence}</td>
                </tr>
              )}
              {data.ledgerInfo?.nftokenMinter && (
                <tr>
                  <td>NFT minter</td>
                  <td>{nftMinterNode}</td>
                </tr>
              )}
            </>
          )}

          {data.ledgerInfo?.flags?.disallowIncomingNFTokenOffer && (
            <tr>
              <td>Incoming NFT offers</td>
              <td className="bold">disallowed</td>
            </tr>
          )}
          {data.ledgerInfo?.flags?.uriTokenIssuer && (
            <tr>
              <td>URI token issuer</td>
              <td className="bold">true</td>
            </tr>
          )}
        </tbody>
      </table>
      <div className="show-on-small-w800">
        <center>{title.toUpperCase()}</center>
        {!xahauNetwork && (
          <>
            {data?.ledgerInfo?.activated && (
              <p>
                {objects?.nftList?.length > 0 && <span className="grey">Owned NFTs</span>} {ownedNftsNode}
              </p>
            )}
            {data.ledgerInfo?.mintedNFTokens && (
              <p>
                <span className="grey">Minted NFTs</span> {mintedNftsNode}
              </p>
            )}
            {data.ledgerInfo?.burnedNFTokens && (
              <p>
                <span className="grey">Burned NFTs</span> {burnedNftsNode}
              </p>
            )}
            {data?.ledgerInfo?.activated && (
              <p>
                {objects?.nftOfferList?.length > 0 && <span className="grey">NFT Offers</span>} {nftOffersNode}
              </p>
            )}
            {data.ledgerInfo?.firstNFTokenSequence && (
              <p>
                <span className="grey">First NFT sequence</span> {data.ledgerInfo.firstNFTokenSequence}
              </p>
            )}
            {data.ledgerInfo?.nftokenMinter && (
              <>
                <p>
                  <span className="grey">NFT minter</span>
                </p>
                {nftMinterNode}
              </>
            )}
          </>
        )}
        {data.ledgerInfo?.flags?.disallowIncomingNFTokenOffer && (
          <p>
            <span className="grey">Incoming NFT offers</span> <span className="bold">disallowed</span>
          </p>
        )}
        {data.ledgerInfo?.flags?.uriTokenIssuer && (
          <p>
            <span className="grey">URI token issuer</span> <span className="bold">true</span>
          </p>
        )}
      </div>
    </>
  )
}

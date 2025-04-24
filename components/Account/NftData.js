import Link from 'next/link'

import { AddressWithIconFilled, fullDateAndTime } from '../../utils/format'
import { xahauNetwork } from '../../utils'

export default function NftData({ data, objects, ledgerTimestamp }) {
  if (
    !data?.ledgerInfo?.nftokenMinter &&
    !data.ledgerInfo?.burnedNFTokens &&
    !data.ledgerInfo?.mintedNFTokens &&
    !(objects?.nftOfferList?.length > 0) &&
    !(objects?.nftList?.length > 0)
  )
    return ''

  const title = 'NFT Data'

  const historicalTitle = ledgerTimestamp ? (
    <span className="red bold">Historical NFT data ({fullDateAndTime(ledgerTimestamp)})</span>
  ) : (
    ''
  )

  const ownedNftsNode = !objects?.nftList ? (
    'Loading...'
  ) : objects?.nftList?.length > 0 ? (
    <>
      {!ledgerTimestamp && (
        <Link href={'/nfts/' + data?.address + '?includeWithoutMediaData=true'} className="bold">
          View owned NFTs ({objects?.nftList?.length})
        </Link>
      )}
    </>
  ) : (
    "This account doesn't own any NFTs."
  )

  const nftOffersNode = !objects?.nftOfferList ? (
    'Loading...'
  ) : objects?.nftOfferList?.length > 0 ? (
    <>
      {!ledgerTimestamp && (
        <Link href={'/nft-offers/' + data?.address} className="bold">
          View NFT Offers ({objects?.nftOfferList?.length})
        </Link>
      )}
    </>
  ) : (
    "This account doesn't have any NFT Offers."
  )

  const mintedNftsNode = (
    <>
      {!ledgerTimestamp && (
        <Link href={'/nft-explorer?includeWithoutMediaData=true&issuer=' + data?.address + '&includeBurned=true'}>
          View minted NFTs ({data.ledgerInfo.mintedNFTokens})
        </Link>
      )}
    </>
  )

  const burnedNftsNode = (
    <>
      {!ledgerTimestamp && (
        <Link
          href={
            '/nft-explorer?includeWithoutMediaData=true&issuer=' +
            data?.address +
            '&includeBurned=true&burnedPeriod=all'
          }
        >
          View burned NFTs ({data.ledgerInfo.burnedNFTokens})
        </Link>
      )}
    </>
  )

  const nftMinterNode = <AddressWithIconFilled data={data.ledgerInfo} name="nftokenMinter" />

  return (
    <>
      <table className="table-details hide-on-small-w800">
        <thead>
          <tr>
            <th colSpan="100">{historicalTitle || title}</th>
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
        <center>{historicalTitle || title.toUpperCase()}</center>
        {!xahauNetwork && (
          <>
            {data?.ledgerInfo?.activated && <p>{ownedNftsNode}</p>}
            {data.ledgerInfo?.mintedNFTokens && <p>{mintedNftsNode}</p>}
            {data.ledgerInfo?.burnedNFTokens && <p>{burnedNftsNode}</p>}
            {data?.ledgerInfo?.activated && <p>{nftOffersNode}</p>}
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

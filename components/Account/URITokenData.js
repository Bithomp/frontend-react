import Link from 'next/link'

export default function URITokenData({ data }) {
  const title = 'NFT Data (URI Token)'

  const ownedNftsNode = <Link href={'/nfts/' + data?.address + '?includeWithoutMediaData=true'}>View owned NFTs</Link>

  const nftOffersNode = <Link href={'/nft-offers/' + data?.address}>View NFT Offers</Link>

  const mintedNftsNode = (
    <Link href={'/nft-explorer?includeWithoutMediaData=true&issuer=' + data?.address + '&includeBurned=true'}>
      View minted NFTs
    </Link>
  )

  const burnedNftsNode = (
    <Link
      href={
        '/nft-explorer?includeWithoutMediaData=true&issuer=' + data?.address + '&includeBurned=true&burnedPeriod=all'
      }
    >
      View burned NFTs
    </Link>
  )

  const soldNftsNode = (
    <Link href={'/nft-sales?seller=' + data?.address + '&period=all&includeWithoutMediaData=true'}>View sold NFTs</Link>
  )

  return (
    <>
      <table className="table-details hide-on-small-w800">
        <thead>
          <tr>
            <th colSpan="100">{title}</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Owned NFTs</td>
            <td>{ownedNftsNode}</td>
          </tr>
          <tr>
            <td>Minted NFTs</td>
            <td>{mintedNftsNode}</td>
          </tr>
          <tr>
            <td>Sold NFTs</td>
            <td>{soldNftsNode}</td>
          </tr>
          <tr>
            <td>Burned NFTs</td>
            <td>{burnedNftsNode}</td>
          </tr>
          <tr>
            <td>NFT Offers</td>
            <td>{nftOffersNode}</td>
          </tr>
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
        <p>{ownedNftsNode}</p>
        <p>{mintedNftsNode}</p>
        <p>{soldNftsNode}</p>
        <p>{burnedNftsNode}</p>
        <p>{nftOffersNode}</p>
        {data.ledgerInfo?.flags?.uriTokenIssuer && (
          <p>
            <span className="grey">URI token issuer</span> <span className="bold">true</span>
          </p>
        )}
      </div>
    </>
  )
}

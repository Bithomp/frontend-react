import Link from 'next/link'

export default function URITokenData({ data, uriTokenList }) {
  if (!uriTokenList && !data.ledgerInfo?.flags?.uriTokenIssuer) return ''

  const title = 'NFT Data (URI Token)'

  const ownedNftsNode = !uriTokenList ? (
    'Loading...'
  ) : uriTokenList?.length > 0 ? (
    <Link href={'/nfts/' + data?.address + '?includeWithoutMediaData=true'} className="bold">
      View owned NFTs ({uriTokenList?.length})
    </Link>
  ) : (
    "This account doesn't own any NFTs."
  )

  //calculate how many children in uriTokenList array have param 'Destination' or "Amount"
  const onSaleNftsCount = uriTokenList?.filter((item) => item.Destination || item.Amount).length

  const nftOffersNode = !uriTokenList ? (
    'Loading...'
  ) : onSaleNftsCount > 0 ? (
    <Link href={'/nft-offers/' + data?.address} className="bold">
      View NFT Sell Offers ({onSaleNftsCount})
    </Link>
  ) : (
    "This account doesn't have any NFT Sell Offers."
  )

  const mintedNftsNode = (
    <Link href={'/nft-explorer?includeWithoutMediaData=true&issuer=' + data?.address + '&includeBurned=true'}>
      View minted NFTs
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
          {data.ledgerInfo?.flags?.uriTokenIssuer && (
            <tr>
              <td>Minted NFTs</td>
              <td>{mintedNftsNode}</td>
            </tr>
          )}
          {(data.ledgerInfo?.flags?.uriTokenIssuer || uriTokenList?.length > 0) && (
            <tr>
              <td>Sold NFTs</td>
              <td>{soldNftsNode}</td>
            </tr>
          )}
          <tr>
            <td>NFT Offers</td>
            <td>{nftOffersNode}</td>
          </tr>
        </tbody>
      </table>
      <div className="show-on-small-w800">
        <center>{title.toUpperCase()}</center>
        <p>{ownedNftsNode}</p>
        {data.ledgerInfo?.flags?.uriTokenIssuer && <p>{mintedNftsNode}</p>}
        {(data.ledgerInfo?.flags?.uriTokenIssuer || uriTokenList?.length > 0) && <p>{soldNftsNode}</p>}
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

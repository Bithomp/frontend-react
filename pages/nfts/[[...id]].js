import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import NftsComponent from '../../components/NftsComponent';

export const getServerSideProps = async ({ query, locale }) => {
  const {
    view,
    list,
    saleDestination,
    saleCurrency,
    saleCurrencyIssuer,
    search,
    issuer,
    owner,
    taxon,
    serial,
    mintedByMarketplace,
    mintedPeriod,
    burnedPeriod,
    includeBurned,
    includeWithoutMetadata,
    id
  } = query
  //key to refresh the component when Link pressed within the same route
  return {
    props: {
      key: Math.random(),
      view: view || "tiles",
      list: list || "nfts",
      saleDestination: saleDestination || "buyNow",
      saleCurrency: saleCurrency || "xrp",
      saleCurrencyIssuer: saleCurrencyIssuer || "",
      searchQuery: search || "",
      issuerQuery: issuer || "",
      ownerQuery: owner || "",
      taxonQuery: taxon || "",
      serialQuery: serial || "",
      mintedByMarketplace: mintedByMarketplace || "",
      mintedPeriod: mintedPeriod || "",
      burnedPeriod: burnedPeriod || "",
      includeBurnedQuery: includeBurned || false,
      includeWithoutMetadataQuery: includeWithoutMetadata || false,
      id: id ? (Array.isArray(id) ? id[0] : id) : "",
      ...(await serverSideTranslations(locale, ['common'])),
    },
  }
}

export default function Nfts({
  view,
  list,
  saleDestination,
  saleCurrency,
  saleCurrencyIssuer,
  searchQuery,
  issuerQuery,
  ownerQuery,
  taxonQuery,
  serialQuery,
  mintedByMarketplace,
  mintedPeriod,
  burnedPeriod,
  includeBurnedQuery,
  includeWithoutMetadataQuery,
  id,
  account
}) {
  return <NftsComponent
    view={view}
    list={list}
    saleDestination={saleDestination}
    saleCurrency={saleCurrency}
    saleCurrencyIssuer={saleCurrencyIssuer}
    searchQuery={searchQuery}
    issuerQuery={issuerQuery}
    ownerQuery={ownerQuery}
    taxonQuery={taxonQuery}
    serialQuery={serialQuery}
    mintedByMarketplace={mintedByMarketplace}
    mintedPeriod={mintedPeriod}
    burnedPeriod={burnedPeriod}
    includeBurnedQuery={includeBurnedQuery}
    includeWithoutMetadataQuery={includeWithoutMetadataQuery}
    nftExplorer={false}
    id={id}
    account={account}
  />
}

import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import NftsComponent from '../../components/NftsComponent'

import { getIsSsrMobile } from '../../utils/mobile'

export const getServerSideProps = async ({ query, locale }) => {
  const {
    listNftsOrder,
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
    includeWithoutMediaData,
    id
  } = query
  //key to refresh the component when Link pressed within the same route
  return {
    props: {
      listNftsOrder: listNftsOrder || "mintedNew",
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
      includeWithoutMediaDataQuery: includeWithoutMediaData || false,
      id: id ? (Array.isArray(id) ? id[0] : id) : "",
      isSsrMobile: getIsSsrMobile(context),
      ...(await serverSideTranslations(locale, ['common'])),
    },
  }
}

export default function Nfts({
  listNftsOrder,
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
  includeWithoutMediaDataQuery,
  id,
  account
}) {
  return <NftsComponent
    listNftsOrder={listNftsOrder}
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
    mintedPeriodQuery={mintedPeriod}
    burnedPeriod={burnedPeriod}
    includeBurnedQuery={includeBurnedQuery}
    includeWithoutMediaDataQuery={includeWithoutMediaDataQuery}
    nftExplorer={false}
    id={id}
    account={account}
  />
}

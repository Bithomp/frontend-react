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
    taxon
  } = query
  return {
    props: {
      view: view || "tiles",
      list: list || "nfts",
      saleDestination: saleDestination || "publicAndKnownBrokers",
      saleCurrency: saleCurrency || "xrp",
      saleCurrencyIssuer: saleCurrencyIssuer || "",
      searchQuery: search || "",
      issuerQuery: issuer || "",
      ownerQuery: owner || "",
      taxonQuery: taxon || "",
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
  taxonQuery 
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
    nftExplorer={false}
  />
};

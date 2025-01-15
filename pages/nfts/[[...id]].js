import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import NftsComponent from '../../components/NftsComponent'

import { getIsSsrMobile } from '../../utils/mobile'
import { xahauNetwork } from '../../utils'

export const getServerSideProps = async (context) => {
  const { query, locale } = context
  const {
    order,
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
      orderQuery: order || '',
      view: view || 'tiles',
      list: list || 'nfts',
      saleDestination: saleDestination || (xahauNetwork ? 'public' : 'buyNow'),
      saleCurrency: saleCurrency || 'xrp',
      saleCurrencyIssuer: saleCurrencyIssuer || '',
      searchQuery: search || '',
      issuerQuery: issuer || '',
      ownerQuery: owner || '',
      taxonQuery: taxon || '',
      serialQuery: serial || '',
      mintedByMarketplace: mintedByMarketplace || '',
      mintedPeriod: mintedPeriod || 'all',
      burnedPeriod: burnedPeriod || '',
      includeBurnedQuery: includeBurned || false,
      includeWithoutMediaDataQuery: includeWithoutMediaData || false,
      id: id ? (Array.isArray(id) ? id[0] : id) : '',
      isSsrMobile: getIsSsrMobile(context),
      ...(await serverSideTranslations(locale, ['common', 'nft-sort', 'popups']))
    }
  }
}

export default function Nfts({
  orderQuery,
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
  account,
  sessionToken,
  subscriptionExpired,
  signOutPro
}) {
  return (
    <NftsComponent
      orderQuery={orderQuery}
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
      burnedPeriodQuery={burnedPeriod}
      includeBurnedQuery={includeBurnedQuery}
      includeWithoutMediaDataQuery={includeWithoutMediaDataQuery}
      nftExplorer={false}
      id={id}
      account={account}
      sessionToken={sessionToken}
      subscriptionExpired={subscriptionExpired}
      signOutPro={signOutPro}
    />
  )
}

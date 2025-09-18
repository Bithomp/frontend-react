import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import SEO from '../../components/SEO'
import { getIsSsrMobile } from '../../utils/mobile'
import { xahauNetwork } from '../../utils'
import NetworkTabs from '../../components/Tabs/NetworkTabs'
import URITokenMint from '../../components/Services/NftMint/URITokenMint'
import NFTokenMint from '../../components/Services/NftMint/NFTokenMint'
import Link from 'next/link'

export const getServerSideProps = async (context) => {
  const { query, locale } = context
  const {
    uri,
    digest,
    taxon,
    burnable,
    onlyXrp,
    transferable,
    mutable,
    royalty,
    sell,
    amount,
    currency,
    currencyIssuer,
    destination,
    expiration,
    issuer,
    mintForOther
  } = query
  return {
    props: {
      uriQuery: uri || '',
      digestQuery: digest || '',
      taxonQuery: taxon || '0',
      burnableQuery: burnable || '',
      onlyXrpQuery: onlyXrp || '',
      transferableQuery: transferable || '',
      mutableQuery: mutable || '',
      royaltyQuery: royalty || '',
      sellQuery: sell || '',
      amountQuery: amount || '',
      currencyQuery: currency || '',
      currencyIssuerQuery: currencyIssuer || '',
      destinationQuery: destination || '',
      expirationQuery: expiration || '',
      issuerQuery: issuer || '',
      mintForOtherQuery: mintForOther || '',
      isSsrMobile: getIsSsrMobile(context),
      ...(await serverSideTranslations(locale, ['common']))
    }
  }
}

export default function NftMint({
  setSignRequest,
  uriQuery,
  digestQuery,
  taxonQuery,
  account,
  burnableQuery,
  onlyXrpQuery,
  transferableQuery,
  mutableQuery,
  royaltyQuery,
  sellQuery,
  amountQuery,
  currencyQuery,
  currencyIssuerQuery,
  destinationQuery,
  expirationQuery,
  issuerQuery,
  mintForOtherQuery
}) {
  return (
    <>
      <SEO title="NFT Mint" description="Mint a New NFT, Free." />
      <div className="page-services-nft-mint content-center">
        <h1 className="center">Mint a new NFT</h1>
        <p>
          You can use this page to create a new NFT, a unique digital asset that can be used in a variety of
          applications. View our guide:{' '}
          <Link href="/learn/nft-minting" target="_blank" rel="noreferrer">
            How to mint NFTs
          </Link>
          .
        </p>

        <NetworkTabs />

        <div className="form-container">
          {xahauNetwork ? (
            <URITokenMint
              setSignRequest={setSignRequest}
              uriQuery={uriQuery}
              digestQuery={digestQuery}
              account={account}
              // hydrate from URL as well
              burnableQuery={burnableQuery}
              sellQuery={sellQuery}
              amountQuery={amountQuery}
              currencyQuery={currencyQuery}
              currencyIssuerQuery={currencyIssuerQuery}
              destinationQuery={destinationQuery}
            />
          ) : (
            <NFTokenMint
              setSignRequest={setSignRequest}
              uriQuery={uriQuery}
              taxonQuery={taxonQuery}
              account={account}
              burnableQuery={burnableQuery}
              onlyXrpQuery={onlyXrpQuery}
              transferableQuery={transferableQuery}
              mutableQuery={mutableQuery}
              royaltyQuery={royaltyQuery}
              sellQuery={sellQuery}
              amountQuery={amountQuery}
              currencyQuery={currencyQuery}
              currencyIssuerQuery={currencyIssuerQuery}
              destinationQuery={destinationQuery}
              expirationQuery={expirationQuery}
              issuerQuery={issuerQuery}
              mintForOtherQuery={mintForOtherQuery}
            />
          )}
        </div>
      </div>
    </>
  )
}

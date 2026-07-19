import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { useTranslation } from 'next-i18next'
import SEO from '../../components/SEO'
import { getIsSsrMobile } from '../../utils/mobile'
import { xahauNetwork } from '../../utils'
import NetworkTabs from '../../components/Tabs/NetworkTabs'
import ServicesTabs from '../../components/Tabs/ServicesTabs'
import URITokenMint from '../../components/Services/NftMint/URITokenMint'
import NFTokenMint from '../../components/Services/NftMint/NFTokenMint'
import Link from 'next/link'
import styles from '../../styles/pages/nft-mint.module.scss'

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
      ...(await serverSideTranslations(locale, ['common', 'services']))
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
  const { t } = useTranslation(['common', 'services'])

  return (
    <>
      <SEO title={t('nft-mint.title', { ns: 'services' })} description={t('nft-mint.description', { ns: 'services' })} />
      <div className={styles.page}>
        <ServicesTabs category="issuance" tab="nft-mint" />
        <h1 className="center">{t('nft-mint.heading', { ns: 'services' })}</h1>
        <p className={styles.intro}>
          {t('nft-mint.intro', { ns: 'services' })} {t('nft-mint.viewGuide', { ns: 'services' })}{' '}
          <Link href="/learn/nft-minting" target="_blank" rel="noreferrer">
            {t('nft-mint.guideLink', { ns: 'services' })}
          </Link>
          .
        </p>

        <NetworkTabs />

        <div className={`form-container ${styles.form}`}>
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

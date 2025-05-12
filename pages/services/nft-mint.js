import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { useTranslation } from 'next-i18next'
import SEO from '../../components/SEO'
import { getIsSsrMobile } from '../../utils/mobile'
import { xahauNetwork } from '../../utils'
import NetworkTabs from '../../components/Tabs/NetworkTabs'
import URITokenMint from '../../components/Services/NftMint/URITokenMint'
import NFTokenMint from '../../components/Services/NftMint/NFTokenMint'

export const getServerSideProps = async (context) => {
  const { query, locale } = context
  const { uri, digest } = query
  return {
    props: {
      uriQuery: uri || '',
      digestQuery: digest || '',
      isSsrMobile: getIsSsrMobile(context),
      ...(await serverSideTranslations(locale, ['common']))
    }
  }
}

export default function NftMint({ setSignRequest, uriQuery, digestQuery }) {
  const { t } = useTranslation()

  return (
    <>
      <SEO
        title={
          xahauNetwork ? t('nft-mint.title-xahau', 'Xahau NFT Mint') : t('nft-mint.title-xrpl', 'XRP Ledger NFT Mint')
        }
        description={t('nft-mint.description', 'Mint NFTs on XRPL and Xahau networks')}
      />
      <div className="page-services-nft-mint content-center">
        <h1 className="center">{t('nft-mint.header', 'Mint a New NFT')}</h1>
        <p>
          {t(
            'nft-mint.bidirectional-pointer',
            'You can use this page to create a new NFT, a unique digital asset that can be used in a variety of applications.'
          )}
        </p>

        <NetworkTabs />

        <div className="form-container">
          {xahauNetwork ? (
            <URITokenMint setSignRequest={setSignRequest} uriQuery={uriQuery} digestQuery={digestQuery} />
          ) : (
            <NFTokenMint setSignRequest={setSignRequest} />
          )}
        </div>
      </div>
    </>
  )
}

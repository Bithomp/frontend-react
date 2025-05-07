import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { useTranslation } from 'next-i18next'
import SEO from '../../components/SEO'
import { xahauNetwork } from '../../utils'
import NetworkTabs from '../../components/Tabs/NetworkTabs'
import URITokenMint from '../../components/Nft/URITokenMint'
import NFTokenMint from '../../components/Nft/NFTokenMint'


export async function getServerSideProps({ locale }) {
  return {
    props: {
      ...(await serverSideTranslations(locale, ['common']))
    }
  }
}

export default function NftMint({ account, setSignRequest, refreshPage }) {
  const { t } = useTranslation()

  return (
    <>
      <SEO 
        title={t('nft-mint.title', 'NFT Mint')} 
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
            <URITokenMint
              account={account} 
              setSignRequest={setSignRequest}
              refreshPage={refreshPage}
            />
          ) : (
            <NFTokenMint
              account={account} 
              setSignRequest={setSignRequest}
              refreshPage={refreshPage}
            />
          )}
        </div>
      </div>
    </>
  )
}

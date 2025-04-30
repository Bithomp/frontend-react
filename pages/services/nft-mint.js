import { useState } from 'react'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { useTranslation } from 'next-i18next'
import SEO from '../../components/SEO'
import { xahauNetwork } from '../../utils'
import NftMintXRPL from '../../components/Nft/NftMintXRPL'
import NftMintXahau from '../../components/Nft/NftMintXahau'
import NftMintTabs from '../../components/Tabs/NftMintTabs'

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
        
        <NftMintTabs />
        
        <div className="form-container">
          {xahauNetwork ? (
            <NftMintXahau 
              account={account} 
              setSignRequest={setSignRequest}
              refreshPage={refreshPage}
            />
          ) : (
            <NftMintXRPL 
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

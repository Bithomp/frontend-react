import { useEffect } from 'react'
import { useTranslation } from 'next-i18next'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { getIsSsrMobile } from '../../utils/mobile'
import { xahauNetwork } from '../../utils'
import SEO from '../../components/SEO'
import XrplNFTMint from '../../components/NFTMint/XrplNFTMint'
import XahauNFTMint from '../../components/NFTMint/XahauNFTMint'

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
  return (
    <>
      <SEO title="NFT Mint" />
      <div className="page-services-nft-mint content-center">
        <h1 className="center">NFT Mint</h1>
        {xahauNetwork ? (
          <XahauNFTMint 
            setSignRequest={setSignRequest}
            uriQuery={uriQuery}
            digestQuery={digestQuery}
          />
        ) : (
          <XrplNFTMint 
            setSignRequest={setSignRequest}
          />
        )}
      </div>
    </>
  )
}

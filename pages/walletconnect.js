import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { getIsSsrMobile } from '../utils/mobile'
import { Connect } from '../components/Walletconnect/Connect'
import { WalletConnectModalSign } from '@walletconnect/modal-sign-react'
import { getAppMetadata } from '@walletconnect/utils'

export async function getServerSideProps(context) {
  const { locale } = context
  return {
    props: {
      isSsrMobile: getIsSsrMobile(context),
      ...(await serverSideTranslations(locale, ['common']))
    }
  }
}

export default function WalletConnect() {
  return (
    <div className="content-center">
      <Connect />

      <WalletConnectModalSign projectId={process.env.NEXT_PUBLIC_WALLETCONNECT} metadata={getAppMetadata()} />
    </div>
  )
}

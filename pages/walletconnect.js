import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { getIsSsrMobile } from '../utils/mobile'
import { Connect } from '../components/Walletconnect/Connect'

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
    </div>
  )
}

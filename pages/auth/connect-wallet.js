import { useState } from 'react'

import { useTranslation } from 'next-i18next'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import Image from 'next/image'

import SignForm from '../../components/SignForm'

export async function getServerSideProps(context) {
  const { locale } = context
  return {
    props: {
      ...(await serverSideTranslations(locale, ['common']))
    }
  }
}

export default function ConnectWallet() {
  const { t } = useTranslation('common')

  const [account, setAccount] = useState(null)
  const [signRequest, setSignRequest] = useState(null)
  const [refreshPage, setRefreshPage] = useState('')
  const [wcSession, setWcSession] = useState(null)

  const handleWalletClick = (wallet) => {
    setSignRequest({
      wallet: wallet,
      redirectName: 'connect-wallet'
    })
  }

  return (
    <main className="content-center">
      <h1>{t('connect-wallet.title', 'Connect your crypto wallet')}</h1>
      <p>
        {t(
          'connect-wallet.description',
          'Connect your crypto wallet to the blockchain explorer to start exploring XRP Ledger.'
        )}
      </p>
      <section className="mx-auto max-w-sm">
        <ul className="list-none flex flex-col gap-2">
          <li className="flex justify-center items-center gap-2 border-2 border-black p-2 hover:shadow-[4px_4px_0px_0px] transition-shadow duration-300">
            <span onClick={() => handleWalletClick('xaman')}>
              <Image src="/images/wallets/xaman.png" alt="Xaman" width={24} height={24} />
              <span>Xaman</span>
            </span>
          </li>
          <li
            onClick={() => handleWalletClick('crossmark')}
            className="flex justify-center items-center gap-2 border-2 border-black p-2 hover:shadow-[4px_4px_0px_0px] transition-shadow duration-300"
          >
            <span>
              <Image
                src="/images/wallets/crossmark.png"
                className="wallet-logo"
                alt="Crossmark Wallet"
                height={24}
                width={24}
              />
              Crossmark
            </span>
          </li>
          <li className="flex justify-center items-center gap-2 border-2 border-black p-2 hover:shadow-[4px_4px_0px_0px] transition-shadow duration-300">
            <span onClick={() => handleWalletClick('gemwallet')}>
              <Image
                src="/images/wallets/gemwallet.svg"
                className="wallet-logo"
                alt="GemWallet"
                height={24}
                width={24}
              />
              GemWallet
            </span>
          </li>
          <li className="flex justify-center items-center gap-2 border-2 border-black p-2 hover:shadow-[4px_4px_0px_0px] transition-shadow duration-300">
            <span onClick={() => handleWalletClick('metamask')}>
              <Image
                src="/images/wallets/metamask.svg"
                className="wallet-logo"
                alt="Metamask Wallet"
                height={24}
                width={24}
              />
              Metamask
            </span>
          </li>
          <li className="flex justify-center items-center gap-2 border-2 border-black p-2 hover:shadow-[4px_4px_0px_0px] transition-shadow duration-300">
            <span onClick={() => handleWalletClick('ledgerwallet')}>
              <Image
                src="/images/wallets/ledgerwallet.svg"
                className="wallet-logo"
                alt="Ledger Wallet"
                height={24}
                width={24}
              />
              Ledger
            </span>
          </li>
          <li className="flex justify-center items-center gap-2 border-2 border-black p-2 hover:shadow-[4px_4px_0px_0px] transition-shadow duration-300">
            <span onClick={() => handleWalletClick('trezor')}>
              <Image
                src="/images/wallets/trezor.svg"
                className="wallet-logo"
                alt="Trezor Wallet"
                height={24}
                width={24}
              />
              Trezor
            </span>
          </li>
        </ul>
      </section>
      <SignForm
        signRequest={signRequest}
        setSignRequest={setSignRequest}
        refreshPage={refreshPage}
        setRefreshPage={setRefreshPage}
        account={account}
        setAccount={setAccount}
        wcSession={wcSession}
        setWcSession={setWcSession}
      />
    </main>
  )
}

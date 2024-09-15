import { useTranslation, Trans } from 'next-i18next'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import Mailto from 'react-protected-mailto'
import { useState, useEffect } from 'react'
import axios from 'axios'

import SocialIcons from '../components/Layout/SocialIcons'
import SEO from '../components/SEO'
import { nativeCurrency, explorerName, xahauNetwork } from '../utils'
import { getIsSsrMobile } from '../utils/mobile'
import { amountFormat } from '../utils/format'

export async function getServerSideProps(context) {
  const { locale } = context
  return {
    props: {
      isSsrMobile: getIsSsrMobile(context),
      ...(await serverSideTranslations(locale, ['common', 'customer-support']))
    }
  }
}

export default function Contact() {
  const { t } = useTranslation()
  const [networkInfo, setNetworkInfo] = useState({})

  useEffect(() => {
    async function fetchData() {
      const networkInfoData = await axios('v2/server')
      setNetworkInfo(networkInfoData?.data)
    }

    fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <>
      <SEO title={t('header', { ns: 'customer-support' })} />
      <div className="content-text">
        <h1>{t('header', { ns: 'customer-support' })}</h1>
        <p>{t('read-carefully', { ns: 'customer-support' }).toUpperCase()}</p>
        <p>
          <Trans ns="customer-support" i18nKey="is-explorer">
            Our web-site operates as an explorer of <strong>PUBLICLY</strong> available information on the{' '}
            {{ explorerName }} Ledger.
          </Trans>
          <br />
          <Trans ns="customer-support" i18nKey="no-wallet" />
          <br />
          <Trans ns="customer-support" i18nKey="primary-function">
            Our <strong>primary function</strong> is to provide information about transactions and accounts on the{' '}
            {{ explorerName }} in a user-friendly manner. The information we provide is not proprietary or secret; it is
            available to anyone with access to the blockchain.
          </Trans>
        </p>
        <h3>{t('what-we-cannot-do', { ns: 'customer-support' })}</h3>
        <ul>
          <li>
            <Trans ns="customer-support" i18nKey="freeze-accounts" values={{ explorerName }} />
          </li>
          <li>
            <Trans ns="customer-support" i18nKey="reverse-transactions" />
          </li>
          <li>
            <Trans ns="customer-support" i18nKey="modify-tags" />
          </li>
          <li>
            <Trans ns="customer-support" i18nKey="conduct-investigations" />
          </li>
          <li>
            <Trans ns="customer-support" i18nKey="recover-funds" values={{ nativeCurrency }} />
          </li>
        </ul>
        <h3>{t('what-to-do', { ns: 'customer-support' })}</h3>
        <ol>
          <li>
            <Trans ns="customer-support" i18nKey="stolen-funds">
              <strong>Stolen Funds or Fraud/Scam Victim</strong>: If your funds were stolen or you were scammed, you can
              report the incident <a href="https://xrplorer.com/forensics/help">here</a>.
            </Trans>
          </li>
          <li>
            <Trans ns="customer-support" i18nKey="failed-transaction" />
          </li>
          <li>
            <Trans ns="customer-support" i18nKey="successful-transaction" />
          </li>
          <li>
            <Trans ns="customer-support" i18nKey="destination-tag" />
          </li>
          <li>
            <Trans ns="customer-support" i18nKey="missing-base-reserve">
              <strong>Missing {{ baseReserve: amountFormat(networkInfo?.reserveBase) }} in Your Wallet</strong>: The
              missing {{ baseReserve: amountFormat(networkInfo?.reserveBase) }} is due to the {{ nativeCurrency }}{' '}
              Ledger's base reserve requirement. Please read more about the{' '}
              <a
                href={
                  xahauNetwork
                    ? 'https://help.xumm.app/app/xahau/understanding-reserves-on-xahau'
                    : 'https://xrpl.org/reserves.html'
                }
              >
                base reserve
              </a>
              .
            </Trans>
          </li>
          <li>
            <Trans ns="customer-support" i18nKey="sending-from-paper-wallet" values={{ nativeCurrency }} />
          </li>
        </ol>
        <p>
          <Trans ns="customer-support" i18nKey="note" />
        </p>
        <p>
          <b>{t('inquiries', { ns: 'customer-support' })}</b>
          <br />
          <Trans ns="customer-support" i18nKey="for-partnership">
            For any partnership or marketing proposals:{' '}
            <Mailto email="partner@bithomp.com" headers={{ subject: 'Bithomp partner' }} />
          </Trans>
          <br />
          <Trans ns="customer-support" i18nKey="for-questions">
            For any questions about the username registration, transaction explorer or Bithomp Pro:{' '}
            <Mailto email="inquiries@bithomp.com" headers={{ subject: 'Bithomp usage question' }} />
          </Trans>
        </p>

        <h3>{t('submit-info', { ns: 'customer-support' })}</h3>
        <p>
          <Trans ns="customer-support" i18nKey="submit-info-here">
            If you have a public service and you want your addresses to be recognised, submit your information{' '}
            <a href="https://xrplexplorer.com/submit-account-information">here</a>.
          </Trans>
        </p>
        <h3>{t('follow-us', { ns: 'customer-support' })}</h3>
        <SocialIcons />
      </div>
    </>
  )
}

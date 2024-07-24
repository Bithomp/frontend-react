import { useTranslation, Trans } from 'next-i18next'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import Mailto from 'react-protected-mailto'
import { useState, useEffect } from 'react'
import axios from 'axios'

import SocialIcons from '../components/Layout/SocialIcons'
import SEO from '../components/SEO'
import { nativeCurrency } from '../utils'
import { getIsSsrMobile } from '../utils/mobile'
import { amountFormat } from '../utils/format'

export async function getServerSideProps(context) {
  const { locale } = context
  return {
    props: {
      isSsrMobile: getIsSsrMobile(context),
      ...(await serverSideTranslations(locale, ['common', 'customer-support'])),
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

  return <>
    <SEO title={t("menu.customer-support")} />
    <div className="content-text">
      <h1>{t("menu.customer-support")}</h1>
      <p>
        <Trans ns="customer-support" i18nKey="text0">
          Bithomp is an explorer of the <u>public</u> {{ nativeCurrency }} Ledger.
        </Trans>
      </p>
      <p>{t("no-help", { ns: "customer-support" })}</p>
      <ol>
        <li>
          <Trans ns="customer-support" i18nKey="text1">
            If you funds were stolen or if you became a victim of fraud/scam you can report it <a href="https://xrplorer.com/forensics/help">here</a>.
          </Trans>
        </li>
        <li>{t("status-failed", { ns: "customer-support" })}</li>
        <li>{t("status-success", { ns: "customer-support" })}</li>
        <li>{t("wrong-tag", { ns: "customer-support" })}</li>
        <li>
          <Trans ns="customer-support" i18nKey="text2">
            If you are missing {{ baseReserve: amountFormat(networkInfo?.reserveBase) }} in your wallet, please read about the <a href="https://xrpl.org/reserves.html">base reserve</a>.
          </Trans>
        </li>
        <li>{t("paper-wallet", { ns: "customer-support", nativeCurrency })}</li>
        <li>
          <Trans ns="customer-support" i18nKey="text3">
            If you have a <b>partnership or marketing</b> proposals then you can contact us by email: <Mailto email='partner@bithomp.com' headers={{ subject: 'Bithomp partner' }} />. You can also contact us with questions about the bithomp username registration or bithomp transaction explorer.
          </Trans>
        </li>
      </ol>
      <p>{t("no-answer", { ns: "customer-support" })}</p>
      <h2>{t("submit-info", { ns: "customer-support" })}</h2>
      <p>
        <Trans ns="customer-support" i18nKey="text4">
          If you have a public service and you want your addresses to be recognised on Bithomp submit your information <a href="https://bithomp.com/explorer/submit.html">here</a>.
        </Trans>
      </p>
      <h2>{t("follow-us", { ns: "customer-support" })}</h2>
      <SocialIcons />
    </div>
  </>
};

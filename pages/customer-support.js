import { useTranslation, Trans } from 'next-i18next'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import Mailto from 'react-protected-mailto'

import SocialIcons from '../components/Layout/SocialIcons'
import SEO from '../components/SEO'

export async function getStaticProps({ locale }) {
  return {
    props: {
      ...(await serverSideTranslations(locale, ['common'])),
    }
  }
}

export default function Contact() {
  const { t } = useTranslation();

  return <>
    <SEO title={t("menu.customer-support")} />
    <div className="content-text">
      <h1>{t("menu.customer-support")}</h1>
      <p>
        <Trans i18nKey="customer-support.text0">
          Bithomp is an explorer of the <u>public</u> XRP Ledger.
        </Trans>
      </p>
      <p>{t("customer-support.no-help")}</p>
      <ol>
        <li>
          <Trans i18nKey="customer-support.text1">
            If you funds were stolen or if you became a victim of fraud/scam you can report it <a href="https://xrplorer.com/forensics/help">here</a>.
          </Trans>
        </li>
        <li>{t("customer-support.status-failed")}</li>
        <li>{t("customer-support.status-success")}</li>
        <li>{t("customer-support.wrong-tag")}</li>
        <li>
          <Trans i18nKey="customer-support.text2">
            If you're missing 10 XRP in your wallet, please read about the <a href="https://xrpl.org/reserves.html">base reserve</a>.
          </Trans>
        </li>
        <li>{t("customer-support.paper-wallet")}</li>
        <li>{t("customer-support.flare")}</li>
        <li>
          <Trans i18nKey="customer-support.text3">
            If you have a <b>partnership or marketing</b> proposals then you can contact us by email: <Mailto email='support@bithomp.com' headers={{ subject: 'Bithomp contact page' }} />. You can also contact us with questions about the bithomp username registration or bithomp transaction explorer.
          </Trans>
        </li>
      </ol>
      <p>{t("customer-support.no-answer")}</p>
      <h2>{t("customer-support.submit-info")}</h2>
      <p>
        <Trans i18nKey="customer-support.text4">
          If you have a public XRPL service and you want your XRP addresses to be recognised on Bithomp submit your information <a href="https://bithomp.com/explorer/submit.html">here</a>. You can also contact us by email: <Mailto email='support@bithomp.com' headers={{ subject: 'New XRPL Service' }} /> if you want to speed up the process.
        </Trans>
      </p>
      <h2>{t("customer-support.follow-us")}</h2>
      <SocialIcons />
    </div>
  </>
};

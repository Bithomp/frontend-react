import { useTranslation } from 'next-i18next'
import Image from 'next/image'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'

export async function getStaticProps({ locale }) {
  return {
    props: {
      ...(await serverSideTranslations(locale, ['common'])),
    }
  }
}

import CopyButton from '../components/UI/CopyButton'
import SEO from '../components/SEO'

export default function Donate() {
  const { t } = useTranslation()

  return <>
    <SEO title={t("menu.donate") + " ❤"} />
    <div className="content-text content-center">
      <h2 className="center">{t("menu.donate")} <span className="red">❤</span></h2>
      <div className="flex">
        <div className="grey-box" >
          <Image
            src="/images/donate.png"
            alt="donate"
            width={300}
            height={300}
            style={{ float: "left", marginRight: "15px" }}
            className='hide-on-mobile'
          />
          <br className='hide-on-mobile' />
          {t("donate.help-us")}
          <br /><br />
          {t("donate.it-helps")}
          <br /><br />
          {t("donate.address")}:
          <br />
          <b style={{ wordBreak: "break-word" }}>rPPHhfSQbHt1t2XPHWAK1HTcjqDg56TzZy</b> <CopyButton text="rPPHhfSQbHt1t2XPHWAK1HTcjqDg56TzZy" />
          <br /><br />
          {t("donate.dt")}:
          <br />
          <b>1</b> <CopyButton text="1" />
        </div>
      </div>
    </div>
  </>;
};

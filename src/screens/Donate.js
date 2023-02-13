import { useTranslation } from 'react-i18next';
import donate from '../assets/images/donate.png';

import CopyButton from '../components/CopyButton';
import SEO from '../components/SEO';

export default function Donate() {
  const { t } = useTranslation();

  return <>
    <SEO title={t("menu.donate") + " ❤"} />
    <div className="content-text content-center">
      <h2 className="center">{t("menu.donate")} <span className="red">❤</span></h2>
      <div className="flex">
        <div className="grey-box" >
          <img
            src={donate}
            alt="donate"
            style={{ float: "left", width: "300px", height: "300px", marginRight: "15px" }}
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

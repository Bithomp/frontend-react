import { useTranslation } from 'react-i18next';

import SEO from '../components/SEO';

export default function Donate() {
  const { t } = useTranslation();

  return <>
    <SEO title={t("menu.donate")} />
    <div className="content-text">

      <h2 className="center">{t("menu.donate")}</h2>
      <div className="flex">
        <div className="grey-box">
          XRPL address: <b>rPPHhfSQbHt1t2XPHWAK1HTcjqDg56TzZy</b>
          <br />
          Destination tag: <b>1</b>
        </div>
      </div>

    </div>
  </>;
};

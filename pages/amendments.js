import { useTranslation } from 'next-i18next'
import { useState, useEffect } from 'react'
import axios from 'axios'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'

import { fullDateAndTime } from '../utils/format'

import SEO from '../components/SEO'

export async function getStaticProps({ locale }) {
  return {
    props: {
      ...(await serverSideTranslations(locale, ['common'])),
    }
  }
}

export default function Amendment() {
  const [majorityAmendments, setMajorityAmendments] = useState(null);
  const [enabledAmendments, setEnabledAmendments] = useState(null);
  const { t } = useTranslation();

  const checkApi = async () => {
    const response = await axios('v2/amendment');
    const data = response.data;
    if (data) {
      setMajorityAmendments(data.filter(a => !!a.majority));
      setEnabledAmendments(data.filter(a => a.enabled === true));
    }
  }

  const amendmentLink = (name, hash) => {
    return name ? <a href={"https://xrpl.org/known-amendments.html#" + name.toLowerCase()}>{name}</a> : hash;
  }

  /*
  [
    {
      "amendment": "DF8B4536989BDACE3F934F29423848B9F1D76D09BE6A1FCFE7E7F06AA26ABEAD",
      "name": "fixRemoveNFTokenAutoTrustLine",
      "enabled": false,
      "supported": true,
      "vetoed": false,
      "introduced": "1.9.4",
      "majority": 1663892802
    }
  ]
  */

  useEffect(() => {
    checkApi();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <>
    <SEO title={t("menu.amendments")} />
    <div className="content-text">
      {majorityAmendments?.length ?
        <>
          <h2 className="center">{t("amendment.soon")}</h2>
          <table className="table-large">
            <thead>
              <tr>
                <th>{t("amendment.name")}</th>
                <th>{t("amendment.introduction")}</th>
                <th>{t("amendment.majority")}</th>
                <th>{t("amendment.eta")}</th>
              </tr>
            </thead>
            <tbody>
              {majorityAmendments.map(a =>
                <tr key={a.amendment}>
                  <td className="brake">{amendmentLink(a.name, a.amendment)}</td>
                  <td className='center'>{a.introduced}</td>
                  <td>{fullDateAndTime(a.majority)}</td>
                  <td>{fullDateAndTime(a.majority + 14 * 86400 + 3)}</td>
                </tr>
              )}
            </tbody>
          </table>
        </> : ""
      }
      {enabledAmendments?.length ?
        <>
          <h2 className="center">{t("amendment.enabled")}</h2>
          <table className="table-large">
            <thead>
              <tr>
                <th>{t("amendment.name")}</th>
                <th>{t("amendment.introduction")}</th>
              </tr>
            </thead>
            <tbody>
              {enabledAmendments.map(a =>
                <tr key={a.amendment}>
                  <td>{amendmentLink(a.name, a.amendment)}</td>
                  <td className='center'>{a.introduced}</td>
                </tr>
              )}
            </tbody>
          </table>
        </> : ""
      }
    </div>
  </>;
};

import { useTranslation } from 'react-i18next';
import { useState, useEffect } from 'react';
import axios from 'axios';

const dataFormat = (timestamp) => {
  return new Date(timestamp * 1000).toLocaleString();
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

  const amendmentLink = (name) => {
    return name ? <a href={"https://xrpl.org/known-amendments.html#" + name.toLowerCase()}>{name}</a> : t("amendment.unknown");
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
  }, []);

  return <>
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
              </tr>
            </thead>
            <tbody>
              {majorityAmendments.map(a =>
                <tr key={a.amendment}>
                  <td>{amendmentLink(a.name)}</td>
                  <td>{a.introduced}</td>
                  <td>{dataFormat(a.majority)}</td>
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
                  <td>{amendmentLink(a.name)}</td>
                  <td>{a.introduced}</td>
                </tr>
              )}
            </tbody>
          </table>
        </> : ""
      }
    </div>
  </>;
};

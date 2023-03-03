import { useTranslation } from 'react-i18next';
import { useState, useEffect } from 'react';
import axios from 'axios';

import { fullDateAndTime } from '../utils/format';

import SEO from '../../components/components/SEO';

export default function Domains() {
  const [data, setData] = useState(null);
  const { t } = useTranslation();

  const checkApi = async () => {
    const response = await axios('xrpl/domains');
    const data = response.data;
    if (data) {
      setData(data);
    }
  }

  /*
    {
      "total": 147,
      "domains": [
        {
          "domain": "bithomp.com",
          "validToml": true,
          "lastTomlCheck": 1664931614,
          "addresses": [
            {
              "address": "rsuUjfWxrACCAwGQDsNeZUhpzXf1n1NK5Z",
              "inToml": 1664931614,
              "verified": true,
              "domainSet": 1664966283,
              "lastInterest":1664966284
            },
  */

  useEffect(() => {
    checkApi();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <>
    <SEO title={t("menu.domains")} />
    <div className="content-text">
      {data?.domains ?
        <>
          <h2 className="center">{t("menu.domains")}</h2>
          <table className="table-large">
            <thead>
              <tr>
                <th>{t("domains.domain")}</th>
                <th>{t("domains.toml-valid")}</th>
                <th>{t("domains.last-check")}</th>
                <th>{t("domains.addresses")}</th>
              </tr>
            </thead>
            <tbody>
              {data?.domains?.map((d, i) =>
                <tr key={i}>
                  <td>{d.domain}</td>
                  <td>{d.validToml}</td>
                  <td>{fullDateAndTime(d.lastTomlCheck)}</td>
                  <td>{d.addresses.length}</td>
                </tr>
              )}
            </tbody>
          </table>
        </> : ""
      }
    </div>
  </>;
};

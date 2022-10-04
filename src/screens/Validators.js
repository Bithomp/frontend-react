import { useTranslation, Trans } from 'react-i18next';
import { useState, useEffect } from 'react';
import axios from 'axios';
import { isMobile } from "react-device-detect";
import moment from "moment";

import { fullDateAndTime } from '../utils';

const compare = (a, b) => {
  // nulls sort after anything else
  if (!a.domain) {
    return 1;
  }
  return a.domain > b.domain ? 1 : -1;
}

export default function Amendment() {
  const [data, setData] = useState(null);
  const { t } = useTranslation();

  const checkApi = async () => {
    const response = await axios('v2/unl');
    const data = response.data;
    if (data) {
      data.validators.sort(compare);
      setData(data);
    }
  }

  /*
  {
    "url": "https://vl.xrplf.org",
    "version": 1,
    "sequence": 2022051601,
    "updatedAt": 1664888233,
    "expiration": 1668297600,
    "PublicKey": "ED45D1840EE724BE327ABE9146503D5848EFD5F38B6D5FEDE71E80ACCE5E6E738B",
    "manifest": "JAAAAAFxIe1F0YQO5yS+Mnq+kUZQPVhI79Xzi21f7ecegKzOXm5zi3Mh7RiCXiUBmFIhZUbZfHHGCftCtcsPeSU01cwAt0hkhs0UdkAQnI9+pUYXskMF1Er1SPrem9zMEOxDx24aS+88WIgXpslXVyRPehFwtnTTb+LwUx7yUXoH3h31Qkruu2RZG70NcBJAy3pkPr9jhqyPvB7T4Nz8j/MjEaNa9ohMLztonxAAZDpcB+zX8QVvQ4GUiAePLCKF/fqTKfhUkSfobozPOi/bCQ==",
    "signature": "109C8F7EA54617B24305D44AF548FADE9BDCCC10EC43C76E1A4BEF3C588817A6C95757244F7A1170B674D36FE2F0531EF2517A07DE1DF5424AEEBB64591BBD0D",
    "validators": [
        {
            "PublicKey": "EDC090980ECAAB37CBE52E880236EC57F732B7DBB7C7BB9A3768D3A6E7184A795E",
            "sequence": 4,
            "publicKey": "nHUFE9prPXPrHcG3SkwP1UzAQbSphqyQkQK9ATXLZsfkezhhda3p",
            "address": "rsjzL7orAw7ej5GXboP3YE9YwAixAsFnWW",
            "domain": "alloy.ee"
        },
    ]
  }
  */

  useEffect(() => {
    checkApi();
  }, []);

  return <>
    <div className="content-text">
      {data?.validators.length ?
        <>
          <h2 className="center">{t("validators.unl")} ({t("validators.updated")} {moment(data.updatedAt * 1000, "unix").fromNow()})</h2>
          <div className="flex center">
            <div className="grey-box">
              {data &&
                <Trans i18nKey="validators.text0">
                  The validator list <b>{{ url: data.url }}</b> has sequence {{ sequence: data.sequence }} and expiration on {{ expiration: fullDateAndTime(data.expiration) }}.
                </Trans>
              }
            </div>
          </div>
          <br />

          {isMobile ?
            <table className="table-mobile">
              <thead>
                <tr>
                  <th> </th>
                  <th>{t("validators.details")}</th>
                </tr>
              </thead>
              <tbody>
                {data.validators.map((v, i) => (
                  <tr key={i}>
                    <td style={{ padding: "5px" }}>{i + 1}</td>
                    <td>
                      {v.domain &&
                        <p>
                          {t("validators.domain")}<br />
                          <a href={"https://" + v.domain}>{v.domain}</a>
                        </p>
                      }
                      <p>
                        {t("validators.public-key")}<br />
                        {v.publicKey.substr(0, 14) + "..." + v.publicKey.substr(-14)}
                      </p>
                      <p>
                        {t("validators.sequence")}: {v.sequence}
                      </p>
                      <p>
                        {t("validators.address")}<br />
                        <a href={"/explorer/" + v.address}>{v.address}</a>
                      </p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table> :
            <table className="table-large">
              <thead>
                <tr>
                  <th> </th>
                  <th>{t("validators.domain")}</th>
                  <th>{t("validators.public-key")}</th>
                  <th className='center'>{t("validators.sequence")}</th>
                  <th>{t("validators.address")}</th>
                </tr>
              </thead>
              <tbody>
                {data.validators.map((v, i) =>
                  <tr key={v.publicKey}>
                    <td>{i + 1}</td>
                    <td>{v.domain ? <a href={"https://" + v.domain}>{v.domain}</a> : t("validators.no-domain")}</td>
                    <td>{v.publicKey}</td>
                    <td className='center'>{v.sequence}</td>
                    <td><a href={"/explorer/" + v.address}>{v.address}</a></td>
                  </tr>
                )}
              </tbody>
            </table>
          }
        </> : ""
      }
    </div>
  </>;
};

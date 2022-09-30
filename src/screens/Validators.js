import { useTranslation, Trans } from 'react-i18next';
import { useState, useEffect } from 'react';
import axios from 'axios';

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
    expiration: 1668470400,
    sequence: 54,
    url: "",
    [
      {
        "publicKey": "nHB8QMKGt9VB4Vg71VszjBVQnDW3v3QudM4DwFaJfy96bj4Pv9fA",
        "address": "rKontEGtDju5MCEJCwtrvTWQQqVAw5juXe",
        "Sequence": 2,
        "domain": "bithomp.com"
      }
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
          <h2 className="center">{t("validators.unl")}</h2>
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
          <table className="table-large">
            <thead>
              <tr>
                <th>{t("validators.domain")}</th>
                <th>{t("validators.public-key")}</th>
                <th>{t("validators.sequence")}</th>
                <th>{t("validators.address")}</th>
              </tr>
            </thead>
            <tbody>
              {data.validators.map(v =>
                <tr key={v.publicKey}>
                  <td>{v.domain ? <a href={"https://" + v.domain}>{v.domain}</a> : t("validators.no-domain")}</td>
                  <td>{v.publicKey}</td>
                  <td className='center'>{v.Sequence}</td>
                  <td><a href={"/explorer/" + v.address}>{v.address}</a></td>
                </tr>
              )}
            </tbody>
          </table>
        </> : ""
      }
    </div>
  </>;
};

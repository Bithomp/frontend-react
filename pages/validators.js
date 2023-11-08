import { useTranslation, Trans } from 'next-i18next'
import { useState, useEffect } from 'react'
import axios from 'axios'
import moment from "moment"
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'

import SEO from '../components/SEO'

import { addressUsernameOrServiceLink, fullDateAndTime, shortHash } from '../utils/format'
import { useWidth } from '../utils'

import CopyButton from '../components/UI/CopyButton'

export async function getStaticProps({ locale }) {
  return {
    props: {
      ...(await serverSideTranslations(locale, ['common'])),
    }
  }
}

const compare = (a, b) => {
  // nulls sort after anything else
  if (!a.domain) {
    return 1;
  }
  return a.domain > b.domain ? 1 : -1;
}

export default function Validators() {
  const [data, setData] = useState(null)
  const { t } = useTranslation()
  const windowWidth = useWidth()

  const checkApi = async () => {
    const response = await axios('v2/unl');
    const data = response.data;
    if (data) {
      data.validators?.sort(compare);
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
    "error":  "Master signature does not match",
    "PublicKey": "ED45D1840EE724BE327ABE9146503D5848EFD5F38B6D5FEDE71E80ACCE5E6E738B",
    "manifest": "JAAAAAFxIe1F0YQO5yS+Mnq+kUZQPVhI79Xzi21f7ecegKzOXm5zi3Mh7RiCXiUBmFIhZUbZfHHGCftCtcsPeSU01cwAt0hkhs0UdkAQnI9+pUYXskMF1Er1SPrem9zMEOxDx24aS+88WIgXpslXVyRPehFwtnTTb+LwUx7yUXoH3h31Qkruu2RZG70NcBJAy3pkPr9jhqyPvB7T4Nz8j/MjEaNa9ohMLztonxAAZDpcB+zX8QVvQ4GUiAePLCKF/fqTKfhUkSfobozPOi/bCQ==",
    "signature": "109C8F7EA54617B24305D44AF548FADE9BDCCC10EC43C76E1A4BEF3C588817A6C95757244F7A1170B674D36FE2F0531EF2517A07DE1DF5424AEEBB64591BBD0D",
    "validators": [
        {
            "PublicKey": "EDC090980ECAAB37CBE52E880236EC57F732B7DBB7C7BB9A3768D3A6E7184A795E",
            "sequence": 4,
            "publicKey": "nHUFE9prPXPrHcG3SkwP1UzAQbSphqyQkQK9ATXLZsfkezhhda3p",
            "address": "rsjzL7orAw7ej5GXboP3YE9YwAixAsFnWW",
            "domain": "alloy.ee",
            "domainLegacy": "alloy.ee"
        },
    ]
  }
  */

  useEffect(() => {
    checkApi();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <>
    <SEO title={t("menu.xrpl.validators")} />
    <div className="content-text">
      {data?.validators?.length ?
        <>
          <h1 className="center">{t("validators.unl")} ({t("validators.updated")} {moment((data.updatedAt - 1) * 1000, "unix").fromNow()})</h1>
          <div className="flex center">
            <div className="grey-box">
              {data &&
                <Trans i18nKey="validators.text0">
                  The validator list <b>{{ url: data.url }}</b> has sequence {{ sequence: data.sequence }} and expiration on {{ expiration: fullDateAndTime(data.expiration) }}.<br />It includes {{ validatorCount: data.validators.length }} validators which are listed below.
                </Trans>
              }
              <br />
              {data.error && <b><br />Validation error: <span className='red'>{data.error}</span>.</b>}
            </div>
          </div>
          <br />

          {windowWidth < 960 ?
            <table className="table-mobile">
              <thead>
              </thead>
              <tbody>
                {data.validators.map((v, i) => (
                  <tr key={i}>
                    <td style={{ padding: "5px" }}>{i + 1}</td>
                    <td>
                      {v.domain ?
                        <p>
                          {t("validators.domain")}<br />
                          <a href={"https://" + v.domain}>{v.domain}</a>
                        </p> :
                        <>
                          {v.domainLegacy &&
                            <p>
                              {t("validators.domain-legacy")}<br />
                              <a href={"https://" + v.domainLegacy}>{v.domainLegacy}</a>
                            </p>
                          }
                        </>
                      }
                      <p>
                        {t("table.public-key")}<br />
                        {shortHash(v.publicKey)} <CopyButton text={v.publicKey} />
                      </p>
                      <p>
                        {t("validators.sequence")}: {v.sequence}
                      </p>
                      <p>
                        {t("validators.address")} <CopyButton text={v.address} /><br />
                        {addressUsernameOrServiceLink(v, 'address')}
                      </p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            :
            <table className="table-large">
              <thead>
                <tr>
                  <th> </th>
                  <th>{t("validators.domain")}</th>
                  <th>{t("table.public-key")}</th>
                  <th className='center'>{t("validators.sequence")}</th>
                  <th>{t("validators.address")}</th>
                </tr>
              </thead>
              <tbody>
                {data.validators.map((v, i) =>
                  <tr key={v.publicKey}>
                    <td>{i + 1}</td>
                    <td>
                      {v.domain ?
                        <a href={"https://" + v.domain}>{v.domain}</a> :
                        <>
                          {v.domainLegacy ?
                            <a href={"https://" + v.domainLegacy} className="green">{v.domainLegacy}</a> :
                            t("validators.no-domain")
                          }
                        </>
                      }
                    </td>
                    <td><CopyButton text={v.publicKey} /> {windowWidth > 1240 ? v.publicKey : shortHash(v.publicKey)}</td>
                    <td className='center'>{v.sequence}</td>
                    <td className='left'><CopyButton text={v.address} /> {addressUsernameOrServiceLink(v, 'address')}</td>
                  </tr>
                )}
              </tbody>
            </table>
          }
        </>
        :
        <>
          {data?.error &&
            <>
              <h1 className="center">{t("validators.unl")}</h1>
              <div className="flex center">
                <div className="grey-box">
                  {data.error && <b>{t("general.error")}: <span className='red'>{data.error}</span>.</b>}
                </div>
              </div>
            </>
          }
        </>
      }
    </div>
  </>;
};

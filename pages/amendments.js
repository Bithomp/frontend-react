import { useTranslation } from 'next-i18next'
import { useState, useEffect } from 'react'
import axios from 'axios'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'

import { fullDateAndTime, shortHash } from '../utils/format'
import { useWidth } from '../utils'

import SEO from '../components/SEO'
import CopyButton from '../components/UI/CopyButton'

export async function getStaticProps({ locale }) {
  return {
    props: {
      ...(await serverSideTranslations(locale, ['common', 'amendments'])),
    }
  }
}

export default function Amendment() {
  const windowWidth = useWidth()
  const [majorityAmendments, setMajorityAmendments] = useState(null)
  const [enabledAmendments, setEnabledAmendments] = useState(null)
  const { t } = useTranslation(['common', 'amendments'])

  const [disabledAmendments, setDisabledAmendments] = useState(null)

  //enabled
  //voting
  //reached majority
  //obsolete

  const checkApi = async () => {
    const response = await axios('v2/amendment')
    const data = response.data //.sort(a => (!a.introduced) ? -1 : 1)
    if (data) {
      setDisabledAmendments(data.filter(a => a.enabled === false))
      setMajorityAmendments(data.filter(a => !!a.majority))
      setEnabledAmendments(data.filter(a => a.enabled === true))
    }
  }

  const amendmentLink = (name, hash) => {
    return name ? <a href={"https://xrpl.org/known-amendments.html#" + name.toLowerCase()}>{name}</a> : shortHash(hash)
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
    <SEO title={t("menu.xrpl.amendments")} />
    <div className="content-text">
      {majorityAmendments?.length > 0 &&
        <>
          <h1 className="center">{t("soon", { ns: 'amendments' })}</h1>
          <table className="table-large">
            <thead>
              <tr>
                <th className='center'>{t("table.index")}</th>
                <th>{t("table.name")}</th>
                <th className='right'>{t("version", { ns: 'amendments' })}</th>
                <th>{t("majority", { ns: 'amendments' })}</th>
                <th>{t("eta", { ns: 'amendments' })}</th>
              </tr>
            </thead>
            <tbody>
              {majorityAmendments.map((a, i) =>
                <tr key={a.amendment}>
                  <td className='center'>{i + 1}</td>
                  <td className="brake">{amendmentLink(a.name, a.amendment)}</td>
                  <td className='right'>{a.introduced}</td>
                  <td>{fullDateAndTime(a.majority)}</td>
                  <td>{fullDateAndTime(a.majority + 14 * 86400 + 3)}</td>
                </tr>
              )}
            </tbody>
          </table>
        </>
      }
      {enabledAmendments?.length > 0 &&
        <>
          <h1 className="center">{t("enabled", { ns: 'amendments' })}</h1>
          <table className="table-large">
            <thead>
              <tr>
                <th className='center'>{t("table.index")}</th>
                <th>{t("table.name")}</th>
                <th className='right'>{t("version", { ns: 'amendments' })}</th>
                <th className='right'>{t("table.hash")}</th>
              </tr>
            </thead>
            <tbody>
              {enabledAmendments.map((a, i) =>
                <tr key={a.amendment}>
                  <td className='center'>{i + 1}</td>
                  <td>{amendmentLink(a.name, a.amendment)}</td>
                  <td className='right'>{a.introduced}</td>
                  <td className='right'>
                    {windowWidth > 1000 ? <>{shortHash(a.amendment)} </> : ""}
                    <CopyButton text={a.amendment} />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </>
      }
      {disabledAmendments?.length > 0 &&
        <>
          <h1 className="center">Disabled amendments</h1>
          <table className="table-large">
            <thead>
              <tr>
                <th className='center'>{t("table.index")}</th>
                <th>{t("table.name")}</th>
                <th className='right'>{t("version", { ns: 'amendments' })}</th>
                <th className='right'>{t("table.hash")}</th>
              </tr>
            </thead>
            <tbody>
              {disabledAmendments.map((a, i) =>
                <tr key={a.amendment}>
                  <td className='center'>{i + 1}</td>
                  <td className="brake">{amendmentLink(a.name, a.amendment)}</td>
                  <td className='right'>{a.introduced}</td>
                  <td className='right'>
                    {windowWidth > 1000 ? <>{shortHash(a.amendment)} </> : ""}
                    <CopyButton text={a.amendment} />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </>
      }
    </div>
  </>;
};

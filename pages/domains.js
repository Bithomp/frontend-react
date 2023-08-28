import { useTranslation } from 'next-i18next'
import { useState, useEffect } from 'react'
import axios from 'axios'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'

import { trWithAccount } from '../utils/format'

import SEO from '../components/SEO'

export async function getStaticProps({ locale }) {
  return {
    props: {
      ...(await serverSideTranslations(locale, ['common', 'domains'])),
    }
  }
}

export default function Domains() {
  const { t } = useTranslation()

  const [data, setData] = useState(null)
  const [sortConfig, setSortConfig] = useState({})

  const sortTable = key => {
    if (!data) return
    let direction = 'descending'
    let sortA = 1
    let sortB = -1

    if (sortConfig.key === key && sortConfig.direction === direction) {
      direction = 'ascending'
      sortA = -1
      sortB = 1
    }
    setSortConfig({ key, direction })
    setData(data.sort(function (a, b) {
      return a[key] < b[key] ? sortA : sortB
    }))
  }

  const checkApi = async () => {
    const response = await axios('xrpl/domains')
    const data = response.data
    if (data?.domains) {
      setData(data.domains.sort(function (a, b) {
        return a.domain < b.domain ? -1 : 1
      }))
    }
  }

  /*
  {
    "total": 97,
    "domains": [
      {
        "domain": "bithomp.com",
        "validToml": true,
        "lastTomlCheck": 1693184438,
        "addresses": [
          {
            "address": "rsuUjfWxrACCAwGQDsNeZUhpzXf1n1NK5Z",
            "inToml": 1693184438,
            "verified": true,
            "domainSet": 1693253151,
            "lastInterest": 1693173887
          },
  */

  useEffect(() => {
    checkApi()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return <>
    <SEO title={t("menu.domains")} />
    <div className="content-text">
      {data ?
        <>
          <h1 className="center">{t("menu.domains")}</h1>
          <table className="table-large">
            <thead>
              <tr>
                <th>{t("table.domain", { ns: 'domains' })} <b className={"link" + (sortConfig.key === 'domain' ? " orange" : "")} onClick={() => sortTable('domain')}>⇅</b></th>
                <th className='center'>{t("table.addresses", { ns: 'domains' })}</th>
              </tr>
            </thead>
            <tbody>
              {data?.map((d, i) =>
                <tr key={i}>
                  <td><a href={"https://" + d.domain}>{d.domain}</a></td>
                  <td>
                    <table>
                      <tbody>
                        {d.addresses.map((a, j) =>
                          <tr key={j}>
                            {trWithAccount(a, 'address', (d.addresses.length > 1 ? (j + 1) + ". " : "---"), "/explorer/")}
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </> : ""
      }
    </div>
  </>
}

import { useTranslation, Trans } from 'next-i18next'
import { useState, useEffect } from 'react'
import axios from 'axios'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import Image from 'next/image'

import { trWithAccount } from '../utils/format'
import { useWidth } from '../utils'

import SEO from '../components/SEO'

export const getServerSideProps = async ({ locale }) => {
  return {
    props: {
      ...(await serverSideTranslations(locale, ['common', 'domains'])),
    }
  }
}

export default function Domains({ setSignRequest }) {
  const { t } = useTranslation()
  const windowWidth = useWidth()

  const [data, setData] = useState(null)
  const [sortConfig, setSortConfig] = useState({})
  const [loading, setLoading] = useState(false)

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
    setLoading(true)
    const response = await axios('xrpl/domains')
    const data = response.data
    if (data?.domains) {
      setData(data.domains.reverse())
      setLoading(false)
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
    <SEO title={t("menu.network.verified-domains")} />
    <div className="content-text">

      <h1 className="center">{t("menu.network.verified-domains")}</h1>
      <div className='flex'>
        <div className="grey-box">
          <h4>
            {t("domain-verification", { ns: 'domains' })}
          </h4>
          <p>
            {t("domain-verification-desc", { ns: 'domains' })}
          </p>
          <p>
            {t("reason-to-verify", { ns: 'domains' })}
          </p>
          <p>
            {t("two-sides-verification", { ns: 'domains' })}
          </p>
          <h4>
            {t("domain-claims-address", { ns: 'domains' })}
          </h4>
          <p>
            {t("serve-toml", { ns: 'domains' })}
            <br />
            {"https://{DOMAIN}/.well-known/xrp-ledger.toml"}
            <br />
            {t("address-in-toml", { ns: 'domains' })}
          </p>
          <p>
            <a href="https://xrpl.org/xrp-ledger-toml.html">
              {t("read-about-toml", { ns: 'domains' })}
            </a>.
          </p>
          <p>
            <Trans i18nKey="toml-editor" ns="domains">
              <a href="https://dallipay.com/xrpltomleditor/">TOML editor</a> by <a href="https://twitter.com/SchlaubiD">SchlaubiD</a>.
            </Trans>
          </p>
        </div>
        <div className="grey-box">
          <h4>
            {t("address-claims-domain", { ns: 'domains' })}
          </h4>
          <p>
            <Trans i18nKey="set-domain" ns="domains">
              You should <a href="https://xrpl.org/accountset.html">set a domain for your XRPL address</a> which should match the domain your TOML file is served from.
            </Trans>
            <br /><br />
            <button
              className='button-action center'
              onClick={() => setSignRequest({
                wallet: "xumm",
                action: "setDomain",
                redirect: "account",
                request: {
                  "TransactionType": "AccountSet"
                }
              })}
            >
              <Image src="/images/xumm.png" className='xumm-logo' alt="xaman" height={24} width={24} />
              {t("button.set-domain", { ns: 'domains' })}
            </button>
          </p>
          <h4>
            {t("verify", { ns: 'domains' })}
          </h4>
          <p>
            <Trans i18nKey="verify-desc" ns="domains">
              You can verify that everything is set properly with the tool: <a href="https://xrpl.org/xrp-ledger-toml-checker.html">TOML Checker</a>. The list on this page updates from 3am to 4am (Stockholm time), if you domain is verifed in the Checker tool, but it is not on our list within 24h, then it's possible that we can not parse your TOML file.
            </Trans>
          </p>
          <br />
          <p>
            {t("desc", { ns: 'domains' })}
          </p>
        </div>
      </div>
      <br />
      {windowWidth > 1000 ?
        <table className="table-large shrink">
          <thead>
            <tr>
              <th>{t("table.index")}</th>
              <th>{t("table.domain")} <b className={"link" + (sortConfig.key === 'domain' ? " orange" : "")} onClick={() => sortTable('domain')}>⇅</b></th>
              <th className='center'>{t("table.addresses", { ns: 'domains' })}</th>
            </tr>
          </thead>
          <tbody>
            {loading ?
              <tr className='center'>
                <td colSpan="100">
                  <br />
                  <span className="waiting"></span>
                  <br />{t("general.loading")}<br />
                  <br />
                </td>
              </tr>
              :
              <>
                {data?.map((d, i) =>
                  <tr key={i} style={{ borderBottom: "1px solid var(--accent-link)" }}>
                    <td>{i + 1}</td>
                    <td>
                      <a href={"https://" + d.domain}>{d.domain}</a>
                    </td>
                    <td>
                      <table>
                        <tbody>
                          {d.addresses.map((a, j) =>
                            trWithAccount(a, 'address', (d.addresses.length > 1 ? (j + 1) + ". " : <>&nbsp;&nbsp;&nbsp;</>), "/explorer/", j)
                          )}
                        </tbody>
                      </table>
                    </td>
                  </tr>
                )}
              </>
            }
          </tbody>
        </table>
        :
        <table className="table-mobile">
          <thead>
          </thead>
          <tbody>
            {loading ?
              <tr className='center'>
                <td colSpan="100">
                  <br />
                  <span className="waiting"></span>
                  <br />{t("general.loading")}<br />
                  <br />
                </td>
              </tr>
              :
              <>
                {data?.map((d, i) =>
                  <tr key={i}>
                    <td style={{ padding: "5px" }} className='center'>
                      <b>{i + 1}</b>
                    </td>
                    <td>
                      <p>
                        <a href={"https://" + d.domain}>{d.domain}</a>
                      </p>
                      <table className='table-mobile' style={{ width: "calc(100% - 22px)", margin: "10px 0" }}>
                        <tbody>
                          {d.addresses.map((a, j) =>
                            trWithAccount(a, 'address', (d.addresses.length > 1 ? (j + 1) + ". " : <>&nbsp;&nbsp;&nbsp;</>), "/explorer/", j)
                          )}
                        </tbody>
                      </table>
                    </td>
                  </tr>
                )}
              </>
            }
          </tbody>
        </table>
      }
    </div>
  </>
}

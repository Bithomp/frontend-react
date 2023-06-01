import { useTranslation } from 'next-i18next'
import { useState, useEffect } from 'react'
import axios from 'axios'
import Image from 'next/image'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'

import { useIsMobile, getIsSsrMobile } from "../utils/mobile"
import { fullDateAndTime, amountFormat, addressUsernameOrServiceLink } from '../utils/format'
import { stripText } from '../utils'

export async function getServerSideProps(context) {
  const { locale } = context
  return {
    props: {
      isSsrMobile: getIsSsrMobile(context),
      ...(await serverSideTranslations(locale, ['common'])),
    }
  }
}

import CopyButton from '../components/UI/CopyButton'
import SEO from '../components/SEO'

export default function Donate() {
  const { t } = useTranslation()
  const isMobile = useIsMobile()

  const [data, setData] = useState(null)

  useEffect(() => {
    async function fetchData() {
      /*
      "transactions": [
        {
          "processedAt": 1680450744,
          "hash": "3B5F22B245069E1FB4A83A668D71E7EB687D10081A6F48514EB3A64D2E420330",
          "ledger": 78833252,
          "type": "Payment",
          "sourceAddress": "rf1NrYAsv92UPDd8nyCG4A3bez7dhYE61r",
          "destinationAddress": "rPPHhfSQbHt1t2XPHWAK1HTcjqDg56TzZy",
          "destinationTag": 1,
          "amount": 50,
          "memos": [
            {
              "type": "Description",
              "format": "text/plain",
              "data": "Donated by Ekiserrepe.com"
            }
          ],
          "sourceAddressDetails": {
            "username": "ekiserrepe",
            "service": "Ekiserrepe"
          }
        },
      */
      const response = await axios('v2/donations')
      setData(response.data)
    }
    fetchData();
  }, [setData])

  return <>
    <SEO
      title={t("menu.donate") + " ❤"}
      description={t("donate.help-us") + " " + t("donate.it-helps")}
      image={{ height: 300, width: 300, file: 'donate.png' }}
      websiteName="Bithomp"
    />
    <div className="content-text content-center">
      <h1 className="center">{t("menu.donate")} <span className="red">❤</span></h1>
      <div className="flex">
        <div className="grey-box" >
          <Image
            src="/images/donate.png"
            alt="donate"
            width={300}
            height={300}
            style={{ float: "left", marginRight: "15px" }}
            className='hide-on-mobile'
          />
          <br className='hide-on-mobile' />
          {t("donate.help-us")}
          <br /><br />
          {t("donate.it-helps")}
          <br /><br />
          {t("donate.address")}:
          <br />
          <b style={{ wordBreak: "break-word" }}>rPPHhfSQbHt1t2XPHWAK1HTcjqDg56TzZy</b> <CopyButton text="rPPHhfSQbHt1t2XPHWAK1HTcjqDg56TzZy" />
          <br /><br />
          {t("donate.dt")}:
          <br />
          <b>1</b> <CopyButton text="1" />

          {isMobile &&
            <>
              <br /><br />
              <a
                className='button-action wide center'
                href="xumm://xumm.app/detect/request:rPPHhfSQbHt1t2XPHWAK1HTcjqDg56TzZy?dt=1&deeplink=true&afterQr=true"
              >
                <Image src="/images/xumm.png" className='xumm-logo' alt="xumm" height={24} width={24} />
                {t("donate.donate-with-xumm")}
              </a>
            </>
          }
        </div>
      </div>
      <br />

      {data?.transactions && <>
        {isMobile ?
          <table className="table-mobile">
            <thead>
            </thead>
            <tbody>
              {data?.transactions?.map((tx, i) => (
                <tr key={i}>
                  <td style={{ paddingLeft: "15px" }}>
                    <p>
                      {t("table.date")}<br />
                      {fullDateAndTime(tx.processedAt)}
                    </p>
                    <p>
                      {t("table.sender")}<br />
                      {addressUsernameOrServiceLink(tx, 'sourceAddress', { short: true })}
                    </p>
                    <p>
                      {t("table.amount")}<br />
                      {amountFormat(tx.amount)}
                    </p>
                    {tx.memos && tx.memos.length > 0 &&
                      <p>
                        {t("table.memo")}<br />
                        {stripText(tx.memos[0]?.data)}
                      </p>
                    }
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          :
          <table className="table-large">
            <thead>
              <tr>
                <th>{t("table.date")}</th>
                <th>{t("table.sender")}</th>
                <th>{t("table.amount")}</th>
                <th>{t("table.memo")}</th>
              </tr>
            </thead>
            <tbody>
              {data?.transactions?.map((tx, i) =>
                <tr key={i}>
                  <td>{fullDateAndTime(tx.processedAt)}</td>
                  <td>{addressUsernameOrServiceLink(tx, 'sourceAddress', { short: true })}</td>
                  <td>{amountFormat(tx.amount)}</td>
                  <td>{tx.memos && tx.memos.length > 0 && stripText(tx.memos[0]?.data)}</td>
                </tr>
              )}
            </tbody>
          </table>
        }
      </>
      }
    </div>
  </>
}

import { useTranslation } from 'next-i18next'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'

import { AddressWithIconFilled, amountFormat, shortNiceNumber, timeFormat, txIdLink } from '../../utils/format'
import { getIsSsrMobile, useIsMobile } from '../../utils/mobile'

import SEO from '../../components/SEO'
import { axiosServer, passHeaders } from '../../utils/axios'
import { devNet, ledgerName } from '../../utils'
import WhaleTabs from '../../components/Tabs/WhaleTabs'

export async function getServerSideProps(context) {
  const { locale, req } = context
  let data = null
  try {
    const res = await axiosServer({
      method: 'get',
      url: 'v2/transactions/whale?limit=100',
      headers: passHeaders(req)
    })
    data = res?.data
  } catch (r) {
    data = r?.response?.data
  }

  return {
    props: {
      data: data || null,
      isSsrMobile: getIsSsrMobile(context),
      ...(await serverSideTranslations(locale, ['common']))
    }
  }
}

export default function Whales({ data, selectedCurrency }) {
  const { t } = useTranslation()
  const isMobile = useIsMobile()

  return (
    <>
      <SEO title={ledgerName + ' Whales'} />
      <div className="content-text">
        <WhaleTabs tab="transactions" />
        <h1 className="center">{ledgerName + ' Whales'}</h1>

        {!isMobile ? (
          <table className="table-large shrink">
            <thead>
              <tr>
                <th>#</th>
                <th>Time</th>
                <th>Sender</th>
                <th>Receiver</th>
                <th>Tx link</th>
                <th>Amount</th>
                <th>Fiat value</th>
              </tr>
            </thead>
            <tbody>
              {data?.map((tx, i) => (
                <tr key={i}>
                  <td>{i + 1}</td>
                  <td>{timeFormat(tx.timestamp)}</td>
                  <td>
                    <AddressWithIconFilled data={tx} name="sourceAddress" />
                  </td>
                  <td>
                    <AddressWithIconFilled data={tx} name="destinationAddress" />
                  </td>
                  <td>{txIdLink(tx.hash, 0)}</td>
                  <td>{amountFormat(tx.amount, { short: true, maxFractionDigits: 2 })}</td>
                  <td>
                    {devNet
                      ? t('table.no-value')
                      : tx.amountFiats
                      ? shortNiceNumber(tx.amountFiats[selectedCurrency?.toLowerCase()], 2, 1, selectedCurrency)
                      : ''}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <table className="table-mobile">
            <thead></thead>
            <tbody>
              {data?.map((d, i) => (
                <tr key={i}>
                  <td style={{ padding: '5px' }} className="center">
                    <b>{i + 1}</b>
                  </td>
                  <td>
                    <p>{timeFormat(tx.timestamp)}</p>
                    From:
                    <AddressWithIconFilled data={tx} name="sourceAddress" />
                    <br />
                    To:
                    <AddressWithIconFilled data={tx} name="destinationAddress" />
                    <p>Tx: {txIdLink(tx.hash, 0)}</p>
                    <p>Amount: {amountFormat(tx.amount, { short: true, maxFractionDigits: 2 })}</p>
                    <p>
                      Fiat value:
                      {devNet
                        ? t('table.no-value')
                        : tx.amountFiats
                        ? shortNiceNumber(tx.amountFiats[selectedCurrency?.toLowerCase()], 2, 1, selectedCurrency)
                        : ''}
                    </p>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  )
}

import { useTranslation } from 'next-i18next'

import { fullDateAndTime } from '../utils/format'

import { useTheme } from './Layout/ThemeContext'

import XahauExplorerLogo from '../public/images/xahauexplorer/longDark.svg'
import XrplExplorerLogo from '../public/images/xrplexplorer/longDark.svg'

import { nativeCurrency, xahauNetwork } from '../utils'

export default function Receipt({ item, details }) {
  const { t } = useTranslation()
  const { theme } = useTheme()

  if (!details) {
    return
  }

  const onPrint = () => {
    if (theme === 'dark') {
      global.window.__setPreferredTheme('light')
      window.print()
      global.window.__setPreferredTheme('dark')
    } else {
      window.print()
    }
  }

  let timestamp = null
  let fiatPrice = 0
  let xrpPrice = 0
  let serviceName = 'Service name'
  let txHash = ''
  let fiatCurrency = ''

  if (item === 'username') {
    serviceName = t('menu.usernames')
    if (details) {
      timestamp = details.completedAt
      fiatPrice = details.priceInSEK
      xrpPrice = details.price
      txHash = details.txHash
      fiatCurrency = 'SEK'
    }

    /*
    {
      action: "Registration",
      address: "rpqVJrX7L4yx2vjYPpDC5DAGrdp92zcsMW",
      bithompid: "testtest1",
      completedAt: 1658841346,
      country: "SE",
      createdAt: 1658837571,
      currency: "XRP",
      destinationTag: 480657625,
      id: 933,
      price: 29.46,
      priceInSEK: 100,
      status: "Completed",
      totalReceivedAmount: 29.470000000000002,
      txHash: "5F622D6CA708F72B7ECAC575995739D4844C267A533889A595573E91316B2FA0"
      updatedAt: 1658841346
    }
    */
  } else if (item === 'subscription') {
    /*
    {
      "id": 53,
      "createdAt": 1713180707,
      "updatedAt": 1713180831,
      "destinationTag": 173620292,
      "action": "Pay for Bithomp Pro",
      "status": "Completed",
      "price": 61.952751,
      "totalReceivedAmount": 61.96,
      "currency": "XRP",
      "priceInSEK": 347.1,
      "country": "SE",
      "completedAt": 1713180831,
      "txHash": "2D4B8220D325F0A76D2862DAC80D64B36C9FDED3B8DB8E774338F086C2FB5E39",
      "destinationAddress": "rsuUjfWxrACCAwGQDsNeZUhpzXf1n1NK5Z",
      "priceInEUR": 30,
      "type": "bithomp_pro",
      "period": "month",
      "periodCount": 3,
      "partnerID": 5
    }
    */

    if (details) {
      serviceName = 'Bithomp Pro' //details.action
      timestamp = details.completedAt
      fiatPrice = details.priceInEUR
      xrpPrice = details.price
      txHash = details.txHash
      fiatCurrency = 'EUR'
    }
  }

  timestamp = fullDateAndTime(timestamp, null, { asText: true })
  fiatPrice = fiatPrice?.toFixed(2)
  xrpPrice = xrpPrice?.toFixed(2)
  const rate = Math.floor((fiatPrice / xrpPrice) * 100) / 100

  return (
    <>
      <div className="receipt" id="section-to-print">
        <div className="receipt-body">
          <div className="receipt-details">
            <div className="receipt-header">
              {xahauNetwork ? (
                <XahauExplorerLogo style={{ width: '40%' }} id="receiptLogo" />
              ) : (
                <XrplExplorerLogo style={{ width: '40%' }} id="receiptLogo" />
              )}
              <br />
              <br />
              <div>{timestamp}</div>
            </div>
            <table>
              <tbody>
                <tr>
                  <th>{t('receipt.quantity')}</th>
                  <th>{t('receipt.items')}</th>
                  <th style={{ textAlign: 'right' }}>{t('receipt.price')}</th>
                </tr>
                <tr>
                  <td>1</td>
                  <td style={{ textAlign: 'left' }}>{serviceName}</td>
                  <td style={{ textAlign: 'right' }}>{fiatPrice}</td>
                </tr>
                <tr>
                  <td colSpan="2" className="bold uppercase" style={{ textAlign: 'left' }}>
                    {t('receipt.total')}
                  </td>
                  <td className="bold" style={{ textAlign: 'right' }}>
                    {fiatCurrency} {fiatPrice}
                  </td>
                </tr>
                <tr>
                  <td className="bold uppercase" style={{ textAlign: 'left' }}>
                    {t('receipt.paid')}
                  </td>
                  <td>
                    {nativeCurrency} {xrpPrice} ({rate} {fiatCurrency}/{nativeCurrency})
                  </td>
                  <td className="bold" style={{ textAlign: 'right' }}>
                    {fiatCurrency} {fiatPrice}
                  </td>
                </tr>
              </tbody>
            </table>
            <div className="receipt-order-id">
              <b className="uppercase">{t('receipt.order-id')}</b>
              <br />
              {txHash}
            </div>
          </div>
          <div className="receipt-bottom">
            Ledger Explorer Ltd.
            <br />
            Suite 9, Ansuya Estate,
            <br />
            Royal street, Victoria,
            <br />
            Mahe, Seychelles.
          </div>
        </div>
      </div>
      <p className="center">
        <input type="button" value={t('button.print')} className="button-action" onClick={onPrint} />
      </p>
    </>
  )
}

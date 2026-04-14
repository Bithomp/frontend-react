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
  const receiptConfig = {
    username: {
      serviceName: t('menu.services.username')
    },
    subscription: {
      serviceName: 'Bithomp Pro'
    }
  }

  const currentReceipt = receiptConfig[item]

  if (!currentReceipt) {
    return null
  }

  timestamp = details.completedAt
  const fiatPrice = details.priceInEUR?.toFixed(2)
  const xrpPrice = details.price?.toFixed(2)
  const serviceName = currentReceipt.serviceName
  const txHash = details.txHash
  const fiatCurrency = 'EUR'

  timestamp = fullDateAndTime(timestamp, null, { asText: true })
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

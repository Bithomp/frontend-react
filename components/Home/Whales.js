import { useState, useEffect } from 'react'
import { useTranslation } from 'next-i18next'
import axios from 'axios'

import { devNet, useWidth, avatarServer } from '../../utils'
import { addressUsernameOrServiceLink, amountFormat, shortNiceNumber, timeFormat, txIdLink } from '../../utils/format'
import Image from 'next/image'

export default function Whales({ currency, data, setData }) {
  const [oldData, setOldData] = useState(null)
  const [difference, setDifference] = useState(null)
  const { t } = useTranslation()
  const width = useWidth()

  const checkStatApi = async () => {
    //?currency=true&service=true
    const response = await axios('v2/transactions/whale?limit=6')
    const data = response.data
    if (data) {
      setData(data)
    }
  }

  useEffect(() => {
    if (oldData && data) {
      const change = data.filter(({ hash: id1 }) => !oldData.some(({ hash: id2 }) => id2 === id1))
      setDifference(change)
    }
    setOldData(data)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data])

  useEffect(() => {
    checkStatApi()
    return () => {
      setDifference(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /*
     {
      "hash":"59850C23F37E86A675F99C0DF29C3468C6F5BB53BDB7B9C73E6AB012DCE9D402",
      "timestamp":1663143343,
      "amount":"1000",
      "amountFiats":{
        "aed":"1240",
        "ars":"47980"
      },
      "counterparty":null,
      "currency": {
        "type": "hex",
        "currencyCode": "53616E6374756D00000000000000000000000000",
        "currency": "Sanctum"
      },
      "sourceAddress":"rPT1Sjq2YGrBMTttX4GZHjKu9dyfzbpAYe",
      "sourceAddressDetails": {
        "service": "Bitstamp",
        "username": "Bitstamp"
      }
      "destinationAddress":"rKb1QJ7dxZ3piULkWbpmTg8UK9eARKFLaY"
      "destinationAddressDetails": {
        "service": "Bitstamp",
        "username": "Bitstamp"
      }
     }
  */

  const styleAddress = { width: width > 800 ? 220 : width > 550 ? 160 : 'auto', display: 'inline-block' }

  return (
    <>
      {data?.length > 0 && (
        <>
          <h2 className="center landing-h2">{t('home.whales.header')}</h2>
          <div className="whale-transactions-block">
            {data.map((tx) => (
              <div key={tx.hash} className={'tx-row' + (difference?.includes(tx) ? ' just-added' : '')}>
                <span className="tx-time">{timeFormat(tx.timestamp)}</span>
                <span className="tx-addresses">
                  <span style={styleAddress}>
                    <Image
                      src={avatarServer + tx.sourceAddress}
                      alt={tx.sourceAddressDetails?.service || 'service logo'}
                      height={20}
                      width={20}
                      style={{ marginRight: '5px', marginBottom: '-5px' }}
                    />
                    {addressUsernameOrServiceLink(tx, 'sourceAddress', { short: width > 800 ? 9 : 5 })}
                  </span>{' '}
                  →{width < 550 ? <div style={{ height: '8px' }} /> : ' '}
                  <span style={styleAddress}>
                    <Image
                      src={avatarServer + tx.destinationAddress}
                      alt={tx.destinationAddressDetails?.service || 'service logo'}
                      height={20}
                      width={20}
                      style={{ marginRight: '5px', marginBottom: '-5px' }}
                    />
                    {addressUsernameOrServiceLink(tx, 'destinationAddress', { short: width > 800 ? 9 : 6 })}
                  </span>
                </span>
                <span className="tx-link">{txIdLink(tx.hash, 0)}</span>
                <span className="tx-amount">
                  {width >= 800 && amountFormat(tx.amount, { short: true, maxFractionDigits: 2 })}
                </span>
                <span className="tx-amount-fiat">
                  {width < 800 && (
                    <>
                      {amountFormat(tx.amount, { short: true, maxFractionDigits: 2 })}
                      <br />
                    </>
                  )}
                  {devNet
                    ? t('table.no-value')
                    : tx.amountFiats
                    ? shortNiceNumber(tx.amountFiats[currency?.toLowerCase()], 2, 1, currency)
                    : ''}
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </>
  )
}

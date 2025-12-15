import { TData } from '../Table'
import {
  AddressWithIconFilled,
  amountFormat,
  expirationExpired,
  nativeCurrencyToFiat,
  shortHash
} from '../../utils/format'

import { TransactionCard } from './TransactionCard'
import CopyButton from '../UI/CopyButton'
import { fullDateAndTime, timeFromNow } from '../../utils/format'
import { useTranslation } from 'next-i18next'
import { timestampExpired } from '../../utils'
import { addressBalanceChanges, dappBySourceTag } from '../../utils/transaction'

export const TransactionCheck = ({ data, pageFiatRate, selectedCurrency }) => {
  const { t, i18n } = useTranslation()

  if (!data) return null

  const { outcome, tx, specification } = data

  const checkChanges = outcome?.checkChanges

  //here we need to check destination balance changes, as executor can be source/destination or anyone when expired
  const destinationBalanceChangesList = addressBalanceChanges(data, checkChanges?.destination?.address)

  /*
  {
    "checkChanges": {
      "status": "deleted",
      "checkID": "5B98C64DDE7774A55D3DCD5806A27EB9197E725D2D9822F95343EDD4152D4FA4",
      "source": {
        "address": "rfnaakrqCzTPwthqtubCJ7m3iQ7Kcd7x3k"
      },
      "destination": {
        "address": "rnBKit9uv2L3pH8HQwPKpDJhhwACKct3ro",
        "tag": 1283813905
      },
      "sendMax": {
        "currency": "XRP",
        "value": "990"
      },
      "sequence": 92885957,
      "expiration": 1741074748
    },
    "ledgerIndex": 94986374,
    "indexInLedger": 56,
    "ledgerTimestamp": 1742817001
  }
  */

  //don't show sourcetag if it's the tag of a known dapp
  const dapp = dappBySourceTag(specification.source.tag)

  return (
    <TransactionCard data={data} pageFiatRate={pageFiatRate} selectedCurrency={selectedCurrency}>
      {checkChanges && (
        <>
          {checkChanges.source && (
            <tr>
              <TData>Source</TData>
              <TData>
                <AddressWithIconFilled data={checkChanges.source} name="address" />
              </TData>
            </tr>
          )}
          {checkChanges.source?.tag !== undefined && !dapp && (
            <tr>
              <TData>Source tag</TData>
              <TData className="bold">{checkChanges.source.tag}</TData>
            </tr>
          )}
          {checkChanges.destination && (
            <tr>
              <TData>Destination</TData>
              <TData>
                <AddressWithIconFilled data={checkChanges?.destination} name="address" />
              </TData>
            </tr>
          )}
          {checkChanges.destination?.tag !== undefined && (
            <tr>
              <TData>Destination tag</TData>
              <TData className="bold">{checkChanges.destination.tag}</TData>
            </tr>
          )}
          {tx?.InvoiceID && (
            <tr>
              <TData>Invoice ID</TData>
              <TData>
                {shortHash(tx.InvoiceID, 10)} <CopyButton text={tx.InvoiceID} />
              </TData>
            </tr>
          )}

          {checkChanges.checkID && (
            <tr>
              <TData>Check ID</TData>
              <TData>
                {shortHash(checkChanges.checkID, 10)} <CopyButton text={checkChanges.checkID} />
              </TData>
            </tr>
          )}

          {checkChanges.sendMax && (
            <tr>
              <TData>Max amount</TData>
              <TData>
                {amountFormat(checkChanges.sendMax, { withIssuer: true, color: 'orange', bold: true })}
                {nativeCurrencyToFiat({
                  amount: checkChanges.sendMax,
                  selectedCurrency,
                  fiatRate: pageFiatRate
                })}
              </TData>
            </tr>
          )}

          {checkChanges.expiration && (
            <tr>
              <TData className={timestampExpired(checkChanges.expiration) ? 'red' : ''}>
                {expirationExpired(t, checkChanges.expiration)}
              </TData>
              <TData>
                {timeFromNow(checkChanges.expiration, i18n)}
                {', '}
                {fullDateAndTime(checkChanges.expiration)}
              </TData>
            </tr>
          )}
        </>
      )}

      {tx.TransactionType === 'CheckCash' && destinationBalanceChangesList?.length > 0 && (
        <tr>
          <TData>
            Redeemed
            {destinationBalanceChangesList.map((change, index) => {
              return <br key={index} />
            })}
          </TData>
          <TData>
            {destinationBalanceChangesList.map((change, index) => (
              <div key={index}>
                {amountFormat(change, { withIssuer: true, bold: true, color: 'direction' })}
                {nativeCurrencyToFiat({
                  amount: change,
                  selectedCurrency,
                  fiatRate: pageFiatRate
                })}
              </div>
            ))}
          </TData>
        </tr>
      )}

      {/*Always show executor, as it can be destination/source or anyone when expired */}
      {tx?.TransactionType !== 'CheckCreate' && (
        <tr>
          <TData>Executor</TData>
          <TData>
            <AddressWithIconFilled data={specification.source} name="address" />
          </TData>
        </tr>
      )}
    </TransactionCard>
  )
}

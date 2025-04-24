import { TData } from '../Table'
import { TransactionCard } from './TransactionCard'
import {
  addressUsernameOrServiceLink,
  AddressWithIconFilled,
  amountFormat,
  capitalize,
  fullDateAndTime,
  nativeCurrencyToFiat,
  niceCurrency,
  timeFromNow
} from '../../utils/format'
import { addressBalanceChanges } from '../../utils/transaction'

export const TransactionOffer = ({ data, pageFiatRate, selectedCurrency }) => {
  if (!data) return null
  const { tx, specification, outcome } = data

  const sourceOrderbookChange = outcome?.orderbookChanges
    ?.filter((entry) => entry.address === specification.source.address)?.[0]
    ?.orderbookChanges.filter((entry) => entry.sequence === specification.orderSequence)?.[0]

  const takerGets = specification.takerGets || sourceOrderbookChange?.takerGets
  const takerPays = specification.takerPays || sourceOrderbookChange?.takerPays

  const direction = (specification.flags ? specification.flags.sell : sourceOrderbookChange?.direction) ? 'Sell' : 'Buy'
  const passive = specification?.flags?.passive || sourceOrderbookChange?.flags?.passive
  const status = sourceOrderbookChange?.status

  const offerCreate = tx?.TransactionType === 'OfferCreate'

  const txTypeSpecial = tx?.TransactionType + ' - ' + direction + ' Order'

  //for payments executor is always the sender, so we can check executor's balance changes.
  const sourceBalanceChangesList = addressBalanceChanges(data, specification.source.address)

  return (
    <TransactionCard
      data={data}
      pageFiatRate={pageFiatRate}
      selectedCurrency={selectedCurrency}
      txTypeSpecial={txTypeSpecial}
    >
      <tr>
        <TData>Offer Maker</TData>
        <TData>
          <AddressWithIconFilled data={specification.source} name="address" />
        </TData>
      </tr>

      {tx.TransactionType === 'OfferCreate' && (
        <tr>
          <TData>Offer sequence</TData>
          <TData>#{tx.Sequence || tx.TicketSequence}</TData>
        </tr>
      )}

      {takerGets && (
        <tr>
          <TData tooltip="The amount and type of currency being sold.">Taker Gets</TData>
          <TData className="bold">
            {amountFormat(takerGets, { precise: true })}
            {takerGets?.issuer && <>({addressUsernameOrServiceLink(takerGets, 'issuer', { short: true })})</>}
          </TData>
        </tr>
      )}
      {takerPays && (
        <tr>
          <TData tooltip="The amount and type of currency being bought.">Taker Pays</TData>
          <TData className="bold">
            {amountFormat(takerPays, { precise: true })}
            {takerPays?.issuer && <>({addressUsernameOrServiceLink(takerPays, 'issuer', { short: true })})</>}
          </TData>
        </tr>
      )}

      {offerCreate && (
        <>
          {direction === 'Sell' ? (
            <tr>
              <TData>Sell order</TData>
              <TData>
                The priority is to fully Sell {amountFormat(takerGets, { precise: true, noSpace: true })}, even if doing
                so results in receiving more than {amountFormat(takerPays, { precise: true, noSpace: true })}.
              </TData>
            </tr>
          ) : (
            <tr>
              <TData>Buy order</TData>
              <TData>
                The priority is to Buy only the {amountFormat(takerPays, { precise: true, noSpace: true })}, not need to
                spend {amountFormat(takerGets, { precise: true, noSpace: true })} fully.
              </TData>
            </tr>
          )}
        </>
      )}

      {tx?.OfferSequence && (
        <tr>
          <TData
            tooltip={
              offerCreate &&
              'The sequence (or ticket) number of a previous OfferCreate transaction. It is instructed to Cancel any offer object in the ledger that was created by that transaction. It is not considered an error if the offer specified does not exist.'
            }
          >
            {offerCreate ? 'Offer to Cancel' : 'Offer sequence'}
          </TData>
          <TData>#{tx.OfferSequence}</TData>
        </tr>
      )}

      {status && (
        <tr>
          <TData>Offer status</TData>
          <TData className={status === 'cancelled' ? 'red bold' : ''}>{capitalize(status)}</TData>
        </tr>
      )}

      {sourceBalanceChangesList.length === 2 && (
        <>
          <tr>
            <TData>
              Exchanged
              <br />
            </TData>
            <TData>
              {sourceBalanceChangesList.map((change, index) => (
                <div key={index}>
                  <span className={'bold ' + (Number(change?.value) > 0 ? 'green' : 'red')}>
                    {Number(change?.value) > 0 && '+'}
                    {amountFormat(change, { precise: 'nice' })}
                  </span>
                  {change?.issuer && <>({addressUsernameOrServiceLink(change, 'issuer', { short: true })})</>}
                  {nativeCurrencyToFiat({
                    amount: change,
                    selectedCurrency,
                    fiatRate: pageFiatRate
                  })}
                </div>
              ))}
            </TData>
          </tr>
          <tr>
            <TData>Rate</TData>
            <TData>
              1 {niceCurrency(sourceBalanceChangesList[0].currency)} ={' '}
              <span className="bold">
                {amountFormat(
                  {
                    ...sourceBalanceChangesList[1],
                    value: Math.abs(sourceBalanceChangesList[1].value / sourceBalanceChangesList[0].value)
                  },
                  { precise: 'nice' }
                )}
              </span>
              <br />1 {niceCurrency(sourceBalanceChangesList[1].currency)} ={' '}
              <span className="bold">
                {amountFormat(
                  {
                    ...sourceBalanceChangesList[0],
                    value: Math.abs(sourceBalanceChangesList[0].value / sourceBalanceChangesList[1].value)
                  },
                  { precise: 'nice' }
                )}
              </span>
            </TData>
          </tr>
        </>
      )}

      {tx?.Expiration && (
        <tr>
          <TData tooltip="Time after which the Offer is no longer active.">Expiration</TData>
          <TData>
            {timeFromNow(tx.Expiration, i18n, 'ripple')} ({fullDateAndTime(tx.Expiration, 'ripple')})
          </TData>
        </tr>
      )}

      {passive && (
        <tr>
          <TData>Passive</TData>
          <TData>
            This Offer does not consume Offers that exactly match it, and instead becomes an Offer object in the ledger.
            It still consumes Offers that cross it.
          </TData>
        </tr>
      )}

      {specification?.flags?.immediateOrCancel && (
        <tr>
          <TData>Immediate or Cancel</TData>
          <TData>
            This offer is an Immediate or Cancel order, meaning it will execute only against existing matching offers in
            the ledger at the time of submission. It does not create a standing offer. Any portion of the offer that
            cannot be immediately filled is canceled. If no matches are found, the offer does nothing but still
            completes successfully.
          </TData>
        </tr>
      )}

      {specification?.flags?.fillOrKill && (
        <tr>
          <TData>Fill or Kill</TData>
          <TData>
            This offer is a Fill or Kill order, meaning it will only execute if it can be fully filled immediately. It
            does not create a standing offer in the ledger. If the full amount cannot be exchanged at the time of
            submission, the offer is automatically canceled.
            <br />
            <span className="bold">
              {direction === 'Sell'
                ? 'The owner must be able to spend the entire ' +
                  amountFormat(takerGets, { precise: true, noSpace: true }) +
                  '.'
                : 'The owner must receive ' + amountFormat(takerPays, { precise: true, noSpace: true }) + '.'}
            </span>
          </TData>
        </tr>
      )}
    </TransactionCard>
  )
}

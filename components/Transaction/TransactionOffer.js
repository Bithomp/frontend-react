import { TData } from '../Table'
import { TransactionCard } from './TransactionCard'
import {
  addressUsernameOrServiceLink,
  AddressWithIconFilled,
  amountFormat,
  fullDateAndTime,
  timeFromNow
} from '../../utils/format'

export const TransactionOffer = ({ data, pageFiatRate, selectedCurrency }) => {
  if (!data) return null
  const { tx, specification, outcome } = data

  //most likely the orderbookChanges format will be changed...
  const takerGets = specification.quantity || outcome?.orderbookChanges?.[specification.source.address]?.[0]?.quantity
  const takerPays =
    specification.totalPrice || outcome?.orderbookChanges?.[specification.source.address]?.[0]?.totalPrice

  return (
    <TransactionCard data={data} pageFiatRate={pageFiatRate} selectedCurrency={selectedCurrency}>
      <tr>
        <TData>Offer Maker</TData>
        <TData>
          <AddressWithIconFilled data={specification.source} name="address" />
        </TData>
      </tr>
      {takerGets && (
        <tr>
          <TData tooltip="The amount and type of currency being sold.">Taker Gets</TData>
          <TData className="bold">
            {amountFormat(takerGets, { presice: true })}
            {takerGets?.issuer && <>({addressUsernameOrServiceLink(takerGets, 'issuer', { short: true })})</>}
          </TData>
        </tr>
      )}
      {takerPays && (
        <tr>
          <TData tooltip="The amount and type of currency being bought.">Taker Pays</TData>
          <TData className="bold">
            {amountFormat(takerPays, { presice: true })}
            {takerPays?.issuer && <>({addressUsernameOrServiceLink(takerPays, 'issuer', { short: true })})</>}
          </TData>
        </tr>
      )}

      {tx?.Expiration && (
        <tr>
          <TData tooltip="Time after which the Offer is no longer active.">Expiration</TData>
          <TData>
            {timeFromNow(tx.Expiration, i18n, 'ripple')} ({fullDateAndTime(tx.Expiration, 'ripple')})
          </TData>
        </tr>
      )}

      {tx?.OfferSequence && (
        <tr>
          <TData tooltip="An Offer to delete first.">Delete Offer</TData>
          <TData>#{tx.OfferSequence}</TData>
        </tr>
      )}

      {specification.direction === 'sell' && (
        <tr>
          <TData>Sell order</TData>
          <TData>
            This offer is a Sell order, meaning it is designed to exchange all of the{' '}
            {amountFormat(tx.TakerGets, { presice: true, noSpace: true })}, even if doing so results in receiving more
            than {amountFormat(specification.totalPrice, { presice: true, noSpace: true })}. The priority is to fully
            sell the offered amount, not to limit the return.
          </TData>
        </tr>
      )}

      {specification?.passive && (
        <tr>
          <TData>Passive</TData>
          <TData>
            This Offer does not consume Offers that exactly match it, and instead becomes an Offer object in the ledger.
            It still consumes Offers that cross it.
          </TData>
        </tr>
      )}

      {specification?.immediateOrCancel && (
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

      {specification?.fillOrKill && (
        <tr>
          <TData>Fill or Kill</TData>
          <TData>
            This offer is a Fill or Kill order, meaning it will only execute if it can be fully filled immediately. It
            does not create a standing offer in the ledger. If the full amount cannot be exchanged at the time of
            submission, the offer is automatically canceled.
            <br />
            <span className="bold">
              {specification.direction === 'sell'
                ? 'The owner must be able to spend the entire ' +
                  amountFormat(specification.quantity, { presice: true, noSpace: true }) +
                  '.'
                : 'The owner must receive ' +
                  amountFormat(specification.totalPrice, { presice: true, noSpace: true }) +
                  '.'}
            </span>
          </TData>
        </tr>
      )}
    </TransactionCard>
  )
}

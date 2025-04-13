import { TData } from '../Table'
import { TransactionCard } from './TransactionCard'
import { addressUsernameOrServiceLink, AddressWithIconFilled, amountFormat, capitalize } from '../../utils/format'

export const TransactionOrder = ({ data, pageFiatRate, selectedCurrency }) => {
  if (!data) return null
  const { tx, specification } = data

  const txTypeSpecial = tx.TransactionType + ' - ' + capitalize(specification.direction) + ' order'

  return (
    <TransactionCard
      data={data}
      pageFiatRate={pageFiatRate}
      selectedCurrency={selectedCurrency}
      txTypeSpecial={txTypeSpecial}
    >
      <tr>
        <TData>Initiated by</TData>
        <TData>
          <AddressWithIconFilled data={specification.source} name="address" />
        </TData>
      </tr>
      <tr>
        <TData>Quantity</TData>
        <TData className="bold">
          {amountFormat({
            value: specification.quantity.value,
            currency: specification.quantity.currency,
            issuer: specification?.quantity?.issuer
          })}
          {specification?.quantity?.issuer && (
            <>({addressUsernameOrServiceLink(specification.quantity, 'issuer', { short: true })})</>
          )}
        </TData>
      </tr>
      <tr>
        <TData>Total Price</TData>
        <TData className="bold">
          {amountFormat({
            value: specification.totalPrice.value,
            currency: specification.totalPrice.currency,
            issuer: specification?.totalPrice?.issuer
          })}
          {specification?.totalPrice?.issuer && (
            <>({addressUsernameOrServiceLink(specification.totalPrice, 'issuer', { short: true })})</>
          )}
        </TData>
      </tr>
    </TransactionCard>
  )
}

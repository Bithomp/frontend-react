import { nativeCurrency } from '../../../utils'
import { amountFormat } from '../../../utils/format'
import { TData } from '../../Table'

export default function PaymentInstructions({ data, sourceBalanceChanges }) {
  const { outcome, specification, tx } = data
  if (
    specification?.allowPartialPayment ||
    specification?.noDirectRipple ||
    specification?.limitQuality ||
    (specification?.source?.maxAmount &&
      Math.abs(specification?.source?.maxAmount?.value) !== Math.abs(sourceBalanceChanges[0]?.value)) ||
    (specification?.destination?.minAmount &&
      specification?.destination?.minAmount?.value !== outcome?.deliveredAmount?.value)
  ) {
    return (
      <>
        {specification.source?.maxAmount && (
          <tr>
            <TData className="bold">Max amount</TData>
            <TData>
              It was instructed to spend up to{' '}
              <span className="bold">{amountFormat(specification.source.maxAmount, { precise: 'nice' })}</span>
            </TData>
          </tr>
        )}
        {specification.destination?.minAmount && (
          <tr>
            <TData className="bold">Min amount</TData>
            <TData>
              It was instructed to deliver at least{' '}
              <span className="bold">{amountFormat(specification.destination.minAmount, { precise: 'nice' })}</span>
            </TData>
          </tr>
        )}
        {specification.allowPartialPayment && (
          <tr>
            <TData className="bold orange">Allow partial payment</TData>
            <TData>
              It was instructed for this payment to go through even if the whole amount cannot be delivered because of a
              lack of liquidity or funds in the source account.
            </TData>
          </tr>
        )}
        {specification.noDirectRipple && (
          <tr>
            <TData className="bold">No direct ripple</TData>
            <TData>
              It was instructed to disregard any direct paths from the source account to the destination account.
            </TData>
          </tr>
        )}
        {specification.limitQuality && (
          <tr>
            <TData className="bold">Limit quality</TData>
            <TData>
              It was instructed to only take paths where all the conversions have rate that is equal or better than 1{' '}
              {specification.source.maxAmount.currency} ={' '}
              <span className="bold">
                {amountFormat(
                  {
                    currency: tx.Amount?.currency || nativeCurrency,
                    issuer: tx.Amount?.issuer,
                    value: Math.abs(
                      (tx.Amount?.value ? tx.Amount?.value : tx.Amount / 1000000) / specification.source.maxAmount.value
                    )
                  },
                  { precise: 'nice', noSpace: true }
                )}
              </span>
              .
            </TData>
          </tr>
        )}
      </>
    )
  }

  return ''
}

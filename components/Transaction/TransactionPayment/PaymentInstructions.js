import { amountFormat } from '../../../utils/format'
import { TRow, TData } from '../../TableDetails'

export default function PaymentInstructions({ data, sourceBalanceChanges }) {
  const { outcome, specification, tx } = data
  if (
    specification?.allowPartialPayment ||
    specification?.noDirectRipple ||
    specification?.limitQuality ||
    (specification?.source?.maxAmount &&
      specification?.source?.maxAmount?.value !== '-' + sourceBalanceChanges[0]?.value.toString()) ||
    (specification?.destination?.minAmount &&
      specification?.destination?.minAmount?.value !== outcome?.deliveredAmount?.value)
  ) {
    return (
      <>
        {specification.source?.maxAmount && (
          <TRow>
            <TData className="bold">Max amount</TData>
            <TData>
              It was instructed to spend up to{' '}
              <span className="bold">{amountFormat(specification.source.maxAmount, { precise: 'nice' })}</span>
            </TData>
          </TRow>
        )}
        {specification.destination?.minAmount && (
          <TRow>
            <TData className="bold">Min amount</TData>
            <TData>
              It was instructed to deliver at least{' '}
              <span className="bold">{amountFormat(specification.destination.minAmount, { precise: 'nice' })}</span>
            </TData>
          </TRow>
        )}
        {specification.allowPartialPayment && (
          <TRow>
            <TData className="bold orange">Allow partial payment</TData>
            <TData>
              It was instructed for this payment to go through even if the whole amount cannot be delivered because of a
              lack of liquidity or funds in the source account.
            </TData>
          </TRow>
        )}
        {specification.noDirectRipple && (
          <TRow>
            <TData className="bold">No direct ripple</TData>
            <TData>
              It was instructed to disregard any direct paths from the source account to the destination account.
            </TData>
          </TRow>
        )}
        {specification.limitQuality && (
          <TRow>
            <TData className="bold">Limit quality</TData>
            <TData>
              It was instructed to only take paths where all the conversions have an input / output ratio that is equal
              or better than the ratio of{' '}
              <span className="bold">
                {amountFormat(tx.Amount, { precise: 'nice' })} /{' '}
                {amountFormat(specification.source.maxAmount, { precise: 'nice' })}
              </span>
              .
            </TData>
          </TRow>
        )}
      </>
    )
  }

  return ''
}

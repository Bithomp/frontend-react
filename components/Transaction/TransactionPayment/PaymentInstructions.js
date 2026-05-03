import { nativeCurrency } from '../../../utils'
import { amountFormat } from '../../../utils/format'
import { TData } from '../TData'
import { useTranslation } from 'next-i18next'

export default function PaymentInstructions({ data, sourceBalanceChanges }) {
  const { t: txT } = useTranslation('transaction')
  const { outcome, specification, tx } = data
  if (
    specification?.allowPartialPayment ||
    specification?.noDirectRipple ||
    specification?.limitQuality ||
    (specification?.source?.maxAmount &&
      Math.abs(specification?.source?.maxAmount?.value) !== Math.abs(sourceBalanceChanges?.[0]?.value)) ||
    (specification?.destination?.minAmount &&
      specification?.destination?.minAmount?.value !== outcome?.deliveredAmount?.value)
  ) {
    return (
      <>
        {specification.source?.maxAmount && (
          <tr>
            <TData className="bold">Max amount</TData>
            <TData>
              {txT('labels.It was instructed to spend up to {{amount}}.', {
                amount: amountFormat(specification.source.maxAmount, { precise: 'nice' })
              })}
            </TData>
          </tr>
        )}
        {specification.destination?.minAmount && (
          <tr>
            <TData className="bold">Min amount</TData>
            <TData>
              {txT('labels.It was instructed to deliver at least {{amount}}.', {
                amount: amountFormat(specification.destination.minAmount, { precise: 'nice' })
              })}
            </TData>
          </tr>
        )}
        {specification.allowPartialPayment && (
          <tr>
            <TData className="bold orange">Allow partial payment</TData>
            <TData>
              {txT(
                'labels.It was instructed for this payment to go through even if the whole amount cannot be delivered because of a lack of liquidity or funds in the source account.'
              )}
            </TData>
          </tr>
        )}
        {specification.noDirectRipple && (
          <tr>
            <TData className="bold">No direct ripple</TData>
            <TData>
              {txT(
                'labels.It was instructed to disregard any direct paths from the source account to the destination account.'
              )}
            </TData>
          </tr>
        )}
        {specification.limitQuality && (
          <tr>
            <TData className="bold">Limit quality</TData>
            <TData>
              {txT(
                'labels.It was instructed to only take paths where all the conversions have rate that is equal or better than 1 {{sourceCurrency}} = {{amount}}.',
                {
                  sourceCurrency: specification.source.maxAmount.currency,
                  amount: amountFormat(
                    {
                      currency: tx.Amount?.currency || nativeCurrency,
                      issuer: tx.Amount?.issuer,
                      value: Math.abs(
                        (tx.Amount?.value ? tx.Amount?.value : tx.Amount / 1000000) /
                          specification.source.maxAmount.value
                      )
                    },
                    { precise: 'nice', noSpace: true }
                  )
                }
              )}
            </TData>
          </tr>
        )}
      </>
    )
  }

  return ''
}

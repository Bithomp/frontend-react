import { TransactionRowCard } from './TransactionRowCard'
import { amountFormat, nativeCurrencyToFiat } from '../../../utils/format'
import { addressBalanceChanges, isConvertionTx } from '../../../utils/transaction'
import { useTxFiatRate } from './FiatRateContext'
import { FaArrowRightArrowLeft } from 'react-icons/fa6'
import { isIOUpayment, optionalAbsPaymentAmount, paymentTypeName } from '../../../utils/transaction/payment'

export const TransactionRowPayment = ({ data, address, index, selectedCurrency }) => {
  const { outcome, specification } = data

  let txTypeSpecial = paymentTypeName(data)
  const isConvertion = isConvertionTx(specification)
  const pageFiatRate = useTxFiatRate()
  //for payments executor is always the sender, so we can check executor's balance changes.
  const sourceBalanceChangesList = addressBalanceChanges(data, specification.source.address)
  const iouPayment = isIOUpayment(data)

  if (!isConvertion) {
    txTypeSpecial = (
      <>
        <span className="bold">{txTypeSpecial} </span>
        {specification?.destination?.address === address
          ? 'from'
          : specification?.source?.address === address
          ? 'to'
          : 'by'}
      </>
    )
  }

  return (
    <TransactionRowCard
      data={data}
      address={address}
      index={index}
      selectedCurrency={selectedCurrency}
      txTypeSpecial={txTypeSpecial}
    >
      <>
        {(isConvertion || iouPayment) && sourceBalanceChangesList?.length > 0 && (
          <>
            <div>
              {isConvertion ? (
                <>
                  {' '}
                  <FaArrowRightArrowLeft style={{ fontSize: 16, marginBottom: -4 }} /> Exchanged:{' '}
                </>
              ) : (
                <>Spent: </>
              )}
              {sourceBalanceChangesList.length > 1 && <br />}
              {sourceBalanceChangesList.map((change, index) => (
                <span key={index}>
                  {amountFormat(optionalAbsPaymentAmount(change, isConvertion), {
                    icon: true,
                    withIssuer: true,
                    bold: true,
                    color: 'direction',
                    precise: true
                  })}
                  {nativeCurrencyToFiat({
                    amount: optionalAbsPaymentAmount(change, isConvertion),
                    selectedCurrency,
                    fiatRate: pageFiatRate
                  })}
                </span>
              ))}
            </div>
            {sourceBalanceChangesList.length === 2 && (
              <div>
                <span>Exchange rate: </span>
                <span>
                  {amountFormat(
                    {
                      currency: sourceBalanceChangesList[0].currency,
                      issuer: sourceBalanceChangesList[0].issuer,
                      value: 1
                    },
                    { icon: true }
                  )}{' '}
                  ={' '}
                  {amountFormat(
                    {
                      ...sourceBalanceChangesList[1],
                      value: Math.abs(sourceBalanceChangesList[1].value / sourceBalanceChangesList[0].value)
                    },
                    { icon: true, withIssuer: true, bold: true }
                  )}
                </span>
              </div>
            )}
          </>
        )}
        {!isConvertion && outcome?.deliveredAmount && (
          <div>
            Delivered:{' '}
            {amountFormat(outcome?.deliveredAmount, {
              icon: true,
              withIssuer: true,
              bold: true,
              color: 'green',
              precise: true
            })}
            {nativeCurrencyToFiat({
              amount: outcome?.deliveredAmount,
              selectedCurrency,
              fiatRate: pageFiatRate
            })}
          </div>
        )}
      </>
    </TransactionRowCard>
  )
}

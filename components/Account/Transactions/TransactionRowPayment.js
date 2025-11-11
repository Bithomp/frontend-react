import { TransactionRowCard } from './TransactionRowCard'
import { amountFormat, nativeCurrencyToFiat } from '../../../utils/format'
import { addressBalanceChanges, dappBySourceTag, isConvertionTx } from '../../../utils/transaction'
import { useTxFiatRate } from './FiatRateContext'
import { FaArrowRightArrowLeft } from 'react-icons/fa6'
import { isIOUpayment, optionalAbsPaymentAmount, paymentTypeName } from '../../../utils/transaction/payment'

export const TransactionRowPayment = ({ data, address, index, selectedCurrency }) => {
  const { outcome, specification } = data

  const txTypeSpecial = paymentTypeName(data)
  const isConvertion = isConvertionTx(specification)
  const pageFiatRate = useTxFiatRate()
  //for payments executor is always the sender, so we can check executor's balance changes.
  const sourceBalanceChangesList = addressBalanceChanges(data, specification.source.address)
  const iouPayment = isIOUpayment(data)
  //don't show sourcetag if it's the tag of a known dapp
  const dapp = dappBySourceTag(specification.source.tag)

  return (
    <TransactionRowCard
      data={data}
      address={address}
      index={index}
      selectedCurrency={selectedCurrency}
      txTypeSpecial={txTypeSpecial}
    >
      <>
        {specification.source?.tag !== undefined && !dapp && (
          <>
            <span>Source tag: </span>
            <span className="bold">{specification.source.tag}</span>
          </>
        )}

        {(isConvertion || iouPayment) && sourceBalanceChangesList?.length > 0 && (
          <>
            <div>
              {isConvertion ? (
                <>
                  {' '}
                  <FaArrowRightArrowLeft style={{ fontSize: 16, marginBottom: -4 }} /> Exchanged:{' '}
                </>
              ) : (
                <> Sender spent: </>
              )}
              <br />
              <span>
                {sourceBalanceChangesList.map((change, index) => (
                  <div key={index}>
                    {amountFormat(optionalAbsPaymentAmount(change, isConvertion), {
                      icon: true,
                      withIssuer: true,
                      bold: true,
                      color: 'direction'
                    })}
                    {nativeCurrencyToFiat({
                      amount: optionalAbsPaymentAmount(change, isConvertion),
                      selectedCurrency,
                      fiatRate: pageFiatRate
                    })}
                  </div>
                ))}
              </span>
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
            <span>Delivered amount: </span>
            {amountFormat(outcome?.deliveredAmount, { icon: true, withIssuer: true, bold: true, color: 'green' })}
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

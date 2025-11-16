import { TransactionRowCard } from './TransactionRowCard'
import { AddressWithIconInline, amountFormat, nativeCurrencyToFiat } from '../../../utils/format'
import { addressBalanceChanges, isConvertionTx } from '../../../utils/transaction'
import { FaArrowRightArrowLeft } from 'react-icons/fa6'
import { isIOUpayment, optionalAbsPaymentAmount, paymentTypeName } from '../../../utils/transaction/payment'

export const TransactionRowPayment = ({ data, address, index, selectedCurrency }) => {
  const { outcome, specification, tx } = data

  let txTypeSpecial = paymentTypeName(data)
  const isConvertion = isConvertionTx(specification)
  const sourceBalanceChangesList = addressBalanceChanges(data, address)
  const iouPayment = isIOUpayment(data)

  if (!isConvertion) {
    txTypeSpecial = (
      <>
        <span className="bold">{txTypeSpecial} </span>
        {tx?.Destination === address ? 'from' : tx?.Account === address ? 'to' : 'by'}
        <br />
        <AddressWithIconInline
          data={
            tx?.Account === address && specification?.destination ? specification?.destination : specification?.source
          }
          options={{ short: 5 }}
        />
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
      {(fiatRate) => (
        <>
          {!isConvertion && outcome?.deliveredAmount && (
            <div>
              {specification?.source?.address === address ? 'Sent' : 'Received'}:{' '}
              {amountFormat(outcome?.deliveredAmount, {
                icon: true,
                withIssuer: true,
                bold: true,
                precise: true,
                issuerShort: false
              })}
              {nativeCurrencyToFiat({
                amount: outcome?.deliveredAmount,
                selectedCurrency,
                fiatRate
              })}
            </div>
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
                  <>Sender spent: </>
                )}
                {sourceBalanceChangesList.length > 1 && <br />}
                {sourceBalanceChangesList.map((change, index) => (
                  <span key={index}>
                    {amountFormat(optionalAbsPaymentAmount(change, isConvertion), {
                      icon: true,
                      withIssuer: true,
                      bold: true,
                      color: 'direction',
                      precise: true,
                      issuerShort: false
                    })}
                    {nativeCurrencyToFiat({
                      amount: optionalAbsPaymentAmount(change, isConvertion),
                      selectedCurrency,
                      fiatRate
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
        </>
      )}
    </TransactionRowCard>
  )
}

import { TransactionRowCard } from './TransactionRowCard'
import { AddressWithIconInline, amountFormat, nativeCurrencyToFiat } from '../../../utils/format'
import { addressBalanceChanges, isConvertionTx } from '../../../utils/transaction'
import {
  isIOUpayment,
  isRipplingOnIssuer,
  optionalAbsPaymentAmount,
  paymentTypeName
} from '../../../utils/transaction/payment'
import { useIsMobile } from '../../../utils/mobile'
import { add } from '../../../utils/calc'

export const TransactionRowPayment = ({ data, address, index, selectedCurrency }) => {
  const { outcome, specification, tx } = data

  let txTypeSpecial = paymentTypeName(data)
  const isConvertion = isConvertionTx(specification)
  const sourceBalanceChangesList = addressBalanceChanges(data, address)
  const iouPayment = isIOUpayment(data)

  const isMobile = useIsMobile(600)

  const rippling = isRipplingOnIssuer(sourceBalanceChangesList, address)

  let gatewayAmountChange = null
  if (rippling) {
    txTypeSpecial = <span className="bold">Rippling through payment</span>
    gatewayAmountChange = sourceBalanceChangesList.reduce((sum, item) => {
      return add(sum, Number(item.value || 0))
    }, 0)
  } else {
    if (!isConvertion) {
      txTypeSpecial = (
        <>
          <span className="bold">{txTypeSpecial} </span>
          {tx?.Destination === address ? 'from' : tx?.Account === address ? 'to' : 'by'}
          {isMobile ? ' ' : <br />}
          <AddressWithIconInline
            data={
              tx?.Account === address && specification?.destination ? specification?.destination : specification?.source
            }
            options={{ short: 5 }}
          />
        </>
      )
    } else {
      txTypeSpecial = <span className="bold">{txTypeSpecial}</span>
    }
  }

  const balancesTitle = isConvertion ? 'Exchanged' : 'Sender spent'

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
          {rippling ? (
            <div>
              Affected accounts:
              <br />
              {sourceBalanceChangesList.map((change, index) => {
                const formattedChange = {
                  ...change,
                  issuer: change.counterparty,
                  issuerDetails: change.counterpartyDetails
                }
                return (
                  <div key={index}>
                    {amountFormat(formattedChange, {
                      icon: true,
                      withIssuer: true,
                      bold: true,
                      color: 'direction',
                      precise: 'nice',
                      issuerShort: false
                    })}
                  </div>
                )
              })}
              {gatewayAmountChange !== null && (
                <div>
                  <span>Total gateway change: </span>
                  <span>
                    {amountFormat(
                      { ...sourceBalanceChangesList[0], value: gatewayAmountChange },
                      {
                        icon: true,
                        bold: true,
                        color: 'direction',
                        precise: 'nice'
                      }
                    )}
                  </span>
                </div>
              )}
            </div>
          ) : (
            <>
              {!isConvertion && outcome?.deliveredAmount && (
                <div>
                  {specification?.source?.address === address ? 'Sent' : 'Received'}:{' '}
                  {amountFormat(outcome?.deliveredAmount, {
                    icon: true,
                    withIssuer: true,
                    bold: true,
                    precise: 'nice',
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
                    {balancesTitle}: {sourceBalanceChangesList.length > 1 && <br />}
                    {sourceBalanceChangesList.map((change, index) => {
                      return (
                        <div key={index}>
                          {amountFormat(optionalAbsPaymentAmount(change, isConvertion), {
                            icon: true,
                            withIssuer: true,
                            bold: true,
                            color: 'direction',
                            precise: 'nice',
                            issuerShort: false
                          })}
                          {nativeCurrencyToFiat({
                            amount: optionalAbsPaymentAmount(change, isConvertion),
                            selectedCurrency,
                            fiatRate
                          })}
                        </div>
                      )
                    })}
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
        </>
      )}
    </TransactionRowCard>
  )
}

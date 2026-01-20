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
import { RipplingChanges } from './Elements/RipplingChanges'
import { MdCompareArrows, MdArrowDownward, MdArrowUpward, MdSwapVert } from 'react-icons/md'

export const TransactionRowPayment = ({ data, address, index, selectedCurrency }) => {
  const { outcome, specification, tx, fiatRates } = data
  const fiatRate = fiatRates?.[selectedCurrency]

  let txTypeSpecial = paymentTypeName(data)
  const isConvertion = isConvertionTx(specification)
  const sourceBalanceChangesList = addressBalanceChanges(data, address)
  const iouPayment = isIOUpayment(data)

  const isMobile = useIsMobile(600)

  const rippling = isRipplingOnIssuer(sourceBalanceChangesList, address)

  if (rippling) {
    txTypeSpecial = <span className="bold">Rippling through payment</span>
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

  // Icon logic for payment (direct icons only)
  let icon = null
  if (rippling) {
    icon = <MdCompareArrows style={{ color: '#9b59b6', transform: 'rotate(90deg)', fontSize: 20 }} title="Rippling" />
  } else if (sourceBalanceChangesList?.length === 2) {
    icon = <MdSwapVert style={{ color: '#2980ef', fontSize: 20 }} title="Exchange" />
  } else if (tx?.TransactionType === 'Payment') {
    const direction = tx?.Account === address ? 'sent' : 'received'
    icon =
      direction === 'sent' ? (
        <MdArrowDownward style={{ color: '#e74c3c', fontSize: 20 }} title="Sent payment" />
      ) : (
        <MdArrowUpward style={{ color: '#27ae60', fontSize: 20 }} title="Received payment" />
      )
  }

  const balancesTitle = isConvertion ? 'Exchanged' : 'Sender spent'

  return (
    <TransactionRowCard
      data={data}
      address={address}
      index={index}
      selectedCurrency={selectedCurrency}
      txTypeSpecial={txTypeSpecial}
      icon={icon}
    >
      {rippling ? (
        <RipplingChanges balanceChanges={sourceBalanceChangesList} />
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
    </TransactionRowCard>
  )
}

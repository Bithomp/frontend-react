import { TransactionRowCard } from './TransactionRowCard'
import {
  addressUsernameOrServiceLink,
  AddressWithIconFilled,
  amountFormat,
  nativeCurrencyToFiat
} from '../../../utils/format'
import { addressBalanceChanges, dappBySourceTag } from '../../../utils/transaction'
import { useTxFiatRate } from './FiatRateContext'
import { FaArrowRightArrowLeft } from 'react-icons/fa6'
import {
  isConvertionPayment,
  isIOUpayment,
  optionalAbsPaymentAmount,
  paymentTypeName
} from '../../../utils/transaction/payment'

export const TransactionRowPayment = ({ data, address, index, selectedCurrency }) => {
  const { outcome, specification } = data

  const txTypeSpecial = paymentTypeName(data)
  const isConvertion = isConvertionPayment(specification)
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
        {!isConvertion && (
          <>
            {specification?.destination?.address === address ? (
              <>
                from
                <br />
                <AddressWithIconFilled data={specification.source} name="address" />
              </>
            ) : specification?.source?.address === address ? (
              <>
                to
                <br />
                <AddressWithIconFilled data={specification.destination} name="address" />
              </>
            ) : (
              <>Payment By {addressUsernameOrServiceLink(specification.source, 'address')}</>
            )}
          </>
        )}
        {specification.source?.tag !== undefined && !dapp && (
          <>
            <span>Source tag: </span>
            <span className="bold">{specification.source.tag}</span>
          </>
        )}

        {(isConvertion || iouPayment) && sourceBalanceChangesList?.length > 0 && (
          <>
            <div className="flex items-center gap-1">
              <span>
                {isConvertion ? (
                  <>
                    {' '}
                    <FaArrowRightArrowLeft style={{ fontSize: 16, marginBottom: -4 }} /> Exchanged:{' '}
                  </>
                ) : (
                  <> Sender spent: </>
                )}
                {sourceBalanceChangesList.map((change, index) => {
                  return <br key={index} />
                })}
              </span>
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
              <div className="flex items-center gap-1">
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

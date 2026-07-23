import { TransactionRowCard } from './TransactionRowCard'
import { AddressWithIconInline, AmountWithIcon, amountFormat, tokenToFiat } from '../../../utils/format'
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
import { isXls14NftAmount, nativeCurrency } from '../../../utils'
import { useTranslation } from 'next-i18next'

export const TransactionRowPayment = ({ data, address, index, selectedCurrency }) => {
  const { t } = useTranslation('transaction')
  const { t: accountT } = useTranslation('account')
  const { outcome, specification, tx, fiatRates } = data
  const fiatRate = fiatRates?.[selectedCurrency]

  let txTypeSpecial = paymentTypeName(data)
  const isConvertion = isConvertionTx(specification)
  const sourceBalanceChangesList = addressBalanceChanges(data, address)
  const iouPayment = isIOUpayment(data)
  const isInsufFee = outcome?.result === 'tecINSUFF_FEE'
  const showExchangeRate = !sourceBalanceChangesList?.some(isXls14NftAmount)
  const fallbackSwapDestinationAmount = outcome?.deliveredAmount
  const fallbackSwapSourceAmount = tx?.Amount
  const fallbackSwapSourceToken =
    fallbackSwapSourceAmount && typeof fallbackSwapSourceAmount !== 'object'
      ? { currency: nativeCurrency, value: String(Number(fallbackSwapSourceAmount) / 1000000) }
      : fallbackSwapSourceAmount
  const showFallbackSwapAmounts =
    isConvertion && !sourceBalanceChangesList?.length && fallbackSwapSourceAmount && fallbackSwapDestinationAmount

  const isMobile = useIsMobile(600)

  const rippling = isRipplingOnIssuer(sourceBalanceChangesList, address)

  if (rippling) {
    txTypeSpecial = <span className="bold">{t('labels.Rippling through payment')}</span>
  } else {
    if (!isConvertion) {
      txTypeSpecial = (
        <>
          <span className="bold">{txTypeSpecial === 'Payment' ? accountT('detail.transactions.payment') : txTypeSpecial} </span>
          {accountT(
            tx?.Destination === address
              ? 'detail.phrases.from'
              : tx?.Account === address
                ? 'detail.phrases.to'
                : 'detail.phrases.by'
          )}
          {isMobile ? ' ' : <br />}
          <AddressWithIconInline
            data={
              tx?.Account === address && specification?.destination ? specification?.destination : specification?.source
            }
            options={{ labelClassName: 'responsive-address' }}
          />
        </>
      )
    } else {
      txTypeSpecial = (
        <span className="bold">{txTypeSpecial === 'Payment' ? accountT('detail.transactions.payment') : txTypeSpecial}</span>
      )
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

  const balancesTitle = isConvertion ? t('labels.Exchanged') : t('labels.Sender spent')

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
              {t(specification?.source?.address === address ? 'labels.Sent' : 'labels.Received')}:{' '}
              {amountFormat(outcome?.deliveredAmount, {
                icon: true,
                withIssuer: true,
                bold: true,
                precise: 'nice',
                issuerShort: false
              })}
              {tokenToFiat({
                amount: outcome?.deliveredAmount,
                selectedCurrency,
                fiatRate
              })}
            </div>
          )}
          {showFallbackSwapAmounts && (
            <div>
              {balancesTitle}:<br />
              <AmountWithIcon amount={fallbackSwapSourceToken} options={{ linkCurrency: true, bold: true, precise: 'nice' }} />{' '}
              →{' '}
              <AmountWithIcon
                amount={fallbackSwapDestinationAmount}
                options={{ linkCurrency: true, bold: true, precise: 'nice' }}
              />
              {' '}
              {tokenToFiat({
                amount: fallbackSwapSourceAmount,
                selectedCurrency,
                fiatRate
              })}
            </div>
          )}
          {(isConvertion || iouPayment) && !isInsufFee && sourceBalanceChangesList?.length > 0 && (
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
                      {tokenToFiat({
                        amount: optionalAbsPaymentAmount(change, isConvertion),
                        selectedCurrency,
                        fiatRate
                      })}
                    </div>
                  )
                })}
              </div>
              {sourceBalanceChangesList.length === 2 && showExchangeRate && (
                <div>
                  <span>{t('labels.Exchange rate')}: </span>
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

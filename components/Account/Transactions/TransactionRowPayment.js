import { TransactionRowCard } from './TransactionRowCard'
import { xls14NftValue } from '../../../utils'
import { addressUsernameOrServiceLink, amountFormat, nativeCurrencyToFiat } from '../../../utils/format'
import { addressBalanceChanges, dappBySourceTag } from '../../../utils/transaction'
import { FiDownload, FiUpload } from 'react-icons/fi'
import { useTxFiatRate } from './FiatRateContext'
import { FaArrowRightArrowLeft } from 'react-icons/fa6'

const TransactionRowPaymentContent = ({ tx, address, selectedCurrency }) => {
  const pageFiatRate = useTxFiatRate()

  const { outcome, specification } = tx

  //for payments executor is always the sender, so we can check executor's balance changes.
  const sourceBalanceChangesList = addressBalanceChanges(tx, specification.source.address)

  //don't show sourcetag if it's the tag of a known dapp
  const dapp = dappBySourceTag(specification.source.tag)

  let iouPayment = false

  const isConvertion =
    specification?.source?.address === specification?.destination?.address &&
    (specification?.source?.tag === specification?.destination?.tag || !specification?.destination?.tag)

  if (!isConvertion) {
    //check if iou involved (pathfinding or iou with fee)
    if (
      !outcome?.deliveredAmount?.mpt_issuance_id &&
      sourceBalanceChangesList?.[0]?.value !== '-' + outcome?.deliveredAmount?.value
    ) {
      iouPayment = true
    }
  }

  const optionalAbsAmount = (change) => {
    return !isConvertion && (change?.value ? change.value.toString()[0] === '-' : change?.toString()[0] === '-')
      ? {
          ...change,
          value: change?.value ? change?.value.toString().slice(1) : change?.toString().slice(1)
        }
      : change
  }

  return (
    <>
      {!isConvertion && (
        <div className="flex items-center gap-1">
          {specification?.destination?.address === address ? (
            <>
              <FiDownload style={{ stroke: 'green', fontSize: 16 }} />
              <span>{addressUsernameOrServiceLink(specification, 'source')}</span>
            </>
          ) : specification?.source?.address === address ? (
            <>
              <FiUpload style={{ stroke: 'red', fontSize: 16 }} />
              <span>{addressUsernameOrServiceLink(specification, 'destination')}</span>
            </>
          ) : (
            <>
              <span>Payment By {addressUsernameOrServiceLink(specification, 'source')}</span>
            </>
          )}
        </div>
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
                  {amountFormat(optionalAbsAmount(change), {
                    icon: true,
                    withIssuer: true,
                    bold: true,
                    color: 'direction'
                  })}
                  {nativeCurrencyToFiat({
                    amount: optionalAbsAmount(change),
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
  )
}

export const TransactionRowPayment = ({ tx, address, index, selectedCurrency }) => {
  const { outcome, specification } = tx

  let txTypeSpecial = 'Payment'
  const isConvertion =
    specification?.source?.address === specification?.destination?.address &&
    (specification?.source?.tag === specification?.destination?.tag || !specification?.destination?.tag)

  if (isConvertion) {
    txTypeSpecial = 'Conversion payment'
  }

  if (xls14NftValue(outcome?.deliveredAmount?.value)) {
    txTypeSpecial = 'NFT transfer (XLS-14)'
  }

  return (
    <TransactionRowCard
      data={tx}
      address={address}
      index={index}
      selectedCurrency={selectedCurrency}
      txTypeSpecial={txTypeSpecial}
    >
      <TransactionRowPaymentContent tx={tx} address={address} selectedCurrency={selectedCurrency} />
    </TransactionRowCard>
  )
}

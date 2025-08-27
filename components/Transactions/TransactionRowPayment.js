import { TransactionRowCard } from './TransactionRowCard'
import { xls14NftValue } from '../../utils'
import { addressUsernameOrServiceLink, amountFormat, nativeCurrencyToFiat } from '../../utils/format'
import { addressBalanceChanges } from '../../utils/transaction'
import { FiDownload, FiUpload } from 'react-icons/fi'
import { useTxFiatRate } from './FiatRateContext'
import { FaArrowRightArrowLeft } from 'react-icons/fa6'

export const TransactionRowPayment = ({ tx, address, index, selectedCurrency}) => {
  const pageFiatRate = useTxFiatRate()

  const { outcome, specification } = tx

  //for payments executor is always the sender, so we can check executor's balance changes.
  const sourceBalanceChangesList = addressBalanceChanges(tx, specification.source.address)

  let txTypeSpecial = 'Payment'
  let iouPayment = false
  // sourse address and destination address is the same
  // sometimes source tag is added to show the dapp
  // so if there is no destintaion tag, no need the source tag to be the same
  const isConvertion =
    specification?.source?.address === specification?.destination?.address &&
    (specification?.source?.tag === specification?.destination?.tag || !specification?.destination?.tag)

  if (isConvertion) {
    txTypeSpecial = 'Conversion payment'
  } else {
    //check if iou involved (pathfinding or iou with fee)
    if (
      !outcome?.deliveredAmount?.mpt_issuance_id &&
      sourceBalanceChangesList?.[0]?.value !== '-' + outcome?.deliveredAmount?.value
    ) {
      iouPayment = true
    }
  }

  if (xls14NftValue(outcome?.deliveredAmount?.value)) {
    txTypeSpecial = 'NFT transfer (XLS-14)'
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
    <TransactionRowCard
      data={tx}
      address={address}
      index={index}
      txTypeSpecial={txTypeSpecial}
      selectedCurrency={selectedCurrency}
    >
      {!isConvertion &&  (
        <div className="flex items-center gap-1">
          {specification?.destination?.address === address ? (
            <>              
              <FiDownload style={{ stroke: 'green', fontSize: 16 }}/>
              <span>
                {addressUsernameOrServiceLink(specification?.source, 'address')}
              </span>
            </>
          ) : specification?.source?.address === address ? (
            <>
              <FiUpload style={{ stroke: 'red', fontSize: 16 }}/>
              <span>
                {addressUsernameOrServiceLink(specification?.destination, 'address')}
              </span>
            </>
          ) : (
            <>
              <span>
                Payment By {addressUsernameOrServiceLink(specification?.source, 'address')}
              </span>
            </>
          )}
        </div>
      )}
      {(isConvertion || iouPayment) && sourceBalanceChangesList?.length > 0 && (
        <>
          <div className="flex items-center gap-1">
            <span>
              {isConvertion ? <> <FaArrowRightArrowLeft style={{ fontSize: 16 , marginBottom: -4 }} /> Exchanged: </> : <> Sender spent: </>}
              {sourceBalanceChangesList.map((change, index) => {
                return <br key={index} />
              })}
            </span>
            <span>
              {sourceBalanceChangesList.map((change, index) => (
                <div key={index}>
                  <span className={'bold ' + (Number(change?.value) > 0 ? 'green' : 'red')}>
                    {amountFormat(optionalAbsAmount(change), { icon: true })}
                  </span>
                  {change?.issuer && <>({addressUsernameOrServiceLink(change, 'issuer', { short: true })})</>}
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
                {amountFormat({ currency: sourceBalanceChangesList[0].currency, issuer: sourceBalanceChangesList[0].issuer, value: 1 }, { icon: true })} ={' '}
                <span className="bold">
                  {amountFormat(
                    {
                      ...sourceBalanceChangesList[1],
                      value: Math.abs(sourceBalanceChangesList[1].value / sourceBalanceChangesList[0].value)
                    },
                    { precise: 'nice', icon: true }
                  )}
                </span>
                {sourceBalanceChangesList[1].issuer && (
                  <>({addressUsernameOrServiceLink(sourceBalanceChangesList[1], 'issuer', { short: true })})</>
                )}
              </span>
            </div>
          )}
        </>
      )}
      {!isConvertion && outcome?.deliveredAmount && (
        <div>
          <span className="bold">Delivered amount: </span>
            <span className="bold green">{amountFormat(outcome?.deliveredAmount, { icon: true })}</span>
            {outcome?.deliveredAmount?.issuer && (
              <>({addressUsernameOrServiceLink(outcome?.deliveredAmount, 'issuer', { short: true })})</>
            )}
            {nativeCurrencyToFiat({
              amount: outcome?.deliveredAmount,
              selectedCurrency,
              fiatRate: pageFiatRate
            })}
        </div>
      )}
    </TransactionRowCard>
  )
}

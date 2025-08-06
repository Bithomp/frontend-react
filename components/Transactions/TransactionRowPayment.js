import { TransactionRowCard } from './TransactionRowCard'
import { useEffect, useState } from 'react'
import { fetchHistoricalRate } from '../../utils/common'
import { xls14NftValue } from '../../utils'
import { addressUsernameOrServiceLink } from '../../utils/format'
import { FiDownload, FiUpload } from 'react-icons/fi'

export const TransactionRowPayment = ({ tx, address, index, selectedCurrency}) => {
  const [pageFiatRate, setPageFiatRate] = useState(0)

  useEffect(() => {
    if (!selectedCurrency || !tx?.outcome) return
    const { ledgerTimestamp } = tx?.outcome
    if (!ledgerTimestamp) return

    fetchHistoricalRate({ timestamp: ledgerTimestamp * 1000, selectedCurrency, setPageFiatRate })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCurrency, tx])

  const { outcome, specification } = tx

  let txTypeSpecial = 'Payment'

  // sourse address and destination address is the same
  // sometimes source tag is added to show the dapp
  // so if there is no destintaion tag, no need the source tag to be the same
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
      txTypeSpecial={txTypeSpecial}
      pageFiatRate={pageFiatRate}
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
          ) : (
            <>
              <FiUpload style={{ stroke: 'red', fontSize: 16 }}/>
              <span>
                {addressUsernameOrServiceLink(specification?.destination, 'address')}
              </span>
            </>
          )}
        </div>
      )}
    </TransactionRowCard>
  )
}
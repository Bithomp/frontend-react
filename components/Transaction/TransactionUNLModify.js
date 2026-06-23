import Link from 'next/link'

import CopyButton from '../UI/CopyButton'
import { getUNLModifyDetails } from '../../utils/transaction'
import { TransactionCard } from './TransactionCard'
import { TData } from './TData'

export const TransactionUNLModify = ({ data, pageFiatRate, selectedCurrency }) => {
  if (!data) return null

  const { actionText, validatorKey, serverVersion } = getUNLModifyDetails(data)

  return (
    <TransactionCard
      data={data}
      pageFiatRate={pageFiatRate}
      selectedCurrency={selectedCurrency}
      txTypeSpecial="UNL Modified"
    >
      <tr>
        <TData>Action</TData>
        <TData className="bold">{actionText}</TData>
      </tr>
      {validatorKey && (
        <tr>
          <TData>Validator</TData>
          <TData>
            <Link href={`/validator/${validatorKey}`}>{validatorKey}</Link> <CopyButton text={validatorKey} />
          </TData>
        </tr>
      )}
      {serverVersion && (
        <tr>
          <TData>Server version</TData>
          <TData className="bold">
            {serverVersion}
          </TData>
        </tr>
      )}
    </TransactionCard>
  )
}

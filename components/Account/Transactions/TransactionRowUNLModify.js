import Link from 'next/link'
import { FaUserShield } from 'react-icons/fa6'

import CopyButton from '../../UI/CopyButton'
import { shortHash } from '../../../utils/format'
import { getUNLModifyDetails } from '../../../utils/transaction'
import { TransactionRowCard } from './TransactionRowCard'

export const TransactionRowUNLModify = ({ data, address, index, selectedCurrency }) => {
  const { actionText, validatorKey, serverVersion } = getUNLModifyDetails(data)
  const txTypeSpecial = <span className="bold">UNL Modified</span>

  return (
    <TransactionRowCard
      data={data}
      address={address}
      index={index}
      selectedCurrency={selectedCurrency}
      txTypeSpecial={txTypeSpecial}
      icon={<FaUserShield style={{ color: '#2980ef', fontSize: 20 }} title="UNL Modified" />}
    >
      <div className="bold orange">{actionText}</div>
      {validatorKey && (
        <div>
          Validator:{' '}
          <Link className="bold" href={`/validator/${validatorKey}`}>
            {shortHash(validatorKey, 10)}
          </Link>{' '}
          <CopyButton text={validatorKey} />
        </div>
      )}
      {serverVersion && <div>Server version: <span className="bold">{serverVersion}</span></div>}
    </TransactionRowCard>
  )
}

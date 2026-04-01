import { TransactionRowCard } from './TransactionRowCard'
import { FiKey } from 'react-icons/fi'
import { addressUsernameOrServiceLink } from '../../../utils/format'
import CopyButton from '../../UI/CopyButton'

export const TransactionRowSetRegularKey = ({ data, address, index, selectedCurrency }) => {
  const { specification, tx } = data || {}
  const regularKey = specification?.regularKey
  const isRemoved = tx?.RegularKey === undefined && !regularKey
  const txTypeSpecial = <span className="bold">{isRemoved ? 'Regular key removed' : 'Regular key set'}</span>

  return (
    <TransactionRowCard
      data={data}
      address={address}
      index={index}
      selectedCurrency={selectedCurrency}
      txTypeSpecial={txTypeSpecial}
      icon={<FiKey style={{ color: '#9b59b6', fontSize: 20 }} title="Set Regular Key" />}
    >
      {isRemoved ? (
        <div className="bold">Removed key</div>
      ) : (
        <div className="bold">
          Key: {addressUsernameOrServiceLink(specification, 'regularKey', { short: 8 })}{' '}
          <CopyButton text={regularKey} />
        </div>
      )}
    </TransactionRowCard>
  )
}

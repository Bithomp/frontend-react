import { fullNiceNumber, showFlags, userOrServiceName } from '../../../utils/format'
import CopyButton from '../../UI/CopyButton'
import { TransactionRowCard } from './TransactionRowCard'

export const TransactionRowTrustSet = ({ data, address, index, selectedCurrency }) => {
  const { specification } = data
  const serviceOruser = userOrServiceName(specification.counterpartyDetails)
  const txTypeSpecial = 'Trust'
  return (
    <TransactionRowCard
      data={data}
      address={address}
      index={index}
      selectedCurrency={selectedCurrency}
      txTypeSpecial={txTypeSpecial}
    >
      {serviceOruser && (
        <>
          {specification.counterpartyDetails?.service ? 'Issuer' : 'User'}: {serviceOruser}
          <br />
        </>
      )}
      {serviceOruser ? 'Address' : 'Counterparty'}: <span className="bold">{specification.counterparty}</span>{' '}
      <CopyButton text={specification.counterparty} />
      <br />
      Currency code: <span className="bold">{specification.currency}</span> <CopyButton text={specification.currency} />
      <br />
      Limit: <span className="bold">{fullNiceNumber(specification.limit)}</span>
      <br />
      <span className="flex gap-1">Flags: {showFlags(specification.flags)}</span>
    </TransactionRowCard>
  )
}

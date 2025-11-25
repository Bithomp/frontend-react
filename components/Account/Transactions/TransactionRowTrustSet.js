import {
  fullNiceNumber,
  showFlags,
  userOrServiceName,
  CurrencyWithIconInline,
  amountFormat
} from '../../../utils/format'
import CopyButton from '../../UI/CopyButton'
import { TransactionRowCard } from './TransactionRowCard'
import { useIsMobile } from '../../../utils/mobile'

export const TransactionRowTrustSet = ({ data, address, index, selectedCurrency }) => {
  const { specification } = data
  const serviceOruser = userOrServiceName(specification?.counterpartyDetails)
  const isMobile = useIsMobile(600)
  const txTypeSpecial = (
    <>
      <span className="bold">
        Trust {specification?.limit === '0' ? <span className="orange">removed</span> : 'set'}
      </span>
      {!isMobile ? (
        <>
          <br />
          <br />
        </>
      ) : (
        ' '
      )}
      {specification?.limit !== '0' ? (
        <>
          {amountFormat(
            {
              currency: specification?.currency,
              issuer: specification?.counterparty,
              issuerDetails: specification?.counterpartyDetails,
              value: specification?.limit
            },
            { icon: true, bold: true, color: 'orange', short: true }
          )}
        </>
      ) : (
        <span className="bold">
          <CurrencyWithIconInline token={{ currency: specification?.currency, issuer: specification?.counterparty }} />
        </span>
      )}
    </>
  )
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
      Currency code: <span className="bold brake">{specification.currency}</span>{' '}
      <CopyButton text={specification.currency} />
      <br />
      Limit: <span className="bold">{fullNiceNumber(specification.limit)}</span>
      <br />
      <span className="flex gap-1">Flags: {showFlags(specification.flags)}</span>
    </TransactionRowCard>
  )
}

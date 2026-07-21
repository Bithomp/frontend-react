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
import { CiLink } from 'react-icons/ci'

export const TransactionRowTrustSet = ({ data, address, index, selectedCurrency }) => {
  const { specification } = data
  const serviceOruser = userOrServiceName(specification?.counterpartyDetails)
  const flags = showFlags(specification?.flags)
  const hasLimit = specification?.limit !== undefined && specification?.limit !== null && specification?.limit !== ''
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
      icon={<CiLink style={{ color: '#9b59b6', fontSize: 20 }} title="Trust set/removed" />}
    >
      {serviceOruser && (
        <>
          {specification.counterpartyDetails?.service ? 'Issuer' : 'User'}: {serviceOruser}
          <br />
        </>
      )}
      {specification?.counterparty && (
        <>
          {serviceOruser ? 'Address' : 'Counterparty'}: <span className="bold">{specification.counterparty}</span>{' '}
          <CopyButton text={specification.counterparty} />
          <br />
        </>
      )}
      {specification?.currency && (
        <>
          Currency code: <span className="bold brake">{specification.currency}</span>{' '}
          <CopyButton text={specification.currency} />
          <br />
        </>
      )}
      {hasLimit && (
        <>
          Limit: <span className="bold">{fullNiceNumber(specification.limit)}</span>
          <br />
        </>
      )}
      {flags && <span className="flex gap-1">Flags: {flags}</span>}
    </TransactionRowCard>
  )
}

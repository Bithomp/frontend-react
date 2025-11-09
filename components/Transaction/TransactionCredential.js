import { TData } from '../Table'
import { TransactionCard } from './TransactionCard'
import { AddressWithIconFilled, fullDateAndTime } from '../../utils/format'
import { decode } from '../../utils'
import CopyButton from '../UI/CopyButton'

const CredentialList = ({ credentials, title }) => {
  if (!credentials || credentials.length === 0) return null

  return (
    <tr>
      <TData className="bold">{title}</TData>
      <TData>
        <div>
          {credentials.map((credential, index) => (
            <div
              key={index}
              style={{ marginBottom: '8px', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '4px'
                }}
              >
                <div
                  style={{
                    flex: '0 0 auto',
                    minWidth: 'fit-content'
                  }}
                >
                  <strong>Issuer:</strong>
                </div>
                <div
                  style={{
                    flex: '1 1 auto',
                    minWidth: '140px'
                  }}
                >
                  <AddressWithIconFilled data={credential} name="issuer" />
                </div>
              </div>
              <div>
                <strong>Type:</strong> {credential.type || <span className="orange">Unknown</span>}
              </div>
            </div>
          ))}
        </div>
      </TData>
    </tr>
  )
}

export const TransactionCredential = ({ data, pageFiatRate, selectedCurrency }) => {
  if (!data) return null
  const { specification, outcome, tx } = data
  const txType = tx?.TransactionType
  const isDepositPreauth = txType === 'DepositPreauth'

  return (
    <TransactionCard data={data} pageFiatRate={pageFiatRate} selectedCurrency={selectedCurrency}>
      <tr>
        <TData>
          Initiated by
          {txType === 'CredentialCreate' && (
            <>
              <br />
              issuer
            </>
          )}
          {outcome?.credentialChanges?.subject === specification?.source && (
            <>
              <br />
              subject
            </>
          )}
        </TData>
        <TData>
          <AddressWithIconFilled data={specification?.source} name="address" />
        </TData>
      </tr>
      {isDepositPreauth && specification.authorize && (
        <tr>
          <TData className="bold">Authorize</TData>
          <TData>
            <AddressWithIconFilled data={specification} name="authorize" />
          </TData>
        </tr>
      )}
      {isDepositPreauth && specification.unauthorize && (
        <tr>
          <TData className="bold">Unauthorize</TData>
          <TData>
            <AddressWithIconFilled data={specification} name="unauthorize" />
          </TData>
        </tr>
      )}
      {!isDepositPreauth && (
        <>
          {specification.issuer && (
            <tr>
              <TData>Issuer</TData>
              <TData>
                <AddressWithIconFilled data={specification} name="issuer" />
              </TData>
            </tr>
          )}
          {specification?.subject && (
            <tr>
              <TData>Subject</TData>
              <TData>
                <AddressWithIconFilled data={specification} name="subject" />
              </TData>
            </tr>
          )}
          <tr>
            <TData>Credential type</TData>
            <TData>
              {outcome?.credentialChanges?.credentialType}{' '}
              <CopyButton text={outcome?.credentialChanges?.credentialType} />
            </TData>
          </tr>
          {outcome?.credentialChanges?.flags && (
            <tr>
              <TData>Flag</TData>
              <TData>
                <span className={outcome.credentialChanges.flags.accepted ? 'green' : 'red'}>
                  {outcome.credentialChanges.flags.accepted ? 'Accepted' : 'Not accepted'}
                </span>
              </TData>
            </tr>
          )}
        </>
      )}
      <CredentialList credentials={specification?.authorizeCredentials} title="Authorize Credentials" />
      <CredentialList credentials={specification?.unauthorizeCredentials} title="Unauthorize Credentials" />
      {!isDepositPreauth && specification?.expiration && (
        <tr>
          <TData>Expiration</TData>
          <TData>{fullDateAndTime(specification.expiration, 'ripple')}</TData>
        </tr>
      )}
      {!isDepositPreauth && specification?.uri && (
        <tr>
          <TData>URI</TData>
          <TData>{decode(specification.uri)}</TData>
        </tr>
      )}
    </TransactionCard>
  )
}

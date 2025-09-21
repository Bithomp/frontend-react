import { TData } from '../Table'

import { TransactionCard } from './TransactionCard'
import { AddressWithIconFilled } from '../../utils/format'

const CredentialList = ({ credentials, title }) => {
  if (!credentials || credentials.length === 0) return null

  return (
    <tr>
      <TData className="bold">{title}</TData>
      <TData>
        <div>
          {credentials.map((credential, index) => (
            <div key={index} style={{ marginBottom: '8px', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}>
              <div style={{ 
                display: 'flex', 
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '4px'
              }}>
                <div style={{ 
                  flex: '0 0 auto',
                  minWidth: 'fit-content'
                }}>
                  <strong>Issuer:</strong>
                </div>
                <div style={{ 
                  flex: '1 1 auto',
                  minWidth: '140px'
                }}>
                  <AddressWithIconFilled data={credential} name="issuer" />
                </div>
              </div>
              <div><strong>Type:</strong> {credential.type || <span className="orange">Unknown</span>}</div>
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
    <TransactionCard
      data={data}
      pageFiatRate={pageFiatRate}
      selectedCurrency={selectedCurrency}
    >
      <tr>
        <TData>Initiated by</TData>
        <TData>
          <AddressWithIconFilled data={specification?.source} name="address" />
        </TData>
      </tr>
      {isDepositPreauth && tx.Authorize && (
        <tr>
          <TData className="bold">Authorize</TData>
          <TData>
            <AddressWithIconFilled data={tx.Authorize} name="address" />
          </TData>
        </tr>
      )}
      {isDepositPreauth && tx.Unauthorize && (
        <tr>
          <TData className="bold">Unauthorize</TData>
          <TData>
            <AddressWithIconFilled data={tx.Unauthorize} name="address" />
          </TData>
        </tr>
      )}
      {!isDepositPreauth && (
        <>
          {txType === 'CredentialDelete' && (
            <tr>
              <TData>Account</TData>
              <TData>
                <AddressWithIconFilled data={specification?.source} name="address" />
              </TData>
            </tr>
          )}
          <tr>
            <TData>
              {txType === 'CredentialCreate' ? 'Account' : 'Issuer'}
            </TData>
            <TData>
              <AddressWithIconFilled data={outcome?.credentialChanges} name="issuer" />
            </TData>
          </tr>
          <tr>
            <TData>
              {txType === 'CredentialCreate' || txType === 'CredentialDelete' ? 'Subject' : 'Account'}
            </TData>
            <TData>
              <AddressWithIconFilled data={outcome?.credentialChanges} name="subject" />
            </TData>
          </tr>
          <tr>
            <TData>Credential Type</TData>
            <TData>{outcome?.credentialChanges?.credentialType}</TData>
          </tr>
          {outcome?.credentialChanges?.flags && (
            <tr>
              <TData>Flags</TData>
              <TData>
                <div>
                  <div>Accepted: <span className={outcome.credentialChanges.flags.accepted ? 'green' : 'red'}>
                    {outcome.credentialChanges.flags.accepted ? 'Yes' : 'No'}
                  </span></div>
                </div>
              </TData>
            </tr>
          )}
        </>
      )}
      <CredentialList 
        credentials={specification?.authorizeCredentials} 
        title="Authorize Credentials" 
      />
      <CredentialList 
        credentials={specification?.unauthorizeCredentials} 
        title="Unauthorize Credentials" 
      />
      {!isDepositPreauth && specification?.expiration !== undefined && (
        <tr>
          <TData>Expiration</TData>
          <TData>{specification.expiration}</TData>
        </tr>
      )}
      {!isDepositPreauth && specification?.uri && (
        <tr>
          <TData>URI</TData>
          <TData>
            {specification.uri.startsWith('http') ? (
              <a href={specification.uri} target="_blank" rel="noopener">
                {specification.uri}
              </a>
            ) : (
              specification.uri
            )}
          </TData>
        </tr>
      )}
    </TransactionCard>
  )
}

import Link from 'next/link'
import { useTranslation } from 'next-i18next'
import Mailto from 'react-protected-mailto'
import ReactCountryFlag from 'react-country-flag'

import CopyButton from '../UI/CopyButton'
import { getUNLModifyDetails } from '../../utils/transaction'
import { TransactionCard } from './TransactionCard'
import { TData } from './TData'
import VerifiedIcon from '../../public/images/verified.svg'

const cleanValue = (value) => {
  if (!value) return ''
  const text = String(value).trim()
  return text && text !== 'null' ? text : ''
}

const countryCode = (country) => {
  const code = cleanValue(country).toUpperCase()
  if (!code) return ''
  return code === 'UK' ? 'GB' : code
}

const countryName = (code) => {
  try {
    return new Intl.DisplayNames(['en'], { type: 'region' }).of(code) || code
  } catch {
    return code
  }
}

const ValidatorCountry = ({ code }) => (
  <span className="no-brake">
    <ReactCountryFlag countryCode={code} svg style={{ width: 18, height: 18 }} /> {countryName(code)}
  </span>
)

const markdownUrl = (value) => {
  const text = cleanValue(value)
  const match = text.match(/^\[[^\]]+\]\((https?:\/\/[^)]+)\)$/)
  if (match?.[1]) return match[1]
  return /^https?:\/\//.test(text) ? text : ''
}

const urlLabel = (url) => url.replace(/^https?:\/\//, '').replace(/\/$/, '')

const principalName = (principal) =>
  [cleanValue(principal?.name), cleanValue(principal?.title)]
    .filter(Boolean)
    .join(', ')

const displayablePrincipals = (principals) =>
  principals?.filter((principal) => principalName(principal) || cleanValue(principal?.email)) || []

const PrincipalLinks = ({ principal }) => {
  const website = markdownUrl(principal?.website)
  const twitter = cleanValue(principal?.twitter || principal?.x).replace(/^@/, '')
  const email = cleanValue(principal?.email)

  if (!website && !twitter && !email) return null

  return (
    <span className="grey">
      {' '}
      (
      {website && (
        <a href={website} target="_blank" rel="noreferrer">
          {urlLabel(website)}
        </a>
      )}
      {website && (twitter || email) && ', '}
      {twitter && (
        <a href={`https://x.com/${twitter}`} target="_blank" rel="noreferrer">
          @{twitter}
        </a>
      )}
      {twitter && email && ', '}
      {email && <Mailto email={email} />}
      )
    </span>
  )
}

const Principals = ({ principals }) => {
  const items = displayablePrincipals(principals)
  if (!items.length) return null

  return items.map((principal, index) => (
    <span key={index}>
      {principalName(principal) || cleanValue(principal.email)}
      <PrincipalLinks principal={principal} />
      {index < items.length - 1 && '; '}
    </span>
  ))
}

export const TransactionUNLModify = ({ data, pageFiatRate, selectedCurrency }) => {
  const { t } = useTranslation('transaction')
  if (!data) return null

  const { actionText, validatorDetails, validatorKey, serverVersion } = getUNLModifyDetails(data)
  const domain = cleanValue(validatorDetails?.domain)
  const domainHref = /^https?:\/\//.test(domain) ? domain : `https://${domain}`
  const ownerCountry = countryCode(validatorDetails?.ownerCountry)
  const serverCountry = countryCode(validatorDetails?.serverCountry)
  const hasPrincipals = displayablePrincipals(validatorDetails?.principals).length > 0
  const hasOperatorData = !!(hasPrincipals || ownerCountry)
  const hasServerData = !!(serverVersion || serverCountry)
  const label = (key) => t(`labels.${key}`, { defaultValue: key })

  return (
    <TransactionCard
      data={data}
      pageFiatRate={pageFiatRate}
      selectedCurrency={selectedCurrency}
      txTypeSpecial="UNL Modified"
    >
      <tr>
        <TData>{label('Action')}</TData>
        <TData className="bold">{actionText}</TData>
      </tr>
      {validatorKey && (
        <tr>
          <TData>{label('Validator')}</TData>
          <TData>
            <Link href={`/validator/${validatorKey}`}>{validatorKey}</Link> <CopyButton text={validatorKey} />
          </TData>
        </tr>
      )}
      {domain && (
        <tr>
          <TData>{label('Validator domain')}</TData>
          <TData>
            <a href={domainHref} target="_blank" rel="noreferrer">
              {domain}
            </a>
            {validatorDetails?.domainVerified && (
              <span className="tooltip" style={{ display: 'inline-flex', marginLeft: 5, verticalAlign: 'middle' }}>
                <VerifiedIcon style={{ width: 15, height: 15 }} />
                <span className="tooltiptext no-brake">{label('Domain verified')}</span>
              </span>
            )}
          </TData>
        </tr>
      )}
      {hasOperatorData && (
        <tr>
          <TData>{label('Operator')}</TData>
          <TData>
            <Principals principals={validatorDetails?.principals} />
            {hasPrincipals && ownerCountry && <span className="grey"> · </span>}
            {ownerCountry && (
              <ValidatorCountry code={ownerCountry} />
            )}
          </TData>
        </tr>
      )}
      {hasServerData && (
        <tr>
          <TData>{label('Server')}</TData>
          <TData>
            {serverVersion && (
              <span className="bold">{serverVersion}</span>
            )}
            {serverVersion && serverCountry && <span className="grey"> · </span>}
            {serverCountry && (
              <ValidatorCountry code={serverCountry} />
            )}
          </TData>
        </tr>
      )}
    </TransactionCard>
  )
}

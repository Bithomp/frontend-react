import Link from 'next/link'
import LinkIcon from '../public/images/link.svg'
import { niceCurrency, shortHash } from './format'
import CopyButton from '../components/UI/CopyButton'
import { isValidTaxon } from './nft'

export const LinkToken = ({ token, icon, copy, children }) => {
  if (!token) return ''
  const { currencyDetails, issuer, mptId, currency } = token

  const tokenUrl = '/token/' + issuer + '/' + currency
  const lpToken = currencyDetails?.type === 'lp_token'

  const textCurrency = mptId
    ? currency
    : lpToken && currencyDetails?.currency
    ? currencyDetails.currency
    : niceCurrency(currency)

  return (
    <>
      {!lpToken && !mptId ? (
        <Link href={tokenUrl}>{children || icon ? <LinkIcon /> : textCurrency}</Link>
      ) : (
        <>{lpToken ? <LinkAmm ammId={currencyDetails?.ammID} text={currencyDetails?.currency} /> : textCurrency}</>
      )}
      {copy && (
        <>
          {' '}
          <CopyButton text={token.currency} copyText="Copy code" />
        </>
      )}
    </>
  )
}

export const LinkTx = ({ tx, icon, short, children, copy }) =>
  tx ? (
    <>
      <Link href={`/tx/${tx}`}>{children || (icon ? <LinkIcon /> : shortHash(tx, short || 10))}</Link>
      {copy ? (
        <>
          {' '}
          <CopyButton text={tx} />
        </>
      ) : (
        ''
      )}
    </>
  ) : (
    ''
  )

export const LedgerLink = ({ version, text, style, onClick }) =>
  version ? (
    <Link href={`/ledger/${version}`} style={style} onClick={onClick}>
      {text ? text : '#' + version}
    </Link>
  ) : (
    ''
  )

export const LinkAccount = ({ address, icon, copy, text, short }) =>
  address ? (
    <>
      <Link href={'/account/' + address}>
        {text ? text : short > 0 ? shortHash(address, short) : short === 0 ? '' : address}
        {icon ? (
          <>
            {' '}
            <LinkIcon />
          </>
        ) : (
          ''
        )}
      </Link>
      {copy ? (
        <>
          {' '}
          <CopyButton text={address} />
        </>
      ) : (
        ''
      )}
    </>
  ) : (
    ''
  )

export const LinkAmm = ({ ammId, hash, icon, copy, text, style }) =>
  ammId ? (
    <>
      <Link href={`/amm/${ammId}`} style={style ? style : {}}>
        {text ? text : hash ? shortHash(ammId, hash === true ? 6 : hash) : ''}
        {icon ? (
          <>
            {' '}
            <LinkIcon />
          </>
        ) : (
          ''
        )}
      </Link>
      {copy ? (
        <>
          {' '}
          <CopyButton text={ammId} />
        </>
      ) : (
        ''
      )}
    </>
  ) : (
    ''
  )

export const LinkObject = ({ objectId, ledgerIndex, hash, icon, copy, text, style }) =>
  objectId ? (
    <>
      <Link
        href={`/object/${objectId}` + (ledgerIndex ? '?ledgerIndex=' + ledgerIndex : '')}
        style={style ? style : {}}
      >
        {text ? text : hash ? shortHash(objectId, hash === true ? 6 : hash) : ''}
        {icon ? (
          <>
            {' '}
            <LinkIcon />
          </>
        ) : (
          ''
        )}
      </Link>
      {copy ? (
        <>
          {' '}
          <CopyButton text={objectId} />
        </>
      ) : (
        ''
      )}
    </>
  ) : (
    ''
  )

export const LinkListedNfts = ({
  children,
  issuer,
  taxon,
  collection,
  saleCurrency,
  saleCurrencyIssuer,
  saleDestination
}) => {
  let collectionPart = ''
  if (issuer && isValidTaxon(taxon)) {
    collectionPart = '&issuer=' + issuer + '&taxon=' + taxon
  } else if (collection) {
    collectionPart = '&collection=' + collection
  }

  let currencyPart = ''
  if (saleCurrency) {
    currencyPart = '&saleCurrency=' + saleCurrency
    if (saleCurrencyIssuer) currencyPart += '&saleCurrencyIssuer=' + saleCurrencyIssuer
  }

  return (
    <Link
      href={
        '/nft-explorer?includeWithoutMediaData=true' +
        collectionPart +
        '&list=onSale' +
        currencyPart +
        '&saleDestination=' +
        saleDestination
      }
    >
      {children || <LinkIcon />}
    </Link>
  )
}

import Link from 'next/link'
import LinkIcon from '../public/images/link.svg'
import { shortHash } from './format'
import CopyButton from '../components/UI/CopyButton'

export const LinkTx = ({ tx, icon, short, children }) =>
  tx ? <Link href={`/tx/${tx}`}>{children || (icon ? <LinkIcon /> : shortHash(tx, short || 10))}</Link> : ''

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
      <Link href={`/amm/${ammId}`} style={style}>
        {text ? text : hash ? shortHash(ammId, hash > 3 ? hash : 10) : ''}
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

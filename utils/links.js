import Link from 'next/link'
import LinkIcon from '../public/images/link.svg'
import { shortHash } from './format'
import CopyButton from '../components/UI/CopyButton'

export const LinkTx = ({ tx, icon }) =>
  tx ? <Link href={`/explorer/${tx}`}>{icon ? <LinkIcon /> : shortHash(tx, 10)}</Link> : ''

export const LedgerLink = ({ version, text, style, onClick }) =>
  version ? (
    <Link href={`/ledger/${version}`} style={style} onClick={onClick}>
      {text ? text : '#' + version}
    </Link>
  ) : (
    ''
  )

export const LinkAccount = ({ address }) => (address ? <Link href={`/explorer/${address}`}>{address}</Link> : '')

export const LinkAmm = ({ ammId, hash, icon, copy }) =>
  ammId ? (
    <>
      <Link href={`/amm/${ammId}`}>
        {hash ? shortHash(ammId, hash > 3 ? hash : 10) : ''}
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

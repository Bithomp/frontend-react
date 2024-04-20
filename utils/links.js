import Link from 'next/link'
import LinkIcon from "../public/images/link.svg"
import { shortHash } from './format'
import CopyButton from '../components/UI/CopyButton'

export const LinkTxIcon = ({ tx }) => (
  tx ?
    <Link href={`/explorer/${tx}`}>
      <LinkIcon />
    </Link>
    :
    ''
)

export const LedgerLink = ({ version, text, style, onClick }) => (
  version ?
    <Link href={`/ledger/${version}`} style={style} onClick={onClick}>
      {text ? text : '#' + version}
    </Link>
    :
    ''
)

export const LinkAccount = ({ address }) => (
  address ?
    <Link href={`/explorer/${address}`}>
      {address}
    </Link>
    :
    ''
)

export const LinkAmm = ({ ammId }) => (
  ammId ?
    <>
      <Link href={`/amm/${ammId}`}>
        {shortHash(ammId, 10)}
        {" "}
        <LinkIcon />
      </Link>
      {" "}
      <CopyButton text={ammId} />
    </>
    :
    ''
)

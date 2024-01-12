import Link from 'next/link'

const LinkExplorer = ({ hash }) => (
    <a href={`https://bithomp.com/explorer/${hash}`} target="_blank" rel="noopener noreferrer">
        {hash}
    </a>
)

const LinkAccount = ({ hash }) => (
    <Link href={`/account/${hash}`}>
        {hash}
    </Link>
)

const LinkLedger = ({ version }) => (
    <Link href={`/ledger/${version}`}>
        #{version}
    </Link>
)

export { LinkAccount, LinkExplorer, LinkLedger }


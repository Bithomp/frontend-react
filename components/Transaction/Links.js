import Link from "next/link";

const LinkAccount = ({ address }) => (
  <Link href={`/account/${address}`}>
    {address}
  </Link>
);

const LinkLedger = ({ version }) => (
  <Link href={`/ledger/${version}`}>
    #{version}
  </Link>
);

const LinkTx = ({ tx }) => (
  <Link href={`/tx/${tx}`}>
    {tx}
  </Link>
);

export { LinkAccount, LinkLedger, LinkTx };

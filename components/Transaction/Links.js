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

export { LinkAccount, LinkLedger };

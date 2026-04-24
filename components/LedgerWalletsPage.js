import Link from 'next/link'
import Breadcrumbs from './Breadcrumbs'
import SEO from './SEO'
import { network } from '../utils'

const REFERRAL = 'https://shop.ledger.com/?r=8aeb'

const WALLET_LIST = [
  {
    id: 'stax',
    name: 'Ledger Stax',
    href: 'https://shop.ledger.com/pages/ledger-stax?r=8aeb',
    tag: 'Premium',
    bestFor: 'Premium everyday use with the biggest screen',
    display: '3.7" curved E Ink touchscreen',
    connectivity: 'USB-C, Bluetooth, NFC, Qi wireless charging',
    mobile: 'iPhone, Android, desktop',
    notes: [
      'Best readability in the current Ledger range',
      'Magnet Shell and Ledger Recovery Key included',
      'Most polished option if you sign often'
    ]
  },
  {
    id: 'flex',
    name: 'Ledger Flex',
    href: 'https://shop.ledger.com/pages/ledger-flex?r=8aeb',
    tag: 'Best balance',
    bestFor: 'Most users who want a modern touchscreen Ledger',
    display: '2.84" E Ink touchscreen',
    connectivity: 'USB-C, Bluetooth, NFC',
    mobile: 'iPhone, Android, desktop',
    notes: [
      'Very strong mix of usability, portability and security',
      'Ledger Recovery Key included',
      'Good default choice for frequent XRP signing'
    ]
  },
  {
    id: 'gen5',
    name: 'Ledger Nano Gen5',
    href: 'https://shop.ledger.com/products/ledger-nano-gen5?r=8aeb',
    tag: 'Accessible touchscreen',
    bestFor: 'Touchscreen experience without going full premium',
    display: '2.8" E Ink touchscreen',
    connectivity: 'USB-C, Bluetooth, NFC',
    mobile: 'iPhone, Android, desktop',
    notes: [
      'Ledger positions it as the most accessible touchscreen signer',
      'Ledger Recovery Key included',
      'Good middle ground between Flex and classic Nanos'
    ]
  },
  {
    id: 'nano-x',
    name: 'Ledger Nano X',
    href: 'https://shop.ledger.com/products/ledger-nano-x?r=8aeb',
    tag: 'Classic mobile',
    bestFor: 'Users who want classic buttons plus Bluetooth',
    display: '1.1" monochrome OLED',
    connectivity: 'USB-C, Bluetooth',
    mobile: 'iPhone, Android, desktop',
    notes: [
      'Still a solid pick if you prefer the classic Nano format',
      'Good travel companion for mobile signing',
      'Smaller screen means more step-by-step verification'
    ]
  },
  {
    id: 'nano-s-plus',
    name: 'Ledger Nano S Plus',
    href: 'https://shop.ledger.com/products/ledger-nano-s-plus?r=8aeb',
    tag: 'Stay-at-home classic',
    bestFor: 'Desktop or Android users who want the essentials',
    display: '1.1" monochrome OLED',
    connectivity: 'USB-C',
    mobile: 'Android and desktop, no iPhone support',
    notes: [
      'Good basic option for long-term storage and occasional use',
      'No Bluetooth and no iOS support',
      'Best if you mainly sign from a desk'
    ]
  }
]

const QUICK_PICKS = [
  {
    title: 'Best overall',
    wallet: 'Ledger Flex',
    text: 'Best balance of screen, portability and day-to-day comfort for most users.'
  },
  {
    title: 'Best premium',
    wallet: 'Ledger Stax',
    text: 'Best if you want the biggest screen and the cleanest signing experience.'
  },
  {
    title: 'Best classic',
    wallet: 'Ledger Nano X',
    text: 'Best if you want Bluetooth but prefer the familiar Nano button layout.'
  },
  {
    title: 'Best basic',
    wallet: 'Ledger Nano S Plus',
    text: 'Best if you mostly use desktop and want a simpler classic device.'
  }
]

export default function LedgerWalletsPage({ networkName = 'XRPL', pageTitle, pageDescription }) {
  return (
    <>
      <SEO title={pageTitle} description={pageDescription} noindex={!['mainnet', 'xahau'].includes(network)} />
      <div className="max-w-6xl mx-auto px-4">
        <Breadcrumbs />

        <section className="wallet-guide-hero">
          <div className="wallet-guide-eyebrow">{networkName} hardware wallets</div>
          <h1>{pageTitle}</h1>
          <p className="wallet-guide-subtitle">{pageDescription}</p>
          <div className="wallet-guide-actions">
            <a href={REFERRAL} target="_blank" rel="noreferrer" className="wallet-guide-primary">
              View Ledger Wallets
            </a>
          </div>
        </section>

        <section className="wallet-guide-panel">
          <h2>Quick picks</h2>
          <div className="wallet-guide-picks">
            {QUICK_PICKS.map((pick) => (
              <div key={pick.title} className="wallet-guide-pick">
                <div className="wallet-guide-pick-label">{pick.title}</div>
                <div className="wallet-guide-pick-wallet">{pick.wallet}</div>
                <p>{pick.text}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="wallet-guide-panel">
          <div className="wallet-guide-section-head">
            <h2>Compare Ledger wallets</h2>
            <a href={REFERRAL} target="_blank" rel="noreferrer" className="wallet-guide-text-link">
              View all wallets
            </a>
          </div>

          <div className="wallet-guide-table-wrap">
            <table className="wallet-guide-table">
              <thead>
                <tr>
                  <th>Wallet</th>
                  <th>Display</th>
                  <th>Connectivity</th>
                  <th>Mobile use</th>
                  <th>Best for</th>
                </tr>
              </thead>
              <tbody>
                {WALLET_LIST.map((wallet) => (
                  <tr key={wallet.id}>
                    <td>
                      <a href={wallet.href} target="_blank" rel="noreferrer" className="wallet-guide-table-name">
                        {wallet.name}
                      </a>
                      <div className="wallet-guide-table-tag">{wallet.tag}</div>
                    </td>
                    <td>{wallet.display}</td>
                    <td>{wallet.connectivity}</td>
                    <td>{wallet.mobile}</td>
                    <td>{wallet.bestFor}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="wallet-guide-grid">
          {WALLET_LIST.map((wallet) => (
            <article key={wallet.id} className="wallet-guide-card">
              <div className="wallet-guide-card-top">
                <div>
                  <div className="wallet-guide-card-tag">{wallet.tag}</div>
                  <h3>{wallet.name}</h3>
                </div>
                <a href={wallet.href} target="_blank" rel="noreferrer" className="wallet-guide-card-link">
                  View details
                </a>
              </div>
              <p className="wallet-guide-card-bestfor">{wallet.bestFor}</p>
              <div className="wallet-guide-meta">
                <div>
                  <span>Display</span>
                  <strong>{wallet.display}</strong>
                </div>
                <div>
                  <span>Connectivity</span>
                  <strong>{wallet.connectivity}</strong>
                </div>
                <div>
                  <span>Works with</span>
                  <strong>{wallet.mobile}</strong>
                </div>
              </div>
              <ul>
                {wallet.notes.map((note) => (
                  <li key={note}>{note}</li>
                ))}
              </ul>
              <a href={wallet.href} target="_blank" rel="noreferrer" className="wallet-guide-primary wallet-guide-card-cta">
                Open {wallet.name}
              </a>
            </article>
          ))}
        </section>

        <section className="wallet-guide-panel wallet-guide-disclaimer">
          <h2>Notes for {networkName} users</h2>
          <p>
            These are Ledger hardware devices from the official Ledger store. They are excellent for self-custody and
            transaction signing, but app-level support can differ by network and wallet software.
          </p>
          <p>
            For XRPL, Ledger support is well established. For Xahau, always confirm the current wallet or app workflow
            you plan to use before buying.
          </p>
          <p>
            Official source pages used for this comparison:{' '}
            <Link href="https://shop.ledger.com/pages/ledger-stax?r=8aeb">Ledger Stax</Link>,{' '}
            <Link href="https://shop.ledger.com/pages/ledger-flex?r=8aeb">Ledger Flex</Link>,{' '}
            <Link href="https://shop.ledger.com/products/ledger-nano-gen5?r=8aeb">Ledger Nano Gen5</Link>,{' '}
            <Link href="https://shop.ledger.com/products/ledger-nano-x?r=8aeb">Ledger Nano X</Link>,{' '}
            <Link href="https://shop.ledger.com/products/ledger-nano-s-plus?r=8aeb">Ledger Nano S Plus</Link>.
          </p>
        </section>

        <style jsx>{`
          .wallet-guide-hero {
            padding: 28px;
            border: 1px solid var(--button-additional);
            border-radius: 24px;
            background:
              radial-gradient(circle at top left, rgba(17, 138, 178, 0.12), transparent 36%),
              linear-gradient(135deg, var(--background-main), var(--background-input));
            box-shadow: 0 12px 40px rgba(0, 0, 0, 0.08);
            margin: 22px 0 18px;
          }

          .wallet-guide-eyebrow {
            font-size: 12px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.08em;
            color: var(--accent-link);
            margin-bottom: 10px;
          }

          .wallet-guide-hero h1 {
            margin: 0 0 12px;
            font-size: clamp(32px, 4vw, 48px);
            line-height: 1.05;
          }

          .wallet-guide-subtitle {
            margin: 0;
            max-width: 900px;
            font-size: 18px;
            line-height: 1.55;
            color: var(--text-secondary);
          }

          .wallet-guide-actions {
            display: flex;
            align-items: center;
            gap: 16px;
            flex-wrap: wrap;
            margin-top: 20px;
          }

          .wallet-guide-primary {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            border-radius: 999px;
            padding: 12px 18px;
            background: #0b7a75;
            color: #fff;
            text-decoration: none;
            font-weight: 700;
          }

          .wallet-guide-primary:hover {
            background: #09645f;
            color: #fff;
            text-decoration: none;
          }

          .wallet-guide-note {
            color: var(--text-secondary);
            font-size: 14px;
          }

          .wallet-guide-panel {
            margin: 18px 0;
            padding: 22px;
            border-radius: 20px;
            background: var(--background-main);
            border: 1px solid var(--button-additional);
            box-shadow: 0 6px 24px rgba(0, 0, 0, 0.06);
          }

          .wallet-guide-panel h2 {
            margin: 0 0 14px;
            font-size: 28px;
          }

          .wallet-guide-section-head {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
            margin-bottom: 14px;
          }

          .wallet-guide-text-link {
            color: var(--accent-link);
            font-weight: 600;
            text-decoration: none;
          }

          .wallet-guide-picks {
            display: grid;
            grid-template-columns: repeat(4, minmax(0, 1fr));
            gap: 14px;
          }

          .wallet-guide-pick {
            padding: 16px;
            border-radius: 16px;
            background: var(--background-input);
            border: 1px solid var(--button-additional);
          }

          .wallet-guide-pick-label {
            font-size: 12px;
            text-transform: uppercase;
            letter-spacing: 0.08em;
            color: var(--accent-link);
            font-weight: 700;
          }

          .wallet-guide-pick-wallet {
            margin-top: 8px;
            font-size: 20px;
            font-weight: 700;
          }

          .wallet-guide-pick p {
            margin: 10px 0 0;
            color: var(--text-secondary);
            line-height: 1.5;
          }

          .wallet-guide-table-wrap {
            overflow-x: auto;
          }

          .wallet-guide-table {
            width: 100%;
            border-collapse: collapse;
          }

          .wallet-guide-table th,
          .wallet-guide-table td {
            padding: 14px 12px;
            border-bottom: 1px solid var(--button-additional);
            text-align: left;
            vertical-align: top;
          }

          .wallet-guide-table th {
            font-size: 13px;
            text-transform: uppercase;
            letter-spacing: 0.06em;
            color: var(--text-secondary);
          }

          .wallet-guide-table-name {
            color: var(--text-main);
            font-weight: 700;
            text-decoration: none;
          }

          .wallet-guide-table-tag {
            margin-top: 6px;
            font-size: 12px;
            color: var(--accent-link);
            font-weight: 700;
          }

          .wallet-guide-grid {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 18px;
            margin: 18px 0;
          }

          .wallet-guide-card {
            display: flex;
            flex-direction: column;
            padding: 22px;
            border-radius: 20px;
            background: linear-gradient(180deg, var(--background-main), var(--background-input));
            border: 1px solid var(--button-additional);
            box-shadow: 0 8px 28px rgba(0, 0, 0, 0.07);
          }

          .wallet-guide-card-top {
            display: flex;
            align-items: flex-start;
            justify-content: space-between;
            gap: 16px;
          }

          .wallet-guide-card-tag {
            display: inline-block;
            padding: 5px 10px;
            border-radius: 999px;
            background: rgba(11, 122, 117, 0.12);
            color: #0b7a75;
            font-size: 12px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.06em;
          }

          .wallet-guide-card h3 {
            margin: 10px 0 0;
            font-size: 28px;
          }

          .wallet-guide-card-link {
            font-size: 14px;
            font-weight: 700;
            color: var(--accent-link);
            text-decoration: none;
            white-space: nowrap;
          }

          .wallet-guide-card-bestfor {
            margin: 14px 0 0;
            font-size: 17px;
            line-height: 1.55;
          }

          .wallet-guide-meta {
            display: flex;
            flex-wrap: wrap;
            gap: 12px;
            margin: 18px 0;
          }

          .wallet-guide-meta div {
            flex: 1 1 180px;
            min-width: 0;
            padding: 12px;
            border-radius: 14px;
            background: var(--background-input);
            border: 1px solid var(--button-additional);
          }

          .wallet-guide-meta span {
            display: block;
            font-size: 12px;
            text-transform: uppercase;
            letter-spacing: 0.06em;
            color: var(--text-secondary);
            margin-bottom: 6px;
          }

          .wallet-guide-meta strong {
            display: block;
            line-height: 1.5;
          }

          .wallet-guide-card ul {
            margin: 0 0 18px 18px;
            padding: 0;
            line-height: 1.6;
            flex: 1;
          }

          .wallet-guide-card-cta {
            width: 100%;
            margin-top: auto;
            box-sizing: border-box;
          }

          .wallet-guide-disclaimer p {
            color: var(--text-secondary);
            line-height: 1.65;
          }

          @media (max-width: 980px) {
            .wallet-guide-picks,
            .wallet-guide-grid {
              grid-template-columns: 1fr;
            }

            .wallet-guide-card-top,
            .wallet-guide-section-head {
              flex-direction: column;
              align-items: flex-start;
            }

            .wallet-guide-meta div {
              flex-basis: 100%;
            }
          }
        `}</style>
      </div>
    </>
  )
}

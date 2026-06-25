import { useState } from 'react'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import Link from 'next/link'

import Breadcrumbs from '../../components/Breadcrumbs'
import SEO from '../../components/SEO'
import CopyButton from '../../components/UI/CopyButton'
import { network, xahauNetwork } from '../../utils'
import { getIsSsrMobile } from '../../utils/mobile'

const APT_INSTALL_TEMPLATE = (repoCodename) => `
sudo apt -y update
sudo apt -y install apt-transport-https ca-certificates wget gnupg

sudo install -m 0755 -d /etc/apt/keyrings
wget -qO- https://repos.ripple.com/repos/api/gpg/key/public | sudo gpg --dearmor -o /etc/apt/keyrings/ripple.gpg
gpg --show-keys /etc/apt/keyrings/ripple.gpg

echo "deb [signed-by=/etc/apt/keyrings/ripple.gpg] https://repos.ripple.com/repos/rippled-deb ${repoCodename} stable" | sudo tee /etc/apt/sources.list.d/ripple.list

sudo apt -y update
sudo apt -y install xrpld
`

const INSTALL_TARGETS = [
  {
    key: 'ubuntu-24',
    label: 'Ubuntu 24.04',
    packageType: 'deb',
    note: 'Ubuntu 24.04 Noble Numbat is supported on x86_64 and uses the stable deb repository.',
    details: [
      'Highest support and testing level for Ubuntu 24.04 on x86_64.',
      'The repository codename is noble.',
      'After gpg --show-keys, check that the key belongs to Ripple TechOps Team.',
      'The xrpld service should start automatically after installation.'
    ],
    command: APT_INSTALL_TEMPLATE('noble')
  },
  {
    key: 'ubuntu-22',
    label: 'Ubuntu 22.04',
    packageType: 'deb',
    note: 'Ubuntu 22.04 Jammy Jellyfish is supported on x86_64 and uses the stable deb repository.',
    details: [
      'Highest support and testing level for Ubuntu 22.04 on x86_64.',
      'The repository codename is jammy.',
      'After gpg --show-keys, check that the key belongs to Ripple TechOps Team.',
      'The xrpld service should start automatically after installation.'
    ],
    command: APT_INSTALL_TEMPLATE('jammy')
  },
  {
    key: 'debian-12',
    label: 'Debian 12',
    packageType: 'deb',
    note: 'Debian 12 Bookworm has xrpld packages available through the stable deb repository.',
    details: [
      'Use Debian 12 Bookworm on x86_64.',
      'The repository codename is bookworm.',
      'After gpg --show-keys, check that the key belongs to Ripple TechOps Team.',
      'The xrpld service should start automatically after installation.'
    ],
    command: APT_INSTALL_TEMPLATE('bookworm')
  },
  {
    key: 'rhel-9',
    label: 'RHEL 9.6',
    packageType: 'rpm',
    note: 'RHEL 9.6 is supported on x86_64 and uses the stable RPM repository.',
    details: [
      'Use Red Hat Enterprise Linux 9.6 on x86_64.',
      'The repository name is ripple-stable.',
      'The commands reload systemd, enable xrpld on boot, and start the service.',
      'Use the stable repository for production validators.'
    ],
    command: `
cat << REPOFILE | sudo tee /etc/yum.repos.d/ripple.repo
[ripple-stable]
name=XRP Ledger Packages
enabled=1
gpgcheck=0
repo_gpgcheck=1
baseurl=https://repos.ripple.com/repos/rippled-rpm/stable/
gpgkey=https://repos.ripple.com/repos/rippled-rpm/stable/repodata/repomd.xml.key
REPOFILE

sudo yum -y update
sudo yum install -y xrpld
sudo systemctl daemon-reload
sudo systemctl enable xrpld.service
sudo systemctl start xrpld.service
`
  }
]

const INSTALL_BUTTON_BASE =
  'min-h-[46px] rounded-md border-2 px-4 py-2 text-center font-semibold leading-tight transition-colors focus:outline-none focus:ring-2 focus:ring-[#008C95] focus:ring-offset-2 dark:focus:ring-offset-gray-950'
const INSTALL_BUTTON_ACTIVE = `${INSTALL_BUTTON_BASE} border-[#008C95] bg-[#008C95] text-white`
const INSTALL_BUTTON_IDLE = `${INSTALL_BUTTON_BASE} border-[#008C95] bg-transparent text-[#008C95] hover:bg-[#E4F3F5] dark:hover:bg-[#0A3940]`

function CodeBlock({ children, copy = true }) {
  const code = String(children).trim()

  return (
    <div
      className="not-prose"
      style={{
        position: 'relative',
        margin: '16px 0',
        overflow: 'hidden',
        border: '1px solid #263348',
        borderRadius: 10,
        background: '#050A1A',
        color: '#E8EEF8',
        boxShadow: '0 4px 14px rgba(0, 0, 0, 0.18)'
      }}
    >
      {copy && (
        <span
          style={{
            position: 'absolute',
            top: 14,
            right: 14,
            zIndex: 2,
            lineHeight: 1
          }}
        >
          <CopyButton text={code} size={18} clickTooltipOnly />
        </span>
      )}
      <pre
        style={{
          margin: 0,
          overflowX: 'auto',
          padding: copy ? '18px 56px 18px 20px' : '18px 20px',
          background: 'transparent',
          color: 'inherit',
          borderRadius: 0,
          fontSize: 14,
          lineHeight: 1.55,
          whiteSpace: 'pre'
        }}
      >
        <code>{code}</code>
      </pre>
    </div>
  )
}

export async function getServerSideProps(context) {
  const { locale } = context
  return {
    props: {
      isSsrMobile: getIsSsrMobile(context),
      ...(await serverSideTranslations(locale, ['common']))
    }
  }
}

export default function RunAValidator() {
  const [installTargetKey, setInstallTargetKey] = useState(INSTALL_TARGETS[0].key)
  const installTarget = INSTALL_TARGETS.find((target) => target.key === installTargetKey) || INSTALL_TARGETS[0]

  return (
    <>
      <SEO
        title="How to Run an XRP Ledger Validator"
        description="A practical step-by-step guide to install xrpld, configure validator keys, connect safely, and check an XRPL validator on Bithomp."
        noindex={network !== 'mainnet' || xahauNetwork}
        image={{ file: '/images/xrplexplorer/previews/1200x630/validators.png', width: 1200, height: 630 }}
      />
      <div className="max-w-4xl mx-auto px-4">
        <Breadcrumbs />
        <article className="prose sm:prose-lg dark:prose-invert mx-auto my-10">
          <h1>How to Run an XRP Ledger Validator</h1>
          <p>
            This is a quick practical guide for running <code>xrpld</code> in validator mode on the XRP Ledger. Keep the
            validator dedicated, private, updated, and monitored.
          </p>

          <h2>1. Prepare the Server</h2>
          <p>For production, use a dedicated bare-metal server. The practical baseline is:</p>
          <ul>
            <li>Ubuntu 22.04 LTS, Ubuntu 24.04 LTS, Debian 12, RHEL, or another supported Linux distribution.</li>
            <li>8+ x86_64 CPU cores at 3+ GHz.</li>
            <li>64 GB RAM for production. 16 GB is only a testing minimum.</li>
            <li>Fast SSD or NVMe storage with sustained 10,000 IOPS or better.</li>
            <li>Gigabit network, stable latency, and accurate system time.</li>
          </ul>
          <p>
            Enable NTP before installing <code>xrpld</code> so the server clock stays in sync with the network:
          </p>
          <CodeBlock>
            {`
timedatectl status
sudo timedatectl set-ntp true
            `}
          </CodeBlock>
          <h2>2. Install xrpld</h2>
          <p>
            Choose your operating system and copy the matching command. Use the stable package repository for production
            validators.
          </p>
          <div className="not-prose my-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {INSTALL_TARGETS.map((target) => (
              <button
                aria-pressed={installTarget.key === target.key}
                className={installTarget.key === target.key ? INSTALL_BUTTON_ACTIVE : INSTALL_BUTTON_IDLE}
                key={target.key}
                onClick={() => setInstallTargetKey(target.key)}
                type="button"
              >
                {target.label}
              </button>
            ))}
          </div>
          <p>
            <strong>{installTarget.label}</strong> uses Ripple's <code>{installTarget.packageType}</code> package.
            {` ${installTarget.note}`}
          </p>
          <ul>
            {installTarget.details.map((detail) => (
              <li key={detail}>{detail}</li>
            ))}
          </ul>
          <CodeBlock>{installTarget.command}</CodeBlock>
          <p>Check that the service started:</p>
          <CodeBlock>
            {`
systemctl status xrpld.service
xrpld server_info
            `}
          </CodeBlock>
          <p>
            A fresh server can take several minutes to sync. Wait until <code>server_state</code> becomes{' '}
            <code>full</code> before enabling validation.
          </p>

          <h2>3. Set Your Validator Domain</h2>
          <p>
            Use your own domain if you have one and want it associated with the validator. You must be able to publish
            an <code>xrp-ledger.toml</code> file for this domain later.
          </p>
          <p>
            In the next step, use that domain in <code>./validator-keys set_domain example.com</code>, and then use the
            same domain in <code>xrp-ledger.toml</code>.
          </p>

          <h2>4. Create Validator Keys and Token</h2>
          <p>
            Generate validator keys on a secure machine, not on the validator host. Store{' '}
            <code>validator-keys.json</code> offline and backed up. Never publish it, never keep it on the validator,
            and generate one token at a time from the current backup.
          </p>
          <p>Create the master validator key file:</p>
          <CodeBlock>
            {`
cd /opt/ripple/bin
./validator-keys create_keys
            `}
          </CodeBlock>
          <p>Example output:</p>
          <CodeBlock copy={false}>
            {`
Validator keys stored in /home/validator-admin/.ripple/validator-keys.json
            `}
          </CodeBlock>
          <p>
            Set the domain in the validator key file before you configure the server. This updates the manifest and
            prints both the domain attestation and the validator token that belongs in <code>xrpld.cfg</code>.
          </p>
          <CodeBlock>
            {`
./validator-keys set_domain example.com
            `}
          </CodeBlock>
          <p>Example output format:</p>
          <CodeBlock copy={false}>
            {`
The domain name has been set to: example.com

The domain attestation for validator nHUtNnLVx7odrz5dnfb2xpIgbEeJPbzJWfdicSkGyVw1eE5GpjQr is:

attestation="A59AB577E14A7BEC053752FBFE78C3DED6DCEC81A7C41DF1931BC61742BB4FAEAA0D4F1C1EAE5BC74F6D68A3B26C8A223EA2492A5BD18D51F8AC7F4A97DFBE0C"

You should include it in your xrp-ledger.toml file in the
section for this validator.

You also need to update the xrpld.cfg file to add a new
validator token and restart xrpld:

Update xrpld.cfg file with these values:

# validator public key: nHUtNnLVx7odrz5dnfb2xpIgbEeJPbzJWfdicSkGyVw1eE5GpjQr
[validator_token]
eyJ2YWxpZGF0aW9uX3NlY3J...example...
QzODdjMDYyNTkwNzk3MmY0ZTcx...example...
VUSmEydzBpMjFlcTNNWXl3TFZKWm5GT3I3QzBrdzJBaVR6U0NqSXpkaXRROD0ifQ==
            `}
          </CodeBlock>
          <p>
            Do not copy the sample token above; copy the token from your own terminal. Copy only the{' '}
            <code>[validator_token]</code> block to the validator server. Keep the <code># validator public key</code>{' '}
            line somewhere safe; you will need it for TOML and for checking the validator on Bithomp.
          </p>
          <p>
            If you later need to rotate a token without changing the domain, the command has the same output format:
          </p>
          <CodeBlock>
            {`
./validator-keys create_token --keyfile /home/validator-admin/.ripple/validator-keys.json
            `}
          </CodeBlock>
          <p>
            Store the updated <code>validator-keys.json</code> backup after every command that generates a new token.
          </p>

          <h2>5. Configure the Validator</h2>
          <p>
            Back up the config, then edit <code>/etc/xrpld/xrpld.cfg</code>:
          </p>
          <CodeBlock>
            {`
sudo cp /etc/xrpld/xrpld.cfg /etc/xrpld/xrpld.cfg.backup
sudo nano /etc/xrpld/xrpld.cfg
            `}
          </CodeBlock>
          <p>
            Add the token printed by <code>set_domain</code>:
          </p>
          <CodeBlock>
            {`
# validator public key: nH...
[validator_token]
PASTE_THE_TOKEN_HERE
            `}
          </CodeBlock>
          <p>For a practical first setup, connect through known public hubs and keep your validator private.</p>
          <CodeBlock>
            {`
[ips_fixed]
r.ripple.com 51235
sahyadri.isrdc.in 51235
hubs.xrpkuwait.com 51235
hub.xrpl-commons.org 51235

[peer_private]
1
            `}
          </CodeBlock>
          <p>Restrict the config file and restart:</p>
          <CodeBlock>
            {`
sudo chmod 600 /etc/xrpld/xrpld.cfg
sudo systemctl restart xrpld.service
            `}
          </CodeBlock>

          <h2>6. Check That It Is Live</h2>
          <p>
            First check locally. The validator public key should match the key created by <code>validator-keys</code>,
            and <code>server_state</code> should normally settle on <code>proposing</code>.
          </p>
          <CodeBlock>
            {`
xrpld server_info
xrpld peers
xrpld validators
            `}
          </CodeBlock>
          <p>Useful live log command:</p>
          <CodeBlock>
            {`
journalctl -u xrpld.service -f
            `}
          </CodeBlock>

          <h3>Check on Bithomp</h3>
          <p>
            Run <code>server_info</code> and copy the <code>pubkey_validator</code> value from the output:
          </p>
          <CodeBlock>
            {`
xrpld server_info
            `}
          </CodeBlock>
          <p>
            Then open <code>https://bithomp.com/validator/YOUR_VALIDATOR_PUBLIC_KEY</code>, or search for it on the{' '}
            <Link href="/validators">Bithomp Validators page</Link>. It may take time to appear the first time, because
            the validator must be seen by the network and indexed by Bithomp.
          </p>
          <p className="not-prose">
            <Link href="/validators" className="button-action secondary">
              Open Validators
            </Link>
          </p>

          <h2>7. Publish TOML Domain Verification</h2>
          <p>
            After the domain is set in the validator keys and the validator token is installed in <code>xrpld.cfg</code>
            , publish the matching <code>xrp-ledger.toml</code>. Serve it over HTTPS at:
          </p>
          <CodeBlock>
            {`
https://example.com/.well-known/xrp-ledger.toml
            `}
          </CodeBlock>
          <p>
            Minimal validator entry. Use your validator public key and attestation from the <code>set_domain</code>
            output.
          </p>
          <CodeBlock>
            {`
[METADATA]
modified = 2026-05-20T00:00:00.000Z

[[PRINCIPALS]]
name = "Bithomp"
email = "validator@example.com"
x = "bithomp"

[[VALIDATORS]]
public_key = "nHB8QMKGt9VB4Vg71VszjBVQnDW3v3QudM4DwFaJfy96bj4Pv9fA"
attestation = "9537FBEBC7A676E8748F9D18FF5BD48662B6D811033F34C807E58B99B91484D22B26F56FC7E6B9B8D2233DD5F0DCF9462C3B264411964A93F0173D512F19F002"
network = "main"
owner_country = "US"
server_country = "DE"
network_asn = 24940
server_location = "HETZNER-AS, DE"
server_cloud = true
unl = "https://unl.xrplf.org"
            `}
          </CodeBlock>
          <p>Check that the file is reachable and validate it on Bithomp:</p>
          <CodeBlock>
            {`
curl -fsSL https://example.com/.well-known/xrp-ledger.toml
            `}
          </CodeBlock>
          <p>
            You can also use the <Link href="/services/toml-checker">Bithomp TOML checker</Link> to inspect the file.
          </p>

          <h2>Quick Troubleshooting</h2>
          <ul>
            <li>
              <strong>No peers:</strong> check firewall rules, outbound access, and the <code>[ips_fixed]</code> hosts.
            </li>
            <li>
              <strong>Not proposing:</strong> wait for sync, check system time, check <code>xrpld server_info</code>,
              and read <code>journalctl -u xrpld.service</code>.
            </li>
            <li>
              <strong>Validator list expired:</strong> check outbound HTTPS access and validator list configuration.
            </li>
            <li>
              <strong>Public key mismatch:</strong> confirm that the token in <code>xrpld.cfg</code> was generated from
              the key file you backed up.
            </li>
          </ul>
        </article>
      </div>
    </>
  )
}

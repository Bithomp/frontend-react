import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import SEO from '../../components/SEO'
import { getIsSsrMobile } from '../../utils/mobile'
import { network } from '../../utils'
import Link from 'next/link'
import Image from 'next/image'
import Breadcrumbs from '../../components/Breadcrumbs'

export async function getServerSideProps(context) {
  const { locale } = context
  return {
    props: {
      isSsrMobile: getIsSsrMobile(context),
      ...(await serverSideTranslations(locale, ['common']))
    }
  }
}

export default function AccountPage() {
  const imagePath = '/images/xrplexplorer/learn/account-page/'
  return (
    <>
      <SEO
        title={'How to Analyze Any XRP Account with Bithomp'}
        description="Complete guide to analyzing XRP accounts using Bithomp, including balances, NFTs, trust lines, account settings, and transaction history."
        noindex={network !== 'mainnet'}
      />
      <div className="px-4">
        <Breadcrumbs />

        <article className="prose sm:prose-lg dark:prose-invert max-w-4xl mx-auto my-10">
          <h1>How to Analyze Any XRP Ledger Account with Bithomp</h1>

          <p>
            The XRP Ledger is highly transparent. Every payment, trust line, NFT, offer, escrow, check, AMM position,
            and account setting is permanently recorded on-chain and publicly verifiable.
          </p>

          <p>The challenge isn't accessing the data—it's understanding what it means.</p>

          <p>
            The XRP Ledger account can contain hundreds of ledger objects, multiple issued tokens, NFT activity,
            liquidity positions, trust lines, payment history, escrows, checks, and different account settings. Looking
            at raw blockchain data can quickly become overwhelming, even for experienced XRPL users.
          </p>

          <p>
            The Bithomp Account Page transforms that raw blockchain data into a complete XRP Ledger account explorer.
            Instead of displaying isolated ledger objects, it organizes everything associated with an XRPL account into
            a single, interactive profile that helps you understand both the current state of the account and its
            historical activity.
          </p>

          <p>
            Whether you're researching another wallet, performing due diligence before buying a token, investigating a
            project, auditing an issuer account, or managing your own wallet, the Account Page provides one of the most
            comprehensive views available anywhere on the XRP Ledger.
          </p>

          <h3>What You'll Learn</h3>

          <p>In this guide you'll learn how to:</p>

          <ul>
            <li>Analyze any XRP Ledger account.</li>
            <li>Investigate token issuers, projects, and service accounts.</li>
            <li>Evaluate account activity and security configuration.</li>
            <li>Manage your own XRPL account after connecting your wallet.</li>
          </ul>

          <h2>Scenario 1: Analyzing a Regular XRP Ledger Account</h2>

          <p>
            Example: <Link href="/account/coov">bithomp.com/account/coov</Link>.
          </p>
          <p>
            When you open any XRP Ledger account in Bithomp, you'll find far more than a wallet balance. The Account
            Page provides a complete overview of an account's activity, assets, relationships, and configuration,
            allowing you to understand how the account is used and how it has evolved over time.
          </p>
          <figure className="prose sm:prose-lg dark:prose-invert max-w-4xl mx-auto my-10">
            <Image
              src={imagePath + 'screen.png'}
              alt="Account Page"
              width={1520}
              height={950}
              className="w-full h-auto"
            />
            <figcaption className="text-center">XRP Ledger account page</figcaption>
          </figure>
          <p>Let's examine each section.</p>

          <h3>XRPL Username</h3>

          <p>
            If an account has a registered username, it appears at the top of the profile, directly below the avatar.
          </p>

          <p>
            An XRPL Username is a human-readable identifier linked to an XRP Ledger account. Instead of sharing a long
            wallet address, users can identify themselves with an easy-to-recognize name across the XRPL ecosystem.
          </p>

          <p>
            Besides making accounts easier to recognize, usernames help reduce mistakes when sharing addresses and
            improve the overall user experience. Besides, some third-party apps, like Xaman, are using Bithomp
            usernames.
          </p>
          <figure className="max-w-[700px] mx-auto">
            <Image src={imagePath + 'username.png'} alt="Username" width={732} height={722} className="w-full h-auto" />
            <figcaption className="text-center">Bithomp Username</figcaption>
          </figure>
          <div className="p-4 my-4 border-l-4 rounded bg-white dark:bg-gray-900 border-[#4BA8B6] shadow-sm">
            <p className="text-gray-800 dark:text-gray-200">
              <span role="img" aria-label="lamp">
                💡
              </span>{' '}
              <Link href="/username">Register your username here</Link>
            </p>
          </div>

          <h3>Activity Status</h3>

          <p>Example: Active: 19 hours ago</p>

          <p>
            The activity status shows when the account was last active on the XRP Ledger. While simple, this is one of
            the quickest ways to determine whether an account is actively used or has been dormant for an extended
            period.
          </p>

          <p>
            Although activity alone doesn't reveal the full story, it provides valuable context before analyzing
            balances, transactions, or assets.
          </p>

          <h3>Identity Signals (PayString, Aliases, and KYC)</h3>

          <p>Some accounts include additional identity information beyond the blockchain address.</p>

          <ul>
            <li>PayString — a human-readable payment identifier that simplifies sending and receiving payments.</li>
            <li>Wallet aliases — alternative names used within supported wallet ecosystems.</li>
            <li>
              Xaman KYC verification — an indication that the account owner has completed identity verification in
              Xaman.
            </li>
          </ul>

          <h3>Activation Information</h3>

          <p>
            The Activation Information section shows when the account was activated and which account funded its initial
            reserve.
          </p>

          <p>
            This historical context is often useful when researching projects, exchanges, businesses, or large wallet
            ecosystems, as activation patterns can reveal relationships that are not immediately visible from
            transaction history alone.
          </p>

          <h4>Activation Tree</h4>

          <p>
            One of Bithomp's distinctive features is <Link href="/activation-tree">the Activation Tree.</Link>
          </p>
          <figure className="max-w-[700px] mx-auto">
            <Image
              src={imagePath + 'family-tree-icon.png'}
              alt="Username"
              width={754}
              height={300}
              className="w-full h-auto"
            />
            <figcaption className="text-center">Activation Tree</figcaption>
          </figure>
          <p>
            By opening the Family Tree, you can visualize an account's "parents" and "children"—the accounts that
            activated it and those it subsequently activated.
          </p>

          <p>
            This makes it easier to investigate organizational wallet structures, project wallet hierarchies, and
            exchange accounts. It also helps identify potential fraud risks at a glance by revealing whether the account
            has activated suspicious accounts or was itself activated by an account associated with fraudulent activity.
          </p>
          <h3>Other Sections</h3>

          <p>
            If the account acts as an NFT Minter or a Signer for other addresses—or has an assigned NFT Minter—these
            relationships are also displayed, providing additional insight into how the account interacts with the wider
            XRP Ledger ecosystem.
          </p>
          <figure className="max-w-[700px] mx-auto">
            <Image src={imagePath + 'signer.jpg'} alt="Username" width={1067} height={616} className="w-full h-auto" />
            <figcaption className="text-center">Signer for other accounts</figcaption>
          </figure>
          <h3>Account and Issuer Settings</h3>

          <p>
            The Account Settings section is one of the most important parts of the Account Page and should always be
            reviewed when analyzing an XRPL account.
          </p>

          <p>
            Account and issuer settings define how an address behaves on the XRP Ledger, what transactions it accepts,
            and which security or operational restrictions are enabled.
          </p>

          <p>
            These configuration flags often reveal valuable information about the account's intended purpose, security
            model, and level of control.
          </p>
          <div className="grid grid-cols-2 gap-6 my-8">
            <figure>
              <Image
                src={imagePath + 'account-settings.png'}
                alt="Account Settings"
                width={714}
                height={474}
                className="w-full h-auto"
              />
              <figcaption className="text-center">Account Settings</figcaption>
            </figure>

            <figure>
              <Image
                src={imagePath + 'issuer-settings.png'}
                alt="Issuer Settings"
                width={714}
                height={616}
                className="w-full h-auto"
              />
              <figcaption className="text-center">Issuer Settings</figcaption>
            </figure>
          </div>
          <p>Some of the most important settings include:</p>

          <h4>Require Destination Tag (asfRequireDest)</h4>

          <p>The account requires a destination tag for incoming payments.</p>

          <p>
            This setting is commonly enabled by exchanges, custodial wallets, and payment providers that use a single
            wallet for multiple users. Sending XRP without the required destination tag may result in delayed processing
            or lost funds.
          </p>

          <h4>Require Authorization (asfRequireAuth)</h4>

          <p>The issuer must explicitly approve trust lines before another account can hold its issued tokens.</p>

          <p>
            This feature is typically used by regulated issuers, enterprise projects, or permissioned token ecosystems
            that need to control who can hold or transact with their assets.
          </p>

          <h4>No Freeze (asfNoFreeze)</h4>

          <p>This flag permanently disables the issuer's ability to freeze trust lines.</p>

          <p>
            For token holders, this can be an important trust signal because it demonstrates that the issuer has
            voluntarily given up the ability to freeze user assets in the future.
          </p>

          <h4>Global Freeze (asfGlobalFreeze)</h4>

          <p>
            If enabled, this setting allows an issuer to freeze all trust lines associated with a specific issued
            currency.
          </p>

          <p>
            Although rarely used, it represents an important element of issuer-level control and should always be
            considered when evaluating an issued asset.
          </p>

          <h3>Signer Lists and Multi-Signature Configuration</h3>

          <p>
            If an account uses Signer Lists or a multi-signature (multisig) configuration, control of the wallet is
            distributed across multiple authorized parties rather than a single private key.
          </p>

          <p>This usually indicates a higher level of operational security.</p>

          <p>It may also suggest that the account belongs to:</p>

          <ul>
            <li>a treasury wallet;</li>
            <li>an exchange;</li>
            <li>a business or organization;</li>
            <li>an infrastructure provider;</li>
          </ul>
          <p>
            Clusters of shared signers across multiple accounts can also reveal relationships between wallets that
            belong to the same organization or ecosystem.
          </p>

          <h3>Historical View: Analyze an Account at Any Point in Time</h3>

          <p>The current state of an account only tells part of the story.</p>

          <p>
            One of Bithomp's powerful analytical features is the ability to view an XRP Ledger account exactly as it
            existed at a specific date and time.
          </p>
          <figure className="prose sm:prose-lg dark:prose-invert max-w-4xl mx-auto my-10">
            <Image
              src={imagePath + 'historical-mode.png'}
              alt="Account Page"
              width={1520}
              height={950}
              className="w-full h-auto"
            />
            <figcaption className="text-center">XRP Ledger account page - Historical Mode</figcaption>
          </figure>
          <p>
            Rather than analyzing only the latest ledger state, you can inspect historical balances, ledger objects, and
            account configuration from virtually any point in its history.
          </p>

          <p>This allows you to answer questions such as:</p>

          <ul>
            <li>How did XRP and token balances change over time?</li>
            <li>When were trust lines created or removed?</li>
            <li>When did NFTs appear or leave the account?</li>
            <li>How did a project's treasury change throughout different market cycles?</li>
          </ul>
          <p>You can easily share the link to show an account’s past state. <Link href="/account/rBodLLeMx7mqEBv4B2BsaWeTJYnALQddd6?ledgerTimestamp=2025-07-02T12%3A00%3A59.000Z">Example</Link>.</p>
          <p>
            This feature transforms the Account Page from a simple blockchain explorer into a historical analysis tool,
            making it significantly easier to investigate wallet behavior, monitor projects, or perform blockchain
            research.
          </p>
          <h3>Total Worth: Understanding the Complete Portfolio</h3>

          <p>Most blockchain explorers focus primarily on account balances.</p>

          <p>
            Bithomp XRP Explorer goes much further by estimating the Total Worth of an XRP Ledger portfolio, giving users a broader
            view of an account's assets.
          </p>
          <figure className="max-w-[700px] mx-auto">
            <Image
              src={imagePath + 'total-worth.png'}
              alt="Username"
              width={1434}
              height={974}
              className="w-full h-auto"
            />
            <figcaption className="text-center">Total Worth section</figcaption>
          </figure>
          <p>
            Instead of reviewing each asset separately, users can quickly understand the overall size and composition of
            a portfolio.
          </p>

          <h3>XRP Balance and Reserve: Where Is Your XRP Locked?</h3>

          <p>One of the most frequently misunderstood aspects of the XRP Ledger is the XRP reserve requirement.</p>

          <p>
            Many users notice that part of their XRP balance cannot be spent and assume the funds are locked or missing.
            In reality, the XRP Ledger permanently reserves a minimum amount of XRP to support the account itself and
            additional ledger objects.
          </p>

          <p>
            By opening the XRP Balance section and selecting Show Details, you can see exactly how much XRP is reserved
            and why.
          </p>
          <p>
  Reserve allocations may include: trust Lines, open DEX offers, checks, escrows, NFT pages, signer lists, etc.
</p>
<figure className="max-w-[700px] mx-auto">
            <Image
              src={imagePath + 'reserves.png'}
              alt="Username"
              width={1434}
              height={974}
              className="w-full h-auto"
            />
            <figcaption className="text-center">XRP Reserves</figcaption>
          </figure>
          <p>
            Rather than displaying a single balance, Bithomp XRP Explorer provides a detailed breakdown of reserved XRP, making it
            easy to understand how the account's reserve is calculated.
          </p>

          <p>
            This feature answers one of the most common questions among new XRPL users and helps explain why the
            available balance is lower than the total XRP balance.
          </p>

          <h3>Token Holdings: Understanding an Account's Interests</h3>

          <p>An account's token portfolio often reveals much more than its XRP balance.</p>

          <p>
            Tokens can provide valuable insight into the communities, projects, and ecosystems the account interacts
            with.
          </p>

          <p>The composition of a portfolio often reflects user behavior.</p>

          <p>
            When combined with transaction history, token holdings become a powerful tool for understanding how an
            account participates in the XRP Ledger ecosystem.
          </p>
          <h3>Transaction History: Understanding Wallet Behavior</h3>

          <p>Transaction history provides one of the clearest ways to understand how an XRP Ledger account is used.</p>

          <p>
            While balances show what an account currently owns, transactions reveal how those assets were acquired,
            transferred, or managed over time.
          </p>

          <p>Even a relatively short period of activity can reveal recognizable patterns.</p>

          <p>For example, you may be able to identify:</p>

          <ul>
            <li>Active traders</li>
            <li>Long-term investors</li>
            <li>NFT collectors</li>
            <li>Market makers</li>
            <li>Liquidity providers</li>
            <li>Business accounts</li>
            <li>Exchange wallets</li>
            <li>Personal wallets</li>
          </ul>
          <p>
            Looking beyond individual transactions and focusing on recurring patterns often provides a much better
            understanding of an account than balances alone.
          </p>

          <h3>NFT Holdings and NFT Activity</h3>

          <p>NFT activity adds another layer to XRP Ledger account analysis.</p>

          <p>
            Account pages on Bithomp allow users to review both current NFT holdings and historical NFT activity, making it
            easier to research collectors, creators, marketplaces, and NFT projects.
          </p>

          <p>Users can scan:</p>

          <ul>
            <li>Owned NFTs</li>
            <li>Minted NFTs</li>
            <li>NFT collections</li>
            <li>Buy offers</li>
            <li>Sell offers</li>
            <li>NFT trading history</li>
          </ul>

          <p>
            NFT activity often reveals interests, community involvement, and creator relationships that may not be
            visible through token balances or payment history alone.
          </p>

          <p>
            For collectors, it provides a complete overview of their portfolio. For researchers, it helps identify
            project creators, early supporters, and active participants within NFT communities.
          </p>

          <h3>Before Moving to Project Accounts</h3>

          <p>
            By this point, you've analyzed a standard XRP Ledger account from multiple perspectives—including its
            identity, activity, relationships, security settings, assets, portfolio, and transaction history.
          </p>

          <p>However, not every account on the XRP Ledger represents an individual user.</p>

          <p>
            Projects, token issuers, exchanges, and other services often expose additional information that differs from regular wallets.
          </p>

          <p>
            In the next section, we'll explore how to explore service accounts and what additional insights they
            provide.
          </p>
          <h2>Scenario 2: Scanning a Project or Service XRP Ledger Account</h2>

          <p>
            Project, issuer, and service accounts contain a little bit more information than a regular XRPL wallet. When
            researching a project, these additional details can help verify its legitimacy, understand its
            infrastructure, and evaluate potential risks before interacting with its assets.
          </p>
      
      
          <h3>1. Verified Service Profile</h3>

          <p>
            One of the first differences you'll notice is that verified service accounts display their service name in
            green, along with links to their official website and social media profiles.
          </p>
          <figure className="prose sm:prose-lg dark:prose-invert max-w-4xl mx-auto my-10">
            <Image
              src={imagePath + 'service-screen.png'}
              alt="Service-account"
              width={1520}
              height={950}
              className="w-full h-auto"
            />
            <figcaption className="text-center">XRP Ledger Service Account Page</figcaption>
          </figure>
          <p>
            This helps users quickly distinguish verified organizations from ordinary wallet addresses and reduces the
            risk of interacting with impersonators or unofficial accounts.
          </p>

          <h3>2. Domain Verification and XRPL TOML File</h3>

          <p>
            For service accounts, Bithomp also displays whether the project's domain has been verified and provides
            direct access to its XRPL TOML file.
          </p>
          <p>
  The TOML file serves as the project's official on-chain directory and may include:
  project name, website, description, contact information, social media links, issued tokens, issuer accounts, validator information.
</p>
          <p>Reviewing the TOML file should be one of the first steps when evaluating any XRPL project.</p>

          <p>
            Bithomp not only allows you to inspect an existing TOML file but also provides tools for generating one for
            your own project.
          </p>

          <div className="p-4 my-4 border-l-4 rounded bg-white dark:bg-gray-900 border-[#4BA8B6] shadow-sm">
            <p className="text-gray-800 dark:text-gray-200">
              <span role="img" aria-label="lamp">
                💡
              </span>{' '}
              <Link href="/services/toml-generator">Create your XRPL TOML file here</Link>
            </p>
          </div>

          <h3>3. Analyze Issued Tokens</h3>

          <p>
            If the account is a token issuer, the Account Page displays its issued assets together with additional
            issuer information.
          </p>
          <p>
  From this section you can review: issued tokens, current price, circulating supply, number of holders, distribution metrics, trust line statistics, market activity.
</p>
          <p>These metrics help answer important questions such as:</p>

          <ul>
            <li>Is the token widely distributed or concentrated among a few holders?</li>
            <li>Is adoption growing?</li>
            <li>How many wallets currently hold the asset?</li>
            <li>Is the token actively traded and used?</li>
          </ul>

          <p>
            For anyone considering purchasing or interacting with an issued asset, these metrics provide valuable
            context that goes far beyond the token price alone.
          </p>

          <h3>Issuer Settings</h3>
          <figure className="prose sm:prose-lg dark:prose-invert max-w-4xl mx-auto my-10">
            <Image
              src={imagePath + 'token-issuer.png'}
              alt="Service-account"
              width={1520}
              height={950}
              className="w-full h-auto"
            />
            <figcaption className="text-center">Token Issuer Account Page</figcaption>
          </figure>
          <p>When investigating a token issuer, always review its issuer settings.</p>

          <p>One of the most important indicators is whether the issuer has been blackholed or not.</p>

          <p>
            A blackholed issuer account has permanently disabled its master key, meaning it can no longer modify account settings or issue more tokens.
          </p>

          <div className="p-4 my-4 border-l-4 rounded bg-white dark:bg-gray-900 border-[#4BA8B6] shadow-sm">
            <p className="text-gray-800 dark:text-gray-200">
              <span role="img" aria-label="lamp">
                💡
              </span>{' '}
              <Link href="/learn/blackholed-address">View more about blackholed accounts on XRP Ledger</Link>
            </p>
          </div>

          <p>
            Understanding whether an issuer is blackholed is an important part of token due diligence and should always
            be considered alongside other issuer settings such as RequireAuth, NoFreeze, Transfer Fee, and Global Freeze.
          </p>

          <h2>Scenario 3: Managing Your Own XRP Ledger Account</h2>

          <p>After connecting your wallet, your Account Page on Bithomp XRP Explorer becomes more than just a blockchain explorer.</p>

          <p>
            It transforms into a complete account management dashboard, allowing you to perform many common XRPL
            operations without leaving the page.
          </p>

          <p>
            This reduces the need to switch between multiple applications and makes day-to-day account management
            significantly more convenient.
          </p>

          <h3>Manage Account Settings</h3>

          <p>
            Open Account Settings from the Account Page to access the settings panel, where you can configure your XRPL
            account.
          </p>

          <p>You can:</p>

          <ul>
            <li>enable or disable Require Destination Tag flag</li>
            <li>disable incoming NFT offers</li>
            <li>update security-related settings</li>
            <li>configure various account flags</li>
            <li>blackhole an issuer account after issuing a token, and much more.</li>
          </ul>

          <p>
            Having these tools available in one place simplifies account administration and reduces the chance of
            configuration mistakes.
          </p>

          <h3>Send XRP and Issued Tokens</h3>

          <p>You can send XRP and issued tokens directly from your account page.</p>

          <p>Simply select the asset, click Send, and complete the transaction.</p>
          <div className="grid grid-cols-2 gap-6 my-8">
            <figure>
              <Image
                src={imagePath + 'send.png'}
                alt="Sending payments on Bithomp"
                width={714}
                height={474}
                className="w-full h-auto"
              />
            </figure>

            <figure>
              <Image
                src={imagePath + 'send-panel.png'}
                alt="Issuer Settings"
                width={714}
                height={616}
                className="w-full h-auto"
              />
            </figure>
             </div>
          <p>Before signing, Bithomp automatically displays helpful information, including:</p>

          <ul>
            <li>whether the destination account has the required trust line</li>
            <li>the maximum amount available to send</li>
            <li>the XRP balance that will remain after the transaction</li>
            <li>destination tag requirements, when applicable</li>
          </ul>

          <p>These built-in checks help reduce common transaction errors before they occur.</p>
          <h3>Create and Manage Trust Lines</h3>

          <p>Trust lines can also be managed directly from the Account Page.</p>

          <p>Users can:</p>

          <ul>
            <li>review existing trust lines</li>
            <li>create new trust lines</li>
            <li>update trust line limits</li>
          </ul>

          <p>
            This makes it easier to participate in the XRP Ledger token ecosystem without switching to another wallet
            interface.
          </p>

          <h3>Manage XRPL Checks</h3>

          <p>Checks remain one of the most powerful—but often overlooked—features of the XRP Ledger.</p>

          <p>From the Account Page you can:</p>

          <ul>
            <li>review incoming checks</li>
            <li>review sent checks</li>
            <li>cash checks</li>
            <li>cancel checks</li>
          </ul>

          <div className="p-4 my-4 border-l-4 rounded bg-white dark:bg-gray-900 border-[#4BA8B6] shadow-sm">
            <p className="text-gray-800 dark:text-gray-200">
              <span role="img" aria-label="lamp">
                💡
              </span>{' '}
              <Link href="/services/check">Create XRPL check here</Link>
            </p>
          </div>

          <h3>Accept or Reject NFT Offers</h3>

          <p>After connecting your wallet, NFT offer management becomes much simpler.</p>

          <p>Without leaving the Account Page you can:</p>

          <ul>
            <li>review incoming offers</li>
            <li>accept offers</li>
            <li>cancel offers</li>
            <li>burn NFTs</li>
            <li>transfer NFTs</li>
            <li>make buy, sell offers</li>
          </ul>
          <p>
            Keeping NFT management within the same interface makes buying, selling, and managing digital collectibles
            much more efficient.
          </p>

          <h3>Personalize Your Account</h3>

          <p>Bithomp also allows users to create a recognizable public identity.</p>

          <p>
            Signed-in users can upload a profile avatar directly from the Account Page, while Bithomp PRO subscribers
            can use animated avatars.
          </p>

          <h3>Use an NFT as Your Profile Picture</h3>

          <p>
            One of the most popular customization features is the ability to use an NFT you own as your public profile
            picture.
          </p>

          <p>
            This gives collectors and creators an easy way to showcase ownership while making their account instantly
            recognizable within the XRPL community.
          </p>

          <h3>Frequently Asked Questions</h3>

          <h4>What is an XRP Ledger account?</h4>

          <p>
            An XRP Ledger (XRPL) account is a blockchain address capable of holding XRP, issued tokens, NFTs, trust
            lines, escrows, checks, AMM positions, and other ledger objects. Every account also contains settings that
            define how it behaves and interacts with the network.
          </p>

          <h4>How can I see who activated an XRPL account?</h4>

          <p>
            Every account page on Bithomp displays activation information, including the account that funded its
            creation.
          </p>

          <p>
            For a deeper investigation, open the Activation Tree, which lets you trace both the account that activated
            the wallet and any accounts it later activated. This is particularly useful when researching wallet
            networks, exchanges, or project infrastructure.
          </p>

          <h4>Why can't I spend all of my XRP?</h4>

          <p>The XRP Ledger requires every account to maintain a minimum XRP reserve.</p>

          <p>Additional XRP is reserved for ledger objects such as trust lines, open offers, checks, escrows, nfts, signer lists, etc.</p>

          <p>Bithomp provides a detailed reserve breakdown, allowing you to see exactly where your XRP is allocated.</p>

          <h4>What is a trust line on XRPL?</h4>

          <p>
            A trust line is a relationship between an XRP Ledger account and an issued currency. It allows an account to
            hold, receive, and transact with tokens issued by another account.
          </p>

          <p>Without an active trust line, an account cannot hold issued tokens.</p>
          <h4>Can I see NFTs owned by an XRP Ledger account?</h4>

          <p>Yes.</p>

          <p>
            The Bithomp Account Page displays NFTs currently owned by an account, as well as NFTs it has created,
            bought, sold, or offered for sale.
          </p>

          <h4>Can I view an account's historical state?</h4>

          <p>Yes.</p>

          <p>Bithomp allows you to view an XRP Ledger account as it existed at a specific date and time.</p>

          <p>
            Historical snapshots make it possible to analyze changes in balances, trust lines, NFTs, ledger objects, and
            account activity over time.
          </p>

          <h4>What can I learn from an account's transaction history?</h4>

          <p>Transaction history reveals how an account interacts with the XRP Ledger.</p>

          <p>
            By analyzing transaction patterns, you can often identify trading activity, liquidity provision, NFT
            collecting, treasury management, business operations, or long-term investment behavior.
          </p>

          <h4>What is an XRPL TOML file?</h4>

          <p>An XRPL TOML file is an official project configuration file associated with a verified domain.</p>

          <p>
            It may contain information about the project, its issuer accounts, issued tokens, validators, contact
            details, and official social media profiles.
          </p>

          <p>Reviewing the TOML file is one of the first steps when performing due diligence on a project.</p>

          <h4>Can I send XRP directly from the Bithomp Account Page?</h4>

          <p>Yes.</p>

          <p>
            After connecting your wallet, you can send XRP and supported issued tokens directly from the Account Page.
          </p>

          <p>
            Before signing the transaction, Bithomp automatically checks important details such as trust lines,
            destination tags, available balance, and reserve requirements.
          </p>

          <h4>Can I use Bithomp to manage my XRPL account?</h4>

          <p>Yes.</p>

          <p>
            After connecting your wallet, the Account Page becomes a management dashboard where you can send payments,
            manage trust lines, configure account settings, cash checks, manage NFT offers, and perform many other XRPL
            operations.
          </p>

          <h4>Can I use an NFT as my Bithomp profile picture?</h4>

          <p>Yes.</p>

          <p>
            If you own eligible NFTs, you can select one as your public profile picture. Bithomp PRO subscribers can
            also use animated avatars.
          </p>

          <h3>Conclusion</h3>

          <p>
            The XRP Ledger is fully transparent, but understanding the relationships between accounts, assets, and
            on-chain activity requires more than access to raw blockchain data.
          </p>

          <p>
            The Bithomp Account Page brings together balances, trust lines, NFTs, transaction history, account settings,
            issuer information, and historical data into a single interface. It not only provides a comprehensive view
            of everything associated with an XRP Ledger account but also allows users to interact directly with the XRP
            Ledger by sending payments, managing trust lines, configuring account settings, and performing many other
            on-chain actions.
          </p>
        </article>
      </div>
      <br />
      <br />
    </>
  )
}

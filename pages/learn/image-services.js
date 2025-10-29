import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import SEO from '../../components/SEO'
import { getIsSsrMobile } from '../../utils/mobile'
import { network, explorerName } from '../../utils'
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

export default function ImageServices() {
  return (
    <>
      <SEO
        title="Bithomp Image Services"
        description="Boost your Apps with Bithomp Image Services — free, high-performance avatars, token logos, NFT previews, and MPT images. Fetch usernames, service names, and visuals via Bithomp API."
        noindex={network !== 'mainnet'}
        image={{
          file: '/images/pages/learn/image-services/cover',
          width: 1520,
          height: 955,
          allNetworks: true
        }}
      />

      <div className="max-w-4xl mx-auto px-4">
        <Breadcrumbs />
        <article className="prose sm:prose-lg dark:prose-invert max-w-4xl my-10">
          <h1 className="text-center">Bithomp Image Services</h1>

          <div className="flex justify-center">
            <figure>
              <Image
                src="/images/pages/learn/image-services/cover.jpg"
                alt="Bithomp Image Services"
                width={1520}
                height={953}
                className="max-w-full h-auto object-contain"
                priority
              />
              <figcaption>Bithomp Image Services</figcaption>
            </figure>
          </div>

          <p>
            If you’re building a marketplace or an app on {explorerName}, you know visuals matter. Whether it’s NFTs,
            tokens, or wallet addresses — clean, recognizable images and names make your project stand out. That’s where
            Bithomp’s Image Services come in.
          </p>

          <h2>What we can offer</h2>

          <h3>1. Free Address Profile Images, Usernames & Service Names</h3>

          <p>
            Our Bithomp Avatar Service lets you easily display profile images, usernames, and registered service names
            for any {explorerName} address — no registration or API key required.
          </p>

          <p>Supported image sources include:</p>
          <ul>
            <li>
              <strong>Bithomp Avatars</strong> — anyone (if your account is not blackholed) can set a profile image
              directly on <Link href="/account">Account Page</Link>. Just enter your address, open your account page,
              and click “Set avatar” — it works with most popular hardware and software wallets.
            </li>
            <li>
              <strong>X (Twitter) Images</strong> — automatically updated profile images for registered projects.
            </li>
            <li>
              <strong>Xaman Pro Profiles</strong> — display user profile photos or token issuer images from Pro
              profiles.
            </li>
            <li>
              <strong>Gravatar</strong> — if an account’s email hash is linked to a Gravatar image, it will be shown
              automatically.
            </li>
            <li>
              <strong>Hashicons</strong> — automatically generated, unique icons based on the address hash — ensuring
              every account has a recognizable visual identity.
            </li>
          </ul>

          <p>Visuals are great — but names make projects and addresses truly recognizable.</p>

          <p>
            You can fetch <Link href="https://docs.bithomp.com/#username">registered usernames</Link> and{' '}
            <Link href="https://docs.bithomp.com/#services">service names</Link> through the Bithomp API, making it easy
            to display not only visuals but also verified names in your app.
          </p>

          <h4>How to get a username on Bithomp</h4>
          <div className="p-4 my-4 border-l-4 rounded bg-white dark:bg-gray-900 border-[#4BA8B6] shadow-sm">
            <p className="text-gray-800 dark:text-gray-200">
              <span role="img" aria-label="point">
                👉
              </span>{' '}
              <Link href="/username">Anyone can register a unique username here</Link>
            </p>
          </div>

          <p>
            The username will be associated with your address on our explorer and available via the Bithomp API —
            allowing third-party services and wallets (like Xaman and others) to display them.
          </p>

          <h4>How to register your project</h4>
          <div className="p-4 my-4 border-l-4 rounded bg-white dark:bg-gray-900 border-[#4BA8B6] shadow-sm">
            <p className="text-gray-800 dark:text-gray-200">
              <span role="img" aria-label="point">
                👉
              </span>{' '}
              <Link href="/submit-account-information">Register your project here</Link>
            </p>
          </div>

          <p>
            Register your project, and we’ll display its name, avatar, and public data (like social accounts) right on
            your account page.
          </p>

          <h3>2. NFT Images, Videos & Music</h3>
          <p>Every NFT deserves a good-looking preview — and we’ve made sure you get it instantly.</p>
          <p>Get direct access to resized and cached content:</p>
          <ul>
            <li>Images: 700×700 px</li>
            <li>Videos: first 15 seconds</li>
            <li>Previews: 360×360 px (image or video frame)</li>
            <li>Thumbnails: 64×64 px (image or video frame)</li>
            <li>Music files</li>
          </ul>

          <p>
            All images, videos & music files are cached and optimized for speed — perfect for NFT explorers or
            marketplaces.
          </p>
          <p>Simply fetch by NFT ID, and you’re ready to display it anywhere.</p>
          <p>
            Please contact our support team at <a href="mailto:partner@bithomp.com">partner@bithomp.com</a> if you want
            to use our cached NFT images and videos from our CDN server.
          </p>

          <h3>3. {explorerName} Token Images</h3>
          <p>Need token logos that “just work” and look great? We’ve got you covered.</p>
          <p>
            <Link href="https://docs.bithomp.com/#free-token-images">Our Free Token Image Service</Link> automatically
            delivers images for tokens across {explorerName}, using trusted and verified sources.
          </p>

          <p>Supported image sources include:</p>
          <ul>
            <li>
              <strong>Bithomp Logos</strong> – uploaded and signed by token issuers
            </li>
            <li>
              <strong>TOML Files</strong> – from issuers with a verified domain (including FirstLedger TOMLs)
            </li>
            <li>
              <strong>X (Twitter) Avatars</strong> – for projects registered on Bithomp with an X handle
            </li>
            <li>
              <strong>Gravatar</strong> – for accounts linked via email hash
            </li>
            <li>
              <strong>Xaman Pro User Profiles</strong> – for Pro users’ issued tokens
            </li>
            <li>
              <strong>Hashicons</strong> – auto-generated unique icons based on the address hash
            </li>
          </ul>

          <p>Example:</p>
          <pre>
            <code>
              &lt;img
              src="https://cdn.bithomp.com/issued-token/rMxCKbEDwqr76QuheSUMdEGf4B9xJ8m5De/524C555344000000000000000000000000000000"
              alt="token logo" /&gt;
            </code>
          </pre>

          <p>Just embed the link, and your token image appears instantly.</p>

          <p>
            <strong>Liquidity Pool Tokens</strong> — For LP tokens, the currency pair image is available, providing
            complete visual context for liquidity pairs.
          </p>

          <h3>4. Multi Purpose Token (MPT) Images & Names</h3>
          <p>We also support Multi Purpose Tokens (MPT) — with the same simplicity and performance.</p>

          <p>Supported image types:</p>
          <ul>
            <li>
              <strong>MPT Metadata Images</strong> – set directly in the token metadata
            </li>
            <li>
              <strong>Bithomp Logos</strong> – verified via signed upload
            </li>
            <li>
              <strong>TOML Files</strong> – from verified issuer domains
            </li>
            <li>
              <strong>X (Twitter) Images</strong> – for registered projects
            </li>
            <li>
              <strong>Gravatar, Xaman Pro Profiles, and Hashicons</strong>
            </li>
          </ul>

          <p>Embed the link:</p>
          <pre>
            <code>
              &lt;img src="https://cdn.bithomp.com/mptoken/00000AE825B89F24B381CABA5921FF0B634DE9111D915B2A" alt="token
              logo" /&gt;
            </code>
          </pre>

          <p>
            You can also access MPT names and metadata.{' '}
            <Link href="https://docs.bithomp.com/#mp-token">More info here</Link>.
          </p>

          <h3>5. Custom Domain Option</h3>
          <p>For just €10/month, you can serve profile images from your own domain (e.g., pfp.mydomain.com).</p>
          <p>Set up with a DNS record:</p>
          <pre>
            <code>CNAME pfp cdn.bithomp.com</code>
          </pre>
          <p>Then use avatar links like this:</p>
          <pre>
            <code>
              &lt;img src="https://pfp.mydomain.com/avatar/rEb8TK3gBgk5auZkwc6sHnwrGVJH8DuaLh" alt="avatar" /&gt;
            </code>
          </pre>

          <p>
            Contact our support team at <a href="mailto:partner@bithomp.com">partner@bithomp.com</a> if you’d like to
            enable image hosting on your custom domain.
          </p>

          <p>
            <span role="img" aria-label="heart">
              ❤️
            </span>{' '}
            Try our services and make your {explorerName} project look as good as it works.
          </p>
        </article>
      </div>
    </>
  )
}

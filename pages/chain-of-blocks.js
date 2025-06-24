import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import SEO from '../components/SEO'
import { getIsSsrMobile } from '../utils/mobile'
import { network } from '../utils'
import Link from 'next/link'
import Image from 'next/image'

export async function getServerSideProps(context) {
  const { locale } = context
  return {
    props: {
      isSsrMobile: getIsSsrMobile(context),
      ...(await serverSideTranslations(locale, ['common']))
    }
  }
}

export default function VerifiedDomains() {
  return (
    <>
      <SEO
        title={'CHAIN OF BLOCKS SUMMIT 2025 — XRPL Community in Malta'}
        description="The first XRPL community summit in Europe — September 2, 2025 in Valletta, Malta. Insights, inspiration, and IRL connection."
        noindex={network !== 'mainnet'}
        image={{ file: '/images/chain of blocks summit 2025/summit-preview.jpg', width: 'auto', height: 'auto', allNetworks: true }}
      />
      <article className="prose sm:prose-lg dark:prose-invert content-center">
        <h1>CHAIN OF BLOCKS</h1> 
         <h2>SUMMIT 2025</h2>
        <figure>
            <Image
              src={'/images/chain of blocks summit 2025/summit-preview.jpg'}
              alt="Chain of Blocks Summit 2025"
              width={402}
              height={587}
              className="max-w-full h-auto object-contain"
              priority
            />
            <figcaption>Chain of blocks Summit 2025</figcaption>
          </figure>
        <p> <strong>September 2, 2025 · Valletta, Malta</strong></p>

        <p><strong>XRPL community summit in Europe.</strong> One day of inspiration, XRPL insights, great speakers, and Web3 energy you’ll actually feel.</p>

        <h2>📍 What’s Happening</h2>
        <p>Join us on a beautiful Mediterranean island 🌞 for a full day dedicated to the XRPL. Whether you're building, investing, or just getting started — this summit is for you.</p>

        <h2>👥 Who It’s For</h2>
        <ul>
          <li><strong>Developers:</strong> technical sessions, real use cases, and live demos</li>
          <li><strong>Users:</strong> discover tools, wallets, and projects you can use right now</li>
          <li><strong>Founders & Builders:</strong> meet future partners, investors, and collaborators</li>
          <li><strong>Institutions & Regulators:</strong> we want to bridge the Web2/Web3 world</li>
        </ul>

        <h2>🤝 Brought to You By</h2>
        <p> Co-organized by Bithomp and <Link href="https://x.com/SnwoManYClub"><strong>Snwoman</strong></Link>  — an XRPL-native project focused on NFTs, RWAs, and onboarding communities into Web3.<br /></p>

        <h2>🎯 Our Goals</h2>
        <ul>
          <li>Showcase what’s being built on XRPL</li>
          <li>Onboard new users and projects</li>
          <li>Strengthen the XRPL community</li>
          <li>Create an event that feels real — and fun — on a beautiful sunny island</li>
        </ul>

        <h2>🎤 Get Involved</h2>
        <p>We’re currently:</p>
        <ul>
          <li>Looking for speakers and XRPL projects to present</li>
          <li>Welcoming sponsors</li>
          <li>Inviting everyone to join us in Malta this September — developers, creators, users, and newcomers</li>
        </ul>

        <h2>🧡 Community First</h2>
        <p>This event is made by the XRPL community, for the community. It’s the first step toward something bigger — and we’d love for you to be a part of it.</p>

        <h2>🌍 Let’s build.</h2>
        <p>📩 Interested in speaking, sponsoring, or helping out? DM <Link href="https://x.com/Bakshayev">Bakshayev</Link>.</p>
        <p>📅 See you in Malta — September 2, 2025</p>
      </article>
    </>
  )
}
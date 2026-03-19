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

export default function ChainOfBlocksSummit() {
  return (
    <>
      <SEO
        title={'CHAIN OF BLOCKS SUMMIT 2026 — XRPL Community Summit.'}
        description="The XRPL Community Summit in Europe — 2026 in Valletta, Malta. Insights, inspiration, and IRL connection."
        noindex={network !== 'mainnet'}
        image={{
          file: '/images/chainOfBlocksSummit/2026-summit-preview.jpeg',
          width: 'auto',
          height: 'auto',
          allNetworks: true
        }}
        twitterImage={{
          file: '/images/chainOfBlocksSummit/2026-summit-preview.jpeg',
          allNetworks: true
        }}
      />
      <article className="prose sm:prose-lg dark:prose-invert content-center">
        <h1>CHAIN OF BLOCKS SUMMIT</h1>
        <h2>Europe | Malta | 20–22 May 2026</h2>
        <figure>
          <Image
            src={'/images/chainOfBlocksSummit/2026-summit-preview.jpeg'}
            alt="Chain of Blocks Summit 2026"
            width={684}
            height={330}
            className="max-w-full h-auto object-contain"
            priority
          />
          <figcaption>Chain Of Blocks Summit 2026</figcaption>
        </figure>
        <p>
          {' '}
          <strong>20–22 May 2026 · Valletta, Malta</strong>
        </p>
        <p>
          <strong>XRPL community summit in Europe.</strong> Over three days in the historic city of Valletta,
          participants will come together for Innovation, Networking, Education, and Unforgettable Experiences.
        </p>
        <h2>📍 What’s Happening</h2>
        <p>
          Join us on a beautiful Mediterranean island 🌞 for three days dedicated to the XRPL. Whether you're building,
          investing, or just getting started — this summit is for you.
        </p>
        <p>Expect conversations and initiatives around:</p>
        <ul>
          <li>Cross-chain collaboration and interoperability</li>
          <li>Real-world blockchain adoption</li>
          <li>Tokenization and digital finance</li>
          <li>Building bridges between ecosystems, institutions, and innovators</li>
        </ul>
        <h2>👥 Who It’s For</h2>
        <ul>
          <li>
            <strong>Developers:</strong> technical sessions, real use cases, and live demos
          </li>
          <li>
            <strong>Users:</strong> discover tools, wallets, and projects you can use right now
          </li>
          <li>
            <strong>Founders & Builders:</strong> meet future partners, investors, and collaborators
          </li>
          <li>
            <strong>Institutions & Regulators:</strong> we want to bridge the Web2/Web3 world
          </li>
        </ul>
        <h2>🤝 Brought to You By</h2>
        <p>
          {' '}
          Co-organized by{' '}
          <Link href="https://x.com/bithomp">
            <strong>Bithomp</strong>
          </Link>{' '}
          and{' '}
          <Link href="https://x.com/SnwoManYClub">
            <strong>SnwoMan</strong>
          </Link>{' '}
          — an XRPL-native project focused on NFTs, RWAs, and onboarding communities into Web3.
          <br />
        </p>
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
          <li>Inviting everyone to join us in Malta — developers, creators, users, and newcomers</li>
        </ul>
        Whan to become a sponsor or apply as a speaker? You can do it on <Link href="https://chainofblockssummit.com/">chainofblockssummit.com</Link>.<h2>🧡 Community First</h2>
        <p>
          This event is made by the XRPL community, for the community. It’s the first step toward something bigger — and
          we’d love for you to be a part of it.
        </p>
        <h2>🎫 Get your Tickets</h2>
        <p>
          Tickets are available on <Link href="https://luma.com/8xdc6wgg">https://luma.com/8xdc6wgg</Link>.
          {/*
          All the event details and tickets are available on Eventbrite:{' '}
          <Link href="https://ChainOfBlocksSummit.eventbrite.com">https://ChainOfBlocksSummit.eventbrite.com</Link>.
          */}
        </p>
        <h2>🌍 Let’s build.</h2>
        <p>
          📩 Interested in speaking, sponsoring, or helping out? DM <Link href="https://x.com/bithomp">Bithomp</Link>.
        </p>
        <p>📅 See you in Malta 20–22 May 2026 </p>
      </article>
    </>
  )
}

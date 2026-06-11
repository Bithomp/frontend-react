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
        title={'CHAIN OF BLOCKS SUMMIT — Malta Web3 Community Summit.'}
        description="Chain Of Blocks Summit in Malta — a community event for XRPL and the broader Web3 ecosystem. 2026 recap and 2027 updates."
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
        <h2>Europe | Malta | Web3 Real-World Integration & Interoperability</h2>
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
          <strong>The 2026 edition took place 20–22 May 2026 in Valletta, Malta.</strong>
        </p>
        <p>
          <strong>Chain Of Blocks Summit</strong> is a community-first summit rooted in XRPL and expanding into the
          broader Web3 ecosystem. The Malta edition brought builders, founders, institutions, creators, and users
          together around Innovation, Networking, Education, and Unforgettable Experiences.
        </p>
        <h2>📍 What Happened in 2026</h2>
        <p>
          The 2026 summit gathered the community on a beautiful Mediterranean island 🌞 for three days of talks,
          networking, and real-world Web3 conversations.
        </p>
        <p>Conversations and initiatives focused on:</p>
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
        <h2>🎤 Looking Toward 2027</h2>
        <p>
          The 2026 event has passed. The next edition is being planned, and this page will be updated when 2027 dates,
          venue details, speaker applications, sponsorship opportunities, and tickets are announced.
        </p>
        <p>Future editions are expected to continue welcoming:</p>
        <ul>
          <li>Speakers and XRPL/Web3 projects to present</li>
          <li>Sponsors and ecosystem partners</li>
          <li>Developers, creators, users, institutions, and newcomers</li>
        </ul>
        Follow updates on <Link href="https://chainofblockssummit.com/">chainofblockssummit.com</Link>.<h2>🧡 Community First</h2>
        <p>
          This event is made by the community, for the community. It is a step toward something bigger: stronger
          collaboration, more useful products, and more real-world blockchain adoption.
        </p>
        <h2>🎫 Tickets</h2>
        <p>
          Tickets for the 2026 edition are no longer promoted here because the event has already taken place. Ticket
          information for the next edition will be added when it is officially available.
        </p>
        <h2>🌍 Let’s build.</h2>
        <p>
          📩 Interested in speaking, sponsoring, or helping out? DM <Link href="https://x.com/bithomp">Bithomp</Link>.
        </p>
        <p>📅 See you at the next Chain Of Blocks Summit.</p>
      </article>
    </>
  )
}

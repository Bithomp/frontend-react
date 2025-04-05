import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import SEO from '../components/SEO'
import { getIsSsrMobile } from '../utils/mobile'
import { explorerName, network } from '../utils'
import Mailto from 'react-protected-mailto'

export async function getServerSideProps(context) {
  const { locale } = context
  return {
    props: {
      isSsrMobile: getIsSsrMobile(context),
      ...(await serverSideTranslations(locale, ['common']))
    }
  }
}

export default function Jobs() {
  return (
    <>
      <SEO
        title="We are hiring"
        description="we are looking for the Next.js Developer"
        noindex={network !== 'mainnet'}
        image={{ file: 'pages/jobs', width: 'auto', height: 'auto', allNetworks: true }}
      />
      <div className="content-center">
        <center>
          <img
            src="/images/pages/jobs.png"
            alt="We are hiring"
            style={{ width: '100%', height: 'auto', maxHeight: 500 }}
          />
        </center>
        <h1>We Are Hiring: Developer - Next.js</h1>
        <h3>About Us</h3>
        <p>
          Bithomp is a leading platform for exploring the {explorerName} network. Now, we are looking for a talented
          developer to join our team!
        </p>
        <p>
          We are searching for a person to jump into the project without a long back-and-forth communication process and
          deliver clean, working code that doesn’t break other components or mess up the website structure.
        </p>
        <p>
          <strong>Position:</strong> Next.js Developer
        </p>
        <p>
          <strong>Requirements:</strong>
        </p>
        <ul>
          <li>
            <strong>
              Proficiency in Next.js - <span className="orange">IMPORTANT</span>
            </strong>
          </li>
          <li>
            <strong>
              Advanced GitHub skills - <span className="orange">IMPORTANT</span>
            </strong>
          </li>
          <li>English - your level should be enough to communicate with the team, read and understand the tasks</li>
          <li>Blockchain knowledge is an advantage; you should be able to find and study relevant documentation</li>
          <li>Ability to work in a team</li>
        </ul>
        <p>
          <strong>What We Offer:</strong>
        </p>
        <ul>
          <li>Remote position</li>
          <li>Part-time with the possibility of full-time employment in future</li>
          <li>Flexible working schedule</li>
          <li>
            Competitive compensation: payment per task during the probation period, transitioning to an hourly rate or
            full-time employment if we are satisfied with the quality of your work.
          </li>
        </ul>
        <p>
          If you're passionate about web development, you have enough experience and want to contribute to an exciting
          project, we’d love to hear from you!
        </p>
        <p>
          Apply now! Send your CV, GitHub profile and portfolio to{' '}
          <Mailto email="info@bithomp.com" headers={{ subject: 'Job Search - Developer' }} />
        </p>
        <p>
          We are looking forward to hearing from you! If we find your CV interesting, we will get back to you.
          <br />
          <br />
          Bithomp Team <span className="red">❤</span>
          <br />
          <br />
          <span className="grey">P.S. We are not interested in working with agencies.</span>
        </p>
        <br />
      </div>
    </>
  )
}

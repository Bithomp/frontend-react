import Mailto from 'react-protected-mailto'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import SEO from '../components/SEO'
import { useTranslation } from 'next-i18next'

import { getIsSsrMobile } from '../utils/mobile'
import Link from 'next/link'
import { ledgerName, server } from '../utils'

export async function getServerSideProps(context) {
  const { locale } = context
  return {
    props: {
      isSsrMobile: getIsSsrMobile(context),
      ...(await serverSideTranslations(locale, ['common']))
    }
  }
}

export default function TermsAndConditions() {
  const { t } = useTranslation()

  return (
    <>
      <SEO title={t('menu.terms-and-conditions')} noindex={true} />
      <div className="content-text">
        <h1>Terms and Conditions</h1>
        <p>Last updated: September 21, 2024</p>
        <p>Please read these terms and conditions carefully before using Our Service.</p>
        <h2>Interpretation and Definitions</h2>
        <h2>Interpretation</h2>
        <p>
          The words of which the initial letter is capitalized have meanings defined under the following conditions. The
          following definitions shall have the same meaning regardless of whether they appear in singular or in plural.
        </p>
        <h2>Definitions</h2>
        <p>For the purposes of these Terms and Conditions:</p>
        <ul>
          <li>
            <p>
              <strong>Affiliate</strong> means an entity that controls, is controlled by or is under common control with
              a party, where &quot;control&quot; means ownership of 50% or more of the shares, equity interest or other
              securities entitled to vote for election of directors or other managing authority.
            </p>
          </li>
          <li>
            <p>
              <strong>Country</strong> refers to: Malta
            </p>
          </li>
          <li>
            <p>
              <strong>Company</strong> (referred to as either &quot;the Company&quot;, &quot;We&quot;, &quot;Us&quot; or
              &quot;Our&quot; in this Agreement) refers to Ledger Explorer Ltd., Suite 9, Ansuya Estate, Revolution
              Avenue, Victoria, Mahe, Seychelles.
            </p>
          </li>
          <li>
            <p>
              <strong>Device</strong> means any device that can access the Service such as a computer, a cellphone or a
              digital tablet.
            </p>
          </li>
          <li>
            <p>
              <strong>Service</strong> refers to the Website, our APIs, mobile app, xApp, and any other software, tools,
              features, or functionalities provided on or in connection with our services; including without limitation
              using our services to view, explore, and create Tokens and use our tools, at your own discretion, to
              connect directly with others to purchase, sell, or transfer Tokens.
            </p>
          </li>
          <li>
            <p>
              <strong>Terms and Conditions</strong> (also referred as &quot;Terms&quot;) mean these Terms and Conditions
              that form the entire agreement between You and the Company regarding the use of the Service.
            </p>
          </li>
          <li>
            <p>
              <strong>Third-party Social Media Service</strong> means any services or content (including data,
              information, products or services) provided by a third-party that may be displayed, included or made
              available by the Service.
            </p>
          </li>
          <li>
            <p>
              <strong>Website</strong> refers to {ledgerName} Explorer website, accessible from{' '}
              <a href={server}>{server}</a>.
            </p>
          </li>
          <li>
            <p>
              <strong>You</strong> means the individual accessing or using the Service, or the company, or other legal
              entity on behalf of which such individual is accessing or using the Service, as applicable.
            </p>
          </li>
          <li>
            <p>
              <strong>NFT</strong> means a non-fungible token or similar digital item implemented on a blockchain, which
              associated with certain content or data.
            </p>
          </li>
          <li>
            <p>
              <strong>Token</strong> means a fungible or non-fungable token or similar digital item implemented on the
              XRP Ledger, which associated with certain content or data, includes IOUs, NFTs.
            </p>
          </li>
        </ul>
        <h2>Acknowledgment</h2>
        <p>
          These are the Terms and Conditions governing the use of this Service and the agreement that operates between
          You and the Company. These Terms and Conditions set out the rights and obligations of all users regarding the
          use of the Service.
        </p>
        <p>
          Your access to and use of the Service is conditioned on Your acceptance of and compliance with these Terms and
          Conditions. These Terms and Conditions apply to all visitors, users and others who access or use the Service.
        </p>
        <p>
          By accessing or using the Service You agree to be bound by these Terms and Conditions. If You disagree with
          any part of these Terms and Conditions then You may not access the Service.
        </p>
        <p>
          You represent that you are over the age of 18. The Company does not permit those under 18 to use the Service.
        </p>
        <p>You represent and warrant that you acknowledge, understand, and accept the risk of the following:</p>
        <ul>
          <li>
            The XRP Ledger and its built-in decentralized exchange is independently maintained by a decentralized
            network of thousands of nodes who are not under the control of any single entity or groups of entities.
          </li>
          <li>
            Service is not a wallet provider, exchange, financial institution, money services business, or creditor.
            Service provides a peer-to-peer web3 service that helps users discover and directly interact with each other
            and tokens available on the public XRP Ledger. Company does not have custody or control over the Tokens and
            we do not execute or effectuate purchases, transfers, or sales of Tokens. To use our Service, you must use a
            third-party wallet which allows you to engage in transactions on the XRP Ledger.
          </li>
          <li>Service doesn't hold anyones assets, tokens, private keys, have any order books or trading system.</li>
          <li>
            By using XUMM or a Hardware wallet within Our Service you're interacting directly with the XRP Ledger. All
            your actions are settled directly on the XRP Ledger.
          </li>
          <li>
            Company makes no representations or guarantees of accessibility at any time and for any length of time.
          </li>
          <li>
            Company does not manually curate the lists of assets that are displayed on Our Service. Any asset or token
            that is created on the XRP Ledger can be displayed.
          </li>
          <li>
            The value of Tokens is subjective. Prices of Tokens are subject to volatility and fluctuations in the price
            of cryptocurrency can also materially and adversely affect Token prices. You acknowledge that you fully
            understand this subjectivity and volatility and that you may lose money.
          </li>
          <li>
            Company is not party to any agreement between any users. You bear full responsibility for verifying the
            identity, legitimacy, and authenticity of Tokens that you purchase from third-party sellers using the
            Service and we make no claims about the identity, legitimacy, functionality, or authenticity of users or
            Tokens (and any content or data associated with such Tokens) visible on the Service.
          </li>
          <li>
            Company has no control over the development, operation, management, marketing, or any other activity of any
            of the assets that are displayed in Our Service. Any information displayed in Our Service regarding an asset
            or token is community-sourced and may be incomplete or inaccurate.
          </li>
          <li>
            You assume all risk of: (i) guarding and storing your crypto assets, tokens and private keys, (ii) auditing
            the quality, security, value, and merit of the assets that you transact, (iii) auditing the legality and
            legal compliance of your transactions of all assets with any counterparties, (iv) auditing counterparties
            with whom you create a trust line, and (v) using Service to perform any operation or transaction.
          </li>
          <li>
            Company reserves the right to change or modify these Terms at any time and in our sole discretion. If we
            make material changes to these Terms, we will use reasonable efforts to provide notice of such changes, such
            as by providing notice through the Service or updating the “Last Updated” date at the beginning of these
            Terms. By continuing to access or use the Service, you confirm your acceptance of the revised Terms and all
            of the terms incorporated therein by reference effective as of the date these Terms are updated. It is your
            sole responsibility to review the Terms from time to time to view such changes and to ensure that you
            understand the terms and conditions that apply when you access or use the Service.
          </li>
        </ul>
        <p>
          Your access to and use of the Service is also conditioned on Your acceptance of and compliance with the
          Privacy Policy of the Company. Our Privacy Policy describes Our policies and procedures on the collection, use
          and disclosure of Your personal information when You use the Application or the Website and tells You about
          Your privacy rights and how the law protects You. Please read Our Privacy Policy carefully before using Our
          Service.
        </p>

        <h2>Third-Party Content and Services</h2>
        <p>
          As a peer-to-peer web3 service, Company helps you explore Tokens (including NFTs and their content) created by
          third parties. Company does not make any representations or warranties about this third-party content visible
          through our Service, including any content associated with NFTs displayed on the Service, and you bear
          responsibility for verifying the legitimacy, authenticity, and legality of NFTs that you purchase from
          third-party sellers. We also cannot guarantee that any NFTs visible on our Service will always remain visible
          and/or available to be bought, sold, or transferred.
        </p>
        <p>
          NFTs may be subject to terms directly between buyers and sellers with respect to the use of the NFT content
          and benefits associated with a given NFT (“Purchase Terms”). For example, when you click on "External URL" to
          get more details about any of the NFTs visible on our Service, you may notice a third party link to the
          creator’s website. Such website may include Purchase Terms governing the use of the NFT that you will be
          required to comply with. Company is not a party to any such Purchase Terms, which are solely between the buyer
          and the seller. The buyer and seller are entirely responsible for communicating, promulgating, agreeing to,
          and enforcing Purchase Terms. You are solely responsible for reviewing such Purchase Terms.
        </p>
        <h2>Links to Other Websites</h2>
        <p>
          Our Service may contain links to third-party web sites or services that are not owned or controlled by the
          Company.
        </p>
        <p>
          The Company has no control over, and assumes no responsibility for, the content, privacy policies, or
          practices of any third party web sites or services. You further acknowledge and agree that the Company shall
          not be responsible or liable, directly or indirectly, for any damage or loss caused or alleged to be caused by
          or in connection with the use of or reliance on any such content, goods or services available on or through
          any such web sites or services.
        </p>
        <p>
          We strongly advise You to read the terms and conditions and privacy policies of any third-party web sites or
          services that You visit.
        </p>
        <h2>Use of Cloudflare Services</h2>
        <p>
          By using our website, you acknowledge and agree that we utilize the services of Cloudflare, Inc.
          ("Cloudflare") to enhance the performance and security of our website.
        </p>
        <p>
          You agree to comply with Cloudflare's Terms of Service, which can be found on their website at Cloudflare
          Terms of Service.
        </p>
        <p>
          <strong> Delivery Network (CDN):</strong>
        </p>
        <p>
          Our website uses Cloudflare's Content Delivery Network (CDN) to optimize the delivery of web content to users
          around the world. This may involve the caching and distribution of static content through Cloudflare servers.
        </p>
        <p>
          <strong>Security and DDoS Protection:</strong>
        </p>
        <p>
          Cloudflare provides security services to protect our website from potential threats, including Distributed
          Denial of Service (DDoS) attacks. You agree to cooperate with Cloudflare's security measures.
        </p>
        <p>
          <strong>Logging and Analytics:</strong>
        </p>
        <p>
          Cloudflare may collect certain information as part of its services, such as IP addresses, access times, and
          referring URLs. This information is subject to Cloudflare's Privacy Policy, which can be found on their
          website at <a href="https://www.cloudflare.com/privacypolicy/">Cloudflare Privacy Policy</a>.
        </p>
        <p>
          <strong>Limitation of Liability:</strong>
        </p>
        <p>
          We are not responsible for any issues or disruptions arising from the use of Cloudflare's services. Any claims
          or disputes related to Cloudflare's services should be directed to Cloudflare in accordance with their Terms
          of Service.
        </p>
        <h2>Use of Direct Registration System</h2>
        <p>
          <strong>User Registration:</strong>
        </p>
        <p>
          To access certain features and services on our website, users may be required to complete a registration
          process. By registering, you agree to provide accurate and complete information.
        </p>
        <p>
          <strong>Direct Registration System (DRS):</strong>
        </p>
        <p>
          Our website employs a Direct Registration System (DRS) to simplify the user registration process. DRS may
          utilize third-party authentication services or other methods to facilitate a secure and efficient registration
          experience.
        </p>
        <p>
          <strong>Account Security:</strong>
        </p>
        <p>
          Users are responsible for maintaining the confidentiality of their account credentials. Any activities that
          occur under user accounts are their responsibility.
        </p>
        <p>
          <strong>User Obligations:</strong>
        </p>
        <p>
          Registered users agree to comply with our Terms and Conditions and any additional terms or guidelines
          applicable to specific services or features. Failure to comply may result in the suspension or termination of
          user accounts.
        </p>
        <h2>Use of Google Analytics 4</h2>
        <p>
          <strong>Website Analytics:</strong>
        </p>
        <p>
          Our website uses Google Analytics 4, a web analytics service provided by Google, Inc. ("Google"). Google
          Analytics uses cookies to help analyze how users interact with our website.
        </p>
        <p>
          <strong>User Consent:</strong>
        </p>
        <p>
          By using our website, you consent to the processing of data about you by Google in the manner and for the
          purposes set out in our Privacy Policy.
        </p>
        <p>
          <strong>Opt-Out Option:</strong>
        </p>
        <p>
          You can opt-out of Google Analytics by adjusting your browser settings or using the Google Analytics Opt-Out
          Browser Add-on, available at{' '}
          <a href="https://support.google.com/analytics/answer/181881?hl=en/">
            Google Analytics Opt-Out Browser Add-on
          </a>
          .{' '}
        </p>
        <p>
          <strong>Google Analytics Terms:</strong>
        </p>
        <p>
          Google Analytics is subject to Google's Terms of Service, which can be found on their website at Google Terms
          of Service.
        </p>
        <h2>Use of PayPal</h2>
        <p>
          <strong>Payment Services:</strong>
        </p>
        <p>
          Our website utilizes PayPal, a third-party payment processing service, to facilitate secure and convenient
          online transactions.
        </p>
        <p>
          <strong>User Consent:</strong>
        </p>
        <p>
          By making a purchase on our website, you acknowledge and agree to the processing of your payment information
          by PayPal in accordance with their{' '}
          <a href="https://www.paypal.com/us/legalhub/useragreement-full/">User Agreement</a>.
        </p>
        <p>
          <strong>Payment Authorization:</strong>
        </p>
        <p>
          When you choose to make a payment, you authorize us to transmit your payment information to PayPal for
          processing.
        </p>
        <p>
          <strong>PayPal User Agreement:</strong>
        </p>
        <p>
          PayPal transactions are subject to the PayPal User Agreement, available at PayPal User Agreement. Please
          review this agreement to understand the terms and conditions governing your use of PayPal for transactions on
          our website.
        </p>
        <h2>API Terms of Use</h2>
        <p>Please read these terms and conditions carefully before using Our Service.</p>

        <p>
          <strong>1. Acceptance </strong>
        </p>
        <p>
          The Bithomp API, as outlined below, is provided by Ledger Explorer Ltd. ("Bithomp", "Company", "we", "us", or
          "our"). If you intend to utilize our Bithomp API, it is essential that you fully accept all the terms and
          conditions outlined in this Bithomp API Terms of Service ("API Terms"). Before commencing the use of our
          Bithomp API, it is imperative that you thoroughly read and agree to our API Terms. By accessing or using our
          Bithomp API, you are expressing your full and legal agreement to abide by all the provisions within these API
          Terms, in addition to our <Link href="/privacy-policy">Privacy policy</Link> and{' '}
          <Link href="/terms-and-conditions">Terms and Conditions</Link>, the terms of which are integrated herein by
          reference.
        </p>
        <p>
          In the event that you are using our Bithomp API on behalf of a corporation, partnership, or other legal
          entity, you confirm that you have the proper authorization to represent and legally bind such entity to the
          API Terms. In such cases, any references to "you" or "your" in these API Terms also apply to the represented
          entity. If you lack the aforementioned authority or if you (or the entity you represent) do not agree with any
          terms in these API Terms, our <Link href="/privacy-policy">Privacy policy</Link>, and/or{' '}
          <Link href="/terms-and-conditions">Terms and Conditions</Link>, you are not permitted to use the Bithomp API.
        </p>
        <p>
          As a user of the Bithomp API, you acknowledge and accept that the API Terms, along with our{' '}
          <Link href="/privacy-policy">Privacy policy</Link> and{' '}
          <Link href="/terms-and-conditions">Terms and Conditions</Link>, form a legally binding contract between Ledger
          Explorer Ltd. and yourself. This agreement holds true even though it is in electronic form and does not
          necessitate physical signing or online acknowledgment, governing your use of our Bithomp API.
        </p>

        <p>
          <strong>2. Definitions</strong>
        </p>
        <p>
          2.1 The term "Application" or "App" refers to any software, mobile application, website, product, or service
          developed, created, or offered using our Bithomp API.
        </p>
        <p>
          2.2 "API Documentation" pertains to the documentation, data, and information provided by Ledger Explorer Ltd.
          regarding the use of our Bithomp API through our API Site.
        </p>
        <p>
          2.3 "API Site" denotes our API development site located <Link href="/admin">HERE</Link>
        </p>
        <p>
          2.4 "Bithomp API" encompasses the Application Programming Interface ("API") publicly offered by our Company,
          along with the associated API Documentation.
        </p>
        <p>
          2.5 The "Bithomp Brand" includes the "BITHOMP" and "Ledger Explorer" brand name and other branding elements,
          names, logos, slogans, service marks, trademarks, and trade names owned by Ledger Explorer Ltd.
        </p>
        <p>
          2.6 "Data" covers (i) any data and content uploaded, posted, transmitted, or otherwise made available by
          Bithomp on it's website {server}, or other associated platforms (including information related to listed
          digital coins, cryptocurrency market data, additional statistics, initial coin offerings data, and coin
          searches); and (ii) in cases where Bithomp provides interactive channels for user engagement, any data,
          content, comments, profile information, and messages uploaded, posted, or transmitted by other users through
          such channels.
        </p>
        <p>
          2.7 "Service(s)" encompasses Bithomp’s products and services, including but not limited to the Bithomp API,
          it's website {server} (the "Site"), and all software, applications, mobile applications, data, reports, text,
          images, messaging channels, message services, updates, content, newsletters, price alerts, merchandise,
          databases, forums, articles, guides, reports, and other information made available by or on behalf of Bithomp
          through any of the aforementioned. The term "Service" excludes information, software applications, mobile
          applications, platforms, websites, or services provided by you or a third party (including Applications),
          whether or not the Bithomp API is incorporated into your product or a third party's services or product, and
          regardless of whether Bithomp designates them as "official integrations."
        </p>
        <p>2.8 "Users" includes all individuals utilizing our Bithomp API, which encompasses you.</p>
        <p>
          <strong>3. Grant of License</strong>
        </p>
        <p>
          3.1 In accordance with the terms outlined in these API Terms, Bithomp grants you a limited, non-exclusive,
          non-assignable, non-transferable, and irrevocable license to utilize the Bithomp API for the development,
          testing, and support of any software application, mobile application, website, platform, service, or product.
          This license also extends to the integration or incorporation of the Bithomp API into your Application. It is
          important to note that this license is subject to the restrictions specified in Section 4 and Section 9 below.
          Any violation of Section 4 will result in the automatic termination of the granted license, and Bithomp holds
          no liability in such termination. Consequently, Bithomp reserves the right to immediately suspend, obstruct,
          restrict, or terminate your access to and/or use of your account and/or Bithomp API without notice or
          liability to you. This action is without prejudice to any other remedies available to Bithomp in law,
          contract, tort, or equity.
        </p>
        <p>
          3.2 Your use of the Bithomp API is contingent upon your ongoing compliance with the provisions outlined in
          these API Terms. In order to enhance the development of our Bithomp API, Applications, Data, Services,
          platforms, channels, and/or products (referred to individually and collectively as "our Property"), we retain
          the right to make changes to the Bithomp API and/or these API Terms at any time without notifying you. It is
          your responsibility to regularly check our <Link href="/admin">SITE</Link> for updates to the Bithomp API
          and/or these API Terms. Additionally, certain aspects, events, methods, and properties of our Bithomp API may
          be undocumented. Considering the potential changes to our Bithomp API (whether documented or not),
          Applications, Data, Services, platforms, channels, and/or products at any time, you agree not to rely on any
          function, behavior, capability, or other aspects of our Bithomp API.
        </p>

        <p>
          <strong>4. Scope of Use</strong>
        </p>
        <p>4.1 Your utilization of Bithomp’s API is subject to the following limitations:</p>
        <p>
          4.1.1 The extent of use permitted by our license is contingent upon the usage plan you select, as outlined in
          each plan's corresponding description available at{' '}
          <a href="https://docs.bithomp.com/#price-and-limits">Price and Limits</a>. If you opt for one of our paid
          usage plans, the license will encompass the designated use specified in the description under your selected
          paid plan, provided you adhere to timely payment of the applicable fees. Regardless of the chosen usage plan,
          continuous compliance with the provisions in these API Terms is required to retain access to the Bithomp API.
        </p>
        <p>
          4.1.2 Our Property, including but not limited to the Bithomp API, must not be used in violation of any
          applicable laws or regulations, or to infringe upon the rights of individuals or entities. This includes usage
          that aids in the infringement of third-party intellectual property rights, privacy rights, or any actions
          inconsistent with these API Terms, our Privacy Policy, Terms and Conditions, and/or any other agreements with
          Bithomp to which you are subject (including, without limitation, any Executed Agreements as defined in Clause
          11.3 below).
        </p>
        <p>
          4.1.3 The Bithomp API (and our other Property, if licensed to you herein) should not be used to access or
          utilize information beyond the limits specified in these API Terms (and/or Executed Agreements, if applicable)
          or the API Documentation. It must not change any aspect of, disrupt, interfere with, or degrade the
          performance of the Services, or circumvent any of Bithomp’s security measures, operational, administrative, or
          technical procedures. Attempting to hack or test the vulnerability of our Services, Bithomp API, or our
          systems and/or networks is strictly prohibited.
        </p>
        <p>
          4.1.4 You agree not to introduce, either directly or indirectly, worms, trojans, viruses, hacks, or other
          computer programs that may damage, interfere with, interrupt, intercept, phish, data mine, or expropriate any
          system or data (including but not limited to the Data, Bithomp API, and our Services) to or from any of our
          Property and associated networks, nor attempt any of the aforementioned.
        </p>
        <p>
          4.1.5 Reverse engineering or deriving source codes, trade secrets, or know-how from any of our Property
          (including but not limited to the Bithomp API) or any portion thereof is strictly prohibited. Any attempts to
          do so, either directly or indirectly, or assisting others in such attempts, are also forbidden.
        </p>
        <p>
          4.1.6 While you have the right to charge for your services and products incorporating or integrating our
          Bithomp API, selling, renting, leasing, sublicensing, redistributing, or syndicating access to the Bithomp API
          or any part thereof is not permitted unless pursuant to the terms of an Executed Agreement with Bithomp.
        </p>
        <p>
          4.1.7 You have the right to place advertisements on and around your products, services, website, platforms,
          mobile applications, and software applications ("your Products") that incorporate or integrate our Bithomp
          API. However, certain restrictions apply, including not placing advertisements on any of our Property and
          ensuring that advertisements on or around your Products do not resemble or be reasonably likely to confuse
          them with belonging to Bithomp or being associated with Bithomp's products or services.
        </p>
        <p>
          4.1.7.1 You must not use the Bithomp API to promote gambling, and any advertisements around your Products
          incorporating or integrating the Bithomp API must not constitute adult/sexual content or offer online
          gambling.
        </p>
        <p>
          4.1.7.2 Using any Data, information, or other content from any of our Property in advertisements or for
          targeting advertisements in your Products or any part thereof is prohibited.
        </p>
        <p>
          4.1.7.3 Using any contact information obtained from our Property or any contact information of other Users
          (including email addresses) to contact Users without the prior written consent of Bithomp and the owners of
          such contact information is not allowed.
        </p>
        <p>
          4.1.7.4 Your Products and associated analyses or research must not isolate a small group of individuals or any
          single individual for any unlawful, harassing, or discriminatory purposes.
        </p>
        <p>
          4.1.7.5 Making public statements or representations in any mode, media, or channel regarding Bithomp or any of
          our Products (including the Bithomp API) without our prior written consent is prohibited.
        </p>
        <p>
          4.1.8 You acknowledge that Bithomp may offer products, services, or other Applications in the future that are
          similar to your offerings, and you agree that Bithomp is fully entitled to do so without any restrictions or
          notice to you.
        </p>
        <p>
          4.2 The rate limit for the Bithomp API is available at{' '}
          <a href="https://docs.bithomp.com/#price-and-limits">Price and Limits</a>, although Bithomp reserves the right
          to change this rate limit at any time at its sole discretion without notice or reference to you or any Users.
          You agree not to exceed or circumvent the specified rate limitation, limitations on calls, and use of the
          Bithomp API, as may be implemented by Bithomp from time to time at its sole discretion. Additionally, using
          the Bithomp API in a manner that may exceed reasonable request volume, constitute excessive or abusive usage,
          or fail to comply with any part of these API Terms, the API Documentation, our Privacy Policy, Terms and
          Conditions, or the limitations of your selected usage plan is strictly prohibited. Each Crypto Data API Plan
          listed on <a href="https://docs.bithomp.com/#price-and-limits">Price and Limits</a> provides a specified
          number of call credits for your use each month ("Monthly Call Limit"). If you exceed your Monthly Call Limit
          for your subscribed plan in any given month, an additional charge per exceeded call will be levied.
        </p>

        <p>
          <strong>5. Payment Terms</strong>
        </p>
        <p>
          5.1 As per Clause 4.1.1 above, if you opt for any fee-based Bithomp Crypto Data API Plans, payment must be
          executed promptly. Check <Link href="/admin">Partner Portal</Link> for the payment details. All payments are
          required to be made in advance, with the deadline being no later than three (3) days before the start date of
          your usage plan and each subsequent recurring billing cycle. These payments are non-refundable, whether in
          full or in part. Bithomp retains the right to obstruct, restrict, limit, and/or suspend (without any liability
          to you) all access to and usage of the Bithomp API until all applicable fees are settled. In cases of
          suspension due to delayed payment, there will be no extension to your subscription period, which will still
          expire as calculated from the start date of your usage plan. Furthermore, Bithomp has the authority to charge
          late payment interest at a rate of 12% per annum for each day of delayed payment. Bithomp also reserves the
          right to terminate your account/use of the Bithomp API without notice, without any liability to you, and
          without prejudicing Bithomp’s rights to any other available remedies in law, contract, tort, or equity.
        </p>
        <p>
          5.2 You are accountable for all bank transfer charges, currency conversion losses, and any other associated
          administrative fees incurred in making your payment. Additionally, you are responsible for all taxes arising
          in relation to your payment for the services, including withholding tax, Goods and Services Tax, Value Added
          Tax, and any other levies ("Taxes"). You are also fully responsible for any currency losses and payment
          service provider charges incurred in your payment to Bithomp. We reserve the right, at our sole discretion, to
          denominate our fees in any currency, determine the acceptable mode of payment, and utilize any payment service
          network or providers for the payment of our fees and/or applicable taxes.
        </p>
        <p>
          5.3 If your failure to pay any Taxes exposes Bithomp to potential tax liabilities, you agree to fully
          indemnify and hold harmless Bithomp against all costs, claims, and damages, including penalties, settlement
          amounts, and legal fees (on a solicitor-client basis).
        </p>
        <p>
          5.4 For online payments, you consent to the use, disclosure, transfer, retention, and processing of your
          personal data as necessary or relevant for payment processing. This includes the disclosure of your personal
          data to the payment portal operator, acquirer, credit card association, credit card issuer, and other relevant
          third parties, as well as the transfer of your personal data outside of your country.
        </p>

        <p>
          <strong>6. Data Caching and Storage</strong>
        </p>
        <p>
          6.1 While we do not actively promote the caching or storage of Data, if you find it necessary to cache or
          store Data:
        </p>
        <p>6.1.1 You are required to refresh the cache at least every 24 hours.</p>
        <p>6.1.2 Implement strong encryption and other security measures to safeguard the stored Data.</p>
        <p>
          6.1.3 Upon a User's request to delete all User Data collected as a result of the User utilizing our Bithomp
          API (whether as part of your Product or otherwise, or when our Bithomp API facilitates the collection of such
          User Data), you must promptly delete all such User Data unless retention is necessary for legitimate legal or
          business purposes, such as ongoing contractual obligations with the User.
        </p>
        <p>
          6.1.4 If Bithomp terminates your access to or use of the Bithomp API (regardless of the reasons), you agree to
          promptly and permanently delete all Data and any other information stored as a result of your use of or access
          to the Bithomp API. No copies should be retained unless required by applicable law.
        </p>
        <p>
          6.2 Unless expressly permitted under these API Terms, you are not authorized to duplicate, reproduce, copy,
          store, derive from, or translate any Data, API Documentation, or information expressed by the Data (including
          but not limited to hashed or transferred data).
        </p>

        <p>
          <strong>7. User Agreement for your Products</strong>
        </p>
        <p>
          In the event that any your Products are offered for use to others outside your entity, you agree that you will
          have in place a binding user agreement and privacy policy which must at the very least: (a) identify the
          Bithomp API as being the property of Bithomp; (b) ensure that your users/customers abide by this API Terms in
          using the Bithomp API (whether as part of our Products or otherwise); (c) exclude and disclaim all liability
          of Bithomp for all usage of the Bithomp API (or part thereof); (d) stipulate your assumption of full
          responsibility and liability for offering the Bithomp API as part of your Products to your users/customers;
          (e) set out clearly in your easily accessible privacy policy your purpose and methods for collection, storage,
          use, processing, disclosure and transfer of personal data of your users in accordance with privacy and data
          protection laws applicable to you, in no event to be less stringent than the requirements thereunder our{' '}
          <Link href="/privacy-policy">Privacy policy</Link>.
        </p>

        <p>
          <strong>8. Security Measures</strong>
        </p>
        <p>
          You commit to implementing stringent and robust security systems to safeguard your network, operating system,
          servers, databases, computers, user information, personal data, and other components integral to, supporting,
          or constituting your Products that integrate, incorporate, or in any way utilize the Bithomp API ("your
          Systems"). Should any compromise occur in any of your Systems, whether through hacking, unauthorized use or
          access, or other security breaches, you are required to promptly notify us via email at{' '}
          <Mailto email="support@bithomp.com" headers={{ subject: 'Security Alert' }} />. We reserve the sole discretion
          to determine whether to terminate your access to and/or use of our Bithomp API, as such security breaches may
          have an adverse effect on our reputation (evaluated at our sole discretion, and we are not obliged to provide
          reasons for our decision). If we decide to terminate your access to or use of our Bithomp API, you are
          obligated to comply immediately with the clauses outlined in Section 10.
        </p>
        <p>
          <strong>9. Ownership</strong>
        </p>
        <p>
          9.1 All assets, rights, title, and interest in and to our Bithomp Brand, API Documentation, Bithomp API, and
          other Property (including but not limited to intellectual property rights) are fully owned by Bithomp. Your
          usage of our Property grants you only a limited license as outlined in these API Terms, and no other rights,
          title, interest, ownership, or property of any kind are transferred to you through your use of our Property.
          It is clarified that any inventions you create that incorporate our Bithomp API do not transfer any ownership
          or interest in our Bithomp API to you, even though you may be considered the owner of such inventions under
          applicable law (excluding the Bithomp API). Additionally, you agree to undertake any necessary acts and
          execute documents (without compensation) as Bithomp may request from you periodically to perfect Bithomp’s
          rights to our Property.
        </p>

        <p>
          <strong>10. Termination </strong>
        </p>
        <p>
          10.1 These API Terms become effective on the date you agree to them or access or use the Bithomp API,
          whichever occurs first, and will remain in force until terminated by Bithomp or you in accordance with the
          provisions of these API Terms.
        </p>
        <p>
          10.2 You have the option to terminate your binding to these API Terms by discontinuing your access to and/or
          use of our Bithomp API and notifying us via email at{' '}
          <Mailto email="support@bithomp.com" headers={{ subject: 'Termination' }} />.
        </p>
        <p>
          10.3 We reserve the right to vary, amend, change, suspend, or discontinue the provision of any of our
          Property, including but not limited to the Bithomp API, and to suspend or terminate your use of the Bithomp
          API and/or the Bithomp Brand at any time without notice or providing reasons to you. Without prejudice to the
          foregoing, we may, at our discretion, restrict your access to or use of our Bithomp API if we determine, in
          our sole discretion, that your access to or use of our Bithomp API may negatively impact our Products or
          Services.
        </p>
        <p>10.4 Upon termination of these API Terms:</p>
        <p>10.4.1 All rights and licenses granted to you will immediately cease and terminate.</p>
        <p>
          10.4.2 You are obligated to promptly destroy the API Documentation, Data, and any other information obtained
          from Bithomp or any of our Property that may be in your possession or control.
        </p>
        <p>
          10.4.3 Unless we specifically grant prior written consent, or as otherwise stated in these API Terms, you must
          promptly and permanently delete all Data and other information obtained from or related to Bithomp and any of
          our Property that you have stored in connection with your access to or use of the Bithomp API. You agree to
          provide written certification of the destruction of stored Data and information if Bithomp requests such
          certification from you.
        </p>

        <p>
          <strong>11. Your Warranties</strong>
        </p>
        <p>
          11.1 By agreeing to this API Terms, you assert and guarantee to Bithomp that you (including any entity you
          represent) have the capacity to enter into and be fully bound by this API Terms. Additionally, you affirm your
          ability to use the Bithomp API in compliance with this API Terms without violating any applicable laws or
          regulations, infringing upon any third party’s rights (including intellectual property rights), or breaching
          any other contracts to which you are bound.
        </p>
        <p>
          11.2 Without limiting the scope of the clauses under Section 11, you warrant and undertake (and shall ensure
          the same undertaking from any entity you represent) not to initiate any legal actions or make any claims
          against Bithomp for damages, expenses, or losses resulting from your use of (or inability to use) any of our
          Property (including the Bithomp API). You acknowledge that Bithomp may amend this API Terms and/or modify any
          aspect or function of the Bithomp API without notice or reference to you, potentially affecting your usage,
          products, or associated business. In such cases, your only recourse is to terminate your use of the Bithomp
          API, and you agree not to make any claims against Bithomp. Your continued access or use of the Bithomp API or
          any of our Property constitutes acceptance and agreement to all amendments and modifications. The effective
          date of the latest version of this API Terms is indicated at the top of the document.
        </p>

        <h2> Bots Terms of Use</h2>

        <p>
          <strong>1. General Provisions</strong>
        </p>
        <p>
          1.1. Users can register on the Platform by visiting <Link href="/admin">Partner Portal</Link>.
        </p>
        <p>
          1.2. The administration may, at its discretion, employ additional registration procedures, including Recaptcha
          V3 ("CAPTCHA").
        </p>
        <p>1.3. After registration, users receive a unique Account and access to the Dashboard.</p>
        <p>
          1.4. All activities conducted in the Dashboard are considered the personal actions of the user. The user bears
          sole responsibility for any actions taken using their Account and the consequences that may arise from such
          use.
        </p>
        <p>1.5. Users are exclusively responsible for:</p>
        <p>a) Safeguarding their username and password.</p>
        <p>
          b) Dealing with the consequences in case of loss and/or disclosure of login and password to third parties.
        </p>
        <p>
          1.6. Users are obligated to take appropriate measures independently to secure their Account and prevent
          unauthorized access by third parties. This includes ensuring that the password is not saved in the browser,
          even when utilizing cookie technology, especially when a third party has access to the user's computer or
          mobile device.
        </p>
        <p>
          1.7. Users are not permitted to transfer their Account data to third parties. If Account data is transferred,
          users bear full responsibility for the actions conducted by third parties using the user's Account.
        </p>

        <p>
          <strong>2. Terms of Use</strong>
        </p>
        <p>2.1. The Administration is not obligated to provide consulting and technical support to the User.</p>
        <p>
          2.2. The Platform is integrated with various services, such as analytics, payment, and mailing services. The
          Platform solely facilitates access to these services. The relationship between the User and the service
          provider using the Platform (service owner) is governed by the service documents (agreement, rules of use,
          etc.), and all matters related to the use of such services are independently resolved between the service
          owner and the User.
        </p>
        <p>2.3. The Platform and services are provided on an "as-is" basis.</p>
        <p>2.4. The User assumes all risks associated with the use of the Platform and services.</p>

        <p>2.5. The Administration is not responsible for:</p>
        <p>a) The inability to use the Platform for reasons beyond the control of the Administration.</p>
        <p>b) Any acts and/or omissions of service providers, services, networks, software, or equipment.</p>
        <p>c) Distortion, alteration, or loss of Content.</p>
        <p>d) Security of the User's login and/or password.</p>
        <p>e) Unauthorized and/or unlawful use of the User's login and/or password by third parties.</p>
        <p>
          f) Damage that may be caused to any of the User's devices, media, and/or software as a result of the use of
          the Platform and/or Services.
        </p>
        <p>g) Consequences of the transfer of Bots between Accounts.</p>
        <p>
          You can contact us with queries, comments, and feedback via email at{' '}
          <Mailto email="support@bithomp.com" headers={{ subject: 'Feedback' }} />
        </p>

        <h2>Bithomp Pro Subscription Terms of Use</h2>
        <p>
          <strong>Subscription Payment</strong>
        </p>
        <p>
          By subscribing to Bithomp Pro paid services, you agree to pay the applicable subscription fees as indicated at
          the time of purchase. All payments are to be made in accordance with the payment terms specified on the
          website. The payment for the subscription is non-refundable. Once the subscription fee is paid, it cannot be
          reclaimed under any circumstances.
        </p>
        <p>
          <strong>User Responsibility</strong>
        </p>
        <p>
          You acknowledge and agree that the use of Bithomp Pro services is entirely at your own risk. The service is
          provided on an "as is" and "as available" basis.
        </p>
        <p>
          <strong>Limitation of Liability</strong>
        </p>
        <p>
          {server} and its employees shall not be liable for any direct, indirect, incidental, special, or consequential
          damages resulting from the use or inability to use the services. This includes, but is not limited to, damages
          for loss of profits, data, or other intangible losses arising out of or in connection with the use or
          performance of the service.
        </p>
        <p>
          <strong>Changes to Subscription and Terms</strong>
        </p>
        <p>
          We reserve the right to modify the subscription fees, payment terms, or these terms of use at any time. Any
          changes will be effective upon posting on the website or notifying you via email or other means. It is your
          responsibility to review these terms periodically for any changes.
        </p>
        <p>
          By using Bithomp Pro paid services, you acknowledge that you have read, understood, and agree to be bound by
          these terms and conditions.
        </p>

        <h2>Termination</h2>
        <p>
          We may terminate or suspend Your access immediately, without prior notice or liability, for any reason
          whatsoever, including without limitation if You breach these Terms and Conditions.
        </p>
        <p>Upon termination, Your right to use the Service will cease immediately.</p>
        <h2>Limitation of Liability</h2>
        <p>
          Notwithstanding any damages that You might incur, the entire liability of the Company and any of its suppliers
          under any provision of this Terms and Your exclusive remedy for all of the foregoing shall be limited to the
          value in SEK on the day of purchase of the amount actually paid by You through the Service or 50 SEK if You
          haven't purchased anything through the Service.
        </p>
        <p>
          To the maximum extent permitted by applicable law, in no event shall the Company or its suppliers be liable
          for any special, incidental, indirect, or consequential damages whatsoever (including, but not limited to,
          damages for loss of profits, loss of data or other information, for business interruption, for personal
          injury, loss of privacy arising out of or in any way related to the use of or inability to use the Service,
          third-party software and/or third-party hardware used with the Service, or otherwise in connection with any
          provision of this Terms), even if the Company or any supplier has been advised of the possibility of such
          damages and even if the remedy fails of its essential purpose.
        </p>
        <p>
          Some states do not allow the exclusion of implied warranties or limitation of liability for incidental or
          consequential damages, which means that some of the above limitations may not apply. In these states, each
          party's liability will be limited to the greatest extent permitted by law.
        </p>
        <h2>&quot;AS IS&quot; and &quot;AS AVAILABLE&quot; Disclaimer</h2>
        <p>
          The Service is provided to You &quot;AS IS&quot; and &quot;AS AVAILABLE&quot; and with all faults and defects
          without warranty of any kind. To the maximum extent permitted under applicable law, the Company, on its own
          behalf and on behalf of its Affiliates and its and their respective licensors and service providers, expressly
          disclaims all warranties, whether express, implied, statutory or otherwise, with respect to the Service,
          including all implied warranties of merchantability, fitness for a particular purpose, title and
          non-infringement, and warranties that may arise out of course of dealing, course of performance, usage or
          trade practice. Without limitation to the foregoing, the Company provides no warranty or undertaking, and
          makes no representation of any kind that the Service will meet Your requirements, achieve any intended
          results, be compatible or work with any other software, applications, systems or services, operate without
          interruption, meet any performance or reliability standards or be error free or that any errors or defects can
          or will be corrected.
        </p>
        <p>
          Without limiting the foregoing, neither the Company nor any of the company's provider makes any representation
          or warranty of any kind, express or implied: (i) as to the operation or availability of the Service, or the
          information, content, and materials or products included thereon; (ii) that the Service will be uninterrupted
          or error-free; (iii) as to the accuracy, reliability, or currency of any information or content provided
          through the Service; or (iv) that the Service, its servers, the content, or e-mails sent from or on behalf of
          the Company are free of viruses, scripts, trojan horses, worms, malware, timebombs or other harmful
          components.
        </p>
        <p>
          Some jurisdictions do not allow the exclusion of certain types of warranties or limitations on applicable
          statutory rights of a consumer, so some or all of the above exclusions and limitations may not apply to You.
          But in such a case the exclusions and limitations set forth in this section shall be applied to the greatest
          extent enforceable under applicable law.
        </p>
        <h2>Governing Law</h2>
        <p>
          The laws of the Country, excluding its conflicts of law rules, shall govern this Terms and Your use of the
          Service. Your use of the Application may also be subject to other local, state, national, or international
          laws.
        </p>
        <h2>Disputes Resolution</h2>
        <p>
          If You have any concern or dispute about the Service, You agree to first try to resolve the dispute informally
          by contacting the Company.
        </p>
        <h2>For European Union (EU) Users</h2>
        <p>
          If You are a European Union consumer, you will benefit from any mandatory provisions of the law of the country
          in which you are resident in. You can access the European Commission's Online Dispute Resolution platform to resolve disputes: 
          <a href="https://ec.europa.eu/consumers/odr/main/?event=main.home2.show"> Online Dispute Resolution</a>.
        </p>
        <h2>United States Legal Compliance</h2>
        <p>
          You represent and warrant that (i) You are not located in a country that is subject to the United States
          government embargo, or that has been designated by the United States government as a &quot;terrorist
          supporting&quot; country, and (ii) You are not listed on any United States government list of prohibited or
          restricted parties.
        </p>
        <h2>Severability and Waiver</h2>
        <h2>Severability</h2>
        <p>
          If any provision of these Terms is held to be unenforceable or invalid, such provision will be changed and
          interpreted to accomplish the objectives of such provision to the greatest extent possible under applicable
          law and the remaining provisions will continue in full force and effect.
        </p>
        <h2>Waiver</h2>
        <p>
          Except as provided herein, the failure to exercise a right or to require performance of an obligation under
          these Terms shall not effect a party's ability to exercise such right or require such performance at any time
          thereafter nor shall the waiver of a breach constitute a waiver of any subsequent breach.
        </p>
        <h2>Translation Interpretation</h2>
        <p>
          These Terms and Conditions may have been translated if We have made them available to You on our Service. You
          agree that the original English text shall prevail in the case of a dispute.
        </p>
        <h2>Changes to These Terms and Conditions</h2>
        <p>
          We reserve the right, at Our sole discretion, to modify or replace these Terms at any time. If a revision is
          material We will make reasonable efforts to provide at least 30 days' notice prior to any new terms taking
          effect. What constitutes a material change will be determined at Our sole discretion.
        </p>
        <p>
          By continuing to access or use Our Service after those revisions become effective, You agree to be bound by
          the revised terms. If You do not agree to the new terms, in whole or in part, please stop using the website
          and the Service.
        </p>
        <h2>Contact Us</h2>
        <p>
          If you have any questions about these Terms and Conditions, You can contact us by email:{' '}
          <Mailto email="support@bithomp.com" headers={{ subject: 'Terms and conditions' }} />
        </p>
      </div>
    </>
  )
}

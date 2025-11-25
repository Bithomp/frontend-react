import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import SEO from '../../components/SEO'
import { getIsSsrMobile } from '../../utils/mobile'
import { network } from '../../utils'
import { nativeCurrency, explorerName, xahauNetwork } from '../../utils'
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

export default function Paystrings() {
  return (
    <>
      <SEO
        title={'PayStrings'}
        description="Learn what PayString is and how to register yours on Bithomp. Send, receive, deposit, and withdraw funds easily with a simple PayString name."
        noindex={network !== 'mainnet'}
        image={{ file: '/images/xrplexplorer/learn/paystrings/cover', width: 1520, height: 855, allNetworks: true }}
      />
      <div className="max-w-4xl mx-auto px-4">
        <Breadcrumbs />
        <article className="prose sm:prose-lg dark:prose-invert max-w-4xl my-10">
          <h1 className="text-center"> PayStrings on {explorerName}.</h1>
          <div className="flex justify-center">
            <figure>
              <Image
                src={
                  xahauNetwork
                    ? '/images/xahauexplorer/learn/paystrings/cover.jpg'
                    : '/images/xrplexplorer/learn/paystrings/cover.jpg'
                }
                alt="Paystrings"
                width={1520}
                height={855}
                className="max-w-full h-auto object-contain"
                priority
              />
              <figcaption>PayStrings on {explorerName}</figcaption>
            </figure>
          </div>
          <p>
            If you’ve ever tried sending crypto, you know how confusing wallet addresses can be — long strings of random
            letters and numbers that are easy to mistype. PayString solves this problem by replacing those complex
            addresses with simple, human-readable names.
          </p>
          <h3>What is Paystring and how it works on {explorerName}</h3>
          <p>
            When someone sends {nativeCurrency} or tokens to your PayString, it automatically routes the payment to your
            linked {explorerName} address. This makes transactions faster, safer, and easier to share. Your PayString
            becomes your universal identity on {explorerName} — the name that connects to your wallet.
          </p>
          <p>
            Instead of sending {nativeCurrency} to a long address, you can use something like{' '}
            <strong>{xahauNetwork ? 'mainfortesting$xahauexplorer.com' : 'love0139$bithomp.com'}</strong> or{' '}
            <strong>{xahauNetwork ? 'drewrobertslive$xahauexplorer.com' : 'kingkong$bithomp.com'}</strong>.
          </p>
          <h3>Get your PayString on Bithomp</h3>
          <div className="p-4 my-4 border-l-4 rounded bg-white dark:bg-gray-900 border-[#4BA8B6] shadow-sm">
            <p className="text-gray-800 dark:text-gray-200">
              <span role="img" aria-label="lamp">
                👉
              </span>{' '}
              <Link href="/username">Here, you can easily register your PayString (Bithomp username)</Link>
            </p>
          </div>
          <p></p>Once registered, your PayString is linked to your {explorerName} address, allowing you to:
          <ul>
            <li>Receive {nativeCurrency} with a name instead of a long wallet address</li>
            <li>Make deposits and withdrawals on exchanges that support PayString</li>
          </ul>
          <p>Make your {explorerName} payments easy and personal.</p>
        </article>
      </div>
      <br />
      <br />
    </>
  )
}

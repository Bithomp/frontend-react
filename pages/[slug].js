import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
import { useTranslation, Trans } from 'next-i18next'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import Link from 'next/link'
import { isAddressOrUsername, isIdValid, performIdSearch, server } from '../utils'

const slugRegex = /^[~]{0,1}[a-zA-Z0-9-_.]*[+]{0,1}[a-zA-Z0-9-_.]*[$]{0,1}[a-zA-Z0-9-.]*[a-zA-Z0-9]*$/i
const forbiddenSlugsRegex = /^.((?!\$).)*.?\.(7z|gz|rar|tar)$/i

export async function getStaticProps({ locale, params }) {
  const { slug } = params
  //redirects
  if (slug === 'top-nft-sales') {
    return {
      redirect: {
        destination: '/nft-sales',
        permanent: true
      }
    }
  }
  if (slug === 'latest-nft-sales') {
    return {
      redirect: {
        destination: '/nft-sales?order=soldNew&period=week',
        permanent: true
      }
    }
  }

  return {
    props: {
      ...(await serverSideTranslations(locale, ['common']))
    }
  }
}

export const getStaticPaths = async () => {
  return {
    paths: [], //indicates that no page needs be created at build time
    fallback: 'blocking' //indicates the type of fallback
  }
}

export default function Custom404() {
  const router = useRouter()
  const { t } = useTranslation()
  const { slug } = router.query
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    const performIdSearching = async ({ searchFor, router, setErrorMessage }) => {
      await performIdSearch({ searchFor, router, setErrorMessage })
    }

    if (slugRegex.test(slug)) {
      if (forbiddenSlugsRegex.test(slug)) {
        window.location = '/404'
        return
      }

      if (isIdValid(slug)) {
        performIdSearching({ searchFor: slug, router, setErrorMessage })
        return
      }

      if (isAddressOrUsername(slug)) {
        router.push('/account/' + encodeURI(slug))
        return
      }

      window.location = server + '/explorer/' + encodeURI(slug)
      return
    }
  })

  return (
    <div className="content-text center">
      <h1>{t('page-not-found.header')}</h1>
      {errorMessage && <p className="text-red-600">{errorMessage}</p>}
      <p>
        <Trans i18nKey="page-not-found.text">
          Click{' '}
          <Link href="/" className="bold">
            here
          </Link>{' '}
          to check our landing page.
        </Trans>
      </p>
    </div>
  )
}

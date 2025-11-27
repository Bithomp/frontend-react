import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
import { useTranslation, Trans } from 'next-i18next'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import Link from 'next/link'
import { isAddressOrUsername, isIdValid, isLedgerIndexValid, isValidCTID, performIdSearch } from '../../utils'

const slugRegex = /^[~]{0,1}[a-zA-Z0-9-_.]*[+]{0,1}[a-zA-Z0-9-_.]*[$]{0,1}[a-zA-Z0-9-.]*[a-zA-Z0-9]*$/i
const forbiddenSlugsRegex = /^.((?!\$).)*.?\.(7z|gz|rar|tar)$/i

export async function getStaticProps({ locale }) {
  return {
    props: {
      ...(await serverSideTranslations(locale, ['common']))
    }
  }
}

export const getStaticPaths = async () => {
  return {
    paths: [],
    fallback: 'blocking'
  }
}

export default function ExplorerRedirect() {
  const router = useRouter()
  const { t } = useTranslation()
  const { slug } = router.query
  const [errorMessage, setErrorMessage] = useState('')
  const [processing, setProcessing] = useState(true)

  useEffect(() => {
    if (!router.isReady) return
    if (typeof slug !== 'string') {
      setProcessing(false)
      return
    }

    const performIdSearching = async ({ searchFor }) => {
      await performIdSearch({ searchFor, router, setErrorMessage })
    }

    if (slugRegex.test(slug)) {
      if (forbiddenSlugsRegex.test(slug)) {
        window.location.href = '/404'
        return
      }

      if (isIdValid(slug)) {
        performIdSearching({ searchFor: slug })
        return
      }

      if (isValidCTID(slug)) {
        router.replace('/tx/' + slug)
        return
      }

      if (isLedgerIndexValid(slug)) {
        router.replace('/ledger/' + slug)
        return
      }

      if (isAddressOrUsername(slug)) {
        router.replace('/account/' + encodeURI(slug))
        return
      }
    }

    setProcessing(false)
  }, [router.isReady, slug, router])

  if (processing) {
    return (
      <div className="content-text center">
        <br />
        <span className="waiting"></span>
        <br />
        {t('general.loading')}
        <br />
        <br />
      </div>
    )
  }

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

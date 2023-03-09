import { useRouter } from "next/router"
import { useEffect } from "react"
import { useTranslation, Trans } from 'next-i18next'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import Link from 'next/link'

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
        destination: '/nft-sales?list=last',
        permanent: true
      }
    }
  }
  return {
    props: {
      ...(await serverSideTranslations(locale, ['common'])),
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

  useEffect(() => {
    if (/^[~]{0,1}[a-zA-Z0-9-_.]*[+]{0,1}[a-zA-Z0-9-_.]*[$]{0,1}[a-zA-Z0-9-.]*[a-zA-Z0-9]*$/i.test(slug)) {
      window.location = "/explorer/" + encodeURI(slug);
      return;
    }
  })

  return (
    <div className="content-text center">
      <h1>{t("page-not-found.header")}</h1>
      <p>
        <Trans i18nKey="page-not-found.text">
          Click <Link href="/" className="bold">here</Link> to check our landing page.
        </Trans>
      </p>
    </div>
  );
}
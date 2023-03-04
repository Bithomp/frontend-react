import { useRouter } from "next/router"
import { useEffect } from "react"
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'

export async function getStaticProps({ locale }) {
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
  const { slug } = router.query

  useEffect(() => {
    if (/^[~]{0,1}[a-zA-Z0-9-_.]*[+]{0,1}[a-zA-Z0-9-_.]*[$]{0,1}[a-zA-Z0-9-.]*[a-zA-Z0-9]*$/i.test(slug)) {
      window.location = "/explorer/" + encodeURI(slug);
      return;
    }
  })

  return <center style={{ height: "400px", lineHeight: "200px" }}>
    404 | The page <b>/{slug}</b> is not found
  </center>
}
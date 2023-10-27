import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { useTranslation } from 'next-i18next'
import { useEffect, useState } from 'react'
import { Turnstile } from '@marsidev/react-turnstile'
import axios from 'axios'

import SEO from '../../components/SEO'

export const getServerSideProps = async (context) => {
  const { locale } = context
  return {
    props: {
      ...(await serverSideTranslations(locale, ['common', 'admin'])),
    },
  }
}

export default function Admin() {
  const { t } = useTranslation(['common', 'admin'])
  const [siteKey, setSiteKey] = useState("")
  const [errorMessage, setErrorMessage] = useState("")

  const checkApi = async () => {
    const siteKeyData = await axios.get('partner/auth').catch(error => {
      if (error && error.message !== "canceled") {
        setErrorMessage(t("error." + error.message))
      }
    })
    const siteKey = siteKeyData?.data?.captcha?.siteKey
    if (siteKey) {
      setSiteKey(siteKey)
      console.log(siteKey) //delete
    }
  }

  useEffect(() => {
    checkApi()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return <>
    <SEO title={t("header", { ns: "admin" })} />
    <div className="page-admin content-text">
      <h1 className='center'>
        {t("header", { ns: "admin" })}
      </h1>
      <div className='center'>
        {siteKey && <Turnstile siteKey={siteKey} />}

        {errorMessage &&
          <div className='center orange bold'>
            {errorMessage}
          </div>
        }
      </div>
    </div>
  </>
}

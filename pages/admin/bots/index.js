import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { useTranslation } from 'next-i18next'

import SEO from '../../../components/SEO'

import { ledgerName } from '../../../utils'
import { getIsSsrMobile } from '../../../utils/mobile'
import AdminTabs from '../../../components/Tabs/AdminTabs'

export const getServerSideProps = async (context) => {
  const { locale } = context
  return {
    props: {
      isSsrMobile: getIsSsrMobile(context),
      ...(await serverSideTranslations(locale, ['common', 'admin']))
    }
  }
}

export default function Bots() {
  const { t } = useTranslation()

  return (
    <>
      <SEO title="Bots" />
      <div className="page-admin content-center">
        <h1 className="center">{t('header', { ns: 'admin' })}</h1>

        <AdminTabs name="mainTabs" tab="bots" />

        <br />
        <div className="center">
          The page is under construction.
          <br />
          <br />
          Here you will be able to set up your {ledgerName} bots.
          <br />
        </div>
      </div>
    </>
  )
}

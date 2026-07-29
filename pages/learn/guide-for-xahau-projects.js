import { serverSideTranslations } from 'next-i18next/serverSideTranslations'

import { ProjectProfileGuide } from './guide-for-xrpl-projects'
import { getIsSsrMobile } from '../../utils/mobile'

export async function getServerSideProps(context) {
  const { locale } = context
  return {
    props: {
      isSsrMobile: getIsSsrMobile(context),
      ...(await serverSideTranslations(locale, ['common', 'learn', 'guide-for-xrpl-projects']))
    }
  }
}

export default function GuideForXahauProjects() {
  return <ProjectProfileGuide isXahau />
}

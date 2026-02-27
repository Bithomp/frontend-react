import { useTranslation } from 'next-i18next'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { getIsSsrMobile } from '../../utils/mobile'
import SEO from '../../components/SEO'
import SearchBlock from '../../components/Layout/SearchBlock'
import Link from 'next/link'

export async function getServerSideProps(context) {
  const { locale } = context

  return {
    props: {
      isSsrMobile: getIsSsrMobile(context),
      ...(await serverSideTranslations(locale, ['common', 'account']))
    }
  }
}

export default function Account2Index() {
  const { t } = useTranslation()

  return (
    <>
      <SEO
        page="Account (New Layout)"
        title="Account - New Column Layout"
        description="Account details with collapsible column layout - XRP Ledger accounts"
      />
      <div className="content-profile account">
        <h1 className="center">
          {t('explorer.header.account')} - New Layout
          <Link href="/account" className="view-switch-link">
            Classic view
          </Link>
        </h1>
        <p className="center">
          Experience the new collapsible column layout for account information. View your assets, transactions, and
          orders in an organized, customizable interface.
        </p>
        <br />
        <SearchBlock searchPlaceholderText={t('explorer.enter-address')} tab="account2" type="explorer" />
      </div>

      <style jsx>{`
        .view-switch-link {
          font-size: 14px;
          color: var(--accent-link);
          text-decoration: none;
          padding: 5px 10px;
          margin-left: 15px;
          border: 1px solid var(--accent-link);
          border-radius: 4px;
          transition: all 0.2s;
        }

        .view-switch-link:hover {
          background: var(--accent-link);
          color: white;
        }
      `}</style>
    </>
  )
}

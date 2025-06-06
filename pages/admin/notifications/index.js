import { serverSideTranslations } from 'next-i18next/serverSideTranslations'

import ListenersList from '@/components/Admin/ListenersList'

import AdminTabs from '@/components/Tabs/AdminTabs'
import { getIsSsrMobile } from '@/utils/mobile'
import { useGetPartherListeners } from '@/hooks/usePartherConnectionsApi'

export const getServerSideProps = async (context) => {
    const { locale } = context
    return {
        props: {
            isSsrMobile: getIsSsrMobile(context),
            ...(await serverSideTranslations(locale, ['common', 'admin']))
        }
    }
}


export default function Integrations() {
    const { data: listeners, isLoading, error } = useGetPartherListeners()

    if (isLoading) {
        return <div>Loading...</div>
    }

    if (error) {
        return <div>Error: {error.message}</div>
    }

    return (
        <main className="page-admin content-center">
            <h1 className="center">Notifications</h1>
            <AdminTabs name="mainTabs" tab="notifications" />
            <ListenersList listeners={listeners} />
        </main>
    )
}
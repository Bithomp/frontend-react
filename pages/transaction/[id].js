import { useTranslation } from 'next-i18next'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'

import SearchBlock from '../../components/Layout/SearchBlock'
import SEO from '../../components/SEO'
import { axiosServer, passHeaders } from '../../utils/axios'
import { getIsSsrMobile } from '../../utils/mobile'

import {
  TransactionDetails,
  TransactionEscrow,
  TransactionOrder,
  TransactionPayment,
  TransactionAmm
} from '../../components/Transaction'

export async function getServerSideProps(context) {
  const { locale, query, req } = context
  let initialData = null
  const { id } = query
  try {
    const res = await axiosServer({
      method: 'get',
      url: 'v2/transaction/' + id,
      headers: passHeaders(req)
    })
    initialData = res?.data
    initialData.rawTransaction = JSON.parse(initialData.rawTransaction)
  } catch (error) {
    console.error(error)
  }

  return {
    props: {
      id,
      initialData,
      isSsrMobile: getIsSsrMobile(context),
      ...(await serverSideTranslations(locale, ['common']))
    }
  }
}

const Container = ({ children }) => {
  return <>{children}</>
}

export default function Transaction({ id, initialData }) {
  const { t } = useTranslation()

  let TransactionComponent = null
  const txType = initialData?.rawTransaction?.TransactionType
  // https://xrpl.org/docs/references/protocol/transactions/types

  if (txType?.includes('Escrow')) {
    TransactionComponent = TransactionEscrow
  } else if (txType === 'OfferCreate' || txType === 'OfferCancel') {
    TransactionComponent = TransactionOrder
  } else if (txType === 'Payment') {
    TransactionComponent = TransactionPayment
  } else if (txType?.includes('AMM')) {
    TransactionComponent = TransactionAmm
  } else {
    TransactionComponent = TransactionDetails
  }

  return (
    <>
      <SEO
        page="Transaction"
        title={
          t('explorer.header.transaction') +
          ' ' +
          (initialData?.service?.name || initialData?.username || initialData?.address || id)
        }
        description={
          'Transaction details for ' +
          (initialData?.service?.name || initialData?.username) +
          ' ' +
          (initialData?.address || id)
        }
      />
      <SearchBlock tab="transaction" />
      <Container>
        <TransactionComponent tx={initialData} />
      </Container>
    </>
  )
}

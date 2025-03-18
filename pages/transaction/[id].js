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
  TransactionAmm,
  TransactionCheck
} from '../../components/Transaction'
import { useEffect, useState } from 'react'
import { fetchHistoricalRate } from '../../utils/common'
import { TransactionSetRegularKey } from '../../components/Transaction/TransactionSetRegularKey'

export async function getServerSideProps(context) {
  const { locale, query, req } = context
  let data = null
  const { id } = query
  try {
    const res = await axiosServer({
      method: 'get',
      url: 'v3/transaction/' + id,
      headers: passHeaders(req)
    })
    data = res?.data
  } catch (r) {
    data = r?.response?.data
  }

  if (data) {
    data.id = id
  }

  return {
    props: {
      data,
      isSsrMobile: getIsSsrMobile(context),
      ...(await serverSideTranslations(locale, ['common']))
    }
  }
}

export default function Transaction({ data, selectedCurrency }) {
  const { t } = useTranslation()

  const [pageFiatRate, setPageFiatRate] = useState(0)

  useEffect(() => {
    if (!selectedCurrency || !outcome) return
    const { ledgerTimestamp } = outcome
    if (!ledgerTimestamp) return

    fetchHistoricalRate({ timestamp: ledgerTimestamp * 1000, selectedCurrency, setPageFiatRate })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCurrency])

  if (!data) return null

  const { txHash, outcome, tx } = data

  let TransactionComponent = null
  const txType = tx?.TransactionType
  // https://xrpl.org/docs/references/protocol/transactions/types

  if (txType?.includes('Escrow')) {
    TransactionComponent = TransactionEscrow
  } else if (txType === 'OfferCreate' || txType === 'OfferCancel') {
    TransactionComponent = TransactionOrder
  } else if (txType === 'Payment') {
    TransactionComponent = TransactionPayment
  } else if (txType === 'SetRegularKey') {
    TransactionComponent = TransactionSetRegularKey
  } else if (txType?.includes('AMM')) {
    TransactionComponent = TransactionAmm
  } else if (txType?.includes('Check')) {
    TransactionComponent = TransactionCheck
  } else {
    TransactionComponent = TransactionDetails
  }

  const Container = ({ children }) => {
    return <>{children}</>
  }

  return (
    <>
      <SEO
        page="Transaction"
        title={t('explorer.header.transaction') + txHash}
        description={'Transaction details for tx: ' + txHash}
      />
      <SearchBlock tab="transaction" />
      <Container>
        <TransactionComponent data={data} pageFiatRate={pageFiatRate} selectedCurrency={selectedCurrency} />
      </Container>
    </>
  )
}

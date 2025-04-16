import { useTranslation } from 'next-i18next'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'

import SearchBlock from '../../components/Layout/SearchBlock'
import SEO from '../../components/SEO'
import { axiosServer, passHeaders } from '../../utils/axios'
import { getIsSsrMobile } from '../../utils/mobile'

import {
  TransactionDetails,
  TransactionAccountDelete,
  TransactionAccountSet,
  TransactionAMM,
  TransactionCheck,
  TransactionDID,
  TransactionEscrow,
  TransactionImport,
  TransactionOffer,
  TransactionPayment,
  TransactionSetRegularKey,
  TransactionTrustSet
} from '../../components/Transaction'
import { useEffect, useState } from 'react'
import { fetchHistoricalRate } from '../../utils/common'

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

  const { txHash, outcome, tx } = data

  useEffect(() => {
    if (!selectedCurrency || !outcome) return
    const { ledgerTimestamp } = outcome
    if (!ledgerTimestamp) return

    fetchHistoricalRate({ timestamp: ledgerTimestamp * 1000, selectedCurrency, setPageFiatRate })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCurrency, outcome])

  if (!data) return null

  let TransactionComponent = null
  const txType = tx?.TransactionType
  // https://xrpl.org/docs/references/protocol/transactions/types

  if (txType === 'AccountDelete') {
    TransactionComponent = TransactionAccountDelete
  } else if (txType === 'AccountSet') {
    TransactionComponent = TransactionAccountSet
  } else if (txType?.includes('AMM')) {
    TransactionComponent = TransactionAMM
  } else if (txType?.includes('Check')) {
    TransactionComponent = TransactionCheck
  } else if (txType?.includes('Escrow')) {
    TransactionComponent = TransactionEscrow
  } else if (txType === 'Import') {
    TransactionComponent = TransactionImport
  } else if (txType === 'OfferCreate' || txType === 'OfferCancel') {
    TransactionComponent = TransactionOffer
  } else if (txType === 'Payment') {
    TransactionComponent = TransactionPayment
  } else if (txType === 'SetRegularKey') {
    TransactionComponent = TransactionSetRegularKey
  } else if (txType === 'TrustSet') {
    TransactionComponent = TransactionTrustSet
  } else if (txType?.includes('DID')) {
    TransactionComponent = TransactionDID
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

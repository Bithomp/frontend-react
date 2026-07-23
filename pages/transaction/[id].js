import { useTranslation } from 'next-i18next'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'

import SEO from '../../components/SEO'
import { axiosServer, currencyServer, passHeaders } from '../../utils/axios'
import { getIsSsrMobile } from '../../utils/mobile'

import {
  TransactionDetails,
  TransactionAccountDelete,
  TransactionAccountSet,
  TransactionAMM,
  TransactionCheck,
  TransactionCredential,
  TransactionDID,
  TransactionEscrow,
  TransactionImport,
  TransactionNFToken,
  TransactionOffer,
  TransactionPayment,
  TransactionSetRegularKey,
  TransactionSetHook,
  TransactionInvoke,
  TransactionTrustSet,
  TransactionURIToken,
  TransactionRemit,
  TransactionEnableAmendment,
  TransactionUNLModify,
  TransactionDelegateSet,
  TransactionBatch,
  TransactionSignerListSet,
  TransactionCron,
  TransactionPermissionedDomain,
  TransactionMPToken
} from '../../components/Transaction'
import { useEffect, useState } from 'react'
import { fetchHistoricalRate } from '../../utils/common'
import { buildTransactionSeo } from '../../utils/transaction/seo'
import { server } from '../../utils'
import { collectMptIssuanceIds } from '../../utils/transaction/mpt'

export async function getServerSideProps(context) {
  const { locale, query, req } = context
  let data = null
  const { id } = query
  const selectedCurrencyServer = currencyServer(req) || 'usd'

  let initialErrorMessage = null

  try {
    const res = await axiosServer({
      method: 'get',
      url: `v3/transaction/${id}?convertCurrencies=${selectedCurrencyServer}`,
      headers: passHeaders(req)
    }).catch((error) => {
      initialErrorMessage = error.message
    })
    data = res?.data
  } catch (r) {
    data = r?.response?.data
  }

  if (typeof data === 'object') {
    data.id = id
    const txType = data?.tx?.TransactionType

    if (txType?.startsWith('MPToken')) {
      const mptIssuanceIds = collectMptIssuanceIds(data)

      if (mptIssuanceIds.length > 0) {
        const tokenResponses = await Promise.all(
          mptIssuanceIds.map(async (mptIssuanceId) => {
            try {
              const tokenRes = await axiosServer({
                method: 'get',
                url: `v2/token/${encodeURIComponent(mptIssuanceId)}?currencyDetails=true`,
                headers: passHeaders(req)
              })
              return tokenRes?.data || null
            } catch (e) {
              return null
            }
          })
        )

        data.mptokensDetails = tokenResponses.reduce((acc, tokenData) => {
          const mptIssuanceId =
            tokenData?.mptokenIssuanceID || tokenData?.MPTokenIssuanceID || tokenData?.mpt_issuance_id
          if (mptIssuanceId) {
            acc[mptIssuanceId] = tokenData
          }
          return acc
        }, {})
      }
    }
  } else {
    initialErrorMessage = data
  }

  return {
    props: {
      id: id || null,
      data: data || null,
      initialErrorMessage: initialErrorMessage || null,
      selectedCurrencyServer,
      isSsrMobile: getIsSsrMobile(context),
      ...(await serverSideTranslations(locale, ['common', 'transaction', 'transaction-errors']))
    }
  }
}

export default function Transaction({
  id,
  data,
  selectedCurrency,
  selectedCurrencyServer,
  initialErrorMessage
}) {
  const { t: txT } = useTranslation('transaction')
  const effectiveSelectedCurrency = selectedCurrency || selectedCurrencyServer

  const [pageFiatRate, setPageFiatRate] = useState(0)

  useEffect(() => {
    if (!effectiveSelectedCurrency || !data?.outcome) return
    const { ledgerTimestamp } = data?.outcome
    if (!ledgerTimestamp) return

    fetchHistoricalRate({
      timestamp: ledgerTimestamp * 1000,
      selectedCurrency: effectiveSelectedCurrency,
      setPageFiatRate
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveSelectedCurrency, data])

  if (!data || initialErrorMessage)
    return (
      <>
        <SEO canonicalPath={id ? `/tx/${id}` : '/tx'} noindex />
        <center>
          <br />
          {initialErrorMessage || txT('errors.noData')}
          <br />
          <br />
        </center>
      </>
    )

  const { tx } = data
  const transactionSeo = buildTransactionSeo(data, effectiveSelectedCurrency)
  const transactionPreviewParams = {
    type: transactionSeo.type,
    status: transactionSeo.status,
    v: '9'
  }
  if (transactionSeo.previewTitle) {
    transactionPreviewParams.title = transactionSeo.previewTitle
  }
  if (transactionSeo.previewSubtitle) {
    transactionPreviewParams.subtitle = transactionSeo.previewSubtitle
  }
  if (transactionSeo.previewAmount) {
    transactionPreviewParams.amount = transactionSeo.previewAmount
  }
  if (transactionSeo.previewDetail) {
    transactionPreviewParams.detail = transactionSeo.previewDetail
  }
  if (transactionSeo.image) {
    transactionPreviewParams.image = transactionSeo.image
  }
  const transactionPreviewImage = {
    width: 1200,
    height: 630,
    file:
      server +
      '/nextapi/tx-preview?' +
      new URLSearchParams(transactionPreviewParams).toString()
  }
  const transactionTwitterImage = transactionPreviewImage

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
  } else if (
    txType === 'CredentialCreate' ||
    txType === 'CredentialAccept' ||
    txType === 'CredentialDelete' ||
    txType === 'DepositPreauth'
  ) {
    TransactionComponent = TransactionCredential
  } else if (txType?.includes('Escrow')) {
    TransactionComponent = TransactionEscrow
  } else if (txType === 'Import') {
    TransactionComponent = TransactionImport
  } else if (txType?.includes('NFToken')) {
    TransactionComponent = TransactionNFToken
  } else if (txType?.startsWith('MPToken')) {
    TransactionComponent = TransactionMPToken
  } else if (txType === 'OfferCreate' || txType === 'OfferCancel') {
    TransactionComponent = TransactionOffer
  } else if (txType === 'Payment') {
    TransactionComponent = TransactionPayment
  } else if (txType === 'SetRegularKey') {
    TransactionComponent = TransactionSetRegularKey
  } else if (txType === 'SetHook') {
    TransactionComponent = TransactionSetHook
  } else if (txType === 'Invoke') {
    TransactionComponent = TransactionInvoke
  } else if (txType === 'DelegateSet') {
    TransactionComponent = TransactionDelegateSet
  } else if (txType === 'TrustSet') {
    TransactionComponent = TransactionTrustSet
  } else if (txType?.includes('DID')) {
    TransactionComponent = TransactionDID
  } else if (txType?.includes('URIToken')) {
    TransactionComponent = TransactionURIToken
  } else if (txType === 'Remit') {
    TransactionComponent = TransactionRemit
  } else if (txType === 'EnableAmendment') {
    TransactionComponent = TransactionEnableAmendment
  } else if (txType === 'UNLModify') {
    TransactionComponent = TransactionUNLModify
  } else if (txType === 'Batch') {
    TransactionComponent = TransactionBatch
  } else if (txType === 'SignerListSet') {
    TransactionComponent = TransactionSignerListSet
  } else if (txType?.includes('Cron')) {
    TransactionComponent = TransactionCron
  } else if (txType?.includes('PermissionedDomain')) {
    TransactionComponent = TransactionPermissionedDomain
  } else {
    TransactionComponent = TransactionDetails
  }

  return (
    <>
      <SEO
        page="Transaction"
        title={transactionSeo.title}
        description={transactionSeo.description}
        image={transactionPreviewImage}
        twitterImage={transactionTwitterImage}
        twitterCardType="summary_large_image"
        canonicalPath={`/tx/${data.id}`}
        noindex
      />
      <TransactionComponent data={data} pageFiatRate={pageFiatRate} selectedCurrency={effectiveSelectedCurrency} />
    </>
  )
}

import React from 'react'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'

import SearchBlock from '../../components/Layout/SearchBlock'
import SEO from '../../components/SEO'
import { getIsSsrMobile } from '../../utils/mobile'
import { axiosServer, passHeaders } from '../../utils/axios'
import { codeHighlight } from '../../utils/format'

export async function getServerSideProps(context) {
  const { locale, query, req } = context
  let initialData = null
  const { id } = query
  let errorMessage = null
  try {
    const res = await axiosServer({
      method: 'get',
      url: 'xrpl/ledgerEntry/' + id,
      headers: passHeaders(req)
    }).catch((error) => {
      errorMessage = error.message
    })
    initialData = res?.data
  } catch (error) {
    console.error(error)
  }

  return {
    props: {
      data: initialData,
      initialErrorMessage: errorMessage || '',
      isSsrMobile: getIsSsrMobile(context),
      ...(await serverSideTranslations(locale, ['common']))
    }
  }
}

export default function Object({ data, initialErrorMessage }) {
  const errorMessage = initialErrorMessage

  return (
    <>
      <SEO title={data?.node?.LedgerEntryType} description="Ledger object details" />
      <SearchBlock tab="object" searchPlaceholderText="Search by LedgerEntry" />
      <div className="content-center short-top">
        {errorMessage ? (
          <div className="orange bold">
            <br />
            {errorMessage}
          </div>
        ) : (
          <>
            <h1>{data?.node?.LedgerEntryType}</h1>
            {codeHighlight(data)}
          </>
        )}
      </div>
    </>
  )
}

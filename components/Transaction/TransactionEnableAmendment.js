import { TData } from '../Table'

import { TransactionCard } from './TransactionCard'
import { AddressWithIconFilled, capitalize } from '../../utils/format'
import CopyButton from '../UI/CopyButton'
import { xahauNetwork } from '../../utils'
import Link from 'next/link'

export const TransactionEnableAmendment = ({ data, pageFiatRate, selectedCurrency }) => {
  if (!data) return null
  const { specification, outcome } = data

  return (
    <TransactionCard data={data} pageFiatRate={pageFiatRate} selectedCurrency={selectedCurrency}>
      <tr>
        <TData>Initiated by</TData>
        <TData>
          <AddressWithIconFilled data={specification.source} name="address" />
        </TData>
      </tr>
      {specification.amendmentDetails?.name && (
        <tr>
          <TData>Amendment</TData>
          <TData className="bold">
            {specification.amendmentDetails.name} <CopyButton text={specification.amendmentDetails.name} />
            {!xahauNetwork && (
              <span>
                {' '}
                (
                <a
                  href={`https://xrpl.org/resources/known-amendments#${specification.amendmentDetails.name.toLowerCase()}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  read more
                </a>
                )
              </span>
            )}
          </TData>
        </tr>
      )}
      {outcome?.amendmentChanges?.amendment === specification.amendment && (
        <tr>
          <TData>New status</TData>
          <TData className="bold">{capitalize(outcome?.amendmentChanges.status)}</TData>
        </tr>
      )}
      <tr>
        <TData>Amendment hash</TData>
        <TData>
          {specification.amendment} <CopyButton text={specification.amendment} />
        </TData>
      </tr>
      {specification.amendmentDetails?.introduced && (
        <tr>
          <TData>Introduced</TData>
          <TData>
            {specification.amendmentDetails?.introduced} (<Link href="/amendments">view other amendments</Link>)
          </TData>
        </tr>
      )}
    </TransactionCard>
  )
}

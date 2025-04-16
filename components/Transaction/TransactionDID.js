import { TData } from '../Table'

import { TransactionCard } from './TransactionCard'
import { AddressWithIconFilled, decodeJsonMemo } from '../../utils/format'
import { decode } from '../../utils'

export const TransactionDID = ({ data, pageFiatRate, selectedCurrency }) => {
  if (!data) return null
  const { specification } = data

  let uriStr = decode(specification?.uri)
  if (uriStr?.startsWith('did/json;base16,')) {
    uriStr = decode(uriStr.slice(16))
  }

  return (
    <TransactionCard data={data} pageFiatRate={pageFiatRate} selectedCurrency={selectedCurrency}>
      <tr>
        <TData>Initiated by</TData>
        <TData>
          <AddressWithIconFilled data={specification.source} name="address" />
        </TData>
      </tr>
      {specification?.uri && (
        <tr>
          <TData>URI</TData>
          <TData>{uriStr}</TData>
        </tr>
      )}
      {specification?.data && (
        <tr>
          <TData>Data</TData>
          <TData>{decode(specification.data)}</TData>
        </tr>
      )}
      {specification?.didDocument && (
        <tr>
          <TData>Data</TData>
          <TData>{decodeJsonMemo(decode(specification.didDocument))}</TData>
        </tr>
      )}
    </TransactionCard>
  )
}

import { TData } from '../Table'
import { TransactionCard } from './TransactionCard'
import { AddressWithIconFilled, shortHash } from '../../utils/format'
import { networkId, networksIds } from '../../utils'
import { i18n } from 'next-i18next'

//https://docs.xahau.network/technical/protocol-reference/transactions/transaction-types/import

/*
tx for test, xahau mainnet
851BFFF152023C0BE95E5968476E734C4D76AB83F76EC2D986CCB3D546B8A651
*/

export const TransactionImport = ({ data, pageFiatRate, selectedCurrency }) => {
  if (!data) return null
  const { specification, tx } = data

  const importExplorer = networkId === 21338 ? networksIds[1].server : networksIds[0].server

  //check that txType and proofTxStatus works!
  const blobTransaction = specification?.blob?.transaction

  const importTX = blobTransaction?.id
  const burnedNft = blobTransaction?.specification?.nftokenID

  const txTypeSpecial = tx?.TransactionType + ' - ' + blobTransaction?.tx?.TransactionType

  const proofTxStatusNode =
    blobTransaction?.meta?.TransactionResult === 'tesSUCCESS' ? (
      <span className="green bold">Success</span>
    ) : (
      <span className="red bold">Failed</span>
    )

  return (
    <TransactionCard
      data={data}
      pageFiatRate={pageFiatRate}
      selectedCurrency={selectedCurrency}
      txTypeSpecial={txTypeSpecial}
    >
      <tr>
        <TData>Initiated by</TData>
        <TData>
          <AddressWithIconFilled data={specification.source} name="address" />
        </TData>
      </tr>
      <tr>
        <TData>Proof TX hash</TData>
        <TData>
          <a href={importExplorer + '/' + i18n.language + '/tx/' + importTX}>{shortHash(importTX)}</a>
        </TData>
      </tr>
      <tr>
        <TData>Proof TX status</TData>
        <TData>{proofTxStatusNode}</TData>
      </tr>
      {burnedNft && (
        <tr>
          <TData>XRPL NFT</TData>
          <TData>
            <a href={importExplorer + '/' + i18n.language + '/nft/' + burnedNft}>{shortHash(burnedNft)}</a>
          </TData>
        </tr>
      )}
    </TransactionCard>
  )
}

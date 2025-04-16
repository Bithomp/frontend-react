import { TData } from '../Table'
import { TransactionCard } from './TransactionCard'
import { AddressWithIconFilled, shortHash } from '../../utils/format'
import { networkId, networksIds } from '../../utils'
import { i18n } from 'next-i18next'
import { LinkTx } from '../../utils/links'

//https://docs.xahau.network/technical/protocol-reference/transactions/transaction-types/import

export const TransactionImport = ({ data, pageFiatRate, selectedCurrency }) => {
  if (!data) return null
  const { specification, tx, outcome } = data

  const importExplorer = networkId === 21338 ? networksIds[1].server : networksIds[0].server

  //check that txType and proofTxStatus works!
  const blobTransaction = tx?.Blob?.transaction
  const specBlobTransaction = specification?.blob?.transaction

  const importTX = specBlobTransaction?.id
  const burnedNft = specBlobTransaction?.specification?.nftokenID

  const txTypeSpecial = tx?.TransactionType + ' - ' + blobTransaction?.tx?.TransactionType

  const proofTxStatusNode =
    blobTransaction?.tx?.meta?.TransactionResult === 'tesSUCCESS' ? (
      <span class="green">Success</span>
    ) : (
      <span className="red">Failed</span>
    )

  return (
    <TransactionCard
      data={data}
      pageFiatRate={pageFiatRate}
      selectedCurrency={selectedCurrency}
      txTypeSpecial={txTypeSpecial}
    >
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
            <a href={importExplorer + '/' + +i18n.language + '/nft/' + burnedNft}>{shortHash(burnedNft)}</a>
          </TData>
        </tr>
      )}
      <tr>
        <TData>Initiated by</TData>
        <TData>
          <AddressWithIconFilled data={specification.source} name="address" />
        </TData>
      </tr>
      {outcome?.emittedTxns?.[0]?.id && (
        <tr>
          <TData>Emitted TX</TData>
          <TData>
            <LinkTx tx={emittedTX} />
          </TData>
        </tr>
      )}
      {specification?.emittedDetails?.emitParentTxnID && (
        <tr>
          <TData>Emit Parent TX</TData>
          <TData>
            <LinkTx tx={specification.emittedDetails.emitParentTxnID} />
          </TData>
        </tr>
      )}
    </TransactionCard>
  )
}
